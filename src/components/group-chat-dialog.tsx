"use client";

import { useState } from "react";
import { Check, LoaderCircle, UsersRound, X } from "lucide-react";

type Agent = { id: string; name: string; role: string; signature: string };

export function GroupChatDialog({ agents, onClose, onCreate }: { agents: Agent[]; onClose: () => void; onCreate: (title: string, agentIds: string[]) => Promise<boolean> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected(current => current.includes(id) ? current.filter(item => item !== id) : current.length >= 6 ? current : [...current, id]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (selected.length < 2) { setError("Select at least two agents to start a group chat."); return; }
    setBusy(true); setError("");
    const created = await onCreate(title.trim(), selected);
    setBusy(false);
    if (!created) setError("The group chat could not be created. Please try again.");
  }

  return <div className="group-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <form className="group-dialog panel" role="dialog" aria-modal="true" aria-labelledby="group-dialog-title" onSubmit={event => void submit(event)}>
      <header className="group-dialog-header"><span className="panel-icon"><UsersRound size={16}/></span><div><h2 id="group-dialog-title">Start a group chat</h2><p>Bring 2–6 agents into one conversation.</p></div><button type="button" className="icon-button" aria-label="Close group chat dialog" disabled={busy} onClick={onClose}><X size={17}/></button></header>
      <label className="group-title-field"><span>GROUP NAME <small>OPTIONAL</small></span><input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} placeholder="e.g. Payments launch review"/></label>
      <div className="group-agent-heading"><strong>Choose agents</strong><span>{selected.length} / 6</span></div>
      <div className="group-agent-options">{agents.map(agent => {
        const checked = selected.includes(agent.id);
        return <button type="button" key={agent.id} className={`group-agent-option ${checked ? "selected" : ""}`} aria-pressed={checked} disabled={!checked && selected.length >= 6 || busy} onClick={() => toggle(agent.id)}><span className="group-agent-check">{checked && <Check size={13}/>}</span><span className="group-agent-copy"><strong>{agent.name}</strong><small>{agent.role}</small></span><span className="group-agent-signature">{agent.signature}</span></button>;
      })}</div>
      <p className="group-cost-note">Each message requests one response from every selected agent. Provider usage and charges can increase with group size.</p>
      {error && <p className="group-dialog-error" role="alert">{error}</p>}
      <footer className="group-dialog-footer"><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={busy || selected.length < 2}>{busy ? <LoaderCircle size={14} className="spin"/> : <UsersRound size={14}/>} Create group chat</button></footer>
    </form>
  </div>;
}
