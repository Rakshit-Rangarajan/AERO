export type AgentPermissions = {
  read: string[];
  write: string[];
  execute: string[];
};

export type AgentProfile = {
  id: string;
  name: string;
  role: string;
  persona: string;
  signature: string;
  voice: string;
  specialties: string[];
  permissions: AgentPermissions;
  workflows: string[];
  instructions: string;
};

const conversationOnly: AgentPermissions = {
  read: ["The user's current message", "Relevant knowledge excerpts selected by AERO"],
  write: ["A response in the current session"],
  execute: [],
};

export function defineAgent(profile: Omit<AgentProfile, "permissions" | "workflows">): AgentProfile {
  return {
    ...profile,
    permissions: { ...conversationOnly },
    workflows: ["individual-agent-chat"],
  };
}
