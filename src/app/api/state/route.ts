import { NextRequest, NextResponse } from "next/server";
import { getDb, type DbSession } from "@/lib/db";
import { publicProviderConfig } from "@/lib/provider-config";
import { addSessionAgentsToRows, getSessionAgents } from "@/lib/session-agents";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const session = sessionId
    ? getDb().prepare("SELECT id,kind,title,created_at,updated_at,agent_id FROM sessions WHERE id=? AND deleted_at IS NULL").get(sessionId) as DbSession | undefined
    : getDb().prepare("SELECT id,kind,title,created_at,updated_at,agent_id FROM sessions WHERE kind='general' AND deleted_at IS NULL LIMIT 1").get() as DbSession | undefined;
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  const sessions = addSessionAgentsToRows(getDb().prepare(`SELECT s.id,s.kind,s.title,s.agent_id AS agentId,s.updated_at AS updatedAt,
    (SELECT m.content FROM messages m WHERE m.session_id=s.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1) AS lastMessage
    FROM sessions s WHERE s.deleted_at IS NULL ORDER BY s.updated_at DESC LIMIT 100`).all() as Array<{id:string}>);
  const messages = getDb().prepare("SELECT id,role,content,agent,created_at AS createdAt FROM messages WHERE session_id=? ORDER BY created_at,id").all(session.id) as unknown as Array<{ id: string; role: "user" | "assistant"; content: string; agent: string | null; createdAt: string }>;
  return NextResponse.json({ session: { id: session.id, kind: session.kind, title: session.title, agentId: session.agent_id, updatedAt: session.updated_at, participants: getSessionAgents(session.id) }, sessions, messages, provider: publicProviderConfig().status, demoMode: process.env.AERO_DEMO_MODE === "1" });
}
