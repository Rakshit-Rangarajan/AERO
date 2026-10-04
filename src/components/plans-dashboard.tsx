"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Kanban,
  Layers,
  ListChecks,
  Milestone,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

type PlanStatus = "planned" | "in-progress" | "at-risk" | "complete";
type PhaseStatus = "done" | "active" | "todo";
type MilestoneStatus = "done" | "upcoming" | "risk";

type Phase = { id: string; name: string; start: string; end: string; status: PhaseStatus };
type Plan = {
  id: string;
  code: string;
  title: string;
  description: string;
  owner: string;
  team: string;
  status: PlanStatus;
  start: string;
  end: string;
  progress: number;
  tasksDone: number;
  tasksTotal: number;
  tags: string[];
  phases: Phase[];
};
type Milestone = { id: string; planId: string | null; title: string; dueDate: string; status: MilestoneStatus };

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86_400_000;

const STATUS_LABEL: Record<PlanStatus, string> = {
  planned: "Planned",
  "in-progress": "In progress",
  "at-risk": "At risk",
  complete: "Complete",
};

const COLUMNS: { key: PlanStatus; label: string }[] = [
  { key: "planned", label: "Planned" },
  { key: "in-progress", label: "In progress" },
  { key: "at-risk", label: "At risk" },
  { key: "complete", label: "Complete" },
];

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);
const toTime = (value: string) => startOfDay(new Date(`${value}T00:00:00`)).getTime();
const shortDate = (value: string) => {
  const d = new Date(`${value}T00:00:00`);
  return `${MON[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
};
const initialsOf = (name: string) =>
  name.split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("") || "—";

export function PlansDashboard() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"timeline" | "board">("timeline");
  const [selectedId, setSelectedId] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", owner: "", start: "", end: "" });
  const [phaseForm, setPhaseForm] = useState({ name: "", start: "", end: "" });

  const today = startOfDay(new Date());

  const load = useCallback(async () => {
    const response = await fetch("/api/plans");
    const result = await response.json().catch(() => null) as { plans?: Plan[]; milestones?: Milestone[]; error?: string } | null;
    if (!response.ok || !result?.plans) { setError(result?.error ?? "The roadmap could not be loaded."); setLoading(false); return; }
    setPlans(result.plans);
    setMilestones(result.milestones ?? []);
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    const start = () => { void load(); };
    start();
  }, [load]);

  const range = useMemo(() => {
    const times = [today.getTime()];
    plans.forEach(plan => { times.push(toTime(plan.start), toTime(plan.end)); });
    const min = new Date(Math.min(...times));
    const max = new Date(Math.max(...times));
    const start = startOfMonth(min);
    const end = new Date(max.getFullYear(), max.getMonth() + 1, 1);
    const span = end.getTime() - start.getTime();
    const months: { label: string; pct: number }[] = [];
    let cursor = start;
    while (cursor.getTime() < end.getTime()) {
      months.push({ label: `${MON[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}`, pct: ((cursor.getTime() - start.getTime()) / span) * 100 });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    const pctOf = (time: number) => Math.max(0, Math.min(100, ((time - start.getTime()) / span) * 100));
    return { months, pctOf };
  }, [plans, today]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return plans;
    return plans.filter(plan => [plan.title, plan.code, plan.owner, plan.team, plan.status, ...plan.tags].join(" ").toLowerCase().includes(needle));
  }, [plans, search]);

  const metrics = useMemo(() => {
    const active = plans.filter(plan => plan.status === "in-progress" || plan.status === "at-risk");
    const avg = active.length ? Math.round(active.reduce((sum, plan) => sum + plan.progress, 0) / active.length) : 0;
    const monthMilestones = milestones.filter(item => {
      const d = new Date(`${item.dueDate}T00:00:00`);
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    }).length;
    return { active: active.length, avg, monthMilestones, atRisk: plans.filter(plan => plan.status === "at-risk").length };
  }, [plans, milestones, today]);

  const selected = plans.find(plan => plan.id === selectedId) ?? plans[0];

  async function mutate(payload: Record<string, unknown>, method: "POST" | "PATCH" | "DELETE" = "POST") {
    setError("");
    const response = await fetch("/api/plans", {
      method,
      headers: method === "DELETE" ? undefined : { "content-type": "application/json" },
      body: method === "DELETE" ? undefined : JSON.stringify(payload),
    });
    const result = await response.json().catch(() => null) as { plans?: Plan[]; milestones?: Milestone[]; error?: string } | null;
    if (!response.ok || !result?.plans) { setError(result?.error ?? "The change could not be saved."); return false; }
    setPlans(result.plans);
    setMilestones(result.milestones ?? []);
    return true;
  }

  const formValid = form.title.trim().length > 0 && Boolean(form.start) && Boolean(form.end) && toTime(form.end) > toTime(form.start);

  async function createPlan() {
    if (!formValid) return;
    const ok = await mutate({ kind: "plan", title: form.title, owner: form.owner, start: form.start, end: form.end });
    if (!ok) return;
    setForm({ title: "", owner: "", start: "", end: "" });
    setCreating(false);
    setView("timeline");
  }

  const phaseValid = Boolean(selected) && phaseForm.name.trim().length > 0 && Boolean(phaseForm.start) && Boolean(phaseForm.end) && toTime(phaseForm.end) > toTime(phaseForm.start);

  async function createPhase() {
    if (!selected || !phaseValid) return;
    const ok = await mutate({ kind: "phase", planId: selected.id, name: phaseForm.name, start: phaseForm.start, end: phaseForm.end });
    if (ok) setPhaseForm({ name: "", start: "", end: "" });
  }

  return (
    <div className="plans-dashboard">
      <div className="repos-header">
        <div className="repos-title">
          <h2>Engineering plans</h2>
          <p>Sequence the work, track milestones, and keep delivery honest.</p>
        </div>
        <div className="repos-actions">
          <div className="repos-search">
            <Search size={14} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search plans, owners, tags…" />
          </div>
          <button className="primary-button" onClick={() => setCreating(value => !value)}>
            {creating ? <X size={14} /> : <Plus size={14} />}
            {creating ? "Cancel" : "New plan"}
          </button>
        </div>
      </div>

      {creating && (
        <div className="plan-create">
          <div className="plan-field plan-field-wide">
            <label htmlFor="plan-title">Plan title</label>
            <input id="plan-title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="e.g. Offline sync for sessions" autoFocus />
          </div>
          <div className="plan-field">
            <label htmlFor="plan-owner">Owner</label>
            <input id="plan-owner" value={form.owner} onChange={event => setForm({ ...form, owner: event.target.value })} placeholder="e.g. Ada Nwosu" />
          </div>
          <div className="plan-field">
            <label htmlFor="plan-start">Start</label>
            <input id="plan-start" type="date" value={form.start} onChange={event => setForm({ ...form, start: event.target.value })} />
          </div>
          <div className="plan-field">
            <label htmlFor="plan-end">Target end</label>
            <input id="plan-end" type="date" value={form.end} onChange={event => setForm({ ...form, end: event.target.value })} />
          </div>
          <div className="plan-create-actions">
            <button className="primary-button" disabled={!formValid} onClick={() => void createPlan()}>
              <CheckCircle2 size={14} /> Create plan
            </button>
          </div>
        </div>
      )}

      {error && <div className="demo-error" role="alert"><AlertTriangle size={14}/>{error}</div>}

      <div className="plan-metrics">
        <div className="test-metric-card">
          <span>Active plans</span>
          <strong>{String(metrics.active).padStart(2, "0")}</strong>
          <Layers size={16} className="text-mint" />
        </div>
        <div className="test-metric-card">
          <span>Average progress</span>
          <strong>{metrics.avg}%</strong>
          <TrendingUp size={16} className="text-green" />
        </div>
        <div className="test-metric-card">
          <span>Milestones this month</span>
          <strong>{String(metrics.monthMilestones).padStart(2, "0")}</strong>
          <Flag size={16} className="text-purple" />
        </div>
        <div className="test-metric-card">
          <span>Plans at risk</span>
          <strong>{String(metrics.atRisk).padStart(2, "0")}</strong>
          <AlertTriangle size={16} className="text-red" />
        </div>
      </div>

      <div className="plan-body">
        <section className="plan-surface">
          <div className="plan-surface-head">
            <div className="plan-surface-head-title">
              <h3>{view === "timeline" ? "Roadmap timeline" : "Delivery board"}</h3>
              <span>{filtered.length.toString().padStart(2, "0")} PLANS</span>
            </div>
            {plans.length > 0 && (
              <div className="pr-filters">
                <button className={view === "timeline" ? "active" : ""} onClick={() => setView("timeline")}><Calendar size={13} /> Timeline</button>
                <button className={view === "board" ? "active" : ""} onClick={() => setView("board")}><Kanban size={13} /> Board</button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="activity-empty"><div className="activity-pulse"><Clock size={16}/></div><div><strong>Loading the roadmap</strong><p>Reading the plans saved in this workspace.</p></div></div>
          ) : plans.length === 0 ? (
            <div className="activity-empty">
              <div className="activity-pulse"><Target size={16}/></div>
              <div>
                <strong>This roadmap is empty</strong>
                <p>Nothing has been planned in this workspace yet. Create the first plan and the timeline, board, and milestones build themselves from it.</p>
              </div>
              {!creating && <button className="primary-button plan-empty-action" onClick={() => setCreating(true)}><Plus size={14}/> Create the first plan</button>}
            </div>
          ) : filtered.length === 0 ? (
            <div className="activity-empty">
              <div className="activity-pulse"><Search size={16}/></div>
              <div><strong>No plans match “{search}”</strong><p>Clear the search to see the whole roadmap.</p></div>
            </div>
          ) : view === "timeline" ? (
            <div className="plan-tl">
              <div className="plan-tl-head">
                <div className="plan-tl-labelcol">Plan</div>
                <div className="plan-tl-months">
                  {range.months.map(month => <span className="plan-tl-month" key={month.label} style={{ left: `${month.pct}%` }}>{month.label}</span>)}
                </div>
              </div>

              {filtered.map(plan => {
                const left = range.pctOf(toTime(plan.start));
                const right = range.pctOf(toTime(plan.end) + DAY);
                return (
                  <div key={plan.id} className={`plan-tl-row ${selected?.id === plan.id ? "selected" : ""}`} onClick={() => setSelectedId(plan.id)}>
                    <div className="plan-tl-label">
                      <strong>{plan.title}</strong>
                      <span>{plan.code} · {plan.owner}</span>
                    </div>
                    <div className="plan-tl-track">
                      {range.months.map(month => <span className="plan-tl-gridline" key={month.label} style={{ left: `${month.pct}%` }} />)}
                      <span className="plan-tl-today" style={{ left: `${range.pctOf(today.getTime())}%` }}><i /></span>
                      <span className="plan-tl-bar" data-status={plan.status} style={{ left: `${left}%`, width: `${Math.max(right - left, 1.5)}%` }} title={`${plan.title} · ${shortDate(plan.start)} → ${shortDate(plan.end)}`}>
                        <span className="plan-tl-fill" style={{ width: `${plan.progress}%` }} />
                        <span className="plan-tl-bar-text">{plan.code} · {plan.progress}%</span>
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="plan-legend">
                {COLUMNS.map(column => <span key={column.key} data-status={column.key}><i /> {column.label}</span>)}
                <span className="plan-legend-today"><i /> Today</span>
              </div>
            </div>
          ) : (
            <div className="plan-board">
              {COLUMNS.map(column => {
                const columnPlans = filtered.filter(plan => plan.status === column.key);
                return (
                  <div className="plan-col" key={column.key}>
                    <div className="plan-col-head" data-status={column.key}>
                      <strong>{column.label}</strong>
                      <span className="plan-col-count">{columnPlans.length.toString().padStart(2, "0")}</span>
                    </div>
                    {columnPlans.length === 0 ? (
                      <div className="plan-col-empty">Nothing here yet</div>
                    ) : columnPlans.map(plan => (
                      <button key={plan.id} className={`plan-card ${selected?.id === plan.id ? "selected" : ""}`} onClick={() => setSelectedId(plan.id)}>
                        <div className="plan-card-top">
                          <span className="plan-card-code">{plan.code}</span>
                          <span className="plan-card-team">{plan.team}</span>
                        </div>
                        <strong className="plan-card-title">{plan.title}</strong>
                        <div className="plan-progress"><span style={{ width: `${plan.progress}%` }} /></div>
                        <div className="plan-card-foot">
                          <span className="plan-card-owner"><span className="plan-card-avatar">{initialsOf(plan.owner)}</span>{plan.owner.split(" ")[0]}</span>
                          <span className="plan-card-due"><Clock size={11} /> {shortDate(plan.end)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="plan-side">
          {selected ? (
            <section className="plan-surface plan-detail">
              <div className="plan-surface-head">
                <div className="plan-surface-head-title">
                  <h3>{selected.code}</h3>
                  <span>{selected.team.toUpperCase()} WORKSTREAM</span>
                </div>
                <span className="plan-badge" data-status={selected.status}>{STATUS_LABEL[selected.status]}</span>
              </div>

              <div className="plan-detail-body">
                <h4>{selected.title}</h4>
                <div className="plan-detail-grid">
                  <div><span>Owner</span><strong><span className="plan-card-avatar">{initialsOf(selected.owner)}</span>{selected.owner}</strong></div>
                  <div><span>Window</span><strong>{shortDate(selected.start)} → {shortDate(selected.end)}</strong></div>
                  <div><span>Progress</span><strong>{selected.progress}% complete</strong></div>
                  <div><span>Tasks</span><strong>{selected.tasksDone}/{selected.tasksTotal} closed</strong></div>
                </div>

                <div className="plan-detail-progress"><div className="plan-progress"><span style={{ width: `${selected.progress}%` }} /></div></div>

                <div className="plan-tags">{selected.tags.map(tag => <span key={tag}>{tag}</span>)}</div>

                <div className="plan-phases">
                  <div className="plan-phases-title"><ListChecks size={13}/> Phases</div>
                  {selected.phases.length === 0 ? (
                    <p className="plan-phases-empty">No phases yet. Break the plan down once the scope is agreed.</p>
                  ) : selected.phases.map(phase => (
                    <div className="plan-phase" key={phase.id} data-state={phase.status}>
                      <button
                        className="plan-phase-icon"
                        title={phase.status === "done" ? "Mark as not started" : "Mark as done"}
                        onClick={() => void mutate({ id: selected.id, phaseId: phase.id, phaseStatus: phase.status === "done" ? "todo" : "done" }, "PATCH")}
                      >
                        {phase.status === "done" ? <CheckCircle2 size={13}/> : <Circle size={13}/>}
                      </button>
                      <span className="plan-phase-main">
                        <strong>{phase.name}</strong>
                        <small>{shortDate(phase.start)} → {shortDate(phase.end)}</small>
                      </span>
                      {phase.status === "active" && <em>active</em>}
                    </div>
                  ))}
                  <div className="plan-phase-form">
                    <input value={phaseForm.name} onChange={event => setPhaseForm({ ...phaseForm, name: event.target.value })} placeholder="Phase name" aria-label="Phase name" />
                    <input type="date" value={phaseForm.start} onChange={event => setPhaseForm({ ...phaseForm, start: event.target.value })} aria-label="Phase start" />
                    <input type="date" value={phaseForm.end} onChange={event => setPhaseForm({ ...phaseForm, end: event.target.value })} aria-label="Phase end" />
                    <button className="icon-button" disabled={!phaseValid} onClick={() => void createPhase()} aria-label="Add phase"><Plus size={14}/></button>
                  </div>
                </div>

                <div className="plan-detail-actions">
                  <label className="plan-status-select">
                    <span>STATUS</span>
                    <select value={selected.status} onChange={event => void mutate({ id: selected.id, status: event.target.value }, "PATCH")}>
                      {COLUMNS.map(column => <option key={column.key} value={column.key}>{column.label}</option>)}
                    </select>
                  </label>
                  <button className="icon-button plan-delete" title="Delete this plan" onClick={() => void mutate({ id: selected.id }, "DELETE")}><Trash2 size={14}/></button>
                </div>
              </div>
            </section>
          ) : (
            <section className="plan-surface plan-detail plan-detail-idle">
              <div className="activity-empty">
                <div className="activity-pulse"><ListChecks size={16}/></div>
                <div><strong>No plan selected</strong><p>Pick a plan from the timeline or board to see its phases.</p></div>
              </div>
            </section>
          )}

          <section className="plan-surface plan-milestones">
            <div className="plan-surface-head">
              <div className="plan-surface-head-title">
                <h3>Upcoming milestones</h3>
                <span>NEXT CHECKPOINTS</span>
              </div>
              <Milestone size={15} className="text-mint" />
            </div>
            {milestones.length === 0 ? (
              <div className="activity-empty">
                <div className="activity-pulse"><Flag size={16}/></div>
                <div><strong>No milestones yet</strong><p>Milestones you add to plans will collect here.</p></div>
              </div>
            ) : (
              <div className="plan-ms-list">
                {milestones.map(item => (
                  <div className="plan-ms" key={item.id} data-status={item.status}>
                    <span className="plan-ms-date">{shortDate(item.dueDate)}</span>
                    <span className="plan-ms-main">
                      <strong>{item.title}</strong>
                      <small>
                        {item.status === "risk" ? "needs attention" : item.status === "done" ? "reached" : "upcoming"}
                        {item.planId && plans.some(plan => plan.id === item.planId) ? ` · ${plans.find(plan => plan.id === item.planId)?.code}` : " · workspace"}
                      </small>
                    </span>
                    <button
                      className="plan-ms-mark"
                      title={item.status === "done" ? "Reopen milestone" : "Mark as reached"}
                      onClick={() => void mutate({ id: item.id, milestoneId: item.id, milestoneStatus: item.status === "done" ? "upcoming" : "done" }, "PATCH")}
                    >
                      {item.status === "done" ? <CheckCircle2 size={13} className="text-green"/> : item.status === "risk" ? <AlertTriangle size={13} className="text-red"/> : <Target size={13} className="text-muted"/>}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="plan-ms-foot">
              {plans.length} plans · {plans.filter(plan => plan.status !== "complete").length} still open
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}