import { Cloud, GitBranch, TerminalSquare, GitCommit, CheckCircle2 } from "lucide-react";

export function AzureDevOpsDashboard() {
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
        <span className="status-chip"><span className="live-dot" style={{background: 'var(--mint)'}}/> SYNCED</span>
      </div>

      <div className="dashboard-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '0 24px', marginBottom: '24px' }}>
        <div className="test-metric-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px' }}>ACTIVE REPOS</div>
          <div style={{ fontSize: '24px', color: 'var(--text)', fontWeight: 600 }}>14</div>
        </div>
        <div className="test-metric-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px' }}>PIPELINES</div>
          <div style={{ fontSize: '24px', color: 'var(--text)', fontWeight: 600 }}>8</div>
        </div>
        <div className="test-metric-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px' }}>OPEN PRs</div>
          <div style={{ fontSize: '24px', color: 'var(--text)', fontWeight: 600 }}>23</div>
        </div>
        <div className="test-metric-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px' }}>FAILED BUILDS</div>
          <div style={{ fontSize: '24px', color: 'var(--red)', fontWeight: 600 }}>1</div>
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>
        <h3 style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '16px', fontWeight: 600 }}>Recent Pipeline Executions</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { name: "core-auth-service-ci", status: "passed", time: "10 mins ago", commit: "Merge pull request #140" },
            { name: "frontend-monorepo-build", status: "passed", time: "1 hour ago", commit: "fix: correct padding on modal" },
            { name: "data-pipeline-nightly", status: "failed", time: "4 hours ago", commit: "chore: update dependencies" },
            { name: "infrastructure-cd", status: "passed", time: "1 day ago", commit: "terraform apply -auto-approve" }
          ].map((pipeline, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <TerminalSquare size={16} color={pipeline.status === "passed" ? 'var(--mint)' : 'var(--red)'} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{pipeline.name}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}><GitCommit size={10} style={{display:'inline',marginRight:'4px'}}/>{pipeline.commit}</span>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{pipeline.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
