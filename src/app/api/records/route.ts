import { NextRequest, NextResponse } from "next/server";
import { recordAudit } from "@/lib/db";
import { isRecordKind, type MetricValue } from "@/lib/record-schemas";
import { createRecord, deleteRecord, listRecords, updateRecord } from "@/lib/records";

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind");
  if (!isRecordKind(kind)) return NextResponse.json({ error: "Unknown record kind." }, { status: 400 });
  return NextResponse.json({ records: listRecords(kind) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const kind = body?.kind;
  if (!isRecordKind(kind)) return NextResponse.json({ error: "Unknown record kind." }, { status: 400 });
  if (typeof body?.title !== "string" || !body.title.trim()) return NextResponse.json({ error: "A title is required." }, { status: 400 });
  try {
    const record = createRecord({
      kind,
      title: body.title,
      code: typeof body.code === "string" ? body.code : undefined,
      subtitle: typeof body.subtitle === "string" ? body.subtitle : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
      severity: typeof body.severity === "string" ? body.severity : undefined,
      owner: typeof body.owner === "string" ? body.owner : undefined,
      repo: typeof body.repo === "string" ? body.repo : undefined,
      starred: body.starred === true,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      metrics: (body.metrics && typeof body.metrics === "object" ? body.metrics : {}) as Record<string, MetricValue>,
    });
    recordAudit(null, "record.created", JSON.stringify({ kind, id: record.id, title: record.title }));
    return NextResponse.json({ record }, { status: 201 });
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : "The record could not be created.";
    return NextResponse.json({ error: detail }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (typeof body?.id !== "string") return NextResponse.json({ error: "A record id is required." }, { status: 400 });
  const patch: Parameters<typeof updateRecord>[1] = {};
  for (const field of ["code", "title", "subtitle", "status", "severity", "owner", "repo", "notes"] as const) {
    if (typeof body[field] === "string") patch[field] = body[field] as string;
  }
  if (typeof body.starred === "boolean") patch.starred = body.starred;
  if (body.metrics && typeof body.metrics === "object") patch.metrics = body.metrics as Record<string, MetricValue>;
  const record = updateRecord(body.id, patch);
  if (!record) return NextResponse.json({ error: "That record no longer exists." }, { status: 404 });
  return NextResponse.json({ record });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A record id is required." }, { status: 400 });
  if (!deleteRecord(id)) return NextResponse.json({ error: "That record no longer exists." }, { status: 404 });
  recordAudit(null, "record.deleted", JSON.stringify({ id }));
  return NextResponse.json({ ok: true });
}