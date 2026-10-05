import { BookOpen, FileText, Clock, Search } from "lucide-react";

export function ConfluenceDashboard() {
  return (
    <div className="knowledge-page">
      <div className="panel-heading">
        <div className="panel-title-wrap">
          <span className="panel-icon"><BookOpen size={15}/></span>
          <div>
            <h2>Confluence</h2>
            <p>Your connected documentation spaces and recent page updates.</p>
          </div>
        </div>
        <span className="status-chip"><span className="live-dot" style={{background: 'var(--mint)'}}/> SYNCED</span>
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <Search size={14} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input 
            placeholder="Search Confluence spaces and pages..." 
            style={{ width: '100%', padding: '12px 16px 12px 40px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '12px', color: 'var(--text)', outline: 'none', fontSize: '13px' }}
          />
        </div>

        <h3 style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '16px', fontWeight: 600 }}>Recently Updated Pages</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {[
            { title: "Q3 Architecture Review", space: "Engineering", author: "Ada", time: "2 hours ago" },
            { title: "API v2 Authentication Flows", space: "Product", author: "Dennis", time: "5 hours ago" },
            { title: "Incident Report: Database Failover", space: "SRE", author: "Hestia", time: "1 day ago" },
            { title: "Frontend Performance Guidelines", space: "Engineering", author: "Aphrodite", time: "2 days ago" },
            { title: "Onboarding: Local Environment Setup", space: "General", author: "Chiron", time: "3 days ago" },
            { title: "Security Audit Q2 Findings", space: "Security", author: "Cerberus", time: "1 week ago" },
          ].map((page, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '12px' }}>
              <FileText size={16} color="var(--blue)" style={{ marginTop: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{page.title}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--muted)' }}>
                  <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>{page.space}</span>
                  <span>•</span>
                  <span>Updated by {page.author}</span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={10} /> {page.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
