import { getDb } from "@/lib/db";
import { isRecordKind, RECORD_SCHEMAS, type MetricValue, type RecordKind, type WorkspaceRecord } from "@/lib/record-schemas";

type RecordRow = {
  id: string;
  kind: RecordKind;
  code: string;
  title: string;
  subtitle: string;
  status: string;
  severity: string;
  owner: string;
  repo: string;
  starred: number;
  notes: string;
  metrics: string;
  created_at: string;
  updated_at: string;
};

export type RecordInput = {
  kind: RecordKind;
  code?: string;
  title: string;
  subtitle?: string;
  status?: string;
  severity?: string;
  owner?: string;
  repo?: string;
  starred?: boolean;
  notes?: string;
  metrics?: Record<string, MetricValue>;
};

function parseMetrics(value: string): Record<string, MetricValue> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const output: Record<string, MetricValue> = {};
    for (const [key, metric] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof metric === "string" || typeof metric === "number" || typeof metric === "boolean") output[key] = metric;
    }
    return output;
  } catch {
    return {};
  }
}

function hydrate(row: RecordRow): WorkspaceRecord {
  return {
    id: row.id,
    kind: row.kind,
    code: row.code,
    title: row.title,
    subtitle: row.subtitle,
    status: row.status,
    severity: row.severity,
    owner: row.owner,
    repo: row.repo,
    starred: row.starred === 1,
    notes: row.notes,
    metrics: parseMetrics(row.metrics),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listRecords(kind: RecordKind): WorkspaceRecord[] {
  const rows = getDb()
    .prepare("SELECT * FROM workspace_records WHERE kind=? ORDER BY starred DESC, updated_at DESC")
    .all(kind) as RecordRow[];
  return rows.filter(row => isRecordKind(row.kind)).map(hydrate);
}

function cleanMetrics(kind: RecordKind, metrics: Record<string, MetricValue> | undefined) {
  if (!metrics) return "{}";
  const allowed = new Set(RECORD_SCHEMAS[kind].fields.filter(field => field.metric).map(field => field.metric!.key));
  const output: Record<string, MetricValue> = {};
  for (const [key, value] of Object.entries(metrics)) {
    if (allowed.has(key) && (typeof value === "string" || typeof value === "number" || typeof value === "boolean")) output[key] = value;
  }
  return JSON.stringify(output);
}

function normalizeStatus(kind: RecordKind, status: string | undefined, fallback: string) {
  const allowed = RECORD_SCHEMAS[kind].statuses.map(option => option.value);
  if (status && allowed.includes(status)) return status;
  return fallback;
}

export function createRecord(input: RecordInput) {
  const db = getDb();
  const title = input.title?.trim();
  if (!title) throw new Error("A title is required.");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const fallbackStatus = RECORD_SCHEMAS[input.kind].statuses[0]?.value ?? "";
  const prefix = CODE_PREFIXES[input.kind];
  // Display codes are allocated by the data layer so every caller gets the same sequence.
  const code = input.code?.trim() || (prefix ? nextCode(input.kind, prefix) : "");
  db.prepare(`INSERT INTO workspace_records(id,kind,code,title,subtitle,status,severity,owner,repo,starred,notes,metrics,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id,
    input.kind,
    code,
    title,
    input.subtitle?.trim() ?? "",
    normalizeStatus(input.kind, input.status, fallbackStatus),
    input.severity?.trim() ?? "",
    input.owner?.trim() ?? "",
    input.repo?.trim() ?? "",
    input.starred ? 1 : 0,
    input.notes?.trim() ?? "",
    cleanMetrics(input.kind, input.metrics),
    now,
    now,
  );
  return hydrate(db.prepare("SELECT * FROM workspace_records WHERE id=?").get(id) as RecordRow);
}

export function updateRecord(id: string, patch: Partial<Omit<RecordInput, "kind">>) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM workspace_records WHERE id=?").get(id) as RecordRow | undefined;
  if (!row || !isRecordKind(row.kind)) return null;
  const current = hydrate(row);
  const kind = current.kind;
  const schema = RECORD_SCHEMAS[kind];
  const nextStatus = patch.status !== undefined
    ? normalizeStatus(kind, patch.status, current.status)
    : current.status;
  db.prepare(`UPDATE workspace_records SET code=?,title=?,subtitle=?,status=?,severity=?,owner=?,repo=?,starred=?,notes=?,metrics=?,updated_at=? WHERE id=?`).run(
    patch.code !== undefined ? patch.code.trim() : current.code,
    patch.title !== undefined ? patch.title.trim() || current.title : current.title,
    patch.subtitle !== undefined ? patch.subtitle.trim() : current.subtitle,
    nextStatus,
    patch.severity !== undefined ? patch.severity.trim() : current.severity,
    patch.owner !== undefined ? patch.owner.trim() : current.owner,
    patch.repo !== undefined ? patch.repo.trim() : current.repo,
    patch.starred !== undefined ? (patch.starred ? 1 : 0) : current.starred ? 1 : 0,
    patch.notes !== undefined ? patch.notes.trim() : current.notes,
    patch.metrics ? cleanMetrics(kind, { ...current.metrics, ...patch.metrics }) : JSON.stringify(current.metrics),
    new Date().toISOString(),
    id,
  );
  if (schema.statuses.length && nextStatus !== current.status) {
    db.prepare("INSERT INTO audit_events(id,session_id,action,detail,created_at) VALUES(?,?,?,?,?)")
      .run(crypto.randomUUID(), null, `${kind}.status_changed`, JSON.stringify({ id, from: current.status, to: nextStatus }), new Date().toISOString());
  }
  return hydrate(db.prepare("SELECT * FROM workspace_records WHERE id=?").get(id) as RecordRow);
}

export function deleteRecord(id: string) {
  const db = getDb();
  const row = db.prepare("SELECT kind FROM workspace_records WHERE id=?").get(id) as { kind: RecordKind } | undefined;
  if (!row || !isRecordKind(row.kind)) return false;
  db.prepare("DELETE FROM workspace_records WHERE id=?").run(id);
  return true;
}

/** Display prefixes for the kinds that show a short code such as PR-421. */
const CODE_PREFIXES: Partial<Record<RecordKind, string>> = {
  "pull-request": "PR-",
  review: "REV-",
  release: "REL-",
  "test-run": "RUN-",
  incident: "INC-",
  "cloud-environment": "ENV-",
  "dev-environment": "ENV-",
};

export function nextCode(kind: RecordKind, prefix: string) {
  const row = getDb().prepare("SELECT code FROM workspace_records WHERE kind=? AND code LIKE ? ORDER BY created_at DESC LIMIT 1")
    .get(kind, `${prefix}%`) as { code: string } | undefined;
  const latest = Number((row?.code ?? `${prefix}0`).replace(prefix, "").replace(/[^0-9].*$/, ""));
  return `${prefix}${String((Number.isFinite(latest) ? latest : 0) + 1)}`;
}

/**
 * Seeds the demo workspace with the reference records each dashboard renders.
 * Only runs when the demo workspace has no records of that kind yet.
 */
const DEMO_RECORDS: Array<RecordInput> = [
  // repositories
  { kind: "repository", title: "aero-platform", subtitle: "engineering", repo: "aero-platform", metrics: { description: "The core AERO AI engineering workspace platform.", isPrivate: true, language: "TypeScript", stars: 12, branches: 14, activePrs: 3 } },
  { kind: "repository", title: "mcp-connectors", subtitle: "engineering", repo: "mcp-connectors", metrics: { description: "Model Context Protocol adapters for Jira, GitHub, and Azure.", isPrivate: true, language: "Rust", stars: 8, branches: 5, activePrs: 1 } },
  { kind: "repository", title: "knowledge-indexer", subtitle: "engineering", repo: "knowledge-indexer", metrics: { description: "Background worker for semantic chunking and local embeddings.", isPrivate: true, language: "Python", stars: 4, branches: 8, activePrs: 0 } },
  { kind: "repository", title: "auth-gateway", subtitle: "infrastructure", repo: "auth-gateway", metrics: { description: "Zero-trust proxy for internal microservices.", isPrivate: false, language: "Go", stars: 45, branches: 2, activePrs: 4 } },
  // pull requests
  { kind: "pull-request", code: "PR-421", title: "feat(knowledge): semantic chunking pipeline", repo: "aero-platform", owner: "j.doe", status: "open", severity: "AERO-112", metrics: { ticket: "AERO-112", approved: true, comments: 4, files: 12, additions: 450, deletions: 23 } },
  { kind: "pull-request", code: "PR-420", title: "fix(ui): agent select dropdown overflow", repo: "aero-platform", owner: "s.smith", status: "merged", severity: "AERO-145", metrics: { ticket: "AERO-145", approved: true, comments: 2, files: 3, additions: 45, deletions: 12 } },
  { kind: "pull-request", code: "PR-419", title: "chore: update MCP dependencies", repo: "mcp-connectors", owner: "ren.bot", status: "open", severity: "AERO-112", metrics: { ticket: "AERO-112", approved: false, comments: 0, files: 2, additions: 15, deletions: 15 } },
  { kind: "pull-request", code: "PR-418", title: "refactor: isolate auth proxy middleware", repo: "auth-gateway", owner: "a.lee", status: "closed", severity: "INFRA-99", metrics: { ticket: "INFRA-99", approved: false, comments: 12, files: 24, additions: 890, deletions: 1200 } },
  { kind: "pull-request", code: "PR-417", title: "feat: add vector indexing worker", repo: "knowledge-indexer", owner: "j.doe", status: "open", severity: "AERO-112", metrics: { ticket: "AERO-112", approved: true, comments: 8, files: 7, additions: 320, deletions: 40 } },
  // reviews
  { kind: "review", code: "REV-101", title: "feat(knowledge): semantic chunking pipeline", repo: "aero-platform", owner: "j.doe", status: "pending", severity: "high", metrics: { prId: "PR-421", files: 12, additions: 450, deletions: 23, due: "Today", issues: 2 } },
  { kind: "review", code: "REV-102", title: "chore: update MCP dependencies", repo: "mcp-connectors", owner: "ren.bot", status: "pending", severity: "low", metrics: { prId: "PR-419", files: 2, additions: 15, deletions: 15, due: "Tomorrow", issues: 0 } },
  { kind: "review", code: "REV-103", title: "feat: add vector indexing worker", repo: "knowledge-indexer", owner: "j.doe", status: "approved", severity: "medium", metrics: { prId: "PR-417", files: 7, additions: 320, deletions: 40, due: "Completed", issues: 0 } },
  { kind: "review", code: "REV-104", title: "refactor: isolate auth proxy middleware", repo: "auth-gateway", owner: "a.lee", status: "changes_requested", severity: "high", metrics: { prId: "PR-418", files: 24, additions: 890, deletions: 1200, due: "Overdue", issues: 5 } },
  // releases
  { kind: "release", code: "REL-v1.2.0", title: "v1.2.0 - Semantic Search API", repo: "aero-platform", owner: "j.doe", status: "deployed", severity: "Production", metrics: { commits: 14 } },
  { kind: "release", code: "REL-v1.1.9", title: "v1.1.9 - Hotfix (Dropdown)", repo: "aero-platform", owner: "s.smith", status: "deployed", severity: "Production", metrics: { commits: 2 } },
  { kind: "release", code: "REL-v2.0.0-rc1", title: "v2.0.0 Release Candidate", repo: "mcp-connectors", owner: "ren.bot", status: "staging", severity: "Staging", metrics: { commits: 45 } },
  { kind: "release", code: "REL-v0.9.5", title: "v0.9.5 - Initial Auth Proxy", repo: "auth-gateway", owner: "a.lee", status: "failed", severity: "Production", metrics: { commits: 120 } },
  // test runs
  { kind: "test-run", code: "RUN-992", title: "E2E Playwright Suite", repo: "aero-platform", status: "passed", severity: "main", metrics: { duration: "12m 4s", total: 450, passed: 450, failed: 0, skipped: 0 } },
  { kind: "test-run", code: "RUN-991", title: "Unit Tests (Jest)", repo: "aero-platform", status: "failed", severity: "feat/knowledge", metrics: { duration: "1m 12s", total: 1240, passed: 1238, failed: 2, skipped: 0 } },
  { kind: "test-run", code: "RUN-990", title: "Integration (PyTest)", repo: "knowledge-indexer", status: "passed", severity: "main", metrics: { duration: "4m 30s", total: 85, passed: 80, failed: 0, skipped: 5 } },
  { kind: "test-run", code: "RUN-989", title: "Security Scan", repo: "auth-gateway", status: "passed", severity: "main", metrics: { duration: "8m 10s", total: 12, passed: 12, failed: 0, skipped: 0 } },
  { kind: "test-run", code: "RUN-988", title: "E2E Playwright Suite", repo: "aero-platform", status: "passed", severity: "fix/ui-overflow", metrics: { duration: "11m 45s", total: 450, passed: 450, failed: 0, skipped: 0 } },
  // incidents
  { kind: "incident", code: "INC-994", title: "API Gateway Latency Spike", subtitle: "auth-gateway", status: "investigating", severity: "high", metrics: { env: "production", errors: 4500 } },
  { kind: "incident", code: "INC-993", title: "OOM Killed: Vector Indexer", subtitle: "knowledge-indexer", status: "mitigated", severity: "medium", metrics: { env: "production", errors: 12 } },
  { kind: "incident", code: "INC-992", title: "Redis Connection Timeout", subtitle: "aero-platform", status: "resolved", severity: "low", metrics: { env: "staging", errors: 340 } },
  // cloud environments
  { kind: "cloud-environment", code: "ENV-P1", title: "Production (US-East)", subtitle: "AWS EKS", status: "healthy", metrics: { pods: 42, cpu: "45%", memory: "12.4GB", version: "v1.2.0" } },
  { kind: "cloud-environment", code: "ENV-P2", title: "Production (EU-West)", subtitle: "AWS EKS", status: "healthy", metrics: { pods: 38, cpu: "30%", memory: "10.1GB", version: "v1.2.0" } },
  { kind: "cloud-environment", code: "ENV-S1", title: "Staging Cluster", subtitle: "GCP GKE", status: "degraded", metrics: { pods: 14, cpu: "85%", memory: "14.2GB", version: "v1.3.0-rc" } },
  { kind: "cloud-environment", code: "ENV-D1", title: "Dev Integration", subtitle: "Azure AKS", status: "healthy", metrics: { pods: 8, cpu: "10%", memory: "2.1GB", version: "latest" } },
  // development environments
  { kind: "dev-environment", code: "ENV-1", title: "aero-platform", subtitle: "Node.js (Next.js)", status: "running", metrics: { port: "3000", branch: "feat/dashboard-ui", uptime: "4h 12m", cpu: "12%", ram: "450MB" } },
  { kind: "dev-environment", code: "ENV-2", title: "mcp-connectors", subtitle: "Rust (Cargo)", status: "stopped", metrics: { port: "8080", branch: "main", uptime: "-", cpu: "0%", ram: "0MB" } },
  { kind: "dev-environment", code: "ENV-3", title: "knowledge-indexer", subtitle: "Python (FastAPI)", status: "running", metrics: { port: "8000", branch: "fix/vector-search", uptime: "2d 4h", cpu: "2%", ram: "1.2GB" } },
  { kind: "dev-environment", code: "ENV-4", title: "redis-cache", subtitle: "Docker Container", status: "running", metrics: { port: "6379", branch: "-", uptime: "5d", cpu: "1%", ram: "50MB" } },
  // security findings
  { kind: "security-finding", title: "14 dependency alerts need triage", repo: "aero-platform", status: "open", severity: "medium", metrics: { source: "dependency", detail: "Dependabot reported 14 advisories across runtime and dev dependencies." } },
  { kind: "security-finding", title: "Secret scan clean", repo: "auth-gateway", status: "resolved", severity: "low", metrics: { source: "secret", detail: "No committed credentials detected in the last scan." } },
  // observability signals
  { kind: "observability-metric", title: "P99 Latency", status: "ok", metrics: { value: "142ms", source: "Datadog" } },
  { kind: "observability-metric", title: "Requests / Sec", status: "ok", metrics: { value: "2,405", source: "Datadog" } },
  { kind: "observability-metric", title: "Active Alerts", status: "warning", metrics: { value: "3", source: "Grafana" } },
  // vector index
  { kind: "vector-index", title: "architecture-v2.md", subtitle: "Design Doc", status: "synced", metrics: { chunks: 42, collection: "engineering" } },
  { kind: "vector-index", title: "AERO-112 Ticket", subtitle: "Jira Epic", status: "synced", metrics: { chunks: 14, collection: "tickets" } },
  { kind: "vector-index", title: "auth-gateway/main.go", subtitle: "Source Code", status: "indexing", metrics: { chunks: 112, collection: "code" } },
  { kind: "vector-index", title: "Q3 Planning Notes", subtitle: "Confluence", status: "synced", metrics: { chunks: 8, collection: "docs" } },
  { kind: "vector-index", title: "Incident-442-RCA", subtitle: "Post-Mortem", status: "synced", metrics: { chunks: 25, collection: "postmortems" } },
  // roi
  { kind: "roi-metric", title: "Automated PR Reviews", metrics: { hours: 64, category: "Review" } },
  { kind: "roi-metric", title: "Root Cause Analysis (RCAs)", metrics: { hours: 45, category: "Reliability" } },
  { kind: "roi-metric", title: "Knowledge Base Retrieval", metrics: { hours: 33, category: "Knowledge" } },
];

export function seedDemoRecords() {
  if (process.env.AERO_DEMO_MODE !== "1") return;
  const db = getDb();
  const existing = db.prepare("SELECT COUNT(*) AS count FROM workspace_records").get() as { count: number };
  if (existing.count > 0) return;
  for (const record of DEMO_RECORDS) createRecord(record);
}