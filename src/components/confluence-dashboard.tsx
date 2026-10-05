"use client";

import { useDemoMode } from "@/lib/demo-mode";
import { BookOpen, FileText, CheckCircle2 } from "lucide-react";

export function ConfluenceDashboard() {
  const { isDemo } = useDemoMode();

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
        <span className="status-chip">{isDemo ? <><span className="live-dot" style={{background: 'var(--mint)'}}/> SYNCED</> : <><span className="live-dot" style={{background: 'var(--muted)'}}/> NOT CONFIGURED</>}</span>
      </div>

      {!isDemo ? (
        <div className="activity-empty" style={{ margin: '0 24px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '16px', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '16px' }}>
          <span className="activity-pulse" style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)' }}><BookOpen size={24} color="var(--muted)"/></span>
          <div>
            <strong style={{ fontSize: '16px', color: 'var(--text)' }}>Confluence not connected</strong>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px', maxWidth: '300px' }}>Connect your Atlassian account in Settings to sync documentation spaces.</p>
          </div>
          <button className="primary-button" onClick={() => window.dispatchEvent(new CustomEvent("aero:navigate", { detail: "Settings" }))} style={{ marginTop: '12px' }}>Connect Confluence</button>
        </div>
      ) : (
        <div style={{ padding: '0 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileText size={16} color="var(--blue)" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--text)' }}>Engineering Onboarding Guide</strong>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Updated 2 hours ago by Architecture Team</span>
                </div>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--mint)', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12}/> Published</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
