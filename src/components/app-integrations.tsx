"use client";

import { useState, useEffect } from "react";
import { Check, Github, Trello, GitMerge, Book, Key, Loader2, LogOut, Settings, X, Server, Cloud } from "lucide-react";

type MCPConfig = { command: string; args: string[]; env: Record<string, string> };

const APPS = [
  { 
    id: "azure-devops", name: "Azure DevOps", icon: Cloud, desc: "Connect repos, boards, and pipelines via Az CLI.",
    defaultMcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-azure-devops"], envKeys: ["AZURE_DEVOPS_ORG"] }
  },
  { 
    id: "github", name: "GitHub Enterprise", icon: Github, desc: "Connect repositories for PR reviews and code search.",
    defaultMcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-github"], envKeys: ["GITHUB_PERSONAL_ACCESS_TOKEN"] }
  },
  { 
    id: "jira", name: "Jira Cloud", icon: Trello, desc: "Sync epics, stories, and sprint boards automatically.",
    defaultMcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-atlassian"], envKeys: ["JIRA_API_TOKEN", "JIRA_EMAIL", "JIRA_DOMAIN"] }
  },
  { 
    id: "confluence", name: "Confluence", icon: Book, desc: "Index engineering documentation for semantic search.",
    defaultMcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-atlassian"], envKeys: ["CONFLUENCE_API_TOKEN", "CONFLUENCE_EMAIL", "CONFLUENCE_DOMAIN"] }
  },
  { 
    id: "gitlab", name: "GitLab", icon: GitMerge, desc: "Connect CI/CD pipelines and deployment tracking.",
    defaultMcp: { command: "npx", args: ["-y", "@modelcontextprotocol/server-gitlab"], envKeys: ["GITLAB_PERSONAL_ACCESS_TOKEN", "GITLAB_API_URL"] }
  }
];

