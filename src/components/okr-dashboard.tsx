"use client";

import { Target, Flag, TrendingUp, Plus, Pencil } from "lucide-react";
import { useRecordComposer } from "@/components/records/record-composer";
import { useRecords } from "@/components/records/use-records";

export function OkrDashboard() {
  const isDemo = false;
  const state = useRecords("okr");
  const { composer, openNew, openEdit } = useRecordComposer("okr", state);

  const dbOkrs = state.records.map(r => ({
    id: r.id,
    record: r,
    objective: r.title,
    progress: Number(r.metrics.progress || 0),
    krs: [
      r.metrics.kr1 ? { name: String(r.metrics.kr1), progress: Number(r.metrics.kr1_prog || 0), current: `${r.metrics.kr1_prog || 0}%` } : null,
      r.metrics.kr2 ? { name: String(r.metrics.kr2), progress: Number(r.metrics.kr2_prog || 0), current: `${r.metrics.kr2_prog || 0}%` } : null,
      r.metrics.kr3 ? { name: String(r.metrics.kr3), progress: Number(r.metrics.kr3_prog || 0), current: `${r.metrics.kr3_prog || 0}%` } : null,
    ].filter(Boolean) as { name: string, progress: number, current: string }[]
  }));

  const activeOkrs = dbOkrs;

  return (
    <div className="knowledge-page">
      {composer}
      <div className="panel-heading">
        <div className="panel-title-wrap">
          <span className="panel-icon"><Target size={15}/></span>
          <div>
            <h2>Objectives & Key Results (OKRs)</h2>
            <p>Aligning engineering execution with corporate product strategy.</p>
          </div>
        </div>
        <div className="panel-tools">
          <button className="primary-button" onClick={() => openNew()} style={{fontSize: '11px', padding: '6px 12px'}}>+ Create OKR</button>
        </div>
      </div>

      {!isDemo && activeOkrs.length === 0 ? (
        <div className="activity-empty" style={{ margin: '0 24px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '16px', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '16px' }}>
          <span className="activity-pulse" style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.05)' }}><Target size={24} color="var(--muted)"/></span>
          <div>
            <strong style={{ fontSize: '16px', color: 'var(--text)' }}>No OKRs Defined</strong>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px', maxWidth: '300px' }}>Create your first Objective and Key Results to align your team.</p>
          </div>
          <button className="primary-button" onClick={() => openNew()} style={{ marginTop: '12px' }}>Create OKR</button>
        </div>
      ) : (
        <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeOkrs.map((okr, i) => (
            <div key={('id' in okr ? okr.id : i) as string | number} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line)', borderRadius: '16px', padding: '20px', position: 'relative' }}>
              {!isDemo && 'record' in okr && (
                <button className="icon-button" onClick={() => openEdit(okr.record as any)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.05)' }}><Pencil size={14}/></button>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingRight: '40px' }}>
                <h3 style={{ fontSize: '15px', color: 'var(--text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={16} color="var(--mint)" /> {okr.objective}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600 }}>{okr.progress}%</span>
                  <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${okr.progress}%`, height: '100%', background: 'var(--mint)' }} />
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '24px' }}>
                {okr.krs.map((kr, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.05em' }}>KEY RESULT {j + 1}</span>
                      <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{kr.name}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--muted)', width: '60px', textAlign: 'right' }}>{kr.current}</span>
                      <div style={{ width: '80px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${kr.progress}%`, height: '100%', background: 'var(--blue)' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
