import { getDb } from "@/lib/db";

export type PlanStatus = "planned" | "in-progress" | "at-risk" | "complete";
export type PhaseStatus = "done" | "active" | "todo";
export type MilestoneStatus = "done" | "upcoming" | "risk";

export type PlanPhase = { id: string; name: string; start: string; end: string; status: PhaseStatus };
export type PlanMilestone = { id: string; planId: string | null; title: string; dueDate: string; status: MilestoneStatus };
export type WorkspacePlan = {
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
  phases: PlanPhase[];
};

const PLAN_STATUSES: PlanStatus[] = ["planned", "in-progress", "at-risk", "complete"];
const PHASE_STATUSES: PhaseStatus[] = ["done", "active", "todo"];
const MILESTONE_STATUSES: MilestoneStatus[] = ["done", "upcoming", "risk"];

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch {
    return [];
  }
}

function phasesFor(planId: string): PlanPhase[] {
  const rows = getDb().prepare("SELECT id,name,start_date AS start,end_date AS end,status FROM plan_phases WHERE plan_id=? ORDER BY position,start_date").all(planId) as Array<PlanPhase>;
  return rows.filter(phase => PHASE_STATUSES.includes(phase.status));
}

export function listPlans(): WorkspacePlan[] {
  const rows = getDb().prepare(`SELECT id,code,title,description,owner,team,status,start_date AS start,end_date AS end,progress,
      tasks_done AS tasksDone,tasks_total AS tasksTotal,tags FROM plans ORDER BY start_date,code`).all() as Array<Omit<WorkspacePlan, "phases" | "tags"> & { tags: string }>;
  return rows
    .filter(plan => PLAN_STATUSES.includes(plan.status))
    .map(plan => ({ ...plan, tags: parseTags(plan.tags), phases: phasesFor(plan.id) }));
}

export function listMilestones(): PlanMilestone[] {
  const rows = getDb().prepare(`SELECT id,plan_id AS planId,title,due_date AS dueDate,status FROM plan_milestones ORDER BY due_date`).all() as PlanMilestone[];
  return rows.filter(item => MILESTONE_STATUSES.includes(item.status));
}

function nextPlanCode() {
  const row = getDb().prepare("SELECT code FROM plans ORDER BY created_at DESC LIMIT 1").get() as { code: string } | undefined;
  const latest = Number((row?.code ?? "AER-00").split("-")[1] ?? 0);
  return `AER-${String((Number.isFinite(latest) ? latest : 0) + 1).padStart(2, "0")}`;
}

export function createPlan(input: {
  title: string;
  owner?: string;
  team?: string;
  status?: PlanStatus;
  start: string;
  end: string;
  description?: string;
  tags?: string[];
  createdBy?: string | null;
}) {
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const status: PlanStatus = input.status && PLAN_STATUSES.includes(input.status) ? input.status : "planned";
  const code = nextPlanCode();
  db.prepare(`INSERT INTO plans(id,code,title,description,owner,team,status,start_date,end_date,progress,tasks_done,tasks_total,tags,created_by,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,0,0,0,?,?,?,?)`)
    .run(
      id,
      code,
      input.title,
      input.description ?? "",
      input.owner?.trim() || "Unassigned",
      input.team?.trim() || "Workspace",
      status,
      input.start,
      input.end,
      JSON.stringify(input.tags ?? []),
      input.createdBy ?? null,
      now,
      now,
    );
  // A new plan immediately populates the roadmap with its own checkpoints.
  insertMilestones([
    { planId: id, title: `${code} kickoff`, dueDate: input.start, status: "upcoming" },
    { planId: id, title: `${code} target completion`, dueDate: input.end, status: "upcoming" },
  ]);
  return listPlans().find(plan => plan.id === id) ?? null;
}

