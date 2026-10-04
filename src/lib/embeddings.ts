import "server-only";
import { createHash } from "node:crypto";
import { getProviderConfig, type ProviderConfig } from "@/lib/provider-config";
import { getVertexAccessToken } from "@/lib/agent";

export type TextEmbedding = { model: string; values: number[]; collection: string };

export function embeddingModel(config = getProviderConfig()) {
  return process.env.AERO_EMBEDDING_MODEL?.trim() || (config.provider === "vertex-ai" ? "gemini-embedding-001" : "text-embedding-3-small");
}

export function embeddingCollection(config = getProviderConfig()) {
  const model = embeddingModel(config);
  const providerIdentity = config.provider === "vertex-ai" ? `${config.projectId}/${config.location}` : new URL(config.baseUrl).host;
  const suffix = createHash("sha256").update(`${config.provider}:${providerIdentity}:${model}`).digest("hex").slice(0, 12);
  return `aero_knowledge_${suffix}`;
}

export async function embedText(text: string, config: ProviderConfig = getProviderConfig()): Promise<TextEmbedding> {
  if (config.provider === "local") throw new Error("Configure an embedding-capable AI provider to enable semantic search.");
  const model = embeddingModel(config);
  const input = text.slice(0, 7000);
  let values: number[] | undefined;
  if (config.provider === "vertex-ai") {
    const token = await getVertexAccessToken(config);
    const endpoint = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/locations/${encodeURIComponent(config.location)}/publishers/google/models/${encodeURIComponent(model)}:predict`;
    const response = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ instances: [{ content: input }], parameters: { autoTruncate: true, outputDimensionality: 768 } }),
    });
    if (!response.ok) throw new Error(`Vertex AI embeddings returned HTTP ${response.status}. Check the embedding model, region, billing, and permissions.`);
    const result = await response.json() as { predictions?: Array<{ embeddings?: { values?: number[] } }> };
    values = result.predictions?.[0]?.embeddings?.values;
  } else {
    const url = new URL("embeddings", config.baseUrl.endsWith("/") ? config.baseUrl : `${config.baseUrl}/`);
    const response = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
      headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model, input }),
    });
    if (!response.ok) throw new Error(`AI provider embeddings returned HTTP ${response.status}. Check that the endpoint supports embeddings and the model is available.`);
    const result = await response.json() as { data?: Array<{ embedding?: number[] }> };
    values = result.data?.[0]?.embedding;
  }
  if (!values?.length || values.some(value => !Number.isFinite(value))) throw new Error("The embedding provider returned an invalid vector.");
  return { model, values, collection: embeddingCollection(config) };
}
