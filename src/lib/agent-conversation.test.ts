import { describe, expect, it } from "vitest";
import { agents } from "../agents";
import { buildConversationPrompt, findMentionedAgents } from "./agent-conversation";

describe("contextual agent handoffs", () => {
  it("routes only complete registered agent names that are not already in the conversation", () => {
    const first = agents[1];
    const second = agents[2];
    const excluded = agents[3];
    const mentioned = findMentionedAgents(`Let's ask ${first.name} and ${second.name}. ${excluded.name} is already here.`, agents, new Set([excluded.id]));
    expect(mentioned.map(agent => agent.id)).toEqual([first.id, second.id]);
    expect(findMentionedAgents("The metadata has an adapter and a gateway.", agents, new Set()).map(agent => agent.id)).toEqual([]);
  });

  it("gives a referred agent the shared transcript and a direct handoff cue", () => {
    const agent = agents[1];
    const referring = agents[2];
    const prompt = buildConversationPrompt([
      { role: "user", content: "Review this deployment plan." },
      { role: "assistant", agent: `${referring.name} · ${referring.role}`, content: "The rollback window is too short." },
    ], agent, "Knowledge excerpt", referring.name);
    expect(prompt).toContain(`${referring.name} explicitly mentioned you`);
    expect(prompt).toContain("The rollback window is too short.");
    expect(prompt).toContain("Review this deployment plan.");
    expect(prompt).toContain("Knowledge excerpt");
  });
});