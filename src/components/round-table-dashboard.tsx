"use client";

import { useState } from "react";
import { Sparkles, Users, Search, Play, Settings, Bot, ArrowRight, MessageSquare, Plus } from "lucide-react";

export function RoundTableDashboard({ sessions = [], onNewRoundTable = () => {}, onJoinTable = (s: any) => {} }: any) {
  const [search, setSearch] = useState("");

  const groupSessions = sessions.filter((s: any) => s.kind === "group");
  const filteredSessions = groupSessions.filter((s: any) => s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="repos-dashboard">
      <div className="repos-header">
        <div className="repos-title">
          <h2>Round Table Conferences</h2>
          <p>Orchestrate autonomous, multi-agent discussions to solve complex engineering problems.</p>
        </div>
        <div className="repos-actions">
          <div className="repos-search">
            <Search size={14} />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search conferences..."
            />
          </div>
          <button onClick={onNewRoundTable} className="primary-button bg-mint text-black border-none" style={{background: 'var(--mint)', color: '#000'}}><Plus size={14}/> New Round Table</button>
        </div>
      </div>

      <div className="test-overview">
        <div className="test-metric-card">
          <span>Active Conferences</span>
          <strong className="text-mint">{groupSessions.length}</strong>
          <Users size={16} className="text-mint"/>
        </div>
        <div className="test-metric-card">
          <span>Agents Engaged</span>
          <strong>{groupSessions.reduce((acc: number, s: any) => acc + (s.participants?.length || 0), 0)}</strong>
          <Bot size={16} className="text-purple"/>
        </div>
        <div className="test-metric-card">
          <span>Decisions Reached</span>
          <strong>0</strong>
          <Sparkles size={16} className="text-blue"/>
        </div>
      </div>

      <div className="pr-list">
        {filteredSessions.map((rt: any) => (
          <article key={rt.id} className="pr-row">
            <div className="pr-icon">
              <Sparkles size={16} className="text-mint"/>
            </div>
            
            <div className="pr-main">
              <div className="pr-title-row">
                <strong>{rt.title}</strong>
                <span className="pr-badge" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid var(--line)', color: 'var(--muted)'}}>{rt.participants?.length || 2} Agents</span>
                <span className="pr-badge" style={{color: '#6db38a', border: '1px solid #6db38a', background: 'rgba(109,179,138,0.1)'}}>In Progress</span>
              </div>
              <div className="pr-meta">
                <span>{rt.messages || 0} messages</span>
                <span>Updated: <strong>{new Date(rt.updatedAt).toLocaleString()}</strong></span>
              </div>
            </div>
            
            <div className="pr-stats">
              <div className="review-actions">
                <button onClick={() => onJoinTable(rt)} className="primary-button" style={{height: '28px', fontSize: '11px', padding: '0 12px'}}><Play size={12}/> Join Table</button>
                <button className="icon-button" aria-label="Settings"><Settings size={14}/></button>
              </div>
            </div>
          </article>
        ))}
        {filteredSessions.length === 0 && (
          <div className="activity-empty" style={{ marginTop: '40px' }}>
            <div className="activity-pulse"><Sparkles size={16}/></div>
            <div>
              <strong>Autonomous Problem Solving</strong>
              <p>Create a Round Table to let agents debate architecture, triage bugs, or review code together.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
