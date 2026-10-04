import "server-only";

type TraceInput = {
  sessionId: string;
  agentId: string;
  agentName: string;
  provider: string;
  model: string;
  input: string;
  output: string;
  retrieval?: string;
  startedAt: Date;
  endedAt: Date;
};

function attribute(key: string, value: string) {
  return { key, value: { stringValue: value } };
}

/** Sends one completed agent generation to Langfuse's OTLP/HTTP JSON endpoint. */
export async function sendAgentTrace(trace: TraceInput) {
  const baseUrl = process.env.LANGFUSE_BASE_URL?.trim().replace(/\/+$/, "");
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY?.trim();
  const secretKey = process.env.LANGFUSE_SECRET_KEY?.trim();
  if (!baseUrl || !publicKey || !secretKey) return { sent: false as const, reason: "not-configured" as const };

  let endpoint: URL;
  try {
    endpoint = new URL(`${baseUrl}/api/public/otel/v1/traces`);
    if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") {
      return { sent: false as const, reason: "invalid-host" as const };
    }
  } catch {
    return { sent: false as const, reason: "invalid-host" as const };
  }

  const startNs = (BigInt(trace.startedAt.getTime()) * BigInt(1_000_000)).toString();
  const endNs = (BigInt(trace.endedAt.getTime()) * BigInt(1_000_000)).toString();
  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
  const payload = {
    resourceSpans: [{
      resource: { attributes: [attribute("service.name", "aero"), attribute("service.version", "0.1.0")] },
      scopeSpans: [{
        scope: { name: "aero.agent-runtime", version: "0.1.0" },
        spans: [{
          traceId: crypto.randomUUID().replaceAll("-", ""),
          spanId: crypto.randomUUID().replaceAll("-", "").slice(0, 16),
          name: `agent ${trace.agentName}`,
          kind: 1,
          startTimeUnixNano: startNs,
          endTimeUnixNano: endNs,
          attributes: [
            attribute("langfuse.observation.type", "generation"),
            attribute("langfuse.observation.input", trace.input),
            attribute("langfuse.observation.output", trace.output),
            attribute("langfuse.session.id", trace.sessionId),
            attribute("langfuse.observation.metadata.agentId", trace.agentId),
            attribute("langfuse.observation.metadata.agentName", trace.agentName),
            ...(trace.retrieval ? [attribute("langfuse.observation.metadata.retrievedDocuments", trace.retrieval)] : []),
            attribute("gen_ai.system", trace.provider),
            attribute("gen_ai.request.model", trace.model),
          ],
          status: { code: 1 },
        }],
      }],
    }],
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Basic ${auth}`,
      "content-type": "application/json",
      "x-langfuse-ingestion-version": "4",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Langfuse trace ingestion returned HTTP ${response.status}.`);
  return { sent: true as const };
}
