import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const globalForAero = globalThis as typeof globalThis & { aeroDb?: DatabaseSync };

function connect() {
  const dataDir = path.resolve(/* turbopackIgnore: true */ process.env.AERO_DATA_DIR || path.join(process.cwd(), "data"));
  mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "aero.sqlite"));
  return db;
}

/** Idempotent schema application. Safe to run against an existing workspace database. */
export function migrate(db: DatabaseSync) {
  db.exec("PRAGMA busy_timeout = 10000;");
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
      agent_id TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_general_session
      ON sessions(kind) WHERE kind = 'general' AND deleted_at IS NULL;
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
      role TEXT NOT NULL CHECK(role IN ('user','assistant')), content TEXT NOT NULL,
      agent TEXT, provider TEXT, model TEXT, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_by_session ON messages(session_id, created_at);
    CREATE TABLE IF NOT EXISTS custom_agents (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, persona TEXT NOT NULL, signature TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS session_agents (
      session_id TEXT NOT NULL REFERENCES sessions(id), agent_id TEXT NOT NULL,
      added_at TEXT NOT NULL, PRIMARY KEY(session_id,agent_id)
    );
    CREATE INDEX IF NOT EXISTS agents_by_session ON session_agents(session_id,added_at);
    CREATE TABLE IF NOT EXISTS knowledge_documents (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, kind TEXT NOT NULL,
      content TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS knowledge_vector_state (
      document_id TEXT NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
      collection_name TEXT NOT NULL, fingerprint TEXT NOT NULL, indexed_at TEXT NOT NULL,
      PRIMARY KEY(document_id, collection_name)
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY, session_id TEXT, action TEXT NOT NULL,
      detail TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspace_settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, description TEXT NOT NULL DEFAULT '',
      jira_url TEXT NOT NULL DEFAULT '', jira_projects TEXT NOT NULL DEFAULT '',
      confluence_url TEXT NOT NULL DEFAULT '', confluence_spaces TEXT NOT NULL DEFAULT '',
      azure_devops_url TEXT NOT NULL DEFAULT '', azure_project TEXT NOT NULL DEFAULT '',
      documentation_url TEXT NOT NULL DEFAULT '', ci_url TEXT NOT NULL DEFAULT '',
      default_branch TEXT NOT NULL DEFAULT 'main', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS company_repositories (
      id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL, remote_url TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'Other',
      default_branch TEXT NOT NULL DEFAULT 'main', created_at TEXT NOT NULL,
      UNIQUE(company_id,name)
    );
    CREATE INDEX IF NOT EXISTS repositories_by_company ON company_repositories(company_id, name);
    CREATE TABLE IF NOT EXISTS demo_runs (
      id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL, action_id TEXT NOT NULL,
      result TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS demo_runs_by_workflow ON demo_runs(workflow_id, created_at);
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '', owner TEXT NOT NULL DEFAULT 'Unassigned',
      team TEXT NOT NULL DEFAULT 'Workspace',
      status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','in-progress','at-risk','complete')),
      start_date TEXT NOT NULL, end_date TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
      tasks_done INTEGER NOT NULL DEFAULT 0, tasks_total INTEGER NOT NULL DEFAULT 0,
      tags TEXT NOT NULL DEFAULT '[]', created_by TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS plans_by_status ON plans(status, start_date);
    CREATE TABLE IF NOT EXISTS plan_phases (
      id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      name TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('done','active','todo')),
      position INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS phases_by_plan ON plan_phases(plan_id, position);
    CREATE TABLE IF NOT EXISTS plan_milestones (
      id TEXT PRIMARY KEY, plan_id TEXT REFERENCES plans(id) ON DELETE CASCADE,
      title TEXT NOT NULL, due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('done','upcoming','risk')),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS milestones_by_date ON plan_milestones(due_date);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, provider TEXT NOT NULL, provider_account_id TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '', picture_url TEXT NOT NULL DEFAULT '',
      access_token TEXT NOT NULL DEFAULT '', token_expires_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(provider, provider_account_id)
    );
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '', bio TEXT NOT NULL DEFAULT '',
      timezone TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS auth_sessions_by_token ON auth_sessions(token_hash);
    CREATE TABLE IF NOT EXISTS oauth_pending (
      state TEXT PRIMARY KEY, provider TEXT NOT NULL, code_verifier TEXT NOT NULL,
      return_to TEXT NOT NULL DEFAULT '/', created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspace_records (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, code TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL, subtitle TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT '',
      severity TEXT NOT NULL DEFAULT '', owner TEXT NOT NULL DEFAULT '', repo TEXT NOT NULL DEFAULT '',
      starred INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '',
      metrics TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS records_by_kind ON workspace_records(kind, updated_at);
  `);
  const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
  if (!sessionColumns.some(column => column.name === "agent_id")) db.exec("ALTER TABLE sessions ADD COLUMN agent_id TEXT");
  const userColumns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  if (!userColumns.some(column => column.name === "access_token")) db.exec("ALTER TABLE users ADD COLUMN access_token TEXT NOT NULL DEFAULT ''");
  if (!userColumns.some(column => column.name === "token_expires_at")) db.exec("ALTER TABLE users ADD COLUMN token_expires_at TEXT NOT NULL DEFAULT ''");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS one_active_agent_chat ON sessions(agent_id) WHERE kind='agent' AND agent_id IS NOT NULL AND deleted_at IS NULL;");
  const activeGeneral = db.prepare("SELECT id FROM sessions WHERE kind = 'general' AND deleted_at IS NULL LIMIT 1").get();
  if (!activeGeneral) {
    const now = new Date().toISOString();
    db.prepare("INSERT INTO sessions(id,kind,title,created_at,updated_at) VALUES(?,?,?,?,?)")
      .run(crypto.randomUUID(), "general", "General session", now, now);
  }
  const activeCompany = db.prepare("SELECT value FROM workspace_settings WHERE key='active_company_id'").get();
  const companyCount = db.prepare("SELECT COUNT(*) AS count FROM companies").get() as { count: number };
  if (companyCount.count === 0) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO companies(id,name,default_branch,created_at,updated_at) VALUES(?,?,?,?,?)")
      .run(id, "BrandBuilder", "main", now, now);
    db.prepare("INSERT INTO workspace_settings(key,value,updated_at) VALUES('active_company_id',?,?)")
      .run(id, now);
  } else if (!activeCompany) {
    const first = db.prepare("SELECT id FROM companies ORDER BY created_at,id LIMIT 1").get() as { id: string };
    db.prepare("INSERT INTO workspace_settings(key,value,updated_at) VALUES('active_company_id',?,?)")
      .run(first.id, new Date().toISOString());
  }
}

export function getDb() {
  if (!globalForAero.aeroDb) globalForAero.aeroDb = connect();
  // Re-apply the schema so workspaces created before a new module still gain its tables.
  migrate(globalForAero.aeroDb);
  return globalForAero.aeroDb;
}

export type DbSession = { id: string; kind: string; title: string; created_at: string; updated_at: string; agent_id: string | null };
export type DbMessage = { id: string; session_id: string; role: "user" | "assistant"; content: string; agent: string | null; provider: string | null; model: string | null; created_at: string };

export function recordAudit(sessionId: string | null, action: string, detail: string) {
  getDb().prepare("INSERT INTO audit_events(id,session_id,action,detail,created_at) VALUES(?,?,?,?,?)")
    .run(crypto.randomUUID(), sessionId, action, detail, new Date().toISOString());
}
