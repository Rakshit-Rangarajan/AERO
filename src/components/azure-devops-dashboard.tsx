"use client";

import { useDemoMode } from "@/lib/demo-mode";
import { Cloud, GitBranch, TerminalSquare, GitCommit, CheckCircle2 } from "lucide-react";

export function AzureDevOpsDashboard() {
  const { isDemo } = useDemoMode();

  return (
    <div className="knowledge-page">
      <div className="panel-heading">
        <div className="panel-title-wrap">
          <span className="panel-icon"><Cloud size={15}/></span>
          <div>
            <h2>Azure DevOps</h2>
            <p>Live status of your ADO repositories, pipelines, and boards.</p>
          </div>
        </div>
        <span className="status-chip">{isDemo ? <><span className="live-dot" style={{background: 'var(--mint)'}}/> SYNCED</> : <><span className="live-dot" style={{background: 'var(--muted)'}}/> NOT CONFIGURED</>}</span>
      </div>
      
      {!isDemo ? (
        <div className="activity-empty" style={{ margin: '0 24px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '16px', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '16px' }}>
          <span className="activity-pulse" style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)' }}><Cloud size={24} color="var(--muted)"/></span>
          <div>
            <strong style={{ fontSize: '16px', color: 'var(--text)' }}>Azure DevOps not connected</strong>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px', maxWidth: '300px' }}>Connect your Azure DevOps organization in Settings to sync pipelines and repos.</p>
          </div>
          <button className="primary-button" onClick={() => window.dispatchEvent(new CustomEvent("aero:navigate", { detail: "Settings" }))} style={{ marginTop: '12px' }}>Connect Azure DevOps</button>
        </div>
      ) : (
        <div className="dashboard-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '0 24px', marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-header"><GitBranch size={14}/><span>Active PRs</span></div>
            <div className="metric-value">12</div>
          </div>
          <div className="metric-card">
            <div className="metric-header"><TerminalSquare size={14}/><span>Pipelines</span></div>
            <div className="metric-value">4 Running</div>
          </div>
          <div className="metric-card">
            <div className="metric-header"><GitCommit size={14}/><span>Deployments</span></div>
            <div className="metric-value">24 Today</div>
          </div>
          <div className="metric-card">
            <div className="metric-header"><CheckCircle2 size={14}/><span>Success Rate</span></div>
            <div className="metric-value">98.5%</div>
          </div>
        </div>
      )}
    </div>
  );
}
