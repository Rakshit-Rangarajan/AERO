import { describe, expect, it } from "vitest";
import { agents, buildSystemPrompt, getAgentProfile, toPublicAgent } from "./index";

describe("AERO agent directory", () => {
  it("contains uniquely named, independently addressable profiles", () => {
    expect(agents.length).toBeGreaterThan(0);
    expect(new Set(agents.map(agent => agent.id)).size).toBe(agents.length);
    expect(new Set(agents.map(agent => agent.name)).size).toBe(agents.length);
    expect(new Set(agents.map(agent => agent.signature)).size).toBe(agents.length);
    for (const profile of agents) {
      expect(profile.persona.length).toBeGreaterThan(30);
      expect(profile.instructions.length).toBeGreaterThan(30);
      expect(getAgentProfile(profile.id)).toBe(profile);
    }
  });

  it("builds distinct prompts and gives every profile chat-only permissions", () => {
    const first = agents[0];
    const last = agents[agents.length - 1];
    expect(first).toBeDefined();
    expect(last).toBeDefined();
    expect(first).not.toBe(last);
    expect(buildSystemPrompt(first)).toContain(first.signature);
    expect(buildSystemPrompt(last)).toContain(last.signature);
    expect(buildSystemPrompt(first)).not.toBe(buildSystemPrompt(last));
    for (const profile of agents) {
      expect(profile.permissions.write).toEqual(["A response in the current session"]);
      expect(profile.permissions.execute).toEqual([]);
    }
  });

  it("keeps private agent instructions out of the public directory response", () => {
    for (const profile of agents) expect(toPublicAgent(profile)).not.toHaveProperty("instructions");
  });
});