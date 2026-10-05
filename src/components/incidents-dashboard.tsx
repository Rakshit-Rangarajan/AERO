"use client";

import { AlertTriangle, ShieldAlert, PhoneCall, Clock, CheckCircle2, Plus, Pencil } from "lucide-react";
import { useDemoMode } from "@/lib/demo-mode";
import { useRecordComposer } from "@/components/records/record-composer";
import { useRecords } from "@/components/records/use-records";

export function IncidentsDashboard() {
  const { isDemo } = useDemoMode();
  const state = useRecords("incident");
  const { composer, openNew, openEdit } = useRecordComposer("incident", state);

  const mockActive = [
    { sev: "SEV-2", title: "High Database Latency in EU-West", time: "Started 14 minutes ago", detail: "Impacting ~5% of read queries", update: "Scaling up read replicas in eu-west-1. Investigating a potential bad query plan introduced in the last deployment." }
  ];
  const mockPm = [
    { sev: "SEV-1", title: "Global Login Outage due to Expired TLS Certificate", date: "Oct 1, 2026", status: "Action items pending", color: "var(--red)" },
    { sev: "SEV-3", title: "Search indexing delay in staging environment", date: "Sep 28, 2026", status: "Resolved", color: "var(--blue)" },
    { sev: "SEV-2", title: "Memory leak in node-worker cluster", date: "Sep 20, 2026", status: "Resolved", color: "var(--orange)" }
  ];

  const dbActive = state.records.filter(r => r.status === 'investigating' || r.status === 'mitigated').map(r => ({
    id: r.id, record: r,
    sev: r.metrics.severity === 'high' ? 'SEV-1' : r.metrics.severity === 'medium' ? 'SEV-2' : 'SEV-3',
    title: r.title,
    time: "Ongoing",
    detail: r.subtitle || "No service specified",
    update: r.notes || "No notes"
  }));

  const dbPm = state.records.filter(r => r.status === 'resolved').map(r => ({
    id: r.id, record: r,
    sev: r.metrics.severity === 'high' ? 'SEV-1' : r.metrics.severity === 'medium' ? 'SEV-2' : 'SEV-3',
    title: r.title,
    date: new Date().toLocaleDateString(),
    status: "Resolved",
    color: r.metrics.severity === 'high' ? "var(--red)" : r.metrics.severity === 'medium' ? "var(--orange)" : "var(--blue)"
  }));

  const active = isDemo ? mockActive : dbActive;
  const pms = isDemo ? mockPm : dbPm;

  return (
    <div className="knowledge-page">
      {composer}
      <div className="panel-heading">
        <div className="panel-title-wrap">
          <span className="panel-icon"><ShieldAlert size={15}/></span>
          <div>
            <h2>Incident Management</h2>
            <p>Active incidents, on-call schedules, and post-mortem tracking.</p>
          </div>
        </div>
        <div className="panel-tools">
          <button className="primary-button" onClick={() => openNew()} style={{fontSize: '11px', padding: '6px 12px'}}>+ Report Incident</button>
        </div>
      </div>

      {!isDemo && active.length === 0 && pms.length === 0 ? (
        <div className="activity-empty" style={{ margin: '0 24px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '16px', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '16px' }}>
          <span className="activity-pulse" style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)' }}><ShieldAlert size={24} color="var(--muted)"/></span>
          <div>
            <strong style={{ fontSize: '16px', color: 'var(--text)' }}>No Incidents</strong>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px', maxWidth: '300px' }}>Your services are healthy. Report an incident to track mitigation and resolution.</p>
          </div>
          <button className="primary-button" onClick={() => openNew()} style={{ marginTop: '12px' }}>Report Incident</button>
        </div>
      ) : (
        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <PhoneCall size={14} color="var(--mint)" />
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em' }}>PRIMARY ON-CALL</span>
              </div>
              <strong style={{ fontSize: '16px', color: 'var(--text)', display: 'block' }}>{isDemo ? "Hestia" : "Unassigned"}</strong>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{isDemo ? "DevOps Engineer" : "Configure PagerDuty to sync on-call"}</span>
            </div>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <PhoneCall size={14} color="var(--blue)" />
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em' }}>SECONDARY (ESCALATION)</span>
              </div>
              <strong style={{ fontSize: '16px', color: 'var(--text)', display: 'block' }}>{isDemo ? "Gwynne" : "Unassigned"}</strong>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{isDemo ? "VP of Engineering" : "Configure PagerDuty to sync escalation"}</span>
            </div>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Clock size={14} color="var(--muted)" />
                <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em' }}>MTTR (LAST 30 DAYS)</span>
              </div>
              <strong style={{ fontSize: '24px', color: 'var(--text)', display: 'block' }}>{isDemo ? "42m" : "0m"}</strong>
              <span style={{ fontSize: '12px', color: 'var(--mint)' }}>{isDemo ? "↓ 15% from last month" : "No recent incidents"}</span>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '16px', fontWeight: 600 }}>Active Incidents</h3>
            {active.length === 0 ? <p style={{fontSize: '13px', color: 'var(--muted)'}}>No active incidents right now.</p> : active.map((inc, i) => (
              <div key={('id' in inc ? inc.id : i) as string | number} style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '12px' }}>
                <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                  <AlertTriangle size={20} color="var(--red)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', background: 'var(--red)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{inc.sev}</span>
                        <strong style={{ fontSize: '15px', color: 'var(--text)' }}>{inc.title}</strong>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{inc.time} • {inc.detail}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!isDemo && 'record' in inc && <button className="icon-button" onClick={() => openEdit(inc.record as any)}><Pencil size={14}/></button>}
                      <button className="primary-button" onClick={() => window.dispatchEvent(new CustomEvent("aero:navigate", { detail: "Command center" }))} style={{ background: 'var(--red)', color: 'white', fontSize: '11px', padding: '6px 12px' }}>Join War Room</button>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text)', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <strong>Latest update:</strong> {inc.update}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h3 style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '16px', fontWeight: 600 }}>Recent Post-Mortems</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pms.length === 0 ? <p style={{fontSize: '13px', color: 'var(--muted)'}}>No resolved incidents found.</p> : pms.map((pm, i) => (
                <div key={('id' in pm ? pm.id : i) as string | number} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <CheckCircle2 size={16} color="var(--muted)" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', color: pm.color, padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{pm.sev}</span>
                      <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{pm.title}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: 'var(--muted)' }}>
                    <span>{pm.status}</span>
                    <span>{pm.date}</span>
                    {!isDemo && 'record' in pm && <button className="icon-button" onClick={() => openEdit(pm.record as any)}><Pencil size={14}/></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
