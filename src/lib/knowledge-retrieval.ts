import { getDb } from "@/lib/db";
import { searchKnowledgeVectors } from "@/lib/qdrant";
import type { RetrievedKnowledge } from "@/lib/knowledge-context";

/** Combines local keyword results with Qdrant semantic matches for agent context. */
export async function retrieveKnowledgeContext(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { mode: "local-keyword" as const, documents: [] as RetrievedKnowledge[] };
  const pattern = `%${trimmed.replace(/[\\%_]/g, "\\$&")}%`;
  const lexical = getDb().prepare(`
    SELECT id,title,kind,source,created_at AS createdAt,
      substr(content,max(1,instr(lower(content),lower(?))-120),520) AS excerpt
    FROM knowledge_documents
    WHERE title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\'
    ORDER BY CASE WHEN title LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END,created_at DESC
    LIMIT 10
  `).all(trimmed, pattern, pattern, pattern) as Array<{ id: string; title: string; kind: string; source: string; createdAt: string; excerpt: string }>;
  const merged = new Map<string, RetrievedKnowledge>();
  for (const row of lexical) merged.set(row.id, { ...row, score: 0.55, match: "keyword" });

  let mode: "local-keyword" | "hybrid" = "local-keyword";
  try {
    const semantic = await searchKnowledgeVectors(trimmed, 20);
    mode = semantic.mode;
    if (semantic.mode === "hybrid") {
      const getDocument = getDb().prepare("SELECT id,title,kind,source,created_at AS createdAt FROM knowledge_documents WHERE id=?");
      for (const point of semantic.results) {
        const id = point.payload?.documentId;
        if (!id) continue;
        const row = getDocument.get(id) as { id: string; title: string; kind: string; source: string; createdAt: string } | undefined;
        if (!row) continue;
        const previous = merged.get(id);
        const isHigher = point.score > (previous?.score ?? -1);
        merged.set(id, {
          ...row,
          excerpt: isHigher ? point.payload?.content ?? previous?.excerpt ?? "" : previous?.excerpt ?? point.payload?.content ?? "",
          score: Math.max(point.score, previous?.score ?? 0),
          match: previous ? "keyword" : "semantic",
        });
      }
    }
  } catch {
    // Keep agent context useful when Qdrant or the configured embedding provider is unavailable.
  }
  const documents = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 5);
  return { mode, documents };
}
