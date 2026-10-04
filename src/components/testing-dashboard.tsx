"use client";

import { useState } from "react";
import { Beaker, Search, CheckCircle2, XCircle, Clock, ShieldAlert, BarChart, Plus, Pencil } from "lucide-react";
import { useRecordComposer } from "@/components/records/record-composer";
import { RecordStatus } from "@/components/records/record-status";
import { matchesSearch, metricNumber, metricText, relativeTime, useRecords } from "@/components/records/use-records";

export function TestingDashboard() {
  const [search, setSearch] = useState("");
  const state = useRecords("test-run");
  const { composer, openNew, openEdit } = useRecordComposer("test-run", state);
  const filtered = state.records.filter(record => matchesSearch(record, search, [record.severity]));

  const totals = state.records.reduce((acc, record) => ({
    total: acc.total + metricNumber(record, "total"),
    passed: acc.passed + metricNumber(record, "passed"),
    failed: acc.failed + metricNumber(record, "failed"),
  }), { total: 0, passed: 0, failed: 0 });
  const passRate = totals.total > 0 ? ((totals.passed / totals.total) * 100).toFixed(1) : "—";
  const failedRuns = state.records.filter(record => record.status === "failed").length;

  return (
    <div className="repos-dashboard">
      {composer}
      <div className="repos-header">
        <div className="repos-title">
          <h2>Testing & CI/CD</h2>
          <p>Track automated test suites, coverage, and build health.</p>
        </div>
        <div className="repos-actions">
          <div className="repos-search">
            <Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search test runs..." aria-label="Search test runs"/>
          </div>
          <button className="primary-button" onClick={openNew}><Plus size={14}/> Record run</button>
        </div>
      </div>

      {state.records.length > 0 && (
        <div className="test-overview">
          <div className="test-metric-card">
            <span>Pass Rate</span>
            <strong>{passRate}{passRate === "—" ? "" : "%"}</strong>
            <BarChart size={16} className="text-green"/>
          </div>
          <div className="test-metric-card">
            <span>Test Suites</span>
            <strong>{state.records.length}</strong>
            <Beaker size={16} className="text-mint"/>
          </div>
          <div className="test-metric-card">
            <span>Failed Runs</span>
            <strong className={failedRuns > 0 ? "text-red" : undefined}>{failedRuns}</strong>
            <ShieldAlert size={16} className="text-red"/>
          </div>
        </div>
      )}

      <RecordStatus
        loading={state.loading}
        error={state.error}
        count={state.records.length}
        noun="test runs"
        icon={Beaker}
        emptyTitle="No test runs recorded"
        emptyBody="Record CI results here to build up pass rates and failure history for this workspace."
      />

      <div className="pr-list">
        {filtered.map(record => (
          <article key={record.id} className="pr-row">
            <div className="pr-icon">
              {record.status === "failed" ? <XCircle size={16} className="text-red"/> : <CheckCircle2 size={16} className="text-green"/>}
            </div>
            <div className="pr-main">
              <div className="pr-title-row">
                <strong>{record.title}</strong>
                <span className="pr-id">{record.code}</span>
                <span className="pr-badge" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'var(--muted)'}}>{record.repo}</span>
                {record.severity && <span className="pr-badge" style={{background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--line)', color: '#a0acb3'}}>{record.severity}</span>}
              </div>
              <div className="pr-meta">
                <span><Clock size={12}/> Finished {relativeTime(record.updatedAt)}</span>
                <span>Duration: <strong>{metricText(record, "duration", "—")}</strong></span>
              </div>
            </div>
            <div className="pr-stats">
              <div className="pr-stat" title="Total Tests"><Beaker size={14}/> {metricNumber(record, "total")}</div>
              <div className="pr-stat" title="Passed"><CheckCircle2 size={14} className="text-green"/> {metricNumber(record, "passed")}</div>
              {metricNumber(record, "failed") > 0 && (
                <div className="pr-stat" title="Failed"><XCircle size={14} className="text-red"/> {metricNumber(record, "failed")}</div>
              )}
              <button
                className="record-status-cycle"
                data-tone={record.status === "failed" ? "bad" : "good"}
                title="Toggle result"
                onClick={() => void state.setStatus(record, record.status === "failed" ? "passed" : "failed")}
              >
                {record.status}
              </button>
              <button className="record-row-action" onClick={() => openEdit(record)} aria-label="Edit test run"><Pencil size={13}/></button>
            </div>
          </article>
        ))}
      </div>

      {!state.loading && state.records.length > 0 && filtered.length === 0 && (
        <div className="activity-empty" style={{ marginTop: '40px' }}>
          <div className="activity-pulse"><Beaker size={16}/></div>
          <div><strong>No test runs found</strong><p>Try changing your search filters.</p></div>
        </div>
      )}
    </div>
  );
}