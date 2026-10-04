"use client";

import { useState } from "react";
import { Search, MessageSquare, Check, X, ShieldAlert, AlertTriangle, GitPullRequest, Code, Pencil, Plus, CheckCircle2 } from "lucide-react";
import { useRecordComposer } from "@/components/records/record-composer";
import { RecordStatus } from "@/components/records/record-status";
import { matchesSearch, metricNumber, useRecords } from "@/components/records/use-records";

function tone(status: string) {
  if (status === "approved") return "good";
  if (status === "changes_requested") return "bad";
  return "";
}

export function ReviewsDashboard() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pending");
  const state = useRecords("review");
  const { composer, openNew, openEdit } = useRecordComposer("review", state);

  const filtered = state.records.filter(record =>
    (filter === "all" || record.status === filter) && matchesSearch(record, search),
  );

  return (
    <div className="pr-dashboard">
      {composer}
      <div className="pr-header">
        <div className="pr-title">
          <h2>Code Reviews</h2>
          <p>Manage your pending code review requests and automated feedback.</p>
        </div>
        <div className="pr-actions">
          <div className="repos-search">
            <Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews..." aria-label="Search reviews"/>
          </div>
          <div className="pr-filters">
            <button className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>Pending</button>
            <button className={filter === "approved" ? "active" : ""} onClick={() => setFilter("approved")}>Approved</button>
            <button className={filter === "changes_requested" ? "active" : ""} onClick={() => setFilter("changes_requested")}>Changes Requested</button>
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
          </div>
          <button className="primary-button" onClick={openNew}><Plus size={14}/> New review</button>
        </div>
      </div>

      <RecordStatus
        loading={state.loading}
        error={state.error}
        count={state.records.length}
        noun="reviews"
        icon={CheckCircle2}
        emptyTitle="Review inbox is empty"
        emptyBody="Add a review request to track it here, or let your agents raise reviews from the Reviews tab."
      />

      <div className="pr-list">
        {filtered.map(record => {
          const issues = metricNumber(record, "issues");
          return (
            <article key={record.id} className="pr-row">
              <div className="pr-icon">
                {record.status === "approved" ? <CheckCircle2 size={16} className="text-green"/> :
                 record.status === "changes_requested" ? <X size={16} className="text-red"/> :
                 <MessageSquare size={16} className="text-purple" />}
              </div>
              <div className="pr-main">
                <div className="pr-title-row">
                  <strong>{record.title}</strong>
                  <span className="pr-id">{record.code}</span>
                  <span className="pr-badge" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'var(--muted)'}}>{record.repo}</span>
                  {record.severity === "high" && <span className="pr-badge" style={{color: '#d08b8b', border: '1px solid #573739', background: 'rgba(87,55,57,0.3)'}}>High Priority</span>}
                </div>
                <div className="pr-meta">
                  {record.metrics.prId && <span><GitPullRequest size={12}/> {String(record.metrics.prId)}</span>}
                  {record.owner && <span>by <strong>{record.owner}</strong></span>}
                  {record.metrics.due && <span>Due: <strong>{String(record.metrics.due)}</strong></span>}
                </div>
              </div>
              <div className="pr-stats">
                {issues > 0 && (
                  <div className="pr-stat" style={{color: '#e7cf9e'}}>
                    <AlertTriangle size={14} /> {issues} issues
                  </div>
                )}
                <div className="pr-stat">
                  <Code size={14}/> +{metricNumber(record, "additions")} -{metricNumber(record, "deletions")}
                </div>
                {record.status === "pending" ? (
                  <>
                    <button className="record-row-action" title="Approve" onClick={() => void state.setStatus(record, "approved")}><Check size={13}/></button>
                    <button className="record-row-action" title="Request changes" onClick={() => void state.setStatus(record, "changes_requested")}><X size={13}/></button>
                  </>
                ) : (
                  <button className="record-status-cycle" data-tone={tone(record.status)} title="Reopen review" onClick={() => void state.setStatus(record, "pending")}>
                    {record.status.replace("_", " ")}
                  </button>
                )}
                <button className="record-row-action" onClick={() => openEdit(record)} aria-label="Edit review"><Pencil size={13}/></button>
              </div>
            </article>
          );
        })}
      </div>

      {!state.loading && state.records.length > 0 && filtered.length === 0 && (
        <div className="activity-empty" style={{ marginTop: '40px' }}>
          <div className="activity-pulse"><ShieldAlert size={16} className="text-green"/></div>
          <div>
            <strong>Inbox Zero!</strong>
            <p>You have no code reviews matching these filters.</p>
          </div>
        </div>
      )}
    </div>
  );
}