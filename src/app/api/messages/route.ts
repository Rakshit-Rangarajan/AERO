import { NextRequest, NextResponse } from "next/server";
import { agentLabel, agents, getAllAgents, defaultAgentId, getAgentProfile } from "@/agents";
import { replyToMessage } from "@/lib/agent";
import { buildConversationPrompt, findMentionedAgents, type ConversationMessage } from "@/lib/agent-conversation";
import { getDb, recordAudit } from "@/lib/db";
import { publicProviderConfig } from "@/lib/provider-config";
import { sendAgentTrace } from "@/lib/langfuse";
import { retrieveKnowledgeContext } from "@/lib/knowledge-retrieval";
import { formatKnowledgeContext } from "@/lib/knowledge-context";
import { addSessionAgentsToRows, getSessionAgents } from "@/lib/session-agents";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { sessionId?: string; content?: string; agentId?: string } | null;
  const sessionId = body?.sessionId;
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const agentId = typeof body?.agentId === "string" ? body.agentId.trim().slice(0, 80) : defaultAgentId;
  const agent = getAgentProfile(agentId);
  if (!sessionId || !content) return NextResponse.json({ error: "A session and message are required." }, { status: 400 });
  if (content.length > 8000) return NextResponse.json({ error: "Messages are limited to 8,000 characters." }, { status: 400 });
  if (!agent) return NextResponse.json({ error: "Unknown agent profile." }, { status: 400 });
  const db = getDb();
  const session = db.prepare("SELECT id,kind,agent_id,title FROM sessions WHERE id=? AND deleted_at IS NULL").get(sessionId) as { id: string; kind: string; agent_id: string | null; title: string } | undefined;
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  if (session.kind === "agent" && session.agent_id !== agentId) return NextResponse.json({ error: "This is a direct chat with a different agent." }, { status: 409 });

  const initialAgents = session.kind === "group"
    ? getSessionAgents(session.id).map(participant => getAgentProfile(participant.id)).filter((participant): participant is NonNullable<typeof participant> => Boolean(participant))
    : [agent];
  if (session.kind === "group" && initialAgents.length < 2) return NextResponse.json({ error: "This group chat has an invalid participant list." }, { status: 409 });
  const history = db.prepare("SELECT role,content,agent FROM messages WHERE session_id=? ORDER BY created_at DESC,id DESC LIMIT 24").all(session.id).reverse() as ConversationMessage[];
  const started = new Date().toISOString();
  history.push({ role: "user", content });
  db.prepare("INSERT INTO messages(id,session_id,role,content,created_at) VALUES(?,?,?,?,?)").run(crypto.randomUUID(), sessionId, "user", content, started);
  const participants = new Map(initialAgents.map(participant => [participant.id, participant]));
  const queued = new Set(initialAgents.map(participant => participant.id));
  const handoffFrom = new Map<string, string>();
  const answered = new Set<string>();
  const failures: string[] = [];
  let lastResponseAt = Date.parse(started);
  let promoted = false;
  recordAudit(sessionId, "message.received", JSON.stringify({ agentId: session.kind === "group" ? "group" : agent.id, agent: session.kind === "group" ? "Group chat" : agentLabel(agent), participants: [...participants.keys()] }));

  try {
    const knowledge = await retrieveKnowledgeContext(content);
    const knowledgeContext = formatKnowledgeContext(knowledge.documents);
    if (knowledge.documents.length) {
      recordAudit(sessionId, "agent.context.retrieved", JSON.stringify({ agentId: agent.id, mode: knowledge.mode, documents: knowledge.documents.map(document => ({ id: document.id, title: document.title, match: document.match })) }));
    }

    // Process the queue in order so each specialist sees replies already given in this turn.
    while ([...queued].some(id => !answered.has(id))) {
      const nextId = [...queued].find(id => !answered.has(id));
      if (!nextId) break;
      const participant = participants.get(nextId)!;
      const contextualPrompt = buildConversationPrompt(history, participant, knowledgeContext, handoffFrom.get(nextId));
      try {
        const reply = await replyToMessage(participant, contextualPrompt);
        lastResponseAt = Math.max(Date.now(), lastResponseAt + 1);
        const completed = new Date(lastResponseAt).toISOString();

        // SPAWN SUB-AGENTS LOGIC
        const spawnRegex = /<spawn_agent\s+name="([^"]+)"\s+role="([^"]+)"\s+persona="([^"]+)"\s+signature="([^"]+)"\s*\/?>/gi;
        let spawnMatch;
        while ((spawnMatch = spawnRegex.exec(reply.content)) !== null) {
          const spawnName = spawnMatch[1];
          const spawnRole = spawnMatch[2];
          const spawnPersona = spawnMatch[3];
          const spawnSignature = spawnMatch[4];
          const spawnId = "custom-spawn-" + Date.now() + Math.floor(Math.random()*1000);
          try {
            db.prepare("INSERT INTO custom_agents (id, name, role, persona, signature, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(spawnId, spawnName, spawnRole, spawnPersona, spawnSignature, completed);
            db.prepare("INSERT OR IGNORE INTO session_agents(session_id,agent_id,added_at) VALUES(?,?,?)").run(sessionId, spawnId, completed);
            
            const newAgentProfile = getAgentProfile(spawnId);
            if (newAgentProfile) {
              participants.set(spawnId, newAgentProfile);
              queued.add(spawnId);
              handoffFrom.set(spawnId, participant.name);
              recordAudit(sessionId, "agent.spawned", JSON.stringify({ parent: participant.name, child: spawnName }));
            }
          } catch(e) {
             console.error("Failed to spawn agent", e);
          }
        }

        db.prepare("INSERT INTO messages(id,session_id,role,content,agent,provider,model,created_at) VALUES(?,?,?,?,?,?,?,?)")
          .run(crypto.randomUUID(), sessionId, "assistant", reply.content, agentLabel(participant), reply.provider, reply.model, completed);
        history.push({ role: "assistant", content: reply.content, agent: agentLabel(participant) });
        answered.add(nextId);
        recordAudit(sessionId, "agent.response", JSON.stringify({ agentId: participant.id, agent: agentLabel(participant), provider: reply.provider, model: reply.model }));
        try {
          const trace = await sendAgentTrace({ sessionId, agentId: participant.id, agentName: participant.name, provider: reply.provider, model: reply.model,
            input: contextualPrompt, output: reply.content,
            retrieval: knowledge.documents.length ? JSON.stringify(knowledge.documents.map(document => ({ id: document.id, title: document.title, match: document.match }))) : undefined,
            startedAt: new Date(started), endedAt: new Date(completed) });
          if (trace.sent) recordAudit(sessionId, "agent.trace.sent", JSON.stringify({ agentId: participant.id, traceProvider: "langfuse" }));
        } catch (traceError) {
          recordAudit(sessionId, "agent.trace.error", JSON.stringify({ agentId: participant.id, error: traceError instanceof Error ? traceError.message : "Langfuse trace failed." }));
        }

        const mentions = findMentionedAgents(reply.content, getAllAgents(), new Set(participants.keys()));
        for (const mentioned of mentions) {
          const wasDirect = db.prepare("SELECT kind,agent_id FROM sessions WHERE id=?").get(sessionId) as { kind: string; agent_id: string | null };
          if (wasDirect.kind === "agent" && wasDirect.agent_id) {
            const origin = getAgentProfile(wasDirect.agent_id);
            const firstInvite = mentions[0];
            if (origin) db.prepare("INSERT OR IGNORE INTO session_agents(session_id,agent_id,added_at) VALUES(?,?,?)").run(sessionId, origin.id, completed);
            db.prepare("UPDATE sessions SET kind='group',title=?,agent_id=NULL WHERE id=? AND kind='agent'")
              .run(origin ? `${origin.name} & ${firstInvite.name}` : `${participant.name} & ${firstInvite.name}`, sessionId);
            promoted = true;
            recordAudit(sessionId, "session.promoted_to_group", JSON.stringify({ from: "agent", invitedBy: participant.id, firstInvites: mentions.map(item => item.id) }));
          }
          db.prepare("INSERT OR IGNORE INTO session_agents(session_id,agent_id,added_at) VALUES(?,?,?)").run(sessionId, mentioned.id, completed);
          participants.set(mentioned.id, mentioned);
          queued.add(mentioned.id);
          handoffFrom.set(mentioned.id, participant.name);
          recordAudit(sessionId, "agent.handoff", JSON.stringify({ fromAgentId: participant.id, fromAgent: participant.name, toAgentId: mentioned.id, toAgent: mentioned.name }));
        }
      } catch (error) {
        answered.add(nextId);
        failures.push(agentLabel(participant));
        recordAudit(sessionId, "agent.error", JSON.stringify({ agentId: participant.id, agent: agentLabel(participant), error: error instanceof Error ? error.message : "Agent request failed." }));
      }
    }

    const completedAt = new Date().toISOString();
    db.prepare("UPDATE sessions SET updated_at=? WHERE id=?").run(completedAt, sessionId);
    if (failures.length === participants.size) return NextResponse.json({ error: "No agent in this chat could generate a reply.", failedAgents: failures, saved: true }, { status: 502 });
    const sessionRow = db.prepare("SELECT id,kind,title,agent_id AS agentId,updated_at AS updatedAt FROM sessions WHERE id=?").get(sessionId) as {id:string;kind:string;title:string;agentId:string|null;updatedAt:string};
    const sessions = addSessionAgentsToRows(db.prepare(`SELECT s.id,s.kind,s.title,s.agent_id AS agentId,s.updated_at AS updatedAt,
      (SELECT m.content FROM messages m WHERE m.session_id=s.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1) AS lastMessage
      FROM sessions s WHERE s.deleted_at IS NULL ORDER BY s.updated_at DESC LIMIT 100`).all() as Array<{id:string}>);
    const messages = db.prepare("SELECT id,role,content,agent,created_at AS createdAt FROM messages WHERE session_id=? ORDER BY created_at,id").all(sessionId);
    return NextResponse.json({ session: { ...sessionRow, participants: getSessionAgents(sessionId) }, sessions, messages, provider: publicProviderConfig().status,
      ...(failures.length ? { warning: `Could not get a response from: ${failures.join(", ")}.` } : {}), ...(promoted ? { promotedToGroup: true } : {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent request failed.";
    recordAudit(sessionId, "agent.error", JSON.stringify({ agentId: agent.id, agent: agentLabel(agent), error: message }));
    return NextResponse.json({ error: message, saved: true }, { status: 502 });
  }
}
