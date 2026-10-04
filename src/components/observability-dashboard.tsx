"use client";

import { useState } from "react";
import { LineChart, Plus, Pencil, Search, Activity, ShieldCheck } from "lucide-react";
import { useRecordComposer } from "@/components/records/record-composer";
import { RecordStatus } from "@/components/records/record-status";
import { matchesSearch, metricText, useRecords } from "@/components/records/use-records";

function tone(status: string) {
  if (status === "critical") return "bad";
  if (status === "warning") return "warn";
  return "good";
}

export function ObservabilityDashboard() {
  const [search, setSearch] = useState("");
  const state = useRecords("observability-metric");
  const { composer, openNew, openEdit } = useRecordComposer("observability-metric", state);
  const filtered = state.records.filter(record => matchesSearch(record, search, [record.metrics.value, record.metrics.source]));

  const alerts = state.records.filter(record => record.status !== "ok").length;

  return (
    <div className="repos-dashboard">
      {composer}
      <div className="repos-header">
        <div className="repos-title">
          <h2>Observability & Metrics</h2>
          <p>Track the telemetry signals and alerts that matter to this workspace.</p>
        </div>
        <div className="repos-actions">
          <div className="repos-search">
            <Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search signals..." aria-label="Search telemetry signals"/>
          </div>
          <button className="primary-button" onClick={openNew}><Plus size={14}/> Add signal</button>
        </div>
      </div>

      {state.records.length > 0 && (
        <div className="test-overview">
          <div className="test-metric-card">
            <span>Tracked Signals</span>
            <strong>{state.records.length}</strong>
            <Activity size={16} className="text-mint"/>
          </div>
          <div className="test-metric-card">
            <span>Healthy</span>
            <strong className="text-green">{state.records.length - alerts}</strong>
            <ShieldCheck size={16} className="text-green"/>
          </div>
          <div className="test-metric-card">
            <span>Needs Attention</span>
            <strong style={{color: alerts > 0 ? '#e7cf9e' : undefined}}>{alerts}</strong>
            <LineChart size={16} style={{color: '#e7cf9e'}}/>
          </div>
        </div>
      )}

      <RecordStatus
        loading={state.loading}
        error={state.error}
        count={state.records.length}
        noun="telemetry signals"
        icon={LineChart}
        emptyTitle="No telemetry recorded"
        emptyBody="Add the metrics and alerts you watch — latency, throughput, error budgets — and they stay on this dashboard."
      />

      <div className="pr-list">
        {filtered.map(record => (
          <article key={record.id} className="pr-row">
            <div className="pr-icon"><LineChart size={16} className="text-mint" /></div>
            <div className="pr-main">
              <div className="pr-title-row">
                <strong>{record.title}</strong>
                <span className="pr-badge" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'var(--muted)'}}>{metricText(record, "source", "manual")}</span>
              </div>
              {metricText(record, "detail", "") !== "" && <div className="pr-meta"><span>{metricText(record, "detail")}</span></div>}
            </div>
            <div className="pr-stats">
              <div className="pr-stat"><strong>{metricText(record, "value", "—")}</strong></div>
              <button
                className="record-status-cycle"
                data-tone={tone(record.status)}
                title="Cycle health"
                onClick={() => void state.setStatus(record, record.status === "ok" ? "warning" : record.status === "warning" ? "critical" : "ok")}
              >
                {record.status}
              </button>
              <button className="record-row-action" onClick={() => openEdit(record)} aria-label="Edit signal"><Pencil size={13}/></button>
            </div>
          </article>
        ))}
      </div>

      {state.records.length > 0 && filtered.length === 0 && (
        <div className="activity-empty" style={{ marginTop: '40px' }}>
          <div className="activity-pulse"><LineChart size={16}/></div>
          <div><strong>No signals found</strong><p>Try a different search term.</p></div>
        </div>
      )}
    </div>
  );
}