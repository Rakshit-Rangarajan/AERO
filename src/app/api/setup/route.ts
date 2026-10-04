import { NextResponse } from "next/server";
import { generateWithProvider } from "@/lib/agent";
import { getProviderConfig, normalizeProviderConfig, providerConfigFromEnv, publicProviderConfig, saveProviderConfig, type ProviderConfig } from "@/lib/provider-config";
import { defaultAgentId, getAgentProfile, buildSystemPrompt } from "@/agents";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(publicProviderConfig());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    action?: unknown;
    config?: Partial<ProviderConfig>;
    envText?: unknown;
  } | null;
  if (!body || !["save", "import", "test"].includes(String(body.action))) {
    return NextResponse.json({ error: "Choose save, import, or test." }, { status: 400 });
  }
  const current = getProviderConfig();
  let config: ProviderConfig;
  try {
    if (body.action === "import") {
      if (typeof body.envText !== "string") return NextResponse.json({ error: "Choose a .env file to import." }, { status: 400 });
      config = normalizeProviderConfig(providerConfigFromEnv(body.envText, current), current);
    } else {
      config = normalizeProviderConfig(body.config ?? {}, current);
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The provider configuration is invalid." }, { status: 400 });
  }
  if (body.action !== "test") saveProviderConfig(config);
  if (body.action === "test") {
    try {
      const agent = getAgentProfile(defaultAgentId);
      await generateWithProvider(config, agent ? buildSystemPrompt(agent) : "You are a helpful assistant.", "Reply with exactly: AERO connection confirmed");
      return NextResponse.json({ ok: true, message: `${config.provider === "vertex-ai" ? "Vertex AI" : "AI provider"} connection succeeded.`, config: publicProviderConfig(config) });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "The provider connection failed." }, { status: 502 });
    }
  }
  return NextResponse.json({ ok: true, imported: body.action === "import", config: publicProviderConfig(config) });
}
