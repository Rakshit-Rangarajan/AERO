"use client";

import { ShieldCheck, ShieldAlert, AlertTriangle, Key, Plus, Pencil, Search } from "lucide-react";
import { useState } from "react";
import { useRecordComposer } from "@/components/records/record-composer";
import { RecordStatus } from "@/components/records/record-status";
import { matchesSearch, metricText, relativeTime, useRecords } from "@/components/records/use-records";

function severityTone(severity: string) {
  if (severity === "critical" || severity === "high") return "bad";
  if (severity === "medium") return "warn";
  return "";
}

export function SecurityDashboard() {
  const [search, setSearch] = useState("");
  const state = useRecords("security-finding");
  const { composer, openNew, openEdit } = useRecordComposer("security-finding", state);
  const filtered = state.records.filter(record => matchesSearch(record, search, [record.metrics.detail]));

  const critical = state.records.filter(record => record.severity === "critical" && record.status !== "resolved").length;
  const openFindings = state.records.filter(record => record.status === "open").length;
  const secretFindings = state.records.filter(record => record.metrics.source === "secret" && record.status !== "resolved").length;

  return (
    <div className="repos-dashboard">
      {composer}
      <div className="repos-header">
        <div className="repos-title">
          <h2>Security & Compliance</h2>
          <p>Vulnerability scanning, dependency audits, and secret detection.</p>
        </div>
        <div className="repos-actions">
          <div className="repos-search">
            <Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search findings..." aria-label="Search findings"/>
          </div>
          <button className="primary-button" onClick={openNew}><Plus size={14}/> Record finding</button>
        </div>
      </div>

      <div className="test-overview">
        <div className="test-metric-card">
          <span>Critical Vulnerabilities</span>
          <strong style={{color: critical > 0 ? '#d08b8b' : undefined}}>{critical}</strong>
          <ShieldAlert size={16} className="text-red"/>
        </div>
        <div className="test-metric-card">
          <span>Open Findings</span>
          <strong style={{color: '#e7cf9e'}}>{openFindings}</strong>
          <AlertTriangle size={16} style={{color: '#e7cf9e'}}/>
        </div>
        <div className="test-metric-card">
          <span>Exposed Secrets</span>
          <strong className={secretFindings > 0 ? "text-red" : "text-green"}>{secretFindings}</strong>
          <Key size={16} className={secretFindings > 0 ? "text-red" : "text-green"}/>
        </div>
      </div>

      <RecordStatus
        loading={state.loading}
        error={state.error}
        count={state.records.length}
        noun="security findings"
        icon={ShieldCheck}
        emptyTitle="No findings recorded"
        emptyBody="Nothing is tracked yet. Record scanner output and dependency advisories here so the risk stays visible."
      />

      <div className="pr-list">
        {filtered.map(record => (
          <article key={record.id} className="pr-row">
            <div className="pr-icon">
              {record.severity === "critical" || record.severity === "high" ? <ShieldAlert size={16} className="text-red"/> : <ShieldCheck size={16} className="text-green"/>}
            </div>
            <div className="pr-main">
              <div className="pr-title-row">
                <strong>{record.title}</strong>
                <span className="pr-badge" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'var(--muted)'}}>{record.repo}</span>
                <span className="pr-badge" style={{background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--line)', color: '#a0acb3'}}>{metricText(record, "source", "manual")}</span>
              </div>
              <div className="pr-meta">
                <span>Reported {relativeTime(record.updatedAt)}</span>
              </div>
              {metricText(record, "detail", "") !== "" && <div className="pr-meta"><span>{metricText(record, "detail")}</span></div>}
            </div>
            <div className="pr-stats">
              <button
                className="record-status-cycle"
                data-tone={severityTone(record.severity)}
                title="Cycle severity"
                onClick={() => {
                  const order = ["critical", "high", "medium", "low"];
                  const next = order[(order.indexOf(record.severity) + 1) % order.length];
                  void state.update(record.id, { severity: next });
                }}
              >
                {record.severity || "unrated"}
              </button>
              <button
                className="record-status-cycle"
                data-tone={record.status === "resolved" ? "good" : record.status === "mitigated" ? "warn" : "bad"}
                title="Cycle status"
                onClick={() => void state.setStatus(record, record.status === "open" ? "mitigated" : record.status === "mitigated" ? "resolved" : "open")}
              >
                {record.status}
              </button>
              <button className="record-row-action" onClick={() => openEdit(record)} aria-label="Edit finding"><Pencil size={13}/></button>
            </div>
          </article>
        ))}
      </div>

      {state.records.length > 0 && filtered.length === 0 && (
        <div className="activity-empty" style={{ marginTop: '40px' }}>
          <div className="activity-pulse"><ShieldCheck size={16}/></div>
          <div><strong>No findings found</strong><p>Try a different search term.</p></div>
        </div>
      )}
      {!state.loading && openFindings === 0 && state.records.length > 0 && (
        <div className="activity-empty" style={{ marginTop: '24px' }}>
          <div className="activity-pulse"><ShieldCheck size={16}/></div>
          <div>
            <strong>All tracked findings are closed</strong>
            <p>Nothing open across {state.records.length} recorded finding{state.records.length === 1 ? "" : "s"}.</p>
          </div>
        </div>
      )}
    </div>
  );
}