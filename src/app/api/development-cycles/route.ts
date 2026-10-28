import { NextRequest, NextResponse } from "next/server";
import { getDb, recordAudit } from "@/lib/db";
import { cycleStages, cycleTransition } from "@/lib/development-cycle";

export const runtime = "nodejs";
function ensureSchema() {
 const db=getDb();
 db.exec(`CREATE TABLE IF NOT EXISTS development_cycles (
  id TEXT PRIMARY KEY, ticket TEXT NOT NULL, title TEXT NOT NULL, repo TEXT NOT NULL,
  current_stage INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
 ); CREATE TABLE IF NOT EXISTS development_cycle_events (
  id TEXT PRIMARY KEY, cycle_id TEXT NOT NULL REFERENCES development_cycles(id),
  stage_id TEXT NOT NULL, decision TEXT NOT NULL, evidence TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TEXT NOT NULL
 ); CREATE INDEX IF NOT EXISTS dev_cycle_events_by_cycle ON development_cycle_events(cycle_id,created_at);`);
 return db;
}
function list() {
 const db=ensureSchema();
 const cycles=db.prepare("SELECT id,ticket,title,repo,current_stage AS currentStage,created_at AS createdAt,updated_at AS updatedAt FROM development_cycles ORDER BY updated_at DESC").all();
 const events=db.prepare("SELECT id,cycle_id AS cycleId,stage_id AS stageId,decision,evidence,actor,created_at AS createdAt FROM development_cycle_events ORDER BY created_at").all();
 return {cycles,events,stages:cycleStages,mode:"MANUAL EVIDENCE TRACKER — NO AUTOMATED EXECUTION"};
}
export async function GET(){return NextResponse.json(list());}
export async function POST(request:NextRequest){
 const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
 const ticket=typeof body?.ticket==="string"?body.ticket.trim():"";
 const title=typeof body?.title==="string"?body.title.trim():"";
 const repo=typeof body?.repo==="string"?body.repo.trim():"";
 if(!/^[A-Za-z][A-Za-z0-9-]{1,39}$/.test(ticket)||!title||title.length>160||repo.length>300)
  return NextResponse.json({error:"Provide a valid ticket, title (up to 160), and repository (up to 300)."}, {status:400});
 const db=ensureSchema(),id=crypto.randomUUID(),now=new Date().toISOString();
 db.prepare("INSERT INTO development_cycles(id,ticket,title,repo,created_at,updated_at) VALUES(?,?,?,?,?,?)").run(id,ticket,title,repo,now,now);
 recordAudit(null,"cycle.created",JSON.stringify({id,ticket}));
 return NextResponse.json(list(),{status:201});
}
export async function PATCH(request:NextRequest){
 const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
 if(typeof body?.id!=="string"||typeof body.evidence!=="string"||typeof body.actor!=="string"||!body.actor.trim()||body.actor.length>100)
  return NextResponse.json({error:"Cycle id, evidence and actor are required."},{status:400});
 const db=ensureSchema();
 const cycle=db.prepare("SELECT current_stage AS stage FROM development_cycles WHERE id=?").get(body.id) as {stage:number}|undefined;
 if(!cycle)return NextResponse.json({error:"Cycle not found."},{status:404});
 if(cycle.stage>=cycleStages.length)return NextResponse.json({error:"Cycle already completed."},{status:409});
 let result:ReturnType<typeof cycleTransition>;
 try {result=cycleTransition(cycle.stage,body.approved===true,body.evidence);}
 catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Invalid transition."},{status:409});}
 const now=new Date().toISOString();
 // Optimistic concurrency rejects concurrent duplicate stage completion.
 const updated=db.prepare("UPDATE development_cycles SET current_stage=?,updated_at=? WHERE id=? AND current_stage=?").run(result.nextStage,now,body.id,cycle.stage);
 if(updated.changes!==1)return NextResponse.json({error:"Cycle changed. Refresh and try again."},{status:409});
 db.prepare("INSERT INTO development_cycle_events(id,cycle_id,stage_id,decision,evidence,actor,created_at) VALUES(?,?,?,?,?,?,?)")
  .run(crypto.randomUUID(),body.id,result.stageId,result.decision,body.evidence.trim(),body.actor.trim(),now);
 recordAudit(null,"cycle.stage.recorded",JSON.stringify({id:body.id,stageId:result.stageId,decision:result.decision}));
 return NextResponse.json(list());
}