export function updatePlan(id: string, patch: Partial<Pick<WorkspacePlan, "title" | "description" | "owner" | "team" | "status" | "start" | "end" | "progress" | "tasksDone" | "tasksTotal">>) {
  const db = getDb();
  const current = db.prepare("SELECT id FROM plans WHERE id=?").get(id);
  if (!current) return null;
  const columns: Record<string, string> = {
    title: "title", description: "description", owner: "owner", team: "team", status: "status",
    start: "start_date", end: "end_date",
    progress: "progress", tasksDone: "tasks_done", tasksTotal: "tasks_total",
  };
  const sets: string[] = [];
  const values: Array<string | number> = [];
  for (const [key, column] of Object.entries(columns)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    if (key === "status") {
      if (!PLAN_STATUSES.includes(value as PlanStatus)) continue;
      sets.push("status=?");
      values.push(value as string);
      continue;
    }
    if (key === "progress") {
      const progress = Math.max(0, Math.min(100, Math.round(Number(value))));
      sets.push("progress=?");
      values.push(progress);
      continue;
    }
    if ((key === "tasksDone" || key === "tasksTotal") && !Number.isFinite(Number(value))) continue;
    sets.push(`${column}=?`);
    values.push(key === "tasksDone" || key === "tasksTotal" ? Number(value) : String(value));
  }
  if (!sets.length) return listPlans().find(plan => plan.id === id) ?? null;
  sets.push("updated_at=?");
  values.push(new Date().toISOString(), id);
  db.prepare(`UPDATE plans SET ${sets.join(",")} WHERE id=?`).run(...values);
  return listPlans().find(plan => plan.id === id) ?? null;
}

function syncPhaseProgress(planId: string) {
  const phases = phasesFor(planId);
  if (!phases.length) return;
  const derived = Math.round((phases.filter(phase => phase.status === "done").length / phases.length) * 100);
  getDb().prepare("UPDATE plans SET progress=?, updated_at=? WHERE id=?").run(derived, new Date().toISOString(), planId);
}

export function deletePlan(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM plan_milestones WHERE plan_id=?").run(id);
  db.prepare("DELETE FROM plan_phases WHERE plan_id=?").run(id);
  db.prepare("DELETE FROM plans WHERE id=?").run(id);
}

function insertMilestones(items: { planId: string | null; title: string; dueDate: string; status: MilestoneStatus }[]) {
  const db = getDb();
  const insert = db.prepare("INSERT INTO plan_milestones(id,plan_id,title,due_date,status,created_at) VALUES(?,?,?,?,?,?)");
  const now = new Date().toISOString();
  for (const item of items) insert.run(crypto.randomUUID(), item.planId, item.title, item.dueDate, item.status, now);
}

export function addPhase(planId: string, input: { name: string; start: string; end: string; status?: PhaseStatus }) {
  const db = getDb();
  const plan = db.prepare("SELECT id,code FROM plans WHERE id=?").get(planId) as { id: string; code: string } | undefined;
  if (!plan) return null;
  const position = (db.prepare("SELECT COALESCE(MAX(position),-1) AS max FROM plan_phases WHERE plan_id=?").get(planId) as { max: number }).max + 1;
  const id = crypto.randomUUID();
  const status: PhaseStatus = input.status && PHASE_STATUSES.includes(input.status) ? input.status : "todo";
  db.prepare("INSERT INTO plan_phases(id,plan_id,name,start_date,end_date,status,position) VALUES(?,?,?,?,?,?,?)")
    .run(id, planId, input.name, input.start, input.end, status, position);
  // Each phase boundary becomes a checkpoint so the milestone rail stays in step with the plan.
  insertMilestones([{ planId, title: `${plan.code} · ${input.name}`, dueDate: input.end, status: "upcoming" }]);
  return { id };
}

export function updatePhase(phaseId: string, status: PhaseStatus) {
  const db = getDb();
  if (!PHASE_STATUSES.includes(status)) return false;
  const row = db.prepare("SELECT plan_id AS planId FROM plan_phases WHERE id=?").get(phaseId) as { planId: string } | undefined;
  if (!row) return false;
  db.prepare("UPDATE plan_phases SET status=? WHERE id=?").run(status, phaseId);
  syncPhaseProgress(row.planId);
  return true;
}

export function createMilestone(input: { planId?: string | null; title: string; dueDate: string; status?: MilestoneStatus }) {
  const status: MilestoneStatus = input.status && MILESTONE_STATUSES.includes(input.status) ? input.status : "upcoming";
  insertMilestones([{ planId: input.planId ?? null, title: input.title, dueDate: input.dueDate, status }]);
  return true;
}

export function updateMilestone(id: string, status: MilestoneStatus) {
  if (!MILESTONE_STATUSES.includes(status)) return false;
  const result = getDb().prepare("UPDATE plan_milestones SET status=? WHERE id=?").run(status, id);
  return result.changes > 0;
}

export function deleteMilestone(id: string) {
  getDb().prepare("DELETE FROM plan_milestones WHERE id=?").run(id);
}

type SeedPlan = {
  code: string; title: string; owner: string; team: string; status: PlanStatus;
  start: string; end: string; progress: number; tasksDone: number; tasksTotal: number; tags: string[];
  phases: { name: string; start: string; end: string; status: PhaseStatus }[];
};

