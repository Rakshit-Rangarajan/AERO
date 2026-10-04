import type { AgentProfile } from "@/agents/types";
import { buildSystemPrompt } from "@/agents";
import { getProviderConfig, type ProviderConfig } from "@/lib/provider-config";

type AgentReply = { content: string; provider: string; model: string };

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export async function getVertexAccessToken(config: ProviderConfig) {
  const credentials = JSON.parse(config.serviceAccountJson) as { client_email: string; private_key: string };
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = encodeBase64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: issuedAt + 3600,
  }));
  const unsigned = `${header}.${claims}`;
  const signer = (await import("node:crypto")).createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(credentials.private_key, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Vertex AI authentication failed. Check the service account, project access, and Vertex AI permissions.");
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("Google authentication did not return an access token.");
  return body.access_token;
}

export async function generateWithProvider(config: ProviderConfig, systemPrompt: string, prompt: string): Promise<string> {
  if (config.provider === "local") throw new Error("Choose an AI provider in Setup & AI before testing a model connection.");
  if (config.provider === "vertex-ai") {
    const token = await getVertexAccessToken(config);
    const endpoint = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/locations/${encodeURIComponent(config.location)}/publishers/google/models/${encodeURIComponent(config.model)}:generateContent`;
    const response = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(45_000),
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
      }),
    });
    if (!response.ok) throw new Error(`Vertex AI returned HTTP ${response.status}. Check the model ID, region, billing, and service-account permissions.`);
    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = result.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("").trim();
    if (!text) throw new Error("Vertex AI returned an empty response. Check the selected model and request access.");
    return text;
  }

  const url = new URL("chat/completions", config.baseUrl.endsWith("/") ? config.baseUrl : `${config.baseUrl}/`);
  const response = await fetch(url, {
    method: "POST", signal: AbortSignal.timeout(45_000),
    headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }] }),
  });
  if (!response.ok) throw new Error(`AI provider returned HTTP ${response.status}. Check the endpoint, API key, model, and account quota.`);
  const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = result.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("AI provider returned an empty response.");
  return content.trim();
}

/** Runs a selected agent against the saved BYOK provider or clearly labeled local adapter. */
export async function replyToMessage(agent: AgentProfile, prompt: string): Promise<AgentReply> {
  const config = getProviderConfig();
  if (config.provider === "local" || !config.model || (config.provider === "openai-compatible" && !config.apiKey) || (config.provider === "vertex-ai" && !config.serviceAccountJson)) {
    return {
      provider: "local",
      model: "development-adapter",
      content: `AERO is running in local development mode, so ${agent.name} (${agent.role}) is not connected to an AI provider yet. Your message is saved in this session. Open Setup & AI to choose a provider and configure your own credentials.`,
    };
  }
  const content = await generateWithProvider(config, buildSystemPrompt(agent), prompt);
  const provider = config.provider === "vertex-ai" ? `Vertex AI · ${config.location}` : new URL(config.baseUrl).hostname;
  return { content, provider, model: config.model };
}
