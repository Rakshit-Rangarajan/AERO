"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, ArrowUpRight, Bot, BookOpen, Check, ChevronDown, CircleHelp, FileText, GitBranch, LayoutDashboard, Menu, MessageSquare, Plus, Search, Send, Settings2, ShieldCheck, Sparkles, SquareTerminal, X , Trash2, UserRound } from "lucide-react";
import { Target, ToggleRight, ShieldAlert } from "lucide-react";
import { DemoWorkbench } from "@/components/demo-workbench";
import { DevelopmentCycleDashboard } from "@/components/development-cycle-dashboard";
import { useDemoMode } from "@/lib/demo-mode";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { CompanySettings } from "@/components/company-settings";
import { CompanySwitcher } from "@/components/company-switcher";
import { ProviderSetup } from "@/components/provider-setup";
import { AppIntegrations } from "@/components/app-integrations";
import { AzureDevOpsDashboard } from "@/components/azure-devops-dashboard";
import { ConfluenceDashboard } from "@/components/confluence-dashboard";
import { OkrDashboard } from "@/components/okr-dashboard";
import { FeatureFlagsDashboard } from "@/components/feature-flags-dashboard";
import { IncidentsDashboard } from "@/components/incidents-dashboard";


import { RepositoriesDashboard } from "@/components/repositories-dashboard";
import { PullRequestsDashboard } from "@/components/pull-requests-dashboard";
import { TestingDashboard } from "@/components/testing-dashboard";
import { DevelopmentDashboard } from "@/components/development-dashboard";
import { ReviewsDashboard } from "@/components/reviews-dashboard";
import { KnowledgeIntelligenceDashboard } from "@/components/knowledge-intelligence-dashboard";
import { FailureAnalysisDashboard } from "@/components/failure-analysis-dashboard";
import { ReleasesDashboard } from "@/components/releases-dashboard";
import { EnvironmentsDashboard } from "@/components/environments-dashboard";
import { ObservabilityDashboard } from "@/components/observability-dashboard";
import { SecurityDashboard } from "@/components/security-dashboard";
import { RoundTableDashboard } from "@/components/round-table-dashboard";
import { PlansDashboard } from "@/components/plans-dashboard";
import { ProfilePanel } from "@/components/profile-panel";
import { ProviderCredentials } from "@/components/provider-credentials";

import { DocumentsLibrary } from "@/components/documents-library";
import { GroupChatDialog } from "@/components/group-chat-dialog";

type Message = { id: string; role: "user" | "assistant"; content: string; createdAt: string; agent?: string };
type Session = { id: string; title: string; kind: string; agentId: string | null; updatedAt: string; lastMessage?: string | null };
type State = { session: Session; sessions: Session[]; messages: Message[]; provider: string };
type AgentChoice = { id: string; name: string; role: string; persona: string; signature: string; voice: string; specialties: string[]; permissions: { read: string[]; write: string[]; execute: string[] }; workflows: string[] };
type KnowledgeResult = { id: string; title: string; kind: string; source: string; createdAt: string; excerpt: string };
type ActivityEvent = { id: string; session_id: string | null; action: string; detail: string; created_at: string };
const sections = [
  { title: "WORKSPACE", items: [{ label: "Command center", icon: LayoutDashboard }, { label: "Demo center", icon: Sparkles }, { label: "Sessions", icon: MessageSquare, count: "04" }, { label: "Work items", icon: SquareTerminal }, { label: "Agents", icon: Bot }, { label: "Analysis", icon: Activity }, { label: "Round table", icon: Bot }, { label: "Plans", icon: Check }, { label: "OKRs", icon: Target }] },
  { title: "ENGINEERING", items: [{ label: "Knowledge", icon: BookOpen }, { label: "Knowledge intelligence", icon: BookOpen }, { label: "Repositories", icon: GitBranch }, { label: "Development", icon: Activity }, { label: "Development cycle", icon: GitBranch }, { label: "Reviews", icon: ShieldCheck }, { label: "Testing", icon: Check }, { label: "Failure analysis", icon: Activity }] },
  { title: "INTEGRATIONS", items: [{ label: "Integrations", icon: GitBranch }, { label: "Confluence", icon: BookOpen }, { label: "Azure DevOps", icon: GitBranch }] },
  { title: "RELEASE", items: [{ label: "Pull requests", icon: GitBranch }, { label: "Releases", icon: SquareTerminal }, { label: "Environments", icon: Check }, { label: "Observability", icon: Activity }, { label: "Security", icon: ShieldCheck }] },
  { title: "ACCOUNT", items: [{ label: "Profile", icon: UserRound }] },
];

const demoGroups = [
  { title: "Overview", icon: LayoutDashboard, items: ["Command center","Demo center","Sessions","Work items","Activity"] },
  { title: "AI studio", icon: Bot, items: ["Agents","Analysis","Round table","Knowledge","Knowledge intelligence"] },
  { title: "Engineering", icon: GitBranch, items: ["Repositories","Development","Development cycle","Reviews","Testing","Failure analysis","Plans"] },
  { title: "Delivery", icon: ShieldCheck, items: ["Pull requests","Releases","Environments","Observability","Security"] },
  { title: "Connections", icon: BookOpen, items: ["Integrations","Confluence","Azure DevOps"] },
  { title: "Management", icon: Target, items: ["OKRs","Feature flags","Incidents","Profile","Settings"] },
];

export default function Home() {
  const [state, setState] = useState<State | null>(null);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([
    { id: 'local', name: 'Local workspace', desc: 'Single-user foundation', avatar: 'L' },
    { id: 'enterprise', name: 'Enterprise Cloud', desc: 'Managed secure environment', avatar: 'E' }
  ]);
  const [activeWorkspace, setActiveWorkspace] = useState('local');
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [agentId, setAgentId] = useState("architect-ada");
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [agents, setAgents] = useState<AgentChoice[]>([]);
  const [agentSearch, setAgentSearch] = useState("");
  const { isDemo, toggleDemo } = useDemoMode();
  const [nav, setNavRaw] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      if (hash) return decodeURIComponent(hash);
    }
    return "Command center";
  });
  const setNav = (value: string) => {
    setNavRaw(value);
    if (typeof window !== "undefined") {
      window.location.hash = encodeURIComponent(value);
    }
  };
  const [teamsTab, setTeamsTab] = useState<"chat"|"profile"|"group-create"|"agent-create">("chat");
  const [editingProfile, setEditingProfile] = useState(false);
  const [agentOverrides, setAgentOverrides] = useState<Record<string, any>>({});
  const [groupSelection, setGroupSelection] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState("");

  const autoSelectAgents = (topic: string) => {
    if (!topic.trim()) {
      alert("Please enter a group title or topic first!");
      return;
    }
    const queryWords = topic.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const scored = agents.map(agent => {
      let score = 0;
      
      agent.specialties.forEach(s => {
         queryWords.forEach(w => { if (s.toLowerCase().includes(w)) score += 5; })
      });
      queryWords.forEach(w => { if (agent.role.toLowerCase().includes(w)) score += 3; });
      queryWords.forEach(w => { if (agent.persona.toLowerCase().includes(w)) score += 1; });
      
      const t = topic.toLowerCase();
      if ((t.includes("bug") || t.includes("crash") || t.includes("triage")) && (agent.role.toLowerCase().includes("qa") || agent.role.toLowerCase().includes("sre"))) score += 4;
      if ((t.includes("auth") || t.includes("security")) && agent.role.toLowerCase().includes("security")) score += 6;
      if ((t.includes("arch") || t.includes("system") || t.includes("design")) && agent.role.toLowerCase().includes("architect")) score += 4;
      if ((t.includes("db") || t.includes("database") || t.includes("sql") || t.includes("perf")) && agent.role.toLowerCase().includes("performance")) score += 4;

      return { id: agent.id, score };
    });

    scored.sort((a, b) => b.score - a.score);
    let best = scored.filter(a => a.score > 0).slice(0, 4);
    
    if (best.length < 2) {
      best = scored.slice(0, 3); 
    }
    
    setGroupSelection(best.map(a => a.id));
  };

  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [knowledgeRoot, setKnowledgeRoot] = useState("");
  const [repoRoot, setRepoRoot] = useState("");
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1);
      if (hash) setNavRaw(decodeURIComponent(hash));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onDemoNavigate = (event: Event) => {
      const target = (event as CustomEvent<string>).detail;
      if (typeof target === "string") setNav(target);
    };
    window.addEventListener("aero:navigate", onDemoNavigate);
    return () => window.removeEventListener("aero:navigate", onDemoNavigate);
  }, []);

  async function refresh(sessionId?: string) {
    const response = await fetch(`/api/state${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ""}`);
    if (response.ok) {
      const result = await response.json();
      setState(result);
      if (result.session.agentId) setAgentId(result.session.agentId);
    }
  }
  useEffect(() => {
    // Hosted demo must not depend on the local SQLite workspace.
    // This is an explicitly synthetic, read-only presentation shell.
    const sample = { id: "demo-general", title: "AERO presenter workspace", kind: "general", agentId: null, updatedAt: new Date().toISOString() };
    setState({ session: sample, sessions: [sample], messages: [], provider: "local" });
  }, []);
  useEffect(() => { fetch("/api/agents").then(response => response.ok ? response.json() : null).then(result => { if (result?.agents) setAgents(result.agents); }); }, []);
  useEffect(() => { fetch("/api/knowledge/setup").then(response => response.ok ? response.json() : null).then(result => { if (result?.root) setKnowledgeRoot(result.root); if (result?.repoRoot) setRepoRoot(result.repoRoot); }); }, []);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [state?.messages.length]);

  // Opening the Agents view loads an existing conversation for the selected agent.
  // It never creates one: browsing agents must not add sessions to the workspace.
  useEffect(() => {
    if (nav !== "Agents" || !state) return;
    const profile = agents.find(item => item.id === agentId);
    if (!profile) return;
    if (state.session.kind === "agent" && state.session.agentId === profile.id) return;
    const existing = state.sessions.find(session => session.kind === "agent" && session.agentId === profile.id);
    if (existing) void refresh(existing.id);
  }, [nav, agentId, agents, state?.session.id, state?.sessions.length]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy || !state) return;
    setDraft(""); setBusy(true);
    try {
      // Demo branch: local-only simulated conversation, no SQLite or AI provider.
      const now = new Date().toISOString();
      const active = nav === "Agents" && selectedAgent ? selectedAgent : null;
      const answer = active
        ? `DEMO SIMULATION · ${active.name} (${active.role}): For "${content}", I would first collect the ticket requirements, retrieve linked knowledge, assess dependencies and risk, then propose an implementation and QA plan for human approval. No live model or repository was consulted.`
        : `DEMO SIMULATION · AERO: I can walk through analysis, knowledge retrieval, the round table, implementation planning, testing and human approval for "${content}". Open Demo center to execute a guided simulated workflow. No live AI provider is connected.`;
      const userMessage: Message = {id:crypto.randomUUID(),role:"user",content,createdAt:now};
      const assistantMessage: Message = {id:crypto.randomUUID(),role:"assistant",content:answer,createdAt:now,agent:active?.name??"AERO"};
      setState(previous => previous ? {...previous,messages:[...previous.messages,userMessage,assistantMessage]} : previous);
      return;

      const activeAgentId = state.session.kind === "agent" && state.session.agentId ? state.session.agentId : agentId;
      const wantsAgentChat = nav === "Agents" && Boolean(selectedAgent);
      let sessionId = state.session.id;
      let replyAgentId: string | null = activeAgentId;
      if (wantsAgentChat && selectedAgent) {
        const existing = state.sessions.find(session => session.kind === "agent" && session.agentId === selectedAgent.id);
        if (existing) {
          sessionId = existing.id;
        } else {
          const created = await fetch("/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "agent", agentId: selectedAgent.id }) });
          const createdResult = await created.json().catch(() => null) as { session?: Session; error?: string } | null;
          if (!created.ok || !createdResult?.session) {
            setNotice(createdResult?.error ?? "The agent conversation could not be started.");
            window.setTimeout(() => setNotice(""), 6000);
            return;
          }
          setState(createdResult as unknown as State);
          sessionId = createdResult.session.id;
        }
        replyAgentId = selectedAgent.id;
      }
      const response = await fetch("/api/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, content, agentId: replyAgentId }) });
      const result = await response.json();
      if (!response.ok) { setNotice(result.error ?? "The message could not be saved."); if (result.saved) await refresh(sessionId); }
      else setState(result);
    } finally { setBusy(false); }
  }

  async function createSession(kind = "ticket", title = "New work item session", directAgentId?: string) {
    const response = await fetch("/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, title, agentId: directAgentId }) });
    if (response.ok) { const result = await response.json(); setState(result); if (result.session.agentId) setAgentId(result.session.agentId); setNav(kind === "agent" ? "Agents" : "Sessions"); }
  }

  /** Selecting an agent only previews that conversation. It never creates a session. */
  async function selectAgent(profile: AgentChoice) {
    setAgentId(profile.id);
    setNav("Agents");
    setTeamsTab("chat");
    const existing = state?.sessions.find(session => session.kind === "agent" && session.agentId === profile.id);
    if (existing) await refresh(existing.id);
  }

  /** A conversation is only created when the user explicitly starts one. */
  async function startAgentChat(profile: AgentChoice) {
    setAgentId(profile.id);
    const existing = state?.sessions.find(session => session.kind === "agent" && session.agentId === profile.id);
    if (existing) { await refresh(existing.id); setNav("Agents"); setTeamsTab("chat"); return; }
    await createSession("agent", `${profile.name} · ${profile.role}`, profile.id);
    setTeamsTab("chat");
  }

  
  async function deleteSession(id: string) {
    if (!confirm("Are you sure you want to delete this session?")) return;
    const response = await fetch(`/api/sessions?id=${id}`, { method: "DELETE" });
    if (response.ok) {
      const result = await response.json();
      if (state?.session.id === id) {
        await refresh(result.fallbackSessionId);
      } else {
        await refresh(state?.session.id);
      }
    }
  }
  async function openSession(session: Session) {
    await refresh(session.id);
    setNav(session.kind === "agent" ? "Agents" : "Sessions");
  }

  async function setupKnowledge(root?: string, repoRoot?: string) {
    const response = await fetch("/api/knowledge/setup", { method: (root || repoRoot) ? "PUT" : "POST", ...((root || repoRoot) ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ root, repoRoot }) } : {}) });
    const result = await response.json();
    if (response.ok && result.root) setKnowledgeRoot(result.root);
    if (response.ok && result.repoRoot) setRepoRoot(result.repoRoot);
    setNotice(response.ok ? "Local workspace folders ready." : result.error ?? "Folder setup failed.");
    window.setTimeout(() => setNotice(""), 6000);
  }

  async function searchKnowledge(event: React.FormEvent) {
    event.preventDefault();
    const query = knowledgeQuery.trim();
    if (query.length < 2) return;
    setSearching(true);
    const response = await fetch(`/api/knowledge/search?q=${encodeURIComponent(query)}`);
    const result = await response.json();
    if (response.ok) setKnowledgeResults(result.results);
    else setNotice(result.error ?? "Knowledge search failed.");
    setSearching(false);
  }

  async function openActivity() {
    setNav("Activity");
    const response = await fetch("/api/activity");
    if (response.ok) { const result = await response.json(); setActivityEvents(result.events); }
  }

  async function analyzeUpload(file?: File) {
    if (!file || !state) return;
    const form = new FormData(); form.set("file", file); form.set("sessionId", state.session.id);
    const response = await fetch("/api/documents", { method: "POST", body: form });
    const result = await response.json();
    setNotice(response.ok ? `Document indexed: ${result.title}` : result.error ?? "Document analysis failed.");
    if (response.ok) await refresh(state.session.id);
    window.setTimeout(() => setNotice(""), 6000);
  }

  if (!state) return <main className="loading"><img src="/logo.png" alt="AERO" className="brand-mark" style={{width: "32px", height: "32px", borderRadius: "8px", objectFit: "contain"}}/><span>Connecting to workspace</span></main>;
  const selectedAgent = agents.find(profile => profile.id === agentId);
  const initials = selectedAgent?.name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase() ?? "AI";
  const matchingAgents = agents.filter(profile => `${profile.name} ${profile.role} ${profile.persona}`.toLowerCase().includes(agentSearch.trim().toLowerCase()));
  const activeChatAgent = state.session.agentId ? agents.find(profile => profile.id === state.session.agentId) ?? selectedAgent : selectedAgent;
  const activeAgentChatId = selectedAgent ? state.sessions.find(session => session.kind === "agent" && session.agentId === selectedAgent.id)?.id : undefined;
  if (activeChatAgent && agentOverrides[activeChatAgent.id]) { Object.assign(activeChatAgent, agentOverrides[activeChatAgent.id]); }
  const activeChatInitials = activeChatAgent?.name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase() ?? "AI";
  const teamsWorkspace = <div className="teams-chat-grid">
    <aside className="teams-chat-list panel">
      <div className="teams-list-heading"><div><span>MESSAGES</span><h2>Agent chats</h2></div><button className="teams-new-chat" title="Create a Group Chat" onClick={() => setTeamsTab("group-create")}><Plus size={17}/></button></div>
      <label className="teams-chat-search"><Search size={14}/><input value={agentSearch} onChange={event => setAgentSearch(event.target.value)} placeholder="Find an agent" aria-label="Find an agent chat"/></label>
      <div className="teams-chat-list-scroll"><div className="teams-list-section">YOUR AGENTS <span>{matchingAgents.length.toString().padStart(2,"0")}</span></div>{matchingAgents.map(profile => {
        const chat = state.sessions.find(session => session.kind === "agent" && session.agentId === profile.id);
        const active = selectedAgent?.id === profile.id;
        const profileInitials = profile.name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
        return <button className={`teams-chat-person ${active ? "active" : ""}`} key={profile.id} onClick={() => void selectAgent(profile)}><span className={`teams-person-avatar ${selectedAgent?.id === profile.id ? "selected" : ""}`}>{profileInitials}<i/></span><span className="teams-person-copy"><strong>{profile.name}</strong><small>{chat?.lastMessage ? chat.lastMessage.slice(0, 50) : profile.role}</small></span><span className="teams-person-time">{chat ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span></button>;
      })}</div>
      <div className="teams-list-footer" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '12px 16px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><span className="local-presence-dot"/> {agents.length} available</div>
          <button onClick={() => setTeamsTab("agent-create")} style={{display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--mint)', cursor: 'pointer', fontSize: '11px', fontWeight: 600}}><Plus size={12}/> NEW AGENT</button>
        </div>
    </aside>

    <section className="teams-chat-center panel">
      <header className="teams-conversation-header"><span className="teams-person-avatar large">{activeChatInitials}</span><div className="teams-chat-title"><h2>{activeChatAgent?.name ?? "Choose an agent"}</h2><span>{activeChatAgent?.role ?? "Agent profile"} <i/> {state.provider === "local" ? "Local adapter" : "Provider configured"}</span></div><div className="teams-header-actions"><button className="teams-header-button" aria-label="Search this conversation" onClick={() => document.getElementById("composer")?.focus()}><Search size={17}/></button><button className="teams-header-button" aria-label="Conversation details" onClick={() => document.getElementById("agent-profile")?.scrollIntoView({ behavior: "smooth" })}><CircleHelp size={17}/></button></div></header>
      <div className="teams-chat-tabs">
  <span className={teamsTab === "chat" ? "active" : ""} onClick={() => setTeamsTab("chat")} style={{cursor: "pointer"}}>Chat</span>
  <span className={teamsTab === "profile" ? "active" : ""} onClick={() => setTeamsTab("profile")} style={{cursor: "pointer"}}>Profile</span>
  <button onClick={() => activeChatAgent && void startAgentChat(activeChatAgent)}>Open conversation <ArrowUpRight size={13}/></button>
</div>

{teamsTab === "agent-create" ? (
  <div className="teams-conversation" style={{padding: "40px", display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto"}}>
    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
      <h2 style={{fontSize: "24px", color: "var(--text)", fontWeight: 600}}>Create Custom Agent</h2>
      <p style={{color: "var(--muted)", fontSize: "14px"}}>Define a specialized autonomous agent with a unique persona and role.</p>
    </div>
    
    <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px"}}>
      <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
        <label style={{fontSize: "11px", color: "var(--muted)", fontWeight: 600, letterSpacing: "0.05em"}}>AGENT NAME</label>
        <input 
          id="new-agent-name"
          placeholder="e.g. Data Scientist Dan" 
          style={{background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)", padding: "12px 16px", borderRadius: "12px", color: "var(--text)", outline: "none", fontSize: "14px"}}
        />
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
        <label style={{fontSize: "11px", color: "var(--muted)", fontWeight: 600, letterSpacing: "0.05em"}}>ROLE / TITLE</label>
        <input 
          id="new-agent-role"
          placeholder="e.g. Senior Machine Learning Engineer" 
          style={{background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)", padding: "12px 16px", borderRadius: "12px", color: "var(--text)", outline: "none", fontSize: "14px"}}
        />
      </div>
    </div>

    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
      <label style={{fontSize: "11px", color: "var(--muted)", fontWeight: 600, letterSpacing: "0.05em"}}>CHARACTER / PERSONA</label>
      <textarea 
        id="new-agent-persona"
        rows={3}
        placeholder="Describe how the agent behaves, their expertise, and their perspective..." 
        style={{background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)", padding: "12px 16px", borderRadius: "12px", color: "var(--text)", outline: "none", fontSize: "14px", resize: "vertical"}}
      />
    </div>

    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
      <label style={{fontSize: "11px", color: "var(--muted)", fontWeight: 600, letterSpacing: "0.05em"}}>RESPONSE SIGNATURE (Style)</label>
      <input 
        id="new-agent-signature"
        placeholder="e.g. Highly analytical, data-driven, provides code examples" 
        style={{background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)", padding: "12px 16px", borderRadius: "12px", color: "var(--text)", outline: "none", fontSize: "14px"}}
      />
    </div>
    
    <div style={{marginTop: "auto", display: "flex", justifyContent: "flex-end", paddingTop: "24px", borderTop: "1px solid var(--line)", gap: "12px"}}>
      <button onClick={() => setTeamsTab("chat")} style={{padding: "0 16px", background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "12px", fontWeight: 600}}>Cancel</button>
      <button 
        className="primary-button" 
        onClick={() => {
          const name = (document.getElementById("new-agent-name") as HTMLInputElement).value;
          const role = (document.getElementById("new-agent-role") as HTMLInputElement).value;
          const persona = (document.getElementById("new-agent-persona") as HTMLTextAreaElement).value;
          const signature = (document.getElementById("new-agent-signature") as HTMLInputElement).value;
          
          if (!name || !role) {
            alert("Name and Role are required.");
            return;
          }

          const newAgent = {
            id: "custom-" + Date.now(),
            name,
            role,
            persona: persona || "Standard helpful assistant.",
            signature: signature || "Standard",
            specialties: []
          };
          
          setAgents(prev => [...prev, newAgent as any]);
          setTeamsTab("chat");
        }}
        style={{padding: "0 24px", height: "40px"}}
      >
        <Bot size={16}/> Create Custom Agent
      </button>
    </div>
  </div>
) : teamsTab === "group-create" ? (
  <div className="teams-conversation" style={{padding: "40px", display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto"}}>
    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
      <h2 style={{fontSize: "24px", color: "var(--text)", fontWeight: 600}}>Create Group Chat</h2>
      <p style={{color: "var(--muted)", fontSize: "14px"}}>Select 2 or more agents to form a collaborative group chat.</p>
    </div>
    
    <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end"}}>
        <label style={{fontSize: "11px", color: "var(--muted)", fontWeight: 600, letterSpacing: "0.05em"}}>GROUP TITLE OR TOPIC</label>
        <button type="button" onClick={() => autoSelectAgents(groupTitle)} style={{fontSize: "11px", display: "flex", gap: "4px", alignItems: "center", background: "transparent", border: "none", color: "var(--mint)", cursor: "pointer", fontWeight: 600}}>
          <Sparkles size={12}/> Auto-select team
        </button>
      </div>
      <input 
        value={groupTitle} 
        onChange={e => setGroupTitle(e.target.value)} 
        placeholder="e.g. Auth System Redesign" 
        style={{background: "var(--surface)", border: "1px solid var(--line)", padding: "12px 16px", borderRadius: "12px", color: "var(--text)", outline: "none", fontSize: "14px"}}
      />
    </div>

    <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
      <label style={{fontSize: "11px", color: "var(--muted)", fontWeight: 600, letterSpacing: "0.05em"}}>SELECT AGENTS ({groupSelection.length})</label>
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px"}}>
        {agents.map(agent => (
          <div 
            key={agent.id} 
            onClick={() => {
              if (groupSelection.includes(agent.id)) {
                setGroupSelection(prev => prev.filter(id => id !== agent.id));
              } else {
                setGroupSelection(prev => [...prev, agent.id]);
              }
            }}
            style={{
              padding: "16px", border: "1px solid", borderRadius: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", transition: "all 0.2s",
              borderColor: groupSelection.includes(agent.id) ? "var(--mint)" : "var(--line)",
              background: groupSelection.includes(agent.id) ? "rgba(167, 235, 198, 0.05)" : "rgba(255, 255, 255, 0.02)"
            }}
          >
            <div style={{
              width: "20px", height: "20px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center",
              background: groupSelection.includes(agent.id) ? "var(--mint)" : "var(--surface)",
              color: groupSelection.includes(agent.id) ? "#000" : "transparent"
            }}><Check size={14}/></div>
            <div style={{display: "flex", flexDirection: "column"}}>
              <strong style={{fontSize: "14px", color: "var(--text)"}}>{agent.name}</strong>
              <span style={{fontSize: "12px", color: "var(--muted)"}}>{agent.role}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
    
    <div style={{marginTop: "auto", display: "flex", justifyContent: "flex-end", paddingTop: "24px", borderTop: "1px solid var(--line)", gap: "12px"}}>
      <button onClick={() => setTeamsTab("chat")} style={{padding: "0 16px", background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "12px", fontWeight: 600}}>Cancel</button>
      <button 
        className="primary-button" 
        disabled={groupSelection.length < 2 || busy}
        onClick={async () => {
          setBusy(true);
          const response = await fetch("/api/sessions", { 
            method: "POST", 
            headers: { "content-type": "application/json" }, 
            body: JSON.stringify({ kind: "group", title: groupTitle, agentIds: groupSelection }) 
          });
          if (response.ok) { 
            const result = await response.json(); 
            setState(result); 
            setTeamsTab("chat");
            setGroupSelection([]);
            setGroupTitle("");
            await refresh(result.session.id);
            setNav("Sessions");
          }
          setBusy(false);
        }}
        style={{padding: "0 24px", height: "40px"}}
      >
        <Sparkles size={16}/> Create Group Session
      </button>
    </div>
  </div>
) : teamsTab === "profile" ? (
  <div className="teams-conversation" style={{padding: "24px", overflowY: "auto"}}>
    <div className="teams-profile-body">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px'}}>
        <div style={{flex: 1, minWidth: 0}}>
          {editingProfile ? (
            <input 
              value={activeChatAgent?.name || ""} 
              onChange={e => setAgentOverrides(prev => ({ ...prev, [activeChatAgent!.id]: { ...prev[activeChatAgent!.id], name: e.target.value } }))}
              style={{fontSize: "18px", fontWeight: 600, background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)", padding: "6px 12px", borderRadius: "8px", color: "var(--text)", width: "100%", marginBottom: "8px", outline: "none", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)"}}
            />
          ) : (
            <h2>{activeChatAgent?.name ?? "Choose an agent"}</h2>
          )}
          <span className="teams-profile-role">{activeChatAgent?.role ?? "Agent"}</span>
        </div>
        <button onClick={() => setEditingProfile(!editingProfile)} style={{padding: '8px 16px', fontSize: '12px', fontWeight: 500, border: editingProfile ? 'none' : '1px solid var(--line)', background: editingProfile ? 'var(--mint)' : 'rgba(255,255,255,0.03)', color: editingProfile ? '#000' : 'var(--text)', borderRadius: '8px', cursor: 'pointer', flexShrink: 0, marginTop: editingProfile ? "2px" : "0", transition: "all 0.2s"}}>
          {editingProfile ? "Save Profile" : "Edit Profile"}
        </button>
      </div>

      {editingProfile ? (
        <div style={{marginTop: "16px"}}>
          <label style={{fontSize: "11px", color: "var(--muted)", fontWeight: 600}}>CHARACTER / PERSONA</label>
          <textarea 
            rows={3}
            value={activeChatAgent?.persona || ""} 
            onChange={e => setAgentOverrides(prev => ({ ...prev, [activeChatAgent!.id]: { ...prev[activeChatAgent!.id], persona: e.target.value } }))}
            style={{background: "var(--surface)", border: "1px solid var(--line)", padding: "8px", borderRadius: "8px", color: "var(--text)", width: "100%", marginTop: "4px", fontSize: "13px"}}
          />
        </div>
      ) : (
        <p style={{marginTop: "12px"}}>{activeChatAgent?.persona ?? "Select an agent to see their persona."}</p>
      )}

      <div className="teams-profile-section" style={{marginTop: editingProfile ? "16px" : "0"}}>
        <span>RESPONSE SIGNATURE (Style)</span>
        {editingProfile ? (
          <input 
            value={activeChatAgent?.signature || ""} 
            onChange={e => setAgentOverrides(prev => ({ ...prev, [activeChatAgent!.id]: { ...prev[activeChatAgent!.id], signature: e.target.value } }))}
            style={{background: "var(--surface)", border: "1px solid var(--line)", padding: "6px 8px", borderRadius: "6px", color: "var(--text)", width: "100%", fontSize: "13px", marginTop: "4px"}}
          />
        ) : (
          <strong>{activeChatAgent?.signature ?? "—"}</strong>
        )}
      </div>
      <div className="teams-profile-section">
        <span>SPECIALTIES</span>
        <div className="teams-specialty-list">
          {activeChatAgent?.specialties.map(specialty => <i key={specialty}>{specialty}</i>)}
        </div>
      </div>
      <div className="teams-profile-section">
        <span>CHAT ACCESS</span>
        <strong><ShieldCheck size={13}/> Current message and reply only</strong>
      </div>
      <div className="teams-profile-note">
        <Sparkles size={14}/>
        <span>{state.provider === "local" ? "Local mode is active. This chat is saved, but no language model is connected." : "This profile guides response style. No external tools are enabled in this chat."}</span>
      </div>
    </div>
  </div>
) : (
  <div className="teams-conversation">
    <div className="teams-start-date">
      <span/> {activeAgentChatId ? "DIRECT AGENT CHAT" : "NO CONVERSATION YET"} <span/>
    </div>
    {!activeAgentChatId && (
      <div className="teams-empty">
        <div className="teams-empty-avatar">{activeChatInitials}</div>
        <h3>No conversation with {activeChatAgent?.name.split(" ")[0] ?? "this agent"} yet</h3>
        <p>Nothing is saved until you start. A conversation is created when you start one or send the first message.</p>
        <button onClick={() => activeChatAgent && void startAgentChat(activeChatAgent)}>
          Start conversation <ArrowUpRight size={13}/>
        </button>
      </div>
    )}
    <div className="teams-messages">
      {state.messages.map(message => (
        <article key={message.id} className={`teams-message ${message.role}`}>
          <span className={`teams-message-avatar ${message.role}`}>
            {message.role === "assistant" ? activeChatInitials : "LD"}
          </span>
          <div className="teams-message-content">
            <div className="teams-message-meta">
              <strong>{message.role === "assistant" ? activeChatAgent?.name ?? message.agent ?? "AERO agent" : "You"}</strong>
              <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="teams-message-bubble">{message.content}</div>
            {message.role === "assistant" && (
              <span className="teams-message-evidence">
                {state.provider === "local" ? "Local development adapter" : "Configured provider"}
              </span>
            )}
          </div>
        </article>
      ))}
      {busy && (
        <div className="typing">
          <span/><span/><span/> <small>{activeChatAgent?.name ?? "Agent"} is responding</small>
        </div>
      )}
      <div ref={bottom}/>
    </div>
  </div>
)}

{teamsTab === "chat" && (
  <form className="teams-composer" onSubmit={sendMessage}>
    <div className="teams-composer-frame">
      <textarea 
        id="composer" 
        value={draft} 
        onChange={event => setDraft(event.target.value)} 
        placeholder={`Message ${activeChatAgent?.name ?? "your agent"}`} 
        rows={2} 
        onKeyDown={event => { 
          if (event.key === "Enter" && !event.shiftKey) { 
            event.preventDefault(); 
            void sendMessage(event); 
          } 
        }}
      />
      <div className="teams-composer-tools">
        <span>Selected profile: {activeChatAgent?.signature ?? "Choose an agent"}</span>
        <div>
          <label title="Attach a supported document">
            <input type="file" accept=".txt,.md,.json,.csv,.pdf,.docx" onChange={event => void analyzeUpload(event.target.files?.[0])}/>
            <Plus size={16}/>
          </label>
          <button type="submit" disabled={busy || !draft.trim()} aria-label="Send message">
            <Send size={15}/>
          </button>
        </div>
      </div>
    </div>
    <small>Enter to send · Shift + Enter for a new line</small>
  </form>
)}
</section>

    <aside className="teams-profile panel" id="agent-profile"><div className="teams-profile-banner"><span>AERO AGENT PROFILE</span><div className="teams-profile-avatar">{activeChatInitials}</div></div><div className="teams-profile-body"><h2>{activeChatAgent?.name ?? "Choose an agent"}</h2><span className="teams-profile-role">{activeChatAgent?.role ?? "Agent"}</span><p>{activeChatAgent?.persona ?? "Select an agent to see their persona."}</p><div className="teams-profile-section"><span>RESPONSE SIGNATURE</span><strong>{activeChatAgent?.signature ?? "—"}</strong></div><div className="teams-profile-section"><span>SPECIALTIES</span><div className="teams-specialty-list">{activeChatAgent?.specialties.map(specialty => <i key={specialty}>{specialty}</i>)}</div></div><div className="teams-profile-section"><span>CHAT ACCESS</span><strong><ShieldCheck size={13}/> Current message and reply only</strong></div><div className="teams-profile-note"><Sparkles size={14}/><span>{state.provider === "local" ? "Local mode is active. This chat is saved, but no language model is connected." : "This profile guides response style. No external tools are enabled in this chat."}</span></div></div></aside>
  </div>;

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand-row"><img src="/logo.png" alt="AERO" className="brand-mark" style={{width: "32px", height: "32px", borderRadius: "8px", objectFit: "contain"}}/><div className="brand-name">AERO<span>ENGINEERING OPERATIONS</span></div><button className="icon-button mobile-menu" aria-label="Menu"><Menu size={17}/></button><button className="icon-button collapse" aria-label="Collapse sidebar"><Menu size={16}/></button></div>
      <div style={{ position: 'relative' }}>
        <button className="workspace-switch" onClick={() => { setWorkspaceMenuOpen(!workspaceMenuOpen); setCreatingWorkspace(false); }}>
          <span className="workspace-avatar">{workspaces.find(w => w.id === activeWorkspace)?.avatar || 'W'}</span>
          <span className="workspace-copy">
            <strong>{workspaces.find(w => w.id === activeWorkspace)?.name}</strong>
            <small>{workspaces.find(w => w.id === activeWorkspace)?.desc}</small>
          </span>
          <ChevronDown size={14}/>
        </button>
        {workspaceMenuOpen && (
          <div style={{ position: 'absolute', top: '100%', left: '12px', right: '12px', marginTop: '8px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px', padding: '8px', zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {creatingWorkspace ? (
              <div style={{ padding: '8px' }}>
                <input autoFocus placeholder="Workspace name" value={newWorkspaceName} onChange={e => setNewWorkspaceName(e.target.value)} style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', borderRadius: '8px', color: 'var(--text)', outline: 'none', fontSize: '13px', marginBottom: '8px' }} />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="primary-button" style={{ flex: 1, padding: '6px', fontSize: '12px' }} onClick={() => {
                    if (newWorkspaceName.trim()) {
                      const id = 'ws-' + Date.now();
                      setWorkspaces([...workspaces, { id, name: newWorkspaceName.trim(), desc: 'Custom workspace', avatar: newWorkspaceName.trim().charAt(0).toUpperCase() }]);
                      setActiveWorkspace(id);
                      setCreatingWorkspace(false);
                      setNewWorkspaceName("");
                      setWorkspaceMenuOpen(false);
                    }
                  }}>Create</button>
                  <button className="primary-button" style={{ flex: 1, padding: '6px', fontSize: '12px', background: 'var(--line)', color: 'var(--text)' }} onClick={() => setCreatingWorkspace(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {workspaces.map(w => (
                  <button key={w.id} onClick={() => { setActiveWorkspace(w.id); setWorkspaceMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: activeWorkspace === w.id ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: 'var(--text)' }}>
                    <span className="workspace-avatar" style={{ width: '24px', height: '24px', fontSize: '12px', background: activeWorkspace === w.id ? 'var(--mint)' : 'rgba(255,255,255,0.1)', color: activeWorkspace === w.id ? 'var(--bg)' : 'var(--text)' }}>{w.avatar}</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: '13px', fontWeight: 600 }}>{w.name}</strong>
                      <small style={{ fontSize: '11px', color: 'var(--muted)' }}>{w.desc}</small>
                    </div>
                  </button>
                ))}
                <div style={{ height: '1px', background: 'var(--line)', margin: '4px 0' }} />
                <button onClick={() => setCreatingWorkspace(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'transparent', border: 'none', color: 'var(--mint)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  <Plus size={14}/> Create new workspace
                </button>
              </>
            )}
          </div>
        )}
      </div>
      <nav className="demo-icon-rail" aria-label="Demo categories">
        {demoGroups.map(group => { const Icon=group.icon; const active=group.items.includes(nav); return <button key={group.title} type="button" aria-label={group.title} title={group.title} aria-current={active?"page":undefined} className={`demo-rail-button ${active?"active":""}`} onClick={() => setNav(group.items[0])}><Icon size={21}/><span>{group.title}</span></button>; })}
      </nav>
      <div className="demo-rail-footer"><button type="button" title="Settings" aria-label="Settings" onClick={()=>setNav("Settings")}><Settings2 size={19}/></button></div>
    </aside>

    <section className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{nav}</strong><span className="crumb-slash">/</span><span>{state.session.title}</span></div><div className="top-actions"><span className="system-status"><i/>{state.provider === "local" ? "Local runtime" : "Provider configured"}</span><button className="search-trigger" onClick={() => { if (nav === "Knowledge") document.getElementById("knowledge-search")?.focus(); else if (document.getElementById("composer")) document.getElementById("composer")?.focus(); else alert("Global search is coming soon! Try searching within the specific dashboard you are on."); }}><Search size={14}/>Search<span>⌘ K</span></button><button className="icon-button help" aria-label="Help"><CircleHelp size={17}/></button><div className="top-avatar">LD</div></div></header>
      <nav className="demo-category-tabs" aria-label="Section tabs">
        {demoGroups.filter(group=>group.items.includes(nav)).flatMap(group=>group.items.map(item=><button type="button" key={item} className={`demo-tab ${nav===item?"active":""}`} aria-current={nav===item?"page":undefined} onClick={()=>item==="Activity"?void openActivity():setNav(item)}>{item}</button>))}
      </nav>
      <div className="content-scroll"><div className="page-content">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "2-digit", year: "numeric" }).toUpperCase()} <span className="eyebrow-divider">·</span> ENGINEERING WORKSPACE</div><h1>{nav === "Agents" ? "Chat with agents" : "Command center"}<span className="heading-period">.</span></h1><p className="page-subtitle">{nav === "Agents" ? "Focused conversations with your engineering specialists." : "Your engineering work, connected and in motion."}</p></div><button className="primary-button" onClick={() => nav === "Agents" && selectedAgent ? void startAgentChat(selectedAgent) : void createSession("ticket", "New work item session")}><Plus size={16}/> {nav === "Agents" ? "New agent chat" : "New session"} <span className="button-shortcut">⌘ J</span></button></div>

        <div className="status-strip"><div className="status-label"><span className="live-indicator"/>WORKSPACE STATUS</div><div className="strip-divider"/><div className="strip-item"><span className="strip-number">{state.sessions.length.toString().padStart(2, "0")}</span><span>sessions</span></div><div className="strip-item"><span className="strip-number">01</span><span>chat adapter</span></div><div className="strip-item"><span className="status-chip"><span/> {state.provider === "local" ? "LOCAL MOCK" : "CONFIGURED"}</span></div><div className="strip-spacer"/><button className="strip-link" onClick={() => void openActivity()}>View activity <ArrowUpRight size={13}/></button></div>

        {nav === "Demo center" ? <DemoWorkbench nav="Demo center" /> : nav === "Knowledge" ? <section className="knowledge-page panel"><div className="panel-heading"><div className="panel-title-wrap"><span className="panel-icon"><BookOpen size={15}/></span><div><h2>Engineering knowledge</h2><p>Search uploaded documents and captured engineering context.</p></div></div><span className="status-chip"><span/> LOCAL KEYWORD SEARCH</span></div><form className="knowledge-search" onSubmit={searchKnowledge}><Search size={16}/><input id="knowledge-search" value={knowledgeQuery} onChange={event => setKnowledgeQuery(event.target.value)} placeholder="Search documents, tickets, notes…" aria-label="Search engineering knowledge"/><button type="submit" disabled={searching || knowledgeQuery.trim().length < 2}>{searching ? "Searching…" : "Search"}</button></form><div className="knowledge-results">{knowledgeResults.length === 0 ? <div className="activity-empty"><span className="activity-pulse"><BookOpen size={15}/></span><div><strong>{knowledgeQuery ? "No results yet" : "Search your engineering memory"}</strong><p>{knowledgeQuery ? "Try a different phrase or check that the document was uploaded." : "Uploaded documents appear here for local keyword search."}</p></div></div> : knowledgeResults.map(result => <article className="knowledge-result" key={result.id}><div className="result-meta"><span>{result.kind.toUpperCase()}</span><span>·</span><span>{new Date(result.createdAt).toLocaleDateString()}</span></div><h3>{result.title}</h3><p>{result.excerpt}</p><span className="result-source">Source: {result.source}</span></article>)}</div></section> : nav === "Sessions" || nav === "Work items" ? <section className="knowledge-page panel"><div className="panel-heading"><div className="panel-title-wrap"><span className="panel-icon"><SquareTerminal size={15}/></span><div><h2>{nav}</h2><p>{nav === "Sessions" ? "Persistent conversations in this local workspace." : "Ticket-kind sessions created in this workspace."}</p></div></div></div><div className="session-results">{state.sessions.filter(session => nav === "Sessions" || session.kind === "ticket").map(session => <div className={`session-row ${session.id === state.session.id ? "active" : ""}`} key={session.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <div style={{display: 'flex', alignItems: 'center', gap: '12px', flex: 1, cursor: 'pointer'}} onClick={() => void openSession(session)}>
      <span className="session-dot"/>
      <span className="session-row-title">
        <strong>{session.title}</strong>
        <small>{session.kind === "general" ? "GENERAL SESSION" : session.kind === "agent" ? "AGENT CHAT" : "WORK ITEM SESSION"} • UPDATED {new Date(session.updatedAt).toLocaleString()}</small>
      </span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button className="icon-button" onClick={() => void deleteSession(session.id)} aria-label="Delete session" style={{ color: '#d08b8b' }}><Trash2 size={14}/></button>
      <ArrowUpRight size={14} style={{ color: 'var(--muted)' }}/>
    </div>
  </div>)}</div></section> : nav === "Settings" ? <section className="knowledge-page panel settings-page"><div className="panel-heading"><div className="panel-title-wrap"><span className="panel-icon"><Settings2 size={15}/></span><div><h2>Knowledge workspace</h2><p>Choose where AERO creates and manages engineering knowledge folders.</p></div></div></div><label className="settings-label" htmlFor="knowledge-root">KNOWLEDGE FOLDER PATH</label>
<input id="knowledge-root" className="settings-input" value={knowledgeRoot} onChange={event => setKnowledgeRoot(event.target.value)} placeholder={"D:\\engineering-knowledge"}/>
<label className="settings-label" htmlFor="repo-root" style={{ marginTop: '16px', display: 'block' }}>REPOSITORIES FOLDER PATH</label>
<input id="repo-root" className="settings-input" value={repoRoot} onChange={event => setRepoRoot(event.target.value)} placeholder={"D:\\aero-repos"}/>
<p className="settings-help">Use absolute paths on this machine. Setup will preserve existing folders and create only missing directories.</p>
<button className="primary-button" disabled={!knowledgeRoot.trim() && !repoRoot.trim()} onClick={() => void setupKnowledge(knowledgeRoot.trim(), repoRoot.trim())}><Check size={14}/> Save paths and verify folders</button>
<ProviderCredentials />
<div className="settings-footer"><span>Settings are stored in this workspace on this machine.</span></div></section> : nav === "Agents" ? teamsWorkspace : nav === "Activity" ? <section className="knowledge-page panel"><div className="panel-heading"><div className="panel-title-wrap"><span className="panel-icon"><Activity size={15}/></span><div><h2>Audit activity</h2><p>Recorded session, upload, and agent adapter events.</p></div></div><span className="status-chip"><span/> LOCAL EVENT LOG</span></div><div className="session-results">{activityEvents.length === 0 ? <div className="activity-empty"><span className="activity-pulse"><Activity size={15}/></span><div><strong>No recorded events yet</strong><p>Chat, uploads, and session changes will appear here.</p></div></div> : activityEvents.map(event => <article className="session-row audit-row" key={event.id}><span className="event-dot"/><span className="session-row-title"><strong>{event.action.replaceAll(".", " ")}</strong><small>{new Date(event.created_at).toLocaleString()} · {event.detail}</small></span></article>)}</div></section> : nav === "Round table" ? <section className="panel"><RoundTableDashboard sessions={state?.sessions || []} onNewRoundTable={() => { setNav('Agents'); setTeamsTab('group-create'); }} onJoinTable={(s: any) => void openSession(s)} /></section> : nav === "Knowledge intelligence" ? <section className="panel"><KnowledgeIntelligenceDashboard /></section> :
nav === "Failure analysis" ? <section className="panel"><FailureAnalysisDashboard /></section> :
nav === "Releases" ? <section className="panel"><ReleasesDashboard /></section> :
nav === "Environments" ? <section className="panel"><EnvironmentsDashboard /></section> :
nav === "Observability" ? <section className="panel"><ObservabilityDashboard /></section> :
nav === "Security" ? <section className="panel"><SecurityDashboard /></section> :
nav === "Development cycle" ? <DevelopmentCycleDashboard /> :
nav === "Development" ? <section className="panel"><DevelopmentDashboard /></section> : nav === "Reviews" ? <section className="panel"><ReviewsDashboard /></section> : nav === "Testing" ? <section className="panel"><TestingDashboard /></section> : nav === "Pull requests" ? <section className="panel"><PullRequestsDashboard /></section> : nav === "Repositories" ? <section className="panel"><RepositoriesDashboard /></section> : nav === "Analysis" ? <section className="panel"><AnalyticsDashboard /></section> : nav === "Profile" ? <section className="panel"><ProfilePanel /></section> : nav === "Plans" ? <section className="panel"><PlansDashboard /></section> : nav === "OKRs" ? <section className="panel"><OkrDashboard /></section> : nav === "Feature flags" ? <section className="panel"><FeatureFlagsDashboard /></section> : nav === "Incidents" ? <section className="panel"><IncidentsDashboard /></section> : nav === "Integrations" ? <section className="panel" style={{padding: "24px"}}><AppIntegrations /></section> : nav === "Azure DevOps" ? <section className="panel"><AzureDevOpsDashboard /></section> : nav === "Confluence" ? <section className="panel"><ConfluenceDashboard /></section> : nav !== "Command center" ? <section className="panel not-configured-hero">
  <div className="not-configured-icon"><Activity size={24}/></div>
  <h2>{nav}</h2>
  <p>This workspace module requires additional configuration. Connect an external integration or setup your provider to enable this capability.</p>
  <button className="primary-button" onClick={() => setNav("Settings")}>Go to settings</button>
</section> : <div className="dashboard-grid"><section className="chat-panel panel"><div className="panel-heading"><div className="panel-title-wrap"><span className="panel-icon"><MessageSquare size={15}/></span><div><h2>General session</h2><p>Persistent workspace conversation</p></div></div><div className="panel-tools"><span className="saved-label"><span/> SAVED</span><button className="icon-button" aria-label="Session options"><Menu size={16}/></button></div></div>
          <div className="conversation"><div className="date-divider"><span/> <span>SESSION ACTIVITY</span> <span/></div>{state.messages.length === 0 ? <div className="empty-conversation"><div className="empty-glyph"><Sparkles size={20}/></div><h3>Start with the work in front of you.</h3><p>Ask a question, explore an engineering decision, or bring an agent into the conversation.</p><div className="suggestions"><button onClick={() => setDraft("What should I focus on today?")}>What should I focus on today? <ArrowUpRight size={13}/></button><button onClick={() => setDraft("Help me think through an engineering decision")}>Think through a decision <ArrowUpRight size={13}/></button></div></div> : <div className="messages">{state.messages.map(message => <article key={message.id} className={`message ${message.role}`}><div className={`message-avatar ${message.role}`}>{message.role === "assistant" ? initials : "LD"}</div><div className="message-body"><div className="message-meta"><strong>{message.role === "assistant" ? message.agent ?? (selectedAgent ? `${selectedAgent.name} · ${selectedAgent.role}` : "Agent") : "Local developer"}</strong><span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><p>{message.content}</p>{message.role === "assistant" && <div className="evidence"><Sparkles size={12}/><span>{state.provider === "local" ? "Local development adapter" : "Configured model"}</span><span>·</span><span>Response recorded</span></div>}</div></article>)}{busy && <div className="typing"><span/><span/><span/> <small>Agent is responding</small></div>}<div ref={bottom}/></div>}
          </div>
          <form className="composer" onSubmit={sendMessage}><div className="composer-tools"><div className="custom-agent-select">
  <button type="button" aria-label="Choose agent" className={`custom-agent-trigger ${state.session.kind === "agent" ? "disabled" : ""}`} onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}>
    <span className="custom-agent-avatar">{initials}</span>
    <span>{selectedAgent ? selectedAgent.name : "Select Agent"}</span>
    <ChevronDown size={12} className="custom-agent-chevron"/>
  </button>
  {agentDropdownOpen && (
    <div className="custom-agent-dropdown">
      {agents.map(profile => (
        <button key={profile.id} type="button" className={`custom-agent-option ${agentId === profile.id ? "selected" : ""}`} onClick={() => { setAgentId(profile.id); setAgentDropdownOpen(false); }}>
          <span className="custom-agent-option-name">{profile.name}</span>
          <span className="custom-agent-option-role">{profile.role}</span>
        </button>
      ))}
    </div>
  )}
</div><span className="composer-hint">Selected persona is applied to each reply</span><label className="attach-button" title="Upload a document"><input type="file" accept=".txt,.md,.json,.csv,.pdf,.docx" onChange={event => void analyzeUpload(event.target.files?.[0])}/><Plus size={16}/></label></div><textarea id="composer" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Ask anything about your engineering work..." rows={2} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(event); } }}/><div className="composer-bottom"><span><kbd>↵</kbd> to send <span className="hint-gap"/><kbd>⇧ ↵</kbd> for new line</span><button type="submit" className="send-button" disabled={busy || !draft.trim()} aria-label="Send message"><Send size={15}/></button></div></form>
        </section>

        <aside className="right-rail"><section className="panel agent-card"><div className="rail-heading"><h2>Agent desk</h2><button className="text-link" onClick={() => setNav("Agents")}>Directory <ArrowUpRight size={12}/></button></div><div className="current-agent"><div className="agent-large">{initials}</div><div className="agent-info"><strong>{selectedAgent ? selectedAgent.name : "Loading agent profiles"}</strong><span style={{display:"block",fontSize:"10px",color:"var(--muted)",marginTop:"2px"}}>{selectedAgent?.role}</span><span><i/> {selectedAgent ? "Chat profile ready" : "Waiting for profile registry"}</span></div><button className="icon-button" aria-label="Agent settings"><ChevronDown size={16}/></button></div><div className="agent-details"><div><span>MODEL ROUTING</span><strong>{state.provider === "local" ? "Local development" : "Configured provider"}</strong></div><div><span>RESPONSE SIGNATURE</span><strong>{selectedAgent?.signature ?? "Loading profile"}</strong></div><div><span>PERMISSIONS</span><strong><ShieldCheck size={13}/> Session chat only</strong></div><div><span>CONTEXT</span><strong><span className="context-dot"/> Current message only</strong></div></div><div className="agent-note"><Sparkles size={14}/><span>{selectedAgent?.persona ?? "Agent profile details are loading."}</span></div></section>

          <section className="panel activity-card"><div className="rail-heading"><h2>Session activity</h2><button className="icon-button" aria-label="Activity options"><Menu size={15}/></button></div>{state.messages.length === 0 ? <div className="activity-empty"><span className="activity-pulse"><Activity size={15}/></span><div><strong>Standing by</strong><p>Agent activity appears here<br/>as work progresses.</p></div></div> : <div className="activity-event"><span className="event-dot"/><div><strong>Conversation updated</strong><p>{state.messages.length} messages · persisted locally</p><small>JUST NOW</small></div></div>}<button className="activity-footer" onClick={() => setNav("Activity")}>Open activity log <ArrowUpRight size={13}/></button></section>

          <section className="panel knowledge-card"><div className="knowledge-icon"><BookOpen size={15}/></div><div className="knowledge-copy"><h2>Engineering knowledge</h2><p>Build a shared memory your team can use.</p><button onClick={() => setNav("Settings")}>Configure workspace <ArrowUpRight size={12}/></button></div><div className="knowledge-art"><FileText size={34}/><div/></div></section>
          <div className="rail-footer"><span> AERO <span>·</span> FOUNDATION 0.1</span><button><CircleHelp size={13}/> Documentation</button></div>
        </aside></div>}
        {notice && <div className="toast" role="status"><Check size={15}/>{notice}<button aria-label="Dismiss" onClick={() => setNotice("")}><X size={14}/></button></div>}
        <footer className="page-footer"><span>Workspace data persists on this machine.</span><span><span className="footer-dot"/> {state.provider === "local" ? "LOCAL DEVELOPMENT MODE" : "PROVIDER CONNECTED"}</span></footer>
      </div></div>
    </section>
  </main>;
}

