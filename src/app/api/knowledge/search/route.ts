import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { searchKnowledgeVectors } from "@/lib/qdrant";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ query, results: [] });
  if (query.length > 120) return NextResponse.json({ error: "Search queries are limited to 120 characters." }, { status: 400 });
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const lexical = getDb().prepare(`
    SELECT id, title, kind, source, created_at AS createdAt,
      substr(content, max(1, instr(lower(content), lower(?)) - 100), 360) AS excerpt
    FROM knowledge_documents
    WHERE title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\'
    ORDER BY CASE WHEN title LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END, created_at DESC
    LIMIT 40
  `).all(query, pattern, pattern, pattern);
  try {
    const vectorSearch = await searchKnowledgeVectors(query, 40);
    if (vectorSearch.mode === "hybrid") {
      const documents = getDb().prepare("SELECT id,title,kind,source,created_at AS createdAt FROM knowledge_documents WHERE id=?");
      const merged = new Map<string, { id: string; title: string; kind: string; source: string; createdAt: string; excerpt: string; score: number; match: "keyword" | "semantic" }>();
      for (const row of lexical as Array<{ id: string; title: string; kind: string; source: string; createdAt: string; excerpt: string }>) {
        merged.set(row.id, { ...row, score: 0.55, match: "keyword" });
      }
      for (const point of vectorSearch.results) {
        const id = point.payload?.documentId;
        if (!id) continue;
        const row = documents.get(id) as { id: string; title: string; kind: string; source: string; createdAt: string } | undefined;
        if (!row) continue;
        const prior = merged.get(id);
        const score = Math.max(point.score, prior?.score ?? 0);
        merged.set(id, { ...row, excerpt: point.payload?.content ?? prior?.excerpt ?? "", score, match: prior ? "keyword" : "semantic" });
      }
      const results = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 40);
      return NextResponse.json({ query, mode: "hybrid", results });
    }
  } catch {
    // Local keyword search remains usable when the vector service or embedding provider is unavailable.
  }
  return NextResponse.json({ query, mode: "local-keyword", results: lexical });
}
