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
