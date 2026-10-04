import { NextRequest, NextResponse } from "next/server";
import { agentLabel, getAgentProfile } from "@/agents";
import { getDb, recordAudit } from "@/lib/db";
import { publicProviderConfig } from "@/lib/provider-config";
import { addSessionAgentsToRows, getSessionAgents } from "@/lib/session-agents";

export const runtime = "nodejs";

function getSessionResult(id: string) {
  const db = getDb();
  const session = db.prepare("SELECT id,kind,title,agent_id AS agentId,updated_at AS updatedAt FROM sessions WHERE id=? AND deleted_at IS NULL").get(id);
  const sessions = addSessionAgentsToRows(db.prepare(`SELECT s.id,s.kind,s.title,s.agent_id AS agentId,s.updated_at AS updatedAt,
    (SELECT m.content FROM messages m WHERE m.session_id=s.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1) AS lastMessage
    FROM sessions s WHERE s.deleted_at IS NULL ORDER BY s.updated_at DESC LIMIT 100`).all() as Array<{id:string}>);
  const messages = db.prepare("SELECT id,role,content,agent,created_at AS createdAt FROM messages WHERE session_id=? ORDER BY created_at,id").all(id);
  const current = session as { id: string; kind: string; agentId: string | null; title: string; updatedAt: string } | undefined;
  return { session: current ? { ...current, participants: getSessionAgents(id) } : current, sessions, messages, provider: publicProviderConfig().status };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { kind?: string; title?: string; agentId?: string; agentIds?: string[] } | null;
  const kind = body?.kind === "ticket" || body?.kind === "agent" || body?.kind === "group" ? body.kind : "general";
  const profile = kind === "agent" && typeof body?.agentId === "string" ? getAgentProfile(body.agentId) : undefined;
  if (kind === "agent" && !profile) return NextResponse.json({ error: "Choose a valid agent profile." }, { status: 400 });
  const groupIds = kind === "group" && Array.isArray(body?.agentIds) ? [...new Set(body.agentIds.filter(id => typeof id === "string"))] : [];
  const groupProfiles = groupIds.map(getAgentProfile);
  if (kind === "group" && (groupIds.length < 2 || groupProfiles.some(agent => !agent))) return NextResponse.json({ error: "Choose at least 2 valid agents for a group chat." }, { status: 400 });
  const agentId = profile?.id ?? null;
  const groupNames = groupProfiles.flatMap(agent => agent ? [agent.name] : []);
  const defaultGroupTitle = groupNames.length > 2 ? `${groupNames.slice(0, 2).join(", ")} +${groupNames.length - 2}` : groupNames.join(" & ");
  const title = profile ? agentLabel(profile) : typeof body?.title === "string" && body.title.trim() ? body.title.trim().slice(0, 120) : kind === "group" ? defaultGroupTitle : "General session";
  if (!title) return NextResponse.json({ error: "Session title is required." }, { status: 400 });
  const db = getDb();
  if (profile) {
    const existing = db.prepare("SELECT id FROM sessions WHERE kind='agent' AND agent_id=? AND deleted_at IS NULL").get(profile.id) as { id: string } | undefined;
    if (existing) return NextResponse.json(getSessionResult(existing.id));
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  if (kind === "general") {
    const existing = db.prepare("SELECT id FROM sessions WHERE kind='general' AND deleted_at IS NULL LIMIT 1").get() as {id:string}|undefined;
    if (existing) return NextResponse.json({ error: "The workspace already has an active General session." }, { status: 409 });
  }
  try {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare("INSERT INTO sessions(id,kind,title,created_at,updated_at,agent_id) VALUES(?,?,?,?,?,?)").run(id, kind, title, now, now, agentId);
      if (kind === "group") {
        const addParticipant = db.prepare("INSERT INTO session_agents(session_id,agent_id,added_at) VALUES(?,?,?)");
        for (const participantId of groupIds) addParticipant.run(id, participantId, now);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } catch (error) {
    if (profile) {
      const existing = db.prepare("SELECT id FROM sessions WHERE kind='agent' AND agent_id=? AND deleted_at IS NULL").get(profile.id) as { id: string } | undefined;
      if (existing) return NextResponse.json(getSessionResult(existing.id));
    }
    throw error;
  }
  recordAudit(id, "session.created", JSON.stringify({ kind, title, agentId, participants: kind === "group" ? groupIds : undefined }));
  return NextResponse.json(getSessionResult(id), { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A session ID is required." }, { status: 400 });
  const db = getDb();
  const session = db.prepare("SELECT id,kind,title FROM sessions WHERE id=? AND deleted_at IS NULL").get(id) as { id: string; kind: string; title: string } | undefined;
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  const now = new Date().toISOString();
  let fallbackSessionId: string;
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE sessions SET deleted_at=?,updated_at=? WHERE id=? AND deleted_at IS NULL").run(now, now, id);
    if (session.kind === "general") {
      fallbackSessionId = crypto.randomUUID();
      db.prepare("INSERT INTO sessions(id,kind,title,created_at,updated_at) VALUES(?,?,?,?,?)").run(fallbackSessionId, "general", "General session", now, now);
    } else {
      const general = db.prepare("SELECT id FROM sessions WHERE kind='general' AND deleted_at IS NULL LIMIT 1").get() as { id: string } | undefined;
      if (!general) throw new Error("The workspace has no active General session.");
      fallbackSessionId = general.id;
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  recordAudit(id, "session.deleted", JSON.stringify({ kind: session.kind, title: session.title }));
  if (session.kind === "general") recordAudit(fallbackSessionId, "session.created", JSON.stringify({ kind: "general", reason: "replacement after explicit delete" }));
  return NextResponse.json({ id, deleted: true, fallbackSessionId });
}
