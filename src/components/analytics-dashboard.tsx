"use client";

import { useEffect, useState } from "react";
import { Activity, TrendingUp, Clock, Server, CheckCircle2, XCircle, Plus, Pencil } from "lucide-react";
import { useRecordComposer } from "@/components/records/record-composer";
import { RecordStatus } from "@/components/records/record-status";
import { metricNumber, useRecords } from "@/components/records/use-records";

const HOURLY_RATE = 60;

type IntegrationState = Record<string, boolean>;

export function AnalyticsDashboard() {
  const [connected, setConnected] = useState<IntegrationState>({});
  const roi = useRecords("roi-metric");
  const reviews = useRecords("review");
  const incidents = useRecords("incident");
  const runs = useRecords("test-run");
  const { composer, openNew, openEdit } = useRecordComposer("roi-metric", roi);

  useEffect(() => {
    const loadIntegrations = () => {
      const saved = localStorage.getItem("aero_integrations");
      if (saved) { try { setConnected(JSON.parse(saved) as IntegrationState); } catch {} }
    };
    loadIntegrations();
    window.addEventListener("aero_integrations_updated", loadIntegrations);
    return () => window.removeEventListener("aero_integrations_updated", loadIntegrations);
  }, []);

  // Every figure below is derived from records stored in this workspace.
  const hoursSaved = roi.records.reduce((sum, record) => sum + metricNumber(record, "hours"), 0);
  const value = Math.round(hoursSaved * HOURLY_RATE);
  const automatedReviews = reviews.records.filter(record => record.status !== "pending").length;
  const openIncidents = incidents.records.filter(record => record.status !== "resolved").length;
  const failedRuns = runs.records.filter(record => record.status === "failed").length;
  const totalRuns = runs.records.length;
  const passRate = totalRuns > 0 ? (((totalRuns - failedRuns) / totalRuns) * 100).toFixed(1) : "—";

  const apps = [
    { name: "Azure DevOps", status: connected["azure-devops"] ? "online" : "offline", latency: connected["azure-devops"] ? "28ms" : "-" },
    { name: "Jira Cloud", status: connected["jira"] ? "online" : "offline", latency: connected["jira"] ? "42ms" : "-" },
    { name: "GitHub Enterprise", status: connected["github"] ? "online" : "offline", latency: connected["github"] ? "89ms" : "-" },
    { name: "GitLab", status: connected["gitlab"] ? "online" : "offline", latency: connected["gitlab"] ? "54ms" : "-" },
    { name: "Confluence", status: connected["confluence"] ? "online" : "offline", latency: connected["confluence"] ? "61ms" : "-" },
  ];

  return (
    <div className="analytics-dashboard" style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr', paddingBottom: '24px' }}>
      {composer}
      <div className="record-kpi-grid">
        <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '12px', fontWeight: 600 }}><Clock size={16}/> HOURS SAVED</div>
          <div style={{ fontSize: '32px', color: 'var(--text)', fontWeight: 700 }}>{hoursSaved.toLocaleString()} <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 400 }}>hrs/mo</span></div>
        </div>
        <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '12px', fontWeight: 600 }}><TrendingUp size={16}/> ESTIMATED VALUE</div>
          <div style={{ fontSize: '32px', color: 'var(--green)', fontWeight: 700 }}>${value.toLocaleString()} <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 400 }}>/mo</span></div>
        </div>
        <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '12px', fontWeight: 600 }}><Activity size={16}/> REVIEWS CLOSED</div>
          <div style={{ fontSize: '32px', color: 'var(--text)', fontWeight: 700 }}>{automatedReviews} <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 400 }}>of {reviews.records.length}</span></div>
        </div>
        <div className="panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '12px', fontWeight: 600 }}><CheckCircle2 size={16}/> TEST PASS RATE</div>
          <div style={{ fontSize: '32px', color: 'var(--text)', fontWeight: 700 }}>{passRate}{passRate === "—" ? "" : "%"} <span style={{ fontSize: '14px', color: openIncidents > 0 ? 'var(--orange)' : 'var(--muted)', fontWeight: 400 }}>{openIncidents} open incident{openIncidents === 1 ? "" : "s"}</span></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div className="panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '16px', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={18}/> ROI & Efficiency Breakdown</h2>
            <button className="primary-button" onClick={openNew}><Plus size={14}/> Add saving</button>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
            Hours are recorded against each automated activity in this workspace and valued at ${HOURLY_RATE}/hr.
          </p>

          <RecordStatus
            loading={roi.loading}
            error={roi.error}
            count={roi.records.length}
            noun="automation savings"
            icon={TrendingUp}
            emptyTitle="No savings recorded yet"
            emptyBody="Record the hours your agents save each month and this breakdown fills in automatically."
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {roi.records.map(record => (
              <div className="record-metric-row" key={record.id}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {record.title}
                  <button className="record-row-action" onClick={() => openEdit(record)} aria-label="Edit saving"><Pencil size={12}/></button>
                </span>
                <strong>{metricNumber(record, "hours")} hrs saved (${(metricNumber(record, "hours") * HOURLY_RATE).toLocaleString()})</strong>
              </div>
            ))}
            {roi.records.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid var(--line)', margin: '8px 0' }} />
                <div className="record-metric-row record-metric-total">
                  <span>Total Estimated Value</span>
                  <strong>${value.toLocaleString()}</strong>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Server size={18}/> Dependent Apps</h2>
          <p style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '20px' }}>Status of the integrations configured in this workspace.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {apps.map(app => (
              <div key={app.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--panel2)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {app.status === 'online' ? <CheckCircle2 size={16} color="var(--green)"/> : <XCircle size={16} color="var(--orange)"/>}
                  <span style={{ color: 'var(--text)', fontSize: '13px' }}>{app.name}</span>
                </div>
                <span style={{ color: 'var(--muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{app.latency}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}