"use client";

import { useState } from "react";
import { Server, Search, Globe, Cloud, Activity, Lock, Cpu, Plus, Pencil } from "lucide-react";
import { useRecordComposer } from "@/components/records/record-composer";
import { RecordStatus } from "@/components/records/record-status";
import { matchesSearch, metricNumber, metricText, useRecords } from "@/components/records/use-records";

export function EnvironmentsDashboard() {
  const [search, setSearch] = useState("");
  const state = useRecords("cloud-environment");
  const { composer, openNew, openEdit } = useRecordComposer("cloud-environment", state);
  const filtered = state.records.filter(record => matchesSearch(record, search));

  const healthy = state.records.filter(record => record.status === "healthy").length;

  return (
    <div className="repos-dashboard">
      {composer}
      <div className="repos-header">
        <div className="repos-title">
          <h2>Cloud Environments</h2>
          <p>Monitor cluster health, deployments, and infrastructure usage.</p>
        </div>
        <div className="repos-actions">
          <div className="repos-search">
            <Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search environments..." aria-label="Search cloud environments"/>
          </div>
          <button className="primary-button" onClick={openNew}><Plus size={14}/> Add environment</button>
        </div>
      </div>

      {state.records.length > 0 && (
        <div className="test-overview">
          <div className="test-metric-card">
            <span>Tracked Environments</span>
            <strong>{state.records.length}</strong>
            <Server size={16} className="text-mint"/>
          </div>
          <div className="test-metric-card">
            <span>Healthy</span>
            <strong className="text-green">{healthy}</strong>
            <Activity size={16} className="text-green"/>
          </div>
          <div className="test-metric-card">
            <span>Needs Attention</span>
            <strong style={{color: state.records.length - healthy > 0 ? '#e7cf9e' : undefined}}>{state.records.length - healthy}</strong>
            <Cpu size={16} style={{color: '#e7cf9e'}}/>
          </div>
        </div>
      )}

      <RecordStatus
        loading={state.loading}
        error={state.error}
        count={state.records.length}
        noun="cloud environments"
        icon={Server}
        emptyTitle="No cloud environments registered"
        emptyBody="Add the clusters and environments you deploy to so their health stays on this dashboard."
      />

      <div className="dev-grid">
        {filtered.map(record => {
          const degraded = record.status !== "healthy";
          return (
            <article key={record.id} className="dev-card">
              <div className="dev-card-top">
                <div className="dev-icon">
                  {record.subtitle.toLowerCase().includes("aws") ? <Cloud size={16} /> : <Server size={16} />}
                </div>
                <div className="dev-name">
                  <strong>{record.title}</strong>
                  <span className="dev-type">{record.subtitle}</span>
                </div>
                <div className="dev-actions">
                  <Lock size={14} className="text-muted"/>
                  <button className="icon-button" onClick={() => openEdit(record)} aria-label="Edit environment"><Pencil size={14} /></button>
                </div>
              </div>

              <div className="dev-status-row">
                <button
                  className={`dev-status-badge ${degraded ? "stopped" : "running"}`}
                  title="Change health"
                  onClick={() => void state.setStatus(record, degraded ? "healthy" : "degraded")}
                >
                  <span className="status-dot" style={degraded ? {background: '#e7cf9e', boxShadow: '0 0 8px #e7cf9e'} : undefined}/>
                  {(record.status || "unknown").toUpperCase()}
                </button>
                <span className="dev-port"><Globe size={12} /> {metricText(record, "version", "unversioned")}</span>
              </div>

              <div className="dev-metrics">
                <div className="dev-metric" title="Active Pods"><Activity size={13}/> {metricNumber(record, "pods")} pods</div>
                <div className="dev-metric" title="CPU Usage"><Cpu size={13}/> {metricText(record, "cpu", "—")}</div>
                <div className="dev-metric" title="Memory Usage"><Server size={13}/> {metricText(record, "memory", "—")}</div>
              </div>
            </article>
          );
        })}
      </div>

      {!state.loading && state.records.length > 0 && filtered.length === 0 && (
        <div className="activity-empty" style={{ marginTop: '40px' }}>
          <div className="activity-pulse"><Server size={16}/></div>
          <div><strong>No environments found</strong><p>Try a different search term.</p></div>
        </div>
      )}
    </div>
  );
}