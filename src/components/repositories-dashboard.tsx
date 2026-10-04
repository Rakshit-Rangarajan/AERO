"use client";

import { useState } from "react";
import { GitBranch, GitPullRequest, Search, Star, FolderGit2, Plus, Pencil } from "lucide-react";
import { useRecordComposer } from "@/components/records/record-composer";
import { RecordStatus } from "@/components/records/record-status";
import { matchesSearch, metricFlag, metricNumber, metricText, relativeTime, useRecords } from "@/components/records/use-records";

export function RepositoriesDashboard() {
  const [search, setSearch] = useState("");
  const state = useRecords("repository");
  const { composer, openNew, openEdit } = useRecordComposer("repository", state);
  const filtered = state.records.filter(record => matchesSearch(record, search, [record.metrics.language]));

  return (
    <div className="repos-dashboard">
      {composer}
      <div className="repos-header">
        <div className="repos-title">
          <h2>Engineering Repositories</h2>
          <p>Manage, search, and analyze your connected codebases.</p>
        </div>
        <div className="repos-actions">
          <div className="repos-search">
            <Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search repositories..." aria-label="Search repos"/>
          </div>
          <button className="primary-button" onClick={openNew}><Plus size={14}/> Connect Repository</button>
        </div>
      </div>

      <RecordStatus
        loading={state.loading}
        error={state.error}
        count={state.records.length}
        noun="repositories"
        icon={FolderGit2}
        emptyTitle="No repositories connected"
        emptyBody="Add a repository to track its branches, pull requests and language mix."
      />

      <div className="repos-grid">
        {filtered.map(record => (
          <article key={record.id} className="repo-card">
            <div className="repo-card-top">
              <div className="repo-icon"><FolderGit2 size={16} /></div>
              <div className="repo-name">
                <span>{record.subtitle ? `${record.subtitle} /` : ""}</span>
                <strong>{record.title}</strong>
                {metricFlag(record, "isPrivate") && <span className="repo-badge">Private</span>}
              </div>
              <button
                className="record-row-action"
                data-active={record.starred}
                aria-label={record.starred ? "Unstar" : "Star"}
                onClick={() => void state.toggleStar(record)}
              >
                <Star size={13} fill={record.starred ? "currentColor" : "none"}/>
              </button>
            </div>

            <p className="repo-desc">{metricText(record, "description", "No description yet.")}</p>

            <div className="repo-stats">
              <div className="repo-stat" title="Active Branches"><GitBranch size={13} /> {metricNumber(record, "branches")}</div>
              <div className="repo-stat" title="Open Pull Requests"><GitPullRequest size={13} /> {metricNumber(record, "activePrs")}</div>
              <div className="repo-stat"><span className="repo-lang-dot" /> {metricText(record, "language", "Mixed")}</div>
            </div>

            <div className="repo-footer">
              <span className="repo-time">Updated {relativeTime(record.updatedAt)}</span>
              <button className="record-row-action" onClick={() => openEdit(record)} aria-label="Edit repository"><Pencil size={13}/></button>
            </div>
          </article>
        ))}
      </div>

      {!state.loading && state.records.length > 0 && filtered.length === 0 && (
        <div className="activity-empty" style={{ marginTop: '40px' }}>
          <div className="activity-pulse"><FolderGit2 size={16}/></div>
          <div><strong>No repositories found</strong><p>Try a different search term or connect a new repo.</p></div>
        </div>
      )}
    </div>
  );
}