import { NextRequest, NextResponse } from "next/server";
import { getDemoWorkflow, demoWorkflows } from "@/lib/demo-catalog";
import { getDb, recordAudit } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const runs = getDb().prepare(`SELECT id,workflow_id AS workflowId,action_id AS actionId,result,created_at AS createdAt
    FROM demo_runs ORDER BY created_at DESC`).all();
  return NextResponse.json({ mode: "DEMO MODE", workflows: demoWorkflows, runs });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { workflowId?: unknown; actionId?: unknown; targetBranch?: unknown } | null;
  if (typeof body?.workflowId !== "string" || typeof body.actionId !== "string") {
    return NextResponse.json({ error: "Choose a demo workflow and action." }, { status: 400 });
  }
  const workflow = getDemoWorkflow(body.workflowId);
  const action = workflow?.actions.find(item => item.id === body.actionId);
  if (!workflow || !action) return NextResponse.json({ error: "That demo action is not available." }, { status: 404 });

  const db = getDb();
  if (action.requires) {
    const completed = db.prepare("SELECT 1 FROM demo_runs WHERE workflow_id=? AND action_id=? LIMIT 1")
      .get(action.requires.workflowId, action.requires.actionId);
    if (!completed) {
      const requiredWorkflow = getDemoWorkflow(action.requires.workflowId);
      const requiredAction = requiredWorkflow?.actions.find(item => item.id === action.requires?.actionId);
      return NextResponse.json({ error: `Complete “${requiredAction?.label ?? "the required step"}” in ${requiredWorkflow?.nav ?? "the required workflow"} first.` }, { status: 409 });
    }
  }

  const targetBranch = typeof body.targetBranch === "string" ? body.targetBranch.trim() : "develop";
  if (workflow.id === "pull-requests" && (!/^[A-Za-z0-9._/-]{1,100}$/.test(targetBranch) || targetBranch.startsWith("-") || targetBranch.includes(".."))) {
    return NextResponse.json({ error: "Enter a valid sample target branch name." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const result = { mode: "DEMO MODE", workflow: workflow.title, action: action.label, output: action.output.replaceAll("{{targetBranch}}", targetBranch) };
  db.prepare("INSERT INTO demo_runs(id,workflow_id,action_id,result,created_at) VALUES(?,?,?,?,?)")
    .run(id, workflow.id, action.id, JSON.stringify(result), now);
  recordAudit(null, "demo.action", JSON.stringify({ workflowId: workflow.id, actionId: action.id, mode: "DEMO MODE" }));
  const runs = db.prepare(`SELECT id,workflow_id AS workflowId,action_id AS actionId,result,created_at AS createdAt
    FROM demo_runs ORDER BY created_at DESC`).all();
  return NextResponse.json({ result, runs, mode: "DEMO MODE" }, { status: 201 });
}
