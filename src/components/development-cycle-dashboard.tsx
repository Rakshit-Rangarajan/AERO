"use client";
import { useEffect,useState } from "react";
import { cycleStages,humanGates } from "@/lib/development-cycle";
type Cycle={id:string;ticket:string;title:string;repo:string;currentStage:number};
type Event={id:string;cycleId:string;stageId:string;decision:string;evidence:string;actor:string;createdAt:string};
export function DevelopmentCycleDashboard(){
 const [cycles,setCycles]=useState<Cycle[]>([]),[events,setEvents]=useState<Event[]>([]);
 const [selected,setSelected]=useState(""),[ticket,setTicket]=useState("PAY-421"),[title,setTitle]=useState("Bound payment retry timeouts");
 const [repo,setRepo]=useState("payments-service"),[actor,setActor]=useState("Presenter"),[evidence,setEvidence]=useState("");
 const [approved,setApproved]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function load(){const r=await fetch("/api/development-cycles");const json=await r.json();if(!r.ok)throw Error(json.error??"Could not load cycles");setCycles(json.cycles);setEvents(json.events);setSelected(previous=>previous||json.cycles[0]?.id||"");}
 useEffect(()=>{void load().catch(e=>setError(String(e)));},[]);
 async function send(method:"POST"|"PATCH",payload:unknown){setBusy(true);setError("");try{const r=await fetch("/api/development-cycles",{method,headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const json=await r.json();if(!r.ok)throw Error(json.error??"Could not save");setCycles(json.cycles);setEvents(json.events);if(method==="POST")setSelected(json.cycles[0]?.id??"");setEvidence("");setApproved(false);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
 const cycle=cycles.find(c=>c.id===selected),stage=cycleStages[cycle?.currentStage??0],gate=stage&&humanGates.includes(stage.id);
 return <section className="demo-panel panel" style={{padding:24}}>
 <div className="demo-heading"><div><span className="demo-eyebrow">EVIDENCE-BASED WORKFLOW · HUMAN IN LOOP</span><h2>Automated development cycle — control plane</h2><p>Persist lifecycle evidence and approval decisions. Actual code execution and integrations are not yet connected.</p></div><span className="demo-mode-pill">MANUAL TRACKER</span></div>
 <div className="demo-warning"><strong>Not an autonomous coding engine.</strong> Recording a stage does not execute agents, scan source, run tests, create a PR or deploy. Only enter evidence from independently verified work.</div>
 {error&&<p role="alert" className="demo-error">{error}</p>}
 <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"18px 0"}}>
 <input aria-label="Ticket" placeholder="Ticket ID" value={ticket} onChange={e=>setTicket(e.target.value)}/>
 <input aria-label="Work item title" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)}/>
 <input aria-label="Repository" placeholder="Repository" value={repo} onChange={e=>setRepo(e.target.value)}/>
 <button disabled={busy} className="demo-run-button" onClick={()=>void send("POST",{ticket,title,repo})}>Create tracked cycle</button></div>
 <label>Active cycle <select style={{marginLeft:8}} value={selected} onChange={e=>setSelected(e.target.value)}>
 <option value="">Choose a cycle</option>{cycles.map(c=><option key={c.id} value={c.id}>{c.ticket} — {c.title}</option>)}</select></label>
 {cycle&&<div style={{marginTop:20}}>
 <p><strong>{cycle.ticket}</strong> · {cycle.title} · {cycle.repo||"Repository not linked"}</p>
 <div role="progressbar" aria-label="Lifecycle completion" aria-valuemin={0} aria-valuemax={cycleStages.length} aria-valuenow={cycle.currentStage} style={{height:9,background:"#64748b55",borderRadius:9,overflow:"hidden"}}><div style={{height:"100%",width:`${cycle.currentStage/cycleStages.length*100}%`,background:"#38bdf8"}}/></div>
 <p>{cycle.currentStage} of {cycleStages.length} stages documented</p>
 <ol style={{paddingLeft:24}}>{cycleStages.map((s,index)=><li key={s.id} style={{padding:"7px 0",opacity:index>cycle.currentStage?.6:1}}>
 {index<cycle.currentStage?"✓ ":index===cycle.currentStage?"➤ ":"○ "}<strong>{s.label}</strong> · {s.owner}{humanGates.includes(s.id)?" · HUMAN GATE":""}<div style={{fontSize:12}}>{s.evidence}</div></li>)}</ol>
 {stage?<div style={{border:"1px solid #64748b77",padding:18,borderRadius:12}}>
 <h3>Current checkpoint: {stage.label}</h3><p>Evidence expected: {stage.evidence}</p>
 <input aria-label="Evidence author" placeholder="Reviewer name" value={actor} onChange={e=>setActor(e.target.value)}/>
 <textarea aria-label="Stage evidence" value={evidence} onChange={e=>setEvidence(e.target.value)} rows={4} maxLength={4000} placeholder="Reference verified artifacts, decisions, PR links or test results. Do not invent outcomes." style={{display:"block",width:"100%",margin:"10px 0"}}/>
 {gate&&<label style={{display:"block",margin:"12px 0"}}><input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/> I explicitly approve this checkpoint based on the evidence above</label>}
 <button className="demo-run-button" disabled={busy||!evidence.trim()||(Boolean(gate)&&!approved)} onClick={()=>void send("PATCH",{id:cycle.id,actor,evidence,approved})}>{gate?"Record human approval":"Record verified completion"}</button>
 </div>:<p>All stages have been documented. Check audit evidence before interpreting this as a verified release.</p>}
 <h3 style={{marginTop:20}}>Audit trail</h3>{events.filter(e=>e.cycleId===cycle.id).map(e=><article key={e.id} style={{borderBottom:"1px solid #64748b44",padding:"8px 0"}}><strong>{e.stageId} · {e.decision}</strong><p>{e.evidence}</p><small>{e.actor} · {new Date(e.createdAt).toLocaleString()}</small></article>)}
 </div>}</section>;
}
