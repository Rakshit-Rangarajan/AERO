import { AlertTriangle, ShieldAlert, PhoneCall, Clock, CheckCircle2 } from "lucide-react";

export function IncidentsDashboard() {
  return (
    <div className="knowledge-page">
      <div className="panel-heading">
        <div className="panel-title-wrap">
          <span className="panel-icon"><ShieldAlert size={15}/></span>
          <div>
            <h2>Incident Management</h2>
            <p>Active incidents, on-call schedules, and post-mortem tracking.</p>
          </div>
        </div>
        <span className="status-chip"><span className="live-dot" style={{background: 'var(--red)'}}/> 1 ACTIVE INCIDENT</span>
      </div>

      <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* On-Call Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <PhoneCall size={14} color="var(--mint)" />
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em' }}>PRIMARY ON-CALL</span>
            </div>
            <strong style={{ fontSize: '16px', color: 'var(--text)', display: 'block' }}>Hestia</strong>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>DevOps Engineer</span>
          </div>
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <PhoneCall size={14} color="var(--blue)" />
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em' }}>SECONDARY (ESCALATION)</span>
            </div>
            <strong style={{ fontSize: '16px', color: 'var(--text)', display: 'block' }}>Gwynne</strong>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>VP of Engineering</span>
          </div>
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Clock size={14} color="var(--muted)" />
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em' }}>MTTR (LAST 30 DAYS)</span>
            </div>
            <strong style={{ fontSize: '24px', color: 'var(--text)', display: 'block' }}>42m</strong>
            <span style={{ fontSize: '12px', color: 'var(--mint)' }}>↓ 15% from last month</span>
          </div>
        </div>

        {/* Active Incidents */}
        <div>
          <h3 style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '16px', fontWeight: 600 }}>Active Incidents</h3>
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
              <AlertTriangle size={20} color="var(--red)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', background: 'var(--red)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>SEV-2</span>
                    <strong style={{ fontSize: '15px', color: 'var(--text)' }}>High Database Latency in EU-West</strong>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Started 14 minutes ago • Impacting ~5% of read queries</span>
                </div>
                <button className="primary-button" style={{ background: 'var(--red)', color: 'white', fontSize: '11px', padding: '6px 12px' }}>Join War Room</button>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text)', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <strong>Latest update (Hestia):</strong> Scaling up read replicas in eu-west-1. Investigating a potential bad query plan introduced in the last deployment.
              </div>
            </div>
          </div>
        </div>

        {/* Recent Post-Mortems */}
        <div>
          <h3 style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '16px', fontWeight: 600 }}>Recent Post-Mortems</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { sev: "SEV-1", title: "Global Login Outage due to Expired TLS Certificate", date: "Oct 1, 2026", status: "Action items pending", color: "var(--red)" },
              { sev: "SEV-3", title: "Search indexing delay in staging environment", date: "Sep 28, 2026", status: "Resolved", color: "var(--blue)" },
              { sev: "SEV-2", title: "Memory leak in node-worker cluster", date: "Sep 20, 2026", status: "Resolved", color: "var(--orange)" }
            ].map((pm, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '12px' }}>
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
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
