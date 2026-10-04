import { NextRequest, NextResponse } from "next/server";
import { getDb, recordAudit } from "@/lib/db";
import { extractDocumentText } from "@/lib/document-extraction";
import { indexKnowledgeDocument, removeKnowledgeVectors } from "@/lib/qdrant";

export const runtime = "nodejs";
const maxBytes = 2 * 1024 * 1024;
const acceptedMime: Record<string, string[]> = {
  txt: ["text/plain"], md: ["text/markdown", "text/plain"], json: ["application/json", "text/plain"], csv: ["text/csv", "text/plain"],
  pdf: ["application/pdf"], docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

export async function GET() {
  const documents = getDb().prepare(`SELECT d.id,d.title,d.kind,d.source,d.created_at AS createdAt,length(d.content) AS characters,
    EXISTS(SELECT 1 FROM knowledge_vector_state v WHERE v.document_id=d.id) AS vectorIndexed
    FROM knowledge_documents d ORDER BY d.created_at DESC`).all();
  return NextResponse.json({ documents });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = await request.json().catch(() => null) as { action?: string; id?: string } | null;
    if (body?.action !== "reindex" || typeof body.id !== "string") return NextResponse.json({ error: "A document ID and reindex action are required." }, { status: 400 });
    const document = getDb().prepare("SELECT id FROM knowledge_documents WHERE id=?").get(body.id);
    if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    try {
      await removeKnowledgeVectors(body.id);
      const result = await indexKnowledgeDocument(body.id);
      recordAudit(null, "document.reindexed", JSON.stringify({ id: body.id, indexed: result.indexed }));
      return NextResponse.json({ id: body.id, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Document reindex failed.";
      recordAudit(null, "document.reindex_error", JSON.stringify({ id: body.id, error: message }));
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const sessionId = form?.get("sessionId");
  if (!(file instanceof File) || typeof sessionId !== "string") return NextResponse.json({ error: "A document and session are required." }, { status: 400 });
  if (file.size > maxBytes) return NextResponse.json({ error: "Documents must be smaller than 2 MB." }, { status: 413 });
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!acceptedMime[extension]) return NextResponse.json({ error: "Supported formats are TXT, Markdown, JSON, CSV, PDF, and DOCX." }, { status: 415 });
  const mime = file.type.toLowerCase();
  if (mime && mime !== "application/octet-stream" && !acceptedMime[extension].includes(mime)) return NextResponse.json({ error: "The file type does not match its extension." }, { status: 415 });
  const session = getDb().prepare("SELECT id FROM sessions WHERE id=? AND deleted_at IS NULL").get(sessionId);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  let extracted: Awaited<ReturnType<typeof extractDocumentText>>;
  try {
    extracted = await extractDocumentText(file.name, new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "The document could not be read.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
  const content = extracted.text;
  if (!content.trim()) return NextResponse.json({ error: "No selectable text was found. Scanned PDFs need OCR, which is not configured." }, { status: 422 });
  const title = file.name.replace(/[\\/]/g, "_").slice(0, 180);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const db = getDb();
  db.prepare("INSERT INTO knowledge_documents(id,title,kind,content,source,created_at) VALUES(?,?,?,?,?,?)").run(id, title, "upload", content, "user-upload", now);
  let vectorIndexed = false;
  try {
    vectorIndexed = (await indexKnowledgeDocument(id)).indexed;
    if (vectorIndexed) recordAudit(sessionId, "document.vector_indexed", JSON.stringify({ id, provider: "qdrant" }));
  } catch (error) {
    recordAudit(sessionId, "document.vector_index_error", JSON.stringify({ id, error: error instanceof Error ? error.message : "Vector indexing failed." }));
  }
  const excerpt = content.slice(0, 1200);
  const format = extension === "pdf" ? `PDF, ${extracted.pages} pages` : extension.toUpperCase();
  db.prepare("INSERT INTO messages(id,session_id,role,content,agent,provider,model,created_at) VALUES(?,?,?,?,?,?,?,?)")
    .run(crypto.randomUUID(), sessionId, "assistant", `Document received: **${title}** (${format}, ${content.length.toLocaleString()} extracted characters). ${vectorIndexed ? "Semantic vector indexing is complete." : "Local keyword search is ready; semantic indexing is available when an embedding provider and Qdrant are configured."}\n\nFirst excerpt:\n${excerpt}${content.length > excerpt.length ? "…" : ""}`, "Document intake", "local", "text-extraction", now);
  recordAudit(sessionId, "document.indexed", JSON.stringify({ id, title, bytes: file.size, characters: content.length, format, pages: extracted.pages }));
  return NextResponse.json({ id, title, characters: content.length, format, pages: extracted.pages, vectorIndexed });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A document ID is required." }, { status: 400 });
  const db = getDb();
  const document = db.prepare("SELECT title FROM knowledge_documents WHERE id=?").get(id) as { title: string } | undefined;
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  try {
    await removeKnowledgeVectors(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not remove the document's semantic vectors.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  db.prepare("DELETE FROM knowledge_documents WHERE id=?").run(id);
  recordAudit(null, "document.deleted", JSON.stringify({ id, title: document.title }));
  return NextResponse.json({ id, deleted: true });
}
