"use client";

import { useState } from "react";
import { ToggleRight, ToggleLeft, Users, Globe, Lock, Plus, Pencil } from "lucide-react";
import { useRecordComposer } from "@/components/records/record-composer";
import { useRecords } from "@/components/records/use-records";

export function FeatureFlagsDashboard() {
  const isDemo = false;
  const state = useRecords("feature-flag");
  const { composer, openNew, openEdit } = useRecordComposer("feature-flag", state);

  const dbFlags = state.records.map(r => ({
    id: r.id,
    record: r,
    name: r.title,
    desc: r.subtitle || "No description",
    env: r.metrics.env || "Production",
    status: r.status || "off",
    rollout: r.metrics.rollout || "0%",
    target: r.metrics.target || "Everyone",
    icon: Globe,
    color: r.status === 'live' ? 'var(--mint)' : r.status === 'ramping' ? 'var(--blue)' : 'var(--muted)'
  }));

  const activeFlags = dbFlags;

  return (
    <div className="knowledge-page">
      {composer}
      <div className="panel-heading">
        <div className="panel-title-wrap">
          <span className="panel-icon"><ToggleRight size={15}/></span>
          <div>
            <h2>Feature Flags</h2>
            <p>Manage progressive delivery, dark launches, and A/B experiments.</p>
          </div>
        </div>
        <div className="panel-tools">
          <button className="primary-button" onClick={() => openNew()} style={{fontSize: '11px', padding: '6px 12px'}}>+ Create Flag</button>
        </div>
      </div>

      {!isDemo && activeFlags.length === 0 ? (
        <div className="activity-empty" style={{ margin: '0 24px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '16px', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '16px' }}>
          <span className="activity-pulse" style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)' }}><ToggleRight size={24} color="var(--muted)"/></span>
          <div>
            <strong style={{ fontSize: '16px', color: 'var(--text)' }}>No Feature Flags</strong>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px', maxWidth: '300px' }}>Create a feature flag to manage progressive delivery for your application.</p>
          </div>
          <button className="primary-button" onClick={() => openNew()} style={{ marginTop: '12px' }}>Create Feature Flag</button>
        </div>
      ) : (
        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeFlags.map((flag, i) => (
            <div key={'id' in flag ? flag.id : i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '12px' }}>
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
                {!isDemo && 'record' in flag && (
                  <button className="icon-button" onClick={() => openEdit(flag.record as any)} style={{background: 'rgba(255,255,255,0.05)'}}><Pencil size={14}/></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