export function AppIntegrations() {
  const [connected, setConnected] = useState<Record<string, MCPConfig | boolean>>({});
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Modal state
  const [mcpCommand, setMcpCommand] = useState("");
  const [mcpArgs, setMcpArgs] = useState("");
  const [mcpEnv, setMcpEnv] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("aero_integrations");
    let current = {};
    if (saved) { try { current = JSON.parse(saved); setConnected(current); } catch {} }

    fetch("/api/integrations/auto-detect").then(res => res.json()).then(data => {
      setConnected(prev => {
        if (data.azure && !prev["azure-devops"]) {
          const next = { ...prev, "azure-devops": { command: "az", args: ["devops"], env: {} } };
          localStorage.setItem("aero_integrations", JSON.stringify(next));
          window.dispatchEvent(new Event("aero_integrations_updated"));
          return next;
        }
        return prev;
      });
    }).catch(() => {});
  }, []);

  const openConfig = (appId: string) => {
    const app = APPS.find(a => a.id === appId)!;
    const existing = connected[appId];
    
    if (typeof existing === "object") {
      setMcpCommand(existing.command);
      setMcpArgs(existing.args.join(" "));
      setMcpEnv(existing.env || {});
    } else {
      setMcpCommand(app.defaultMcp.command);
      setMcpArgs(app.defaultMcp.args.join(" "));
      const initEnv: Record<string, string> = {};
      app.defaultMcp.envKeys.forEach(k => initEnv[k] = "");
      setMcpEnv(initEnv);
    }
    
    setVerifyError("");
    setVerifySuccess("");
    setActiveModal(appId);
  };

  const disconnect = (id: string) => {
    const next = { ...connected };
    delete next[id];
    setConnected(next);
    localStorage.setItem("aero_integrations", JSON.stringify(next));
    window.dispatchEvent(new Event("aero_integrations_updated"));
  };

  const verifyAndConnect = async () => {
    if (!activeModal) return;
    setVerifying(true);
    setVerifyError("");
    setVerifySuccess("");
    
    const config: MCPConfig = {
      command: mcpCommand.trim(),
      args: mcpArgs.split(" ").filter(a => a.trim().length > 0),
      env: mcpEnv
    };

    try {
      const res = await fetch("/api/mcp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect to MCP server");
      }
      
      setVerifySuccess(`Successfully connected! Found ${data.tools?.length || 0} tools.`);
      
      // Save
      const next = { ...connected, [activeModal]: config };
      setConnected(next);
      localStorage.setItem("aero_integrations", JSON.stringify(next));
      window.dispatchEvent(new Event("aero_integrations_updated"));
      
      setTimeout(() => {
        setActiveModal(null);
      }, 1500);
      
    } catch (err: any) {
      setVerifyError(err.message || "Unknown error occurred");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <section className="knowledge-page panel settings-page" style={{ marginTop: '16px', paddingBottom: '8px' }}>
        <div className="panel-heading"><div className="panel-title-wrap"><span className="panel-icon"><Server size={15}/></span><div><h2>MCP Integrations</h2><p>Connect native Model Context Protocol (MCP) servers for full agent integration.</p></div></div></div>
        
        <div style={{ display: 'flex', flexDirection: 'column', padding: '0 16px 16px' }}>
          {APPS.map(app => (
            <div key={app.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 8px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--panel2)', display: 'grid', placeItems: 'center', color: connected[app.id] ? 'var(--green)' : 'var(--muted)', transition: 'color 0.2s' }}>
                  <app.icon size={20} />
                </div>
                <div>
                  <strong style={{ display: 'block', color: 'var(--text)', fontSize: '13.5px', marginBottom: '4px' }}>{app.name}</strong>
                  <span style={{ color: 'var(--muted)', fontSize: '11.5px' }}>{app.desc}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                {connected[app.id] && (
                  <button onClick={() => openConfig(app.id)} className="icon-button" style={{ width: '32px', height: '32px', background: 'var(--panel2)', border: '1px solid var(--line)' }} title="Settings">
                    <Settings size={14} color="var(--text)" />
                  </button>
                )}
                <button 
                  onClick={() => connected[app.id] ? disconnect(app.id) : openConfig(app.id)}
                  className="primary-button"
                  style={{ 
                    minWidth: '120px', 
                    height: '32px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    fontSize: '11.5px', 
                    borderRadius: '16px', 
                    background: connected[app.id] ? 'var(--panel2)' : 'var(--green)', 
                    color: connected[app.id] ? 'var(--text)' : 'var(--bg)', 
                    boxShadow: connected[app.id] ? 'none' : undefined,
                    border: connected[app.id] ? '1px solid var(--line)' : 'none', 
                    cursor: 'pointer', 
                    fontWeight: 700 
                  }}
                >
                  {connected[app.id] ? <><LogOut size={13}/> Disconnect</> : <><Server size={13}/> Configure MCP</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MCP Configuration Modal */}
      {activeModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="panel" style={{ width: '100%', maxWidth: '500px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', margin: 0, color: 'var(--text)' }}>Configure {APPS.find(a => a.id === activeModal)?.name} MCP</h2>
              <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={18}/></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>COMMAND</label>
              <input value={mcpCommand} onChange={e => setMcpCommand(e.target.value)} className="settings-input" style={{ margin: 0, width: '100%' }} placeholder="e.g. npx" />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>ARGUMENTS</label>
              <input value={mcpArgs} onChange={e => setMcpArgs(e.target.value)} className="settings-input" style={{ margin: 0, width: '100%' }} placeholder="-y @modelcontextprotocol/server-name" />
            </div>
            
            {Object.keys(mcpEnv).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', padding: '16px', background: 'var(--panel2)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text)', fontWeight: 600 }}>ENVIRONMENT VARIABLES</span>
                {Object.keys(mcpEnv).map(key => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '10.5px', color: 'var(--muted)' }}>{key}</label>
                    <input type="password" value={mcpEnv[key]} onChange={e => setMcpEnv({...mcpEnv, [key]: e.target.value})} className="settings-input" style={{ margin: 0, width: '100%', height: '32px' }} placeholder="Required" />
                  </div>
                ))}
              </div>
            )}

            {verifyError && <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--panel2)', border: '1px solid var(--orange)', color: 'var(--orange)', fontSize: '12.5px', marginTop: '8px' }}>{verifyError}</div>}
            {verifySuccess && <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--panel2)', border: '1px solid var(--green)', color: 'var(--green)', fontSize: '12.5px', marginTop: '8px' }}>{verifySuccess}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button onClick={() => setActiveModal(null)} className="secondary-button" style={{ padding: '0 16px', height: '36px', borderRadius: '18px', background: 'var(--panel2)', color: 'var(--text)', border: '1px solid var(--line)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button 
                onClick={verifyAndConnect} 
                disabled={verifying || !mcpCommand}
                className="primary-button" 
                style={{ padding: '0 16px', height: '36px', borderRadius: '18px', background: 'var(--green)', color: 'var(--bg)', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {verifying ? <Loader2 size={16} className="setup-spin" /> : <Check size={16}/>}
                Verify & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
