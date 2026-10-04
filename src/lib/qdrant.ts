import "server-only";
import { createHash } from "node:crypto";
import { getDb } from "@/lib/db";
import { embedText, embeddingCollection } from "@/lib/embeddings";
import { getProviderConfig } from "@/lib/provider-config";

type KnowledgeDocument = { id: string; title: string; kind: string; content: string; source: string; created_at: string };
type QdrantPoint = { id: string; score: number; payload?: { documentId?: string; title?: string; content?: string; kind?: string; source?: string; createdAt?: string } };

function qdrantConfig() {
  const rawUrl = process.env.QDRANT_URL?.trim();
  if (!rawUrl) throw new Error("QDRANT_URL is not configured.");
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new Error("QDRANT_URL must use HTTPS or a localhost address.");
  return { url: url.toString().replace(/\/+$/, ""), apiKey: process.env.QDRANT_API_KEY?.trim() };
}

async function qdrant(path: string, init: RequestInit = {}) {
  const config = qdrantConfig();
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  if (config.apiKey) headers.set("api-key", config.apiKey);
  const response = await fetch(`${config.url}${path}`, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(12_000) });
  return response;
}

function chunks(content: string) {
  const source = content.slice(0, 24_000);
  const result: string[] = [];
  for (let start = 0; start < source.length && result.length < 20; start += 1_000) {
    const chunk = source.slice(start, start + 1_200).trim();
    if (chunk) result.push(chunk);
  }
  return result;
}

function pointId(documentId: string, collection: string, index: number) {
  const bytes = createHash("sha256").update(`${collection}:${documentId}:${index}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function ensureCollection(collection: string, size: number) {
  const encoded = encodeURIComponent(collection);
  const current = await qdrant(`/collections/${encoded}`, { method: "GET" });
  if (current.ok) {
    const body = await current.json() as { result?: { config?: { params?: { vectors?: { size?: number } } } } };
    const currentSize = body.result?.config?.params?.vectors?.size;
    if (currentSize && currentSize !== size) throw new Error("The Qdrant collection uses a different embedding size. Change AERO_EMBEDDING_MODEL to create a separate collection.");
    return;
  }
  if (current.status !== 404) throw new Error(`Qdrant collection check returned HTTP ${current.status}.`);
  const created = await qdrant(`/collections/${encoded}`, { method: "PUT", body: JSON.stringify({ vectors: { size, distance: "Cosine" } }) });
  if (!created.ok && created.status !== 409) throw new Error(`Qdrant could not create a collection (HTTP ${created.status}).`);
}

function fingerprint(doc: KnowledgeDocument) {
  return createHash("sha256").update(`${doc.title}\0${doc.kind}\0${doc.source}\0${doc.content}`).digest("hex");
}

async function indexDocument(doc: KnowledgeDocument, collection: string) {
  const digest = fingerprint(doc);
  const existing = getDb().prepare("SELECT fingerprint FROM knowledge_vector_state WHERE document_id=? AND collection_name=?").get(doc.id, collection) as { fingerprint: string } | undefined;
  if (existing?.fingerprint === digest) return;
  const sections = chunks(doc.content);
  const deleteExisting = await qdrant(`/collections/${encodeURIComponent(collection)}/points/delete?wait=true`, {
    method: "POST",
    body: JSON.stringify({ filter: { must: [{ key: "documentId", match: { value: doc.id } }] } }),
  });
  if (!deleteExisting.ok && deleteExisting.status !== 404) throw new Error(`Qdrant could not replace existing document vectors (HTTP ${deleteExisting.status}).`);
  const points: Array<{ id: string; vector: number[]; payload: Record<string, string | number> }> = [];
  for (let index = 0; index < sections.length; index += 1) {
    const embedding = await embedText(`${doc.title}\n${sections[index]}`);
    await ensureCollection(collection, embedding.values.length);
    points.push({
      id: pointId(doc.id, collection, index),
      vector: embedding.values,
      payload: { documentId: doc.id, title: doc.title, content: sections[index], kind: doc.kind, source: doc.source, createdAt: doc.created_at, chunkIndex: index },
    });
  }
  if (points.length) {
    const response = await qdrant(`/collections/${encodeURIComponent(collection)}/points?wait=true`, { method: "PUT", body: JSON.stringify({ points }) });
    if (!response.ok) throw new Error(`Qdrant vector indexing returned HTTP ${response.status}.`);
  }
  getDb().prepare(`INSERT INTO knowledge_vector_state(document_id,collection_name,fingerprint,indexed_at) VALUES(?,?,?,?)
    ON CONFLICT(document_id,collection_name) DO UPDATE SET fingerprint=excluded.fingerprint,indexed_at=excluded.indexed_at`)
    .run(doc.id, collection, digest, new Date().toISOString());
}

export async function indexKnowledgeDocument(id: string) {
  const config = getProviderConfig();
  if (config.provider === "local") return { indexed: false as const, reason: "no-embedding-provider" as const };
  const collection = embeddingCollection(config);
  const doc = getDb().prepare("SELECT id,title,kind,content,source,created_at FROM knowledge_documents WHERE id=?").get(id) as KnowledgeDocument | undefined;
  if (!doc) throw new Error("Knowledge document not found.");
  await indexDocument(doc, collection);
  return { indexed: true as const, collection };
}

/** Removes every known collection's points before the source document is deleted. */
export async function removeKnowledgeVectors(id: string) {
  const db = getDb();
  const states = db.prepare("SELECT collection_name FROM knowledge_vector_state WHERE document_id=?").all(id) as Array<{ collection_name: string }>;
  for (const { collection_name } of states) {
    const response = await qdrant(`/collections/${encodeURIComponent(collection_name)}/points/delete?wait=true`, {
      method: "POST",
      body: JSON.stringify({ filter: { must: [{ key: "documentId", match: { value: id } }] } }),
    });
    if (!response.ok && response.status !== 404) throw new Error(`Qdrant could not remove document vectors (HTTP ${response.status}).`);
  }
  db.prepare("DELETE FROM knowledge_vector_state WHERE document_id=?").run(id);
  return states.length;
}

export async function searchKnowledgeVectors(query: string, limit = 20) {
  const config = getProviderConfig();
  if (config.provider === "local") return { mode: "local-keyword" as const, results: [] as QdrantPoint[] };
  const collection = embeddingCollection(config);
  // Index a small backlog on demand so documents uploaded before Qdrant/provider setup are included.
  const pending = getDb().prepare(`SELECT d.id,d.title,d.kind,d.content,d.source,d.created_at FROM knowledge_documents d
    LEFT JOIN knowledge_vector_state v ON v.document_id=d.id AND v.collection_name=?
    WHERE v.document_id IS NULL ORDER BY d.created_at DESC LIMIT 5`).all(collection) as KnowledgeDocument[];
  for (const doc of pending) await indexDocument(doc, collection);
  const embedding = await embedText(query, config);
  await ensureCollection(collection, embedding.values.length);
  const response = await qdrant(`/collections/${encodeURIComponent(collection)}/points/query`, {
    method: "POST",
    body: JSON.stringify({ query: embedding.values, limit: Math.min(40, Math.max(1, limit)), with_payload: true }),
  });
  if (!response.ok) throw new Error(`Qdrant vector search returned HTTP ${response.status}.`);
  const body = await response.json() as { result?: { points?: QdrantPoint[] } };
  return { mode: "hybrid" as const, results: body.result?.points ?? [] };
}
