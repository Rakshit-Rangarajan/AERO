"use client";

import { useState } from "react";
import { AlertOctagon, Activity, Search, ServerCrash, Cpu, Globe, Plus, Pencil, CheckCircle2 } from "lucide-react";
import { useRecordComposer } from "@/components/records/record-composer";
import { RecordStatus } from "@/components/records/record-status";
import { matchesSearch, metricNumber, metricText, relativeTime, useRecords } from "@/components/records/use-records";

export function FailureAnalysisDashboard() {
  const [search, setSearch] = useState("");
  const state = useRecords("incident");
  const { composer, openNew, openEdit } = useRecordComposer("incident", state);
  const filtered = state.records.filter(record => matchesSearch(record, search, [record.metrics.env]));

  const active = state.records.filter(record => record.status !== "resolved").length;
  const totalErrors = state.records.reduce((sum, record) => sum + metricNumber(record, "errors"), 0);
  const resolved = state.records.filter(record => record.status === "resolved").length;

  return (
    <div className="repos-dashboard">
      {composer}
      <div className="repos-header">
        <div className="repos-title">
          <h2>Failure Analysis</h2>
          <p>Investigate incidents, capture root causes, and track what has been resolved.</p>
        </div>
        <div className="repos-actions">
          <div className="repos-search">
            <Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search incidents..." aria-label="Search incidents"/>
          </div>
          <button className="primary-button bg-red text-white border-none" style={{background: '#a53737', borderColor: '#a53737'}} onClick={openNew}>
            <Plus size={14}/> Declare Incident
          </button>
        </div>
      </div>

      {state.records.length > 0 && (
        <div className="test-overview">
          <div className="test-metric-card">
            <span>Active Incidents</span>
            <strong style={{color: '#d08b8b'}}>{active}</strong>
            <AlertOctagon size={16} className="text-red"/>
          </div>
          <div className="test-metric-card">
            <span>Recorded Error Events</span>
            <strong style={{color: '#e7cf9e'}}>{totalErrors.toLocaleString()}</strong>
            <Activity size={16} style={{color: '#e7cf9e'}}/>
          </div>
          <div className="test-metric-card">
            <span>Resolved</span>
            <strong className="text-mint">{resolved}</strong>
            <CheckCircle2 size={16} className="text-mint"/>
          </div>
        </div>
      )}

      <RecordStatus
        loading={state.loading}
        error={state.error}
        count={state.records.length}
        noun="incidents"
        icon={ServerCrash}
        emptyTitle="No incidents recorded"
        emptyBody="Declare an incident here to track its impact, error volume and root cause."
      />

      <div className="pr-list">
        {filtered.map(record => (
          <article key={record.id} className="pr-row">
            <div className="pr-icon">
              {record.status === "resolved" ? <CheckCircle2 size={16} className="text-green"/> :
               record.status === "mitigated" ? <Activity size={16} style={{color: '#e7cf9e'}}/> :
               <ServerCrash size={16} className="text-red" />}
            </div>
            <div className="pr-main">
              <div className="pr-title-row">
                <strong>{record.title}</strong>
                <span className="pr-id">{record.code}</span>
                {record.severity === "high" && <span className="pr-badge" style={{color: '#d08b8b', border: '1px solid #573739', background: 'rgba(87,55,57,0.3)'}}>High Impact</span>}
              </div>
              <div className="pr-meta">
                {metricText(record, "env", "") !== "" && <span><Globe size={12}/> {metricText(record, "env")}</span>}
                <span><Cpu size={12}/> {record.subtitle}</span>
                <span>Started: <strong>{relativeTime(record.createdAt)}</strong></span>
              </div>
              {record.notes && <div className="pr-meta"><span>{record.notes}</span></div>}
            </div>
            <div className="pr-stats">
              <div className="pr-stat">
                <AlertOctagon size={14} className="text-red"/> {metricNumber(record, "errors").toLocaleString()} events
              </div>
              <button
                className="record-status-cycle"
                data-tone={record.status === "resolved" ? "good" : record.status === "mitigated" ? "warn" : "bad"}
                title="Advance status"
                onClick={() => void state.setStatus(record, record.status === "investigating" ? "mitigated" : record.status === "mitigated" ? "resolved" : "investigating")}
              >
                {record.status}
              </button>
              <button className="record-row-action" onClick={() => openEdit(record)} aria-label="Edit incident"><Pencil size={13}/></button>
            </div>
          </article>
        ))}
      </div>

      {!state.loading && state.records.length > 0 && filtered.length === 0 && (
        <div className="activity-empty" style={{ marginTop: '40px' }}>
          <div className="activity-pulse"><ServerCrash size={16}/></div>
          <div><strong>No incidents found</strong><p>Try a different search term.</p></div>
        </div>
      )}
    </div>
  );
}