import path from "node:path";
import { NextResponse } from "next/server";
import { ensureKnowledgeFolders } from "@/lib/knowledge";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  const knowledgeSaved = db.prepare("SELECT value FROM workspace_settings WHERE key='knowledge_root'").get();
  const repoSaved = db.prepare("SELECT value FROM workspace_settings WHERE key='repo_root'").get();
  
  return NextResponse.json({ 
    root: knowledgeSaved?.value ?? process.env.AERO_KNOWLEDGE_ROOT ?? path.join(process.cwd(), "aero-knowledge"),
    repoRoot: repoSaved?.value ?? path.join(process.cwd(), "aero-repos")
  });
}

export async function POST() {
  try {
    const db = getDb();
    const saved = db.prepare("SELECT value FROM workspace_settings WHERE key='knowledge_root'").get() as { value: string } | undefined;
    const root = saved?.value || process.env.AERO_KNOWLEDGE_ROOT || path.join(process.cwd(), "aero-knowledge");
    const result = await ensureKnowledgeFolders(root);
    return NextResponse.json({ ...result, created: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Knowledge workspace setup failed." }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const db = getDb();
    let finalRoot = null;
    let finalRepoRoot = null;
    
    if (body?.root) {
      const root = body.root.trim();
      if (!path.isAbsolute(root)) return NextResponse.json({ error: "Knowledge path must be absolute." }, { status: 400 });
      const result = await ensureKnowledgeFolders(root);
      finalRoot = result.root;
      db.prepare("INSERT INTO workspace_settings(key,value,updated_at) VALUES('knowledge_root',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").run(finalRoot, new Date().toISOString());
    }
    
    if (body?.repoRoot) {
      const repo = body.repoRoot.trim();
      if (!path.isAbsolute(repo)) return NextResponse.json({ error: "Repo path must be absolute." }, { status: 400 });
      finalRepoRoot = repo;
      const fsNode = require("fs");
      if (!fsNode.existsSync(repo)) {
         fsNode.mkdirSync(repo, { recursive: true });
      }
      db.prepare("INSERT INTO workspace_settings(key,value,updated_at) VALUES('repo_root',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").run(finalRepoRoot, new Date().toISOString());
    }
    
    return NextResponse.json({ root: finalRoot, repoRoot: finalRepoRoot, created: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Workspace setup failed." }, { status: 400 });
  }
}