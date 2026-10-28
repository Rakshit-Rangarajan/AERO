"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CircleAlert, Clock3, Play, Radio, RotateCw, ShieldCheck, Sparkles } from "lucide-react";
import { demoWorkflows } from "@/lib/demo-catalog";
import { presenterProgress, presenterSteps } from "@/lib/presenter-journey";

type Run = { id: string; workflowId: string; actionId: string; result: string; createdAt: string };
type DemoState = { mode: string; workflows: typeof demoWorkflows; runs: Run[] };

export function DemoWorkbench({ nav }: { nav: string }) {
  const [data, setData] = useState<DemoState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [targetBranch, setTargetBranch] = useState("develop");
  const workflowId = nav === "Work items" ? "jira-analysis" : nav === "Knowledge" ? "knowledge-intelligence" : undefined;
  const workflow = useMemo(() => demoWorkflows.find(item => item.id === workflowId || (!workflowId && item.nav === nav)), [nav, workflowId]);
  const runs = data?.runs ?? [];
  const journey = presenterProgress(runs);
  const guidedSteps = presenterSteps();

  useEffect(() => {
    let active = true;
    fetch("/api/demo").then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load demo state.");
      if (active) setData(result);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Could not load demo state."); });
    return () => { active = false; };
  }, []);

  async function runAction(workflowId: string, actionId: string) {
    const key = `${workflowId}:${actionId}`;
    setBusy(key); setError(""); setNotice("");
    try {
      const response = await fetch("/api/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ workflowId, actionId, targetBranch }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Demo action failed.");
      setData(current => current ? { ...current, runs: result.runs } : current);
      setNotice("Simulation saved to the local demo log.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Demo action failed."); }
    finally { setBusy(null); }
  }

  function exportEvidence() {
    const payload = { title: "AERO deterministic local demo evidence", mode: "DEMO MODE / SIMULATION ONLY",
      exportedAt: new Date().toISOString(), progress: { completed: journey.completed, total: journey.total },
      steps: guidedSteps.map(step => ({ workflow: step.workflow.title, action: step.action.label,
        completed: runs.some(run => run.workflowId === step.workflowId && run.actionId === step.actionId) })),
      runs: runs.map(run => ({ workflowId: run.workflowId, actionId: run.actionId, createdAt: run.createdAt,
        output: (() => { try { return JSON.parse(run.result).output ?? ""; } catch { return "Unavailable"; } })() })) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "aero-simulated-demo-evidence.json";
    anchor.click(); URL.revokeObjectURL(url);
  }

  const presenter = <div className="demo-presenter" style={{ padding: "20px", border: "1px solid #64748b66", borderRadius: 16, marginBottom: 20 }}>
    <div style={{display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
      <div><span className="demo-eyebrow">PRESENTER MODE · PAY-421 · SIMULATION ONLY</span><h3 style={{margin:"6px 0"}}>End-to-end guided demo</h3>
        <p style={{margin:0}}>Walk through intake → multi-agent analysis → approval → implementation → QA → release → knowledge.</p></div>
      <strong>{journey.completed} / {journey.total} steps</strong>
    </div>
    <div role="progressbar" aria-label="Demo progress" aria-valuemin={0} aria-valuemax={journey.total} aria-valuenow={journey.completed}
       style={{height:8,background:"#64748b55",borderRadius:8,margin:"16px 0",overflow:"hidden"}}>
      <div style={{width:`${journey.completed / journey.total * 100}%`,height:"100%",background:"#38bdf8"}} />
    </div>
    {journey.next ? <div style={{marginBottom:12}}><strong>Next: {journey.next.action.label}</strong><p style={{margin:"4px 0"}}>{journey.next.takeaway}</p></div>
      : <p><Check size={14} /> Presenter journey completed. All results remain simulated.</p>}
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {journey.next && <button className="demo-run-button" onClick={() => window.dispatchEvent(new CustomEvent("aero:navigate", {detail:journey.next?.workflow.nav}))}>
        <ArrowRight size={13}/> Go to next step: {journey.next.workflow.nav}</button>}
      <button className="demo-run-button" onClick={exportEvidence} disabled={!runs.length}>Export simulated evidence (JSON)</button>
    </div>
    <details style={{marginTop:14}}><summary>View all presenter chapters</summary>
      <ol style={{paddingLeft:22}}>{guidedSteps.map((step,index) => <li key={index} style={{padding:"5px 0"}}>
        {runs.some(run => run.workflowId===step.workflowId && run.actionId===step.actionId) ? "✓ " : "○ "}
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("aero:navigate",{detail:step.workflow.nav}))}
          style={{background:"none",border:0,color:"inherit",textDecoration:"underline",cursor:"pointer"}}>{step.action.label}</button> — {step.takeaway}
      </li>)}</ol>
    </details>
  </div>;

  if (!workflow) return <section className="demo-panel panel"><div className="demo-heading"><span className="demo-icon"><Sparkles size={16}/></span><div><span className="demo-eyebrow">LOCAL FEATURE CATALOG</span><h2>Demo workbench</h2><p>Select a feature from the workspace navigation to walk through its local simulation.</p></div><span className="demo-mode-pill"><Radio size={12}/> DEMO MODE</span></div>{presenter}<div className="demo-catalog-grid">{demoWorkflows.map(item => <button key={item.id} onClick={() => window.dispatchEvent(new CustomEvent("aero:navigate", { detail: item.nav }))}><span>{item.eyebrow}</span><strong>{item.title}</strong><small>{item.description}</small><i>{item.actions.length} guided steps <ArrowRight size={12}/></i></button>)}</div></section>;

  const completed = new Set(runs.filter(run => run.workflowId === workflow.id).map(run => run.actionId));
  const latestRun = runs.find(run => run.workflowId === workflow.id);

  return <section className="demo-panel panel">
    <header className="demo-heading"><span className="demo-icon"><Sparkles size={16}/></span><div><span className="demo-eyebrow">{workflow.eyebrow}</span><h2>{workflow.title}</h2><p>{workflow.description}</p></div><span className="demo-mode-pill"><Radio size={12}/> DEMO MODE</span></header>
    {presenter}
    <div className="demo-warning"><ShieldCheck size={15}/><span><strong>Simulation only.</strong> No external service, repository, browser, model trace, or environment is accessed. Results below are deterministic fixtures saved locally.</span></div>
    {error && <div className="demo-error" role="alert"><CircleAlert size={14}/>{error}</div>}
    {notice && <div className="demo-notice" role="status"><Check size={14}/>{notice}</div>}
    {workflow.id === "pull-requests" && <label className="demo-branch-field"><span>DEMO TARGET BRANCH</span><input value={targetBranch} onChange={event => setTargetBranch(event.target.value)} maxLength={100} placeholder="develop"/><small>Used only in the saved PR preview; no branch or PR is created.</small></label>}
    <div className="demo-steps">{workflow.actions.map((action, index) => {
      const actionRuns = runs.filter(run => run.workflowId === workflow.id && run.actionId === action.id);
      const latest = actionRuns[0];
      const isBusy = busy === `${workflow.id}:${action.id}`;
      const locked = Boolean(action.requires && !runs.some(run => run.workflowId === action.requires?.workflowId && run.actionId === action.requires?.actionId));
      let output = "";
      if (latest) { try { output = (JSON.parse(latest.result) as { output?: string }).output ?? latest.result; } catch { output = latest.result; } }
      return <article className={`demo-step ${completed.has(action.id) ? "complete" : ""}`} key={action.id}>
        <div className="demo-step-index">{completed.has(action.id) ? <Check size={14}/> : String(index + 1).padStart(2,"0")}</div>
        <div className="demo-step-main"><div className="demo-step-top"><div><h3>{action.label}</h3>{action.requires && <small><LockKeyholeIcon/> Requires previous approval or workflow evidence</small>}</div><button className="demo-run-button" disabled={Boolean(busy) || locked} onClick={() => void runAction(workflow.id, action.id)}>{isBusy ? <RotateCw size={13} className="demo-spin"/> : completed.has(action.id) ? <RotateCw size={13}/> : <Play size={12}/>} {isBusy ? "Saving…" : completed.has(action.id) ? "Run again" : "Run demo"}</button></div>
          {output && <div className="demo-output"><span>SIMULATED OUTPUT</span><p>{output}</p><small><Clock3 size={11}/> Saved {latest ? new Date(latest.createdAt).toLocaleString() : ""}</small></div>}
          {!output && <p className="demo-step-empty">{locked ? "Complete the required step first; this action will unlock automatically." : "Run this step to create a clearly labeled sample artifact."}</p>}
        </div>
      </article>;
    })}</div>
    <footer className="demo-footer"><span><span className="local-presence-dot"/> {completed.size} of {workflow.actions.length} steps recorded</span><span>{latestRun ? `Latest activity ${new Date(latestRun.createdAt).toLocaleString()}` : "No activity recorded yet"}</span></footer>
  </section>;
}

function LockKeyholeIcon() {
  return <span aria-hidden="true" className="demo-lock-icon">GATE</span>;
}
