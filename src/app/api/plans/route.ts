import { NextRequest, NextResponse } from "next/server";
import { addPhase, createMilestone, createPlan, deleteMilestone, deletePlan, demoModeEnabled, listMilestones, listPlans, seedDemoWorkspace, updateMilestone, updatePhase, updatePlan } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET() {
  if (demoModeEnabled()) seedDemoWorkspace();
  return NextResponse.json({ plans: listPlans(), milestones: listMilestones(), demoMode: demoModeEnabled() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "A plan payload is required." }, { status: 400 });
  const kind = body.kind === "phase" ? "phase" : body.kind === "milestone" ? "milestone" : "plan";
  const text = (key: string) => (typeof body[key] === "string" ? String(body[key]).trim() : "");

  if (kind === "milestone") {
    if (!text("title") || !text("dueDate")) return NextResponse.json({ error: "A milestone needs a title and a due date." }, { status: 400 });
    createMilestone({ planId: text("planId") || null, title: text("title"), dueDate: text("dueDate") });
    return NextResponse.json({ plans: listPlans(), milestones: listMilestones() }, { status: 201 });
  }

  if (kind === "phase") {
    if (!text("planId") || !text("name") || !text("start") || !text("end")) {
      return NextResponse.json({ error: "A phase needs a plan, a name, and a start and end date." }, { status: 400 });
    }
    if (new Date(text("end")) <= new Date(text("start"))) {
      return NextResponse.json({ error: "A phase must end after it starts." }, { status: 400 });
    }
    const created = addPhase(text("planId"), { name: text("name"), start: text("start"), end: text("end") });
    if (!created) return NextResponse.json({ error: "That plan no longer exists." }, { status: 404 });
    return NextResponse.json({ plans: listPlans(), milestones: listMilestones() }, { status: 201 });
  }

  if (!text("title") || !text("start") || !text("end")) {
    return NextResponse.json({ error: "A plan needs a title, a start date, and an end date." }, { status: 400 });
  }
  if (new Date(text("end")) <= new Date(text("start"))) {
    return NextResponse.json({ error: "A plan must end after it starts." }, { status: 400 });
  }
  const tags = Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 8) : [];
  createPlan({
    title: text("title"),
    owner: text("owner"),
    team: text("team"),
    description: text("description"),
    start: text("start"),
    end: text("end"),
    tags,
  });
  return NextResponse.json({ plans: listPlans(), milestones: listMilestones() }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "An update payload is required." }, { status: 400 });
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "An id is required." }, { status: 400 });

  if (typeof body.phaseId === "string" && typeof body.phaseStatus === "string") {
    const updated = updatePhase(body.phaseId, body.phaseStatus as "done" | "active" | "todo");
    if (!updated) return NextResponse.json({ error: "That phase no longer exists." }, { status: 404 });
    return NextResponse.json({ plans: listPlans(), milestones: listMilestones() });
  }

  if (typeof body.milestoneId === "string" && typeof body.milestoneStatus === "string") {
    const updated = updateMilestone(body.milestoneId, body.milestoneStatus as "done" | "upcoming" | "risk");
    if (!updated) return NextResponse.json({ error: "That milestone no longer exists." }, { status: 404 });
    return NextResponse.json({ plans: listPlans(), milestones: listMilestones() });
  }

  const patch: Record<string, unknown> = {};
  for (const key of ["title", "description", "owner", "team", "status", "start", "end", "progress", "tasksDone", "tasksTotal"]) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  const plan = updatePlan(id, patch);
  if (!plan) return NextResponse.json({ error: "That plan no longer exists." }, { status: 404 });
  return NextResponse.json({ plans: listPlans(), milestones: listMilestones(), plan });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "An id is required." }, { status: 400 });
  const plan = listPlans().find(item => item.id === id);
  if (plan) deletePlan(id);
  else deleteMilestone(id);
  return NextResponse.json({ plans: listPlans(), milestones: listMilestones() });
}