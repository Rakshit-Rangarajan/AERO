import { ToggleRight, ToggleLeft, Users, Globe, Lock } from "lucide-react";

export function FeatureFlagsDashboard() {
  return (
    <div className="knowledge-page">
      <div className="panel-heading">
        <div className="panel-title-wrap">
          <span className="panel-icon"><ToggleRight size={15}/></span>
          <div>
            <h2>Feature Flags</h2>
            <p>Manage progressive delivery, dark launches, and A/B experiments.</p>
          </div>
        </div>
        <div className="panel-tools">
          <button className="primary-button" style={{fontSize: '11px', padding: '6px 12px'}}>+ Create Flag</button>
        </div>
      </div>

      <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { name: "enable-agentic-orchestration", desc: "Turns on the new multi-agent orchestrator UI", env: "Production", status: "ramping", rollout: "25%", target: "Beta Users", icon: Users, color: 'var(--blue)' },
          { name: "new-sso-provider-login", desc: "Routes enterprise users through Okta/SAML v2", env: "Production", status: "live", rollout: "100%", target: "Global", icon: Globe, color: 'var(--mint)' },
          { name: "dark-mode-v2-contrast", desc: "Adjusts contrast ratios for accessibility compliance", env: "Production", status: "off", rollout: "0%", target: "Internal Only", icon: Lock, color: 'var(--muted)' },
          { name: "payment-gateway-stripe", desc: "New checkout flow bypassing legacy provider", env: "Staging", status: "live", rollout: "100%", target: "QA Team", icon: Lock, color: 'var(--mint)' },
          { name: "experimental-rag-pipeline", desc: "Uses vector DB for context instead of keyword search", env: "Production", status: "ramping", rollout: "5%", target: "Canary", icon: Users, color: 'var(--blue)' }
        ].map((flag, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ marginTop: '2px', color: flag.status === 'off' ? 'var(--muted)' : flag.color }}>
                {flag.status === 'off' ? <ToggleLeft size={24} /> : <ToggleRight size={24} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {flag.name}
                  <span style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{flag.env}</span>
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{flag.desc}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em' }}>ROLLOUT</span>
                <strong style={{ fontSize: '14px', color: flag.color }}>{flag.rollout}</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', width: '100px' }}>
                <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em' }}>TARGET</span>
                <span style={{ fontSize: '12px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '4px' }}><flag.icon size={12}/> {flag.target}</span>
              </div>
              <button className="icon-button" style={{background: 'rgba(255,255,255,0.05)'}}>...</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
