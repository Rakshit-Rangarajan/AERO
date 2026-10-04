import { getAgentProfile } from "@/agents";
import { getDb } from "@/lib/db";

export type SessionAgent = { id: string; name: string; role: string; signature: string };

export function getSessionAgents(sessionId: string): SessionAgent[] {
  const session = getDb().prepare("SELECT kind,agent_id FROM sessions WHERE id=?").get(sessionId) as { kind: string; agent_id: string | null } | undefined;
  if (session?.kind === "agent" && session.agent_id) {
    const agent = getAgentProfile(session.agent_id);
    return agent ? [{ id: agent.id, name: agent.name, role: agent.role, signature: agent.signature }] : [];
  }
  const ids = getDb().prepare("SELECT agent_id FROM session_agents WHERE session_id=? ORDER BY rowid").all(sessionId) as Array<{ agent_id: string }>;
  return ids.flatMap(({ agent_id }) => {
    const agent = getAgentProfile(agent_id);
    return agent ? [{ id: agent.id, name: agent.name, role: agent.role, signature: agent.signature }] : [];
  });
}

export function addSessionAgentsToRows<T extends { id: string }>(sessions: T[]) {
  return sessions.map(session => ({ ...session, participants: getSessionAgents(session.id) }));
}
