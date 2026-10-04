"use client";

import { useState } from "react";
import { Terminal, Play, Square, Code2, Box, Cpu, Clock, RefreshCw, GitBranch, Search, Pencil } from "lucide-react";
import { useRecordComposer } from "@/components/records/record-composer";
import { RecordStatus } from "@/components/records/record-status";
import { matchesSearch, metricText, useRecords } from "@/components/records/use-records";

export function DevelopmentDashboard() {
  const [search, setSearch] = useState("");
  const state = useRecords("dev-environment");
  const { composer, openNew, openEdit } = useRecordComposer("dev-environment", state);
  const filtered = state.records.filter(record => matchesSearch(record, search));

  return (
    <div className="repos-dashboard">
      {composer}
      <div className="repos-header">
        <div className="repos-title">
          <h2>Development Environments</h2>
          <p>Track local runtimes, containers, and the workspaces you have open.</p>
        </div>
        <div className="repos-actions">
          <div className="repos-search">
            <Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search environments..." aria-label="Search environments"/>
          </div>
          <button className="primary-button" onClick={openNew}><Terminal size={14}/> Register environment</button>
        </div>
      </div>

      <RecordStatus
        loading={state.loading}
        error={state.error}
        count={state.records.length}
        noun="development environments"
        icon={Terminal}
        emptyTitle="No development environments"
        emptyBody="Register the workspaces you run locally so their runtime, port and branch stay visible."
      />

      <div className="dev-grid">
        {filtered.map(record => (
          <article key={record.id} className="dev-card">
            <div className="dev-card-top">
              <div className="dev-icon">
                {record.subtitle.toLowerCase().includes("docker") ? <Box size={16} /> : <Code2 size={16} />}
              </div>
              <div className="dev-name">
                <strong>{record.title}</strong>
                <span className="dev-type">{record.subtitle}</span>
              </div>
              <div className="dev-actions">
                <button
                  className={record.status === "running" ? "icon-button text-red" : "icon-button text-green"}
                  aria-label={record.status === "running" ? "Stop" : "Start"}
                  title={record.status === "running" ? "Mark stopped" : "Mark running"}
                  onClick={() => void state.setStatus(record, record.status === "running" ? "stopped" : "running")}
                >
                  {record.status === "running" ? <Square size={13} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                </button>
                <button className="icon-button" onClick={() => openEdit(record)} aria-label="Edit environment"><Pencil size={14} /></button>
              </div>
            </div>

            <div className="dev-status-row">
              <span className={`dev-status-badge ${record.status === "running" ? "running" : "stopped"}`}>
                <span className="status-dot" />
                {(record.status || "unknown").toUpperCase()}
              </span>
              {metricText(record, "port", "") !== "" && <span className="dev-port">localhost:{metricText(record, "port")}</span>}
            </div>

            <div className="dev-metrics">
              <div className="dev-metric" title="Active Branch"><GitBranch size={13}/> {metricText(record, "branch", "—")}</div>
              <div className="dev-metric" title="CPU Usage"><Cpu size={13}/> {metricText(record, "cpu", "—")}</div>
              <div className="dev-metric" title="Memory Usage"><RefreshCw size={13}/> {metricText(record, "ram", "—")}</div>
              <div className="dev-metric" title="Uptime"><Clock size={13}/> {metricText(record, "uptime", "—")}</div>
            </div>
          </article>
        ))}
      </div>

      {!state.loading && state.records.length > 0 && filtered.length === 0 && (
        <div className="activity-empty" style={{ marginTop: '40px' }}>
          <div className="activity-pulse"><Terminal size={16}/></div>
          <div><strong>No environments found</strong><p>Try searching for a different runtime.</p></div>
        </div>
      )}
    </div>
  );
}