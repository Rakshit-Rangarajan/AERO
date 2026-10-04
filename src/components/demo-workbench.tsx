"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CircleAlert, Clock3, Play, Radio, RotateCw, ShieldCheck, Sparkles } from "lucide-react";
import { demoWorkflows } from "@/lib/demo-catalog";

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

  if (!workflow) return <section className="demo-panel panel"><div className="demo-heading"><span className="demo-icon"><Sparkles size={16}/></span><div><span className="demo-eyebrow">LOCAL FEATURE CATALOG</span><h2>Demo workbench</h2><p>Select a feature from the workspace navigation to walk through its local simulation.</p></div><span className="demo-mode-pill"><Radio size={12}/> DEMO MODE</span></div><div className="demo-catalog-grid">{demoWorkflows.map(item => <button key={item.id} onClick={() => window.dispatchEvent(new CustomEvent("aero:navigate", { detail: item.nav }))}><span>{item.eyebrow}</span><strong>{item.title}</strong><small>{item.description}</small><i>{item.actions.length} guided steps <ArrowRight size={12}/></i></button>)}</div></section>;

  const completed = new Set(runs.filter(run => run.workflowId === workflow.id).map(run => run.actionId));
  const latestRun = runs.find(run => run.workflowId === workflow.id);

  return <section className="demo-panel panel">
    <header className="demo-heading"><span className="demo-icon"><Sparkles size={16}/></span><div><span className="demo-eyebrow">{workflow.eyebrow}</span><h2>{workflow.title}</h2><p>{workflow.description}</p></div><span className="demo-mode-pill"><Radio size={12}/> DEMO MODE</span></header>
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
