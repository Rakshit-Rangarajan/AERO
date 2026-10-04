import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const events = getDb().prepare(`
    SELECT id, session_id, action, detail, created_at
    FROM audit_events ORDER BY created_at DESC LIMIT 100
  `).all();
  return NextResponse.json({ events });
}
