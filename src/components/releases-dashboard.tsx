"use client";

import { useState } from "react";
import { Tag, Search, Rocket, GitCommit, Calendar, Play, Server, Pencil, ArrowRightCircle } from "lucide-react";
import { useRecordComposer } from "@/components/records/record-composer";
import { RecordStatus } from "@/components/records/record-status";
import { matchesSearch, metricNumber, relativeTime, useRecords } from "@/components/records/use-records";

export function ReleasesDashboard() {
  const [search, setSearch] = useState("");
  const state = useRecords("release");
  const { composer, openNew, openEdit } = useRecordComposer("release", state);
  const filtered = state.records.filter(record => matchesSearch(record, search));

  return (
    <div className="repos-dashboard">
      {composer}
      <div className="repos-header">
        <div className="repos-title">
          <h2>Releases</h2>
          <p>Track deployments, release candidates, and production rollouts.</p>
        </div>
        <div className="repos-actions">
          <div className="repos-search">
            <Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search releases..." aria-label="Search releases"/>
          </div>
          <button className="primary-button" onClick={openNew}><Rocket size={14}/> Create Release</button>
        </div>
      </div>

      <RecordStatus loading={state.loading} error={state.error} count={state.records.length} noun="releases" icon={Tag}/>

      <div className="pr-list">
        {filtered.map(record => (
          <article key={record.id} className="pr-row">
            <div className="pr-icon">
              <Tag size={16} className={record.status === "deployed" ? "text-green" : record.status === "failed" ? "text-red" : "text-purple"}/>
            </div>
            <div className="pr-main">
              <div className="pr-title-row">
                <strong>{record.title}</strong>
                <span className="pr-id">{record.code}</span>
                <span className="pr-badge" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'var(--muted)'}}>{record.repo}</span>
                {record.status === "failed" && <span className="pr-badge" style={{color: '#d08b8b', border: '1px solid #573739', background: 'rgba(87,55,57,0.3)'}}>Rollback</span>}
              </div>
              <div className="pr-meta">
                {record.severity && <span><Server size={12}/> {record.severity}</span>}
                <span><Calendar size={12}/> {relativeTime(record.updatedAt)}</span>
                {record.owner && <span>by <strong>{record.owner}</strong></span>}
              </div>
            </div>
            <div className="pr-stats">
              <div className="pr-stat">
                <GitCommit size={14} /> {metricNumber(record, "commits")} commits
              </div>
              {record.status === "staging" && (
                <button className="primary-button" style={{height: '28px', fontSize: '11px', padding: '0 12px'}} onClick={() => void state.setStatus(record, "deployed")}>
                  <Play size={12}/> Deploy to Prod
                </button>
              )}
              {record.status === "deployed" && (
                <button className="record-status-cycle" data-tone="bad" title="Mark as rolled back" onClick={() => void state.setStatus(record, "failed")}>
                  <ArrowRightCircle size={12}/> Rollback
                </button>
              )}
              <button className="record-row-action" onClick={() => openEdit(record)} aria-label="Edit release">
                <Pencil size={13}/>
              </button>
            </div>
          </article>
        ))}
      </div>

      {!state.loading && state.records.length > 0 && filtered.length === 0 && (
        <div className="activity-empty" style={{ marginTop: '40px' }}>
          <div className="activity-pulse"><Tag size={16}/></div>
          <div><strong>No releases found</strong><p>Try a different search term.</p></div>
        </div>
      )}
    </div>
  );
}