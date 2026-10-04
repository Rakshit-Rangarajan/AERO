import "server-only";

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type ProviderKind = "local" | "openai-compatible" | "vertex-ai";

export type ProviderConfig = {
  provider: ProviderKind;
  baseUrl: string;
  apiKey: string;
  model: string;
  projectId: string;
  location: string;
  serviceAccountJson: string;
};

const defaults: ProviderConfig = {
  provider: "local",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  projectId: "",
  location: "us-central1",
  serviceAccountJson: "",
};

function configPath() {
  const dataDir = path.resolve(/* turbopackIgnore: true */ process.env.AERO_DATA_DIR || path.join(process.cwd(), "data"));
  mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "ai-provider.json");
}

export function getProviderConfig(): ProviderConfig {
  try {
    const parsed = JSON.parse(readFileSync(configPath(), "utf8")) as Partial<ProviderConfig>;
    return { ...defaults, ...parsed };
  } catch {
    return {
      ...defaults,
      provider: process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL ? "openai-compatible" : "local",
      baseUrl: process.env.AI_BASE_URL?.trim() || defaults.baseUrl,
      apiKey: process.env.AI_API_KEY?.trim() || "",
      model: process.env.AI_MODEL?.trim() || defaults.model,
      projectId: process.env.GOOGLE_CLOUD_PROJECT?.trim() || "",
      location: process.env.GOOGLE_CLOUD_LOCATION?.trim() || defaults.location,
      serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "",
    };
  }
}

export function saveProviderConfig(next: ProviderConfig) {
  const file = configPath();
  writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  try { chmodSync(file, 0o600); } catch { /* Windows applies ACLs rather than POSIX mode bits. */ }
}

export function publicProviderConfig(config = getProviderConfig()) {
  const validVertexCredentials = Boolean(config.serviceAccountJson);
  const dataDir = path.resolve(/* turbopackIgnore: true */ process.env.AERO_DATA_DIR || path.join(process.cwd(), "data"));
  const setupComplete = existsSync(path.join(dataDir, "ai-provider.json")) || Boolean(process.env.AI_BASE_URL && process.env.AI_API_KEY && process.env.AI_MODEL);
  return {
    provider: config.provider,
    status: config.provider === "local" ? "local" : "configured",
    baseUrl: config.baseUrl,
    model: config.model,
    projectId: config.projectId,
    location: config.location,
    hasCredential: config.provider === "vertex-ai" ? validVertexCredentials : Boolean(config.apiKey),
    configured: config.provider === "local" || (config.provider === "vertex-ai" ? Boolean(config.projectId && config.location && config.model && validVertexCredentials) : Boolean(config.baseUrl && config.model && config.apiKey)),
    setupComplete,
  };
}

function parseEnv(source: string) {
  if (source.length > 128_000) throw new Error("The .env file must be smaller than 128 KB.");
  const values: Record<string, string> = {};
  for (const rawLine of source.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) throw new Error("The .env file contains a line that is not KEY=value.");
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
      if (match[2].trim().startsWith('"')) value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    values[match[1]] = value;
  }
  return values;
}

export function providerConfigFromEnv(source: string, current = getProviderConfig()): ProviderConfig {
  const env = parseEnv(source);
  const vertexKeys = ["GOOGLE_CLOUD_PROJECT", "GOOGLE_CLOUD_LOCATION", "VERTEX_AI_MODEL", "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64", "GOOGLE_SERVICE_ACCOUNT_JSON"];
  const kind = (env.AI_PROVIDER || (vertexKeys.some(key => env[key]) ? "vertex-ai" : "openai-compatible")).toLowerCase();
  if (!["local", "openai-compatible", "openai", "vertex-ai", "vertex"].includes(kind)) {
    throw new Error("AI_PROVIDER must be local, openai-compatible, or vertex-ai.");
  }
  const provider: ProviderKind = kind === "openai" ? "openai-compatible" : kind === "vertex" ? "vertex-ai" : kind as ProviderKind;
  let serviceAccountJson = current.serviceAccountJson;
  const encodedCredentials = env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (encodedCredentials) {
    try { serviceAccountJson = Buffer.from(encodedCredentials, "base64").toString("utf8"); JSON.parse(serviceAccountJson); }
    catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 must contain a valid base64-encoded service-account JSON file."); }
  } else if (env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try { JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON); serviceAccountJson = env.GOOGLE_SERVICE_ACCOUNT_JSON; }
    catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON must contain valid JSON."); }
  }
  if (env.GOOGLE_APPLICATION_CREDENTIALS && !encodedCredentials && !env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error("This app cannot read a GOOGLE_APPLICATION_CREDENTIALS path from an imported file. Export the service-account JSON as GOOGLE_SERVICE_ACCOUNT_JSON_BASE64; the downloadable sample shows the format.");
  }
  return {
    provider,
    baseUrl: env.AI_BASE_URL || current.baseUrl || defaults.baseUrl,
    apiKey: env.AI_API_KEY || current.apiKey,
    model: env.VERTEX_AI_MODEL || env.AI_MODEL || current.model || defaults.model,
    projectId: env.GOOGLE_CLOUD_PROJECT || current.projectId,
    location: env.GOOGLE_CLOUD_LOCATION || current.location || defaults.location,
    serviceAccountJson,
  };
}

export function normalizeProviderConfig(input: Partial<ProviderConfig>, current = getProviderConfig()): ProviderConfig {
  const provider = input.provider;
  if (provider !== "local" && provider !== "openai-compatible" && provider !== "vertex-ai") throw new Error("Choose a supported AI provider.");
  const config = {
    provider,
    baseUrl: typeof input.baseUrl === "string" ? input.baseUrl.trim().slice(0, 500) : current.baseUrl,
    apiKey: provider === "openai-compatible" ? (typeof input.apiKey === "string" && input.apiKey.trim() ? input.apiKey.trim().slice(0, 20_000) : current.apiKey) : "",
    model: typeof input.model === "string" ? input.model.trim().slice(0, 200) : current.model,
    projectId: typeof input.projectId === "string" ? input.projectId.trim().slice(0, 200) : current.projectId,
    location: typeof input.location === "string" ? input.location.trim().slice(0, 100) : current.location,
    serviceAccountJson: provider === "vertex-ai" ? (typeof input.serviceAccountJson === "string" && input.serviceAccountJson.trim() ? input.serviceAccountJson.trim().slice(0, 50_000) : current.serviceAccountJson) : "",
  };
  if (provider === "openai-compatible") {
    let url: URL;
    try { url = new URL(config.baseUrl); } catch { throw new Error("Enter a valid OpenAI-compatible API base URL."); }
    if ((url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") || url.username || url.password) throw new Error("The API base URL must use HTTPS (or localhost) and cannot include embedded credentials.");
    if (!config.apiKey || !config.model) throw new Error("Enter an API key and model to use the OpenAI-compatible provider.");
  }
  if (provider === "vertex-ai") {
    if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(config.projectId)) throw new Error("Enter a valid Google Cloud project ID.");
    if (!/^[a-z0-9-]{2,40}$/.test(config.location)) throw new Error("Enter a valid Vertex AI location, for example us-central1.");
    if (!/^[A-Za-z0-9._-]{2,200}$/.test(config.model)) throw new Error("Enter a valid Vertex AI model ID.");
    let credentials: { type?: string; client_email?: string; private_key?: string };
    try { credentials = JSON.parse(config.serviceAccountJson); } catch { throw new Error("Import a valid Google service-account JSON credential in the .env file."); }
    if (credentials.type !== "service_account" || !credentials.client_email || !credentials.private_key) throw new Error("Vertex AI credentials must be a service-account JSON file with client_email and private_key fields.");
  }
  return config;
}
