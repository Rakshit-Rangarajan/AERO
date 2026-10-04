"use client";

import { useState } from "react";
import { GitPullRequest, Search, CheckCircle2, XCircle, Clock, MessageSquare, GitMerge, FileDiff, FolderGit2, Ticket, Pencil, Star, Plus } from "lucide-react";
import { useRecordComposer } from "@/components/records/record-composer";
import { RecordStatus } from "@/components/records/record-status";
import { matchesSearch, metricFlag, metricNumber, relativeTime, useRecords } from "@/components/records/use-records";
import type { WorkspaceRecord } from "@/lib/record-schemas";

function statusTone(status: string) {
  if (status === "merged") return "good";
  if (status === "closed") return "bad";
  return "";
}

export function PullRequestsDashboard() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("open");
  const [groupBy, setGroupBy] = useState<"repo" | "ticket">("repo");
  const state = useRecords("pull-request");
  const { composer, openNew, openEdit } = useRecordComposer("pull-request", state);

  const filtered = state.records.filter(record => {
    const ticket = String(record.metrics.ticket ?? record.severity ?? "");
    return (filter === "all" || record.status === filter) && matchesSearch(record, search, [ticket]);
  });

  const grouped = filtered.reduce<Record<string, WorkspaceRecord[]>>((acc, record) => {
    const key = groupBy === "repo" ? record.repo || record.subtitle || "unassigned" : String(record.metrics.ticket ?? record.severity ?? "unticketed");
    (acc[key] ??= []).push(record);
    return acc;
  }, {});

  return (
    <div className="pr-dashboard">
      {composer}
      <div className="pr-header">
        <div className="pr-title">
          <h2>Pull Requests</h2>
          <p>Review, merge, and track code changes across connected repositories.</p>
        </div>
        <div className="pr-actions">
          <div className="repos-search">
            <Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pull requests..." aria-label="Search pull requests"/>
          </div>
          <select className="pr-group-select" value={groupBy} onChange={e => setGroupBy(e.target.value as "repo" | "ticket")} aria-label="Group by">
            <option value="repo">Group by: Repository</option>
            <option value="ticket">Group by: Jira Ticket</option>
          </select>
          <div className="pr-filters">
            <button className={filter === "open" ? "active" : ""} onClick={() => setFilter("open")}>Open</button>
            <button className={filter === "merged" ? "active" : ""} onClick={() => setFilter("merged")}>Merged</button>
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
          </div>
          <button className="primary-button" onClick={openNew}><Plus size={14}/> New pull request</button>
        </div>
      </div>

      <RecordStatus
        loading={state.loading}
        error={state.error}
        count={state.records.length}
        noun="pull requests"
        icon={GitPullRequest}
        emptyTitle="No pull requests tracked"
        emptyBody="Add the pull requests this workspace should follow. They persist between restarts."
      />

      <div className="pr-list-grouped">
        {Object.keys(grouped).sort().map(groupName => (
          <div key={groupName} className="pr-repo-group">
            <div className="pr-repo-header">
              {groupBy === "repo" ? <FolderGit2 size={15} /> : <Ticket size={15} />}
              <h3>{groupName}</h3>
              <span className="pr-repo-count">{grouped[groupName].length} PRs</span>
            </div>
            <div className="pr-list">
              {grouped[groupName].map(record => (
                <article key={record.id} className="pr-row">
                  <div className="pr-icon">
                    {record.status === "merged" ? <GitMerge size={16} className="text-purple" /> :
                     record.status === "closed" ? <XCircle size={16} className="text-red" /> :
                     <GitPullRequest size={16} className="text-green" />}
                  </div>
                  <div className="pr-main">
                    <div className="pr-title-row">
                      <strong>{record.title}</strong>
                      <span className="pr-id">{record.code}</span>
                      {groupBy === "ticket" && <span className="pr-badge" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'var(--muted)'}}>{record.repo}</span>}
                      {metricFlag(record, "approved") && <span className="pr-badge approved"><CheckCircle2 size={12}/> Approved</span>}
                    </div>
                    <div className="pr-meta">
                      <span><Clock size={12}/> Updated {relativeTime(record.updatedAt)}</span>
                      {record.owner && <span>by <strong>{record.owner}</strong></span>}
                    </div>
                  </div>
                  <div className="pr-stats">
                    <div className="pr-stat">
                      <FileDiff size={14}/>
                      <span className="text-green">+{metricNumber(record, "additions")}</span>
                      <span className="text-red">-{metricNumber(record, "deletions")}</span>
                    </div>
                    <div className="pr-stat">
                      <MessageSquare size={14}/> {metricNumber(record, "comments")}
                    </div>
                    <button
                      className="record-status-cycle"
                      data-tone={statusTone(record.status)}
                      title="Advance status"
                      onClick={() => void state.setStatus(record, record.status === "open" ? "merged" : record.status === "merged" ? "closed" : "open")}
                    >
                      {record.status}
                    </button>
                    <button className="record-row-action" data-active={record.starred} onClick={() => void state.toggleStar(record)} aria-label="Star">
                      <Star size={13} fill={record.starred ? "currentColor" : "none"}/>
                    </button>
                    <button className="record-row-action" onClick={() => openEdit(record)} aria-label="Edit pull request">
                      <Pencil size={13}/>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!state.loading && state.records.length > 0 && filtered.length === 0 && (
        <div className="activity-empty" style={{ marginTop: '40px' }}>
          <div className="activity-pulse"><GitPullRequest size={16}/></div>
          <div>
            <strong>No pull requests found</strong>
            <p>Try changing your filters or searching differently.</p>
          </div>
        </div>
      )}
    </div>
  );
}