export const RECORD_KINDS = [
  "repository",
  "pull-request",
  "review",
  "release",
  "test-run",
  "incident",
  "cloud-environment",
  "dev-environment",
  "security-finding",
  "observability-metric",
  "vector-index",
  "roi-metric",
  "okr",
  "feature-flag",
] as const;

export type RecordKind = (typeof RECORD_KINDS)[number];

export function isRecordKind(value: unknown): value is RecordKind {
  return typeof value === "string" && (RECORD_KINDS as readonly string[]).includes(value);
}

export type MetricValue = string | number | boolean;

export type WorkspaceRecord = {
  id: string;
  kind: RecordKind;
  code: string;
  title: string;
  subtitle: string;
  status: string;
  severity: string;
  owner: string;
  repo: string;
  starred: boolean;
  notes: string;
  metrics: Record<string, MetricValue>;
  createdAt: string;
  updatedAt: string;
};

export type FieldOption = { value: string; label: string };

/** One editor field. `column` routes to a real column, otherwise the value lands in `metrics`. */
export type RecordField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "toggle";
  column?: "code" | "title" | "subtitle" | "status" | "severity" | "owner" | "repo" | "starred" | "notes";
  options?: FieldOption[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  metric?: { key: string; suffix?: string };
};

export type RecordSchema = {
  kind: RecordKind;
  label: string;
  plural: string;
  /** Statuses offered in the editor; empty means the record has no lifecycle. */
  statuses: FieldOption[];
  fields: RecordField[];
  /** Metric key used to sort by recency/priority where the dashboard needs one. */
  primaryMetric?: string;
};

const status = (values: string[]): FieldOption[] => values.map(value => ({ value, label: value.replace(/[-_]/g, " ") }));

export const RECORD_SCHEMAS: Record<RecordKind, RecordSchema> = {
  repository: {
    kind: "repository",
    label: "Repository",
    plural: "Repositories",
    statuses: [],
    fields: [
      { name: "title", label: "Repository name", type: "text", column: "title", required: true, placeholder: "aero-platform" },
      { name: "subtitle", label: "Organisation", type: "text", column: "subtitle", placeholder: "engineering" },
      { name: "description", label: "Description", type: "textarea", metric: { key: "description" } },
      { name: "language", label: "Primary language", type: "text", metric: { key: "language" }, placeholder: "TypeScript" },
      { name: "isPrivate", label: "Private", type: "toggle", metric: { key: "isPrivate" } },
      { name: "stars", label: "Stars", type: "number", metric: { key: "stars" } },
      { name: "branches", label: "Active branches", type: "number", metric: { key: "branches" } },
      { name: "activePrs", label: "Open pull requests", type: "number", metric: { key: "activePrs" } },
      { name: "starred", label: "Starred", type: "toggle", column: "starred" },
    ],
  },
  "pull-request": {
    kind: "pull-request",
    label: "Pull request",
    plural: "Pull requests",
    statuses: status(["open", "merged", "closed"]),
    fields: [
      { name: "title", label: "Title", type: "text", column: "title", required: true, placeholder: "feat(knowledge): semantic chunking pipeline" },
      { name: "code", label: "Pull request ID", type: "text", column: "code", placeholder: "PR-421" },
      { name: "repo", label: "Repository", type: "text", column: "repo", placeholder: "aero-platform" },
      { name: "ticket", label: "Ticket", type: "text", metric: { key: "ticket" }, placeholder: "AERO-112" },
      { name: "owner", label: "Author", type: "text", column: "owner", placeholder: "j.doe" },
      { name: "status", label: "Status", type: "select", column: "status", options: status(["open", "merged", "closed"]) },
      { name: "approved", label: "Approved", type: "toggle", metric: { key: "approved" } },
      { name: "comments", label: "Comments", type: "number", metric: { key: "comments" } },
      { name: "files", label: "Files changed", type: "number", metric: { key: "files" } },
      { name: "additions", label: "Additions", type: "number", metric: { key: "additions" } },
      { name: "deletions", label: "Deletions", type: "number", metric: { key: "deletions" } },
    ],
  },
  review: {
    kind: "review",
    label: "Review",
    plural: "Code reviews",
    statuses: status(["pending", "approved", "changes_requested"]),
    fields: [
      { name: "title", label: "Title", type: "text", column: "title", required: true },
      { name: "repo", label: "Repository", type: "text", column: "repo" },
      { name: "prId", label: "Pull request", type: "text", metric: { key: "prId" }, placeholder: "PR-421" },
      { name: "owner", label: "Author", type: "text", column: "owner" },
      { name: "status", label: "Status", type: "select", column: "status", options: status(["pending", "approved", "changes_requested"]) },
      { name: "urgency", label: "Urgency", type: "select", column: "severity", options: status(["high", "medium", "low"]) },
      { name: "files", label: "Files", type: "number", metric: { key: "files" } },
      { name: "additions", label: "Lines added", type: "number", metric: { key: "additions" } },
      { name: "deletions", label: "Lines removed", type: "number", metric: { key: "deletions" } },
      { name: "due", label: "Due", type: "text", metric: { key: "due" }, placeholder: "Today" },
      { name: "issues", label: "Open issues", type: "number", metric: { key: "issues" } },
    ],
  },
  release: {
    kind: "release",
    label: "Release",
    plural: "Releases",
    statuses: status(["staging", "deployed", "failed"]),
    fields: [
      { name: "title", label: "Release name", type: "text", column: "title", required: true, placeholder: "v1.2.0 - Semantic Search API" },
      { name: "code", label: "Release ID", type: "text", column: "code", placeholder: "REL-v1.2.0" },
      { name: "repo", label: "Repository", type: "text", column: "repo" },
      { name: "owner", label: "Author", type: "text", column: "owner" },
      { name: "status", label: "Status", type: "select", column: "status", options: status(["staging", "deployed", "failed"]) },
      { name: "env", label: "Environment", type: "text", column: "severity", placeholder: "Production" },
      { name: "commits", label: "Commits", type: "number", metric: { key: "commits" } },
      { name: "notes", label: "Release notes", type: "textarea", column: "notes" },
    ],
  },
  "test-run": {
    kind: "test-run",
    label: "Test run",
    plural: "Test runs",
    statuses: status(["passed", "failed", "running"]),
    fields: [
      { name: "title", label: "Suite name", type: "text", column: "title", required: true, placeholder: "E2E Playwright Suite" },
      { name: "code", label: "Run ID", type: "text", column: "code", placeholder: "RUN-992" },
      { name: "repo", label: "Repository", type: "text", column: "repo" },
      { name: "branch", label: "Branch", type: "text", column: "severity", placeholder: "main" },
      { name: "status", label: "Result", type: "select", column: "status", options: status(["passed", "failed", "running"]) },
      { name: "duration", label: "Duration", type: "text", metric: { key: "duration" }, placeholder: "12m 4s" },
      { name: "total", label: "Total tests", type: "number", metric: { key: "total" } },
      { name: "passed", label: "Passed", type: "number", metric: { key: "passed" } },
      { name: "failed", label: "Failed", type: "number", metric: { key: "failed" } },
      { name: "skipped", label: "Skipped", type: "number", metric: { key: "skipped" } },
    ],
  },
  incident: {
    kind: "incident",
    label: "Incident",
    plural: "Incidents",
    statuses: status(["investigating", "mitigated", "resolved"]),
    fields: [
      { name: "title", label: "Incident title", type: "text", column: "title", required: true, placeholder: "API Gateway Latency Spike" },
      { name: "code", label: "Incident ID", type: "text", column: "code", placeholder: "INC-994" },
      { name: "service", label: "Service", type: "text", column: "subtitle", placeholder: "auth-gateway" },
      { name: "env", label: "Environment", type: "text", metric: { key: "env" }, placeholder: "production" },
      { name: "status", label: "Status", type: "select", column: "status", options: status(["investigating", "mitigated", "resolved"]) },
      { name: "impact", label: "Impact", type: "select", column: "severity", options: status(["high", "medium", "low"]) },
      { name: "errors", label: "Error events", type: "number", metric: { key: "errors" } },
      { name: "notes", label: "Root cause", type: "textarea", column: "notes" },
    ],
  },
  "cloud-environment": {
    kind: "cloud-environment",
    label: "Cloud environment",
    plural: "Cloud environments",
    statuses: status(["healthy", "degraded", "down"]),
    fields: [
      { name: "title", label: "Environment name", type: "text", column: "title", required: true, placeholder: "Production (US-East)" },
      { name: "provider", label: "Provider", type: "text", column: "subtitle", placeholder: "AWS EKS" },
      { name: "status", label: "Health", type: "select", column: "status", options: status(["healthy", "degraded", "down"]) },
      { name: "pods", label: "Active pods", type: "number", metric: { key: "pods" } },
      { name: "cpu", label: "CPU usage", type: "text", metric: { key: "cpu" }, placeholder: "45%" },
      { name: "memory", label: "Memory usage", type: "text", metric: { key: "memory" }, placeholder: "12.4GB" },
      { name: "version", label: "Version", type: "text", metric: { key: "version" }, placeholder: "v1.2.0" },
    ],
  },
  "dev-environment": {
    kind: "dev-environment",
    label: "Development environment",
    plural: "Development environments",
    statuses: status(["running", "stopped"]),
    fields: [
      { name: "title", label: "Workspace name", type: "text", column: "title", required: true, placeholder: "aero-platform" },
      { name: "type", label: "Runtime", type: "text", column: "subtitle", placeholder: "Node.js (Next.js)" },
      { name: "status", label: "State", type: "select", column: "status", options: status(["running", "stopped"]) },
      { name: "port", label: "Port", type: "text", metric: { key: "port" }, placeholder: "3000" },
      { name: "branch", label: "Branch", type: "text", metric: { key: "branch" }, placeholder: "feat/dashboard-ui" },
      { name: "uptime", label: "Uptime", type: "text", metric: { key: "uptime" }, placeholder: "4h 12m" },
      { name: "cpu", label: "CPU usage", type: "text", metric: { key: "cpu" }, placeholder: "12%" },
      { name: "ram", label: "Memory usage", type: "text", metric: { key: "ram" }, placeholder: "450MB" },
    ],
  },
  "security-finding": {
    kind: "security-finding",
    label: "Security finding",
    plural: "Security findings",
    statuses: status(["open", "mitigated", "resolved"]),
    fields: [
      { name: "title", label: "Finding", type: "text", column: "title", required: true, placeholder: "Transitive lodash prototype pollution" },
      { name: "repo", label: "Repository", type: "text", column: "repo" },
      { name: "severity", label: "Severity", type: "select", column: "severity", options: status(["critical", "high", "medium", "low"]) },
      { name: "status", label: "Status", type: "select", column: "status", options: status(["open", "mitigated", "resolved"]) },
      { name: "source", label: "Source", type: "select", metric: { key: "source" }, options: status(["dependency", "secret", "static-analysis", "runtime"]) },
      { name: "detail", label: "Detail", type: "textarea", metric: { key: "detail" } },
    ],
  },
  "observability-metric": {
    kind: "observability-metric",
    label: "Telemetry signal",
    plural: "Telemetry signals",
    statuses: status(["ok", "warning", "critical"]),
    fields: [
      { name: "title", label: "Signal", type: "text", column: "title", required: true, placeholder: "P99 Latency" },
      { name: "value", label: "Value", type: "text", metric: { key: "value" }, placeholder: "142ms" },
      { name: "source", label: "Source", type: "text", metric: { key: "source" }, placeholder: "Datadog" },
      { name: "status", label: "Health", type: "select", column: "status", options: status(["ok", "warning", "critical"]) },
      { name: "detail", label: "Detail", type: "textarea", metric: { key: "detail" } },
    ],
  },
  "vector-index": {
    kind: "vector-index",
    label: "Indexed document",
    plural: "Indexed documents",
    statuses: status(["synced", "indexing", "failed"]),
    fields: [
      { name: "title", label: "Document", type: "text", column: "title", required: true, placeholder: "architecture-v2.md" },
      { name: "type", label: "Document type", type: "text", column: "subtitle", placeholder: "Design Doc" },
      { name: "status", label: "Index status", type: "select", column: "status", options: status(["synced", "indexing", "failed"]) },
      { name: "chunks", label: "Chunks", type: "number", metric: { key: "chunks" } },
      { name: "collection", label: "Collection", type: "text", metric: { key: "collection" }, placeholder: "engineering" },
    ],
  },
  "okr": {
    kind: "okr",
    label: "OKR",
    plural: "OKRs",
    statuses: [],
    fields: [
      { name: "title", label: "Objective", type: "text", column: "title", required: true, placeholder: "Accelerate Enterprise Onboarding" },
      { name: "progress", label: "Overall Progress (%)", type: "number", metric: { key: "progress" } },
      { name: "kr1", label: "Key Result 1", type: "text", metric: { key: "kr1" }, placeholder: "Reduce setup time from 4h to 10m" },
      { name: "kr1_prog", label: "KR 1 Progress (%)", type: "number", metric: { key: "kr1_prog" } },
      { name: "kr2", label: "Key Result 2", type: "text", metric: { key: "kr2" } },
      { name: "kr2_prog", label: "KR 2 Progress (%)", type: "number", metric: { key: "kr2_prog" } },
      { name: "kr3", label: "Key Result 3", type: "text", metric: { key: "kr3" } },
      { name: "kr3_prog", label: "KR 3 Progress (%)", type: "number", metric: { key: "kr3_prog" } },
    ],
  },
  "feature-flag": {
    kind: "feature-flag",
    label: "Feature Flag",
    plural: "Feature Flags",
    statuses: [],
    fields: [
      { name: "title", label: "Flag Name", type: "text", column: "title", required: true, placeholder: "enable-new-auth" },
      { name: "desc", label: "Description", type: "textarea", column: "subtitle", placeholder: "Turns on the new auth flow" },
      { name: "env", label: "Environment", type: "text", metric: { key: "env" }, placeholder: "Production" },
      { name: "rollout", label: "Rollout (%)", type: "text", metric: { key: "rollout" }, placeholder: "25%" },
      { name: "target", label: "Target Audience", type: "text", metric: { key: "target" }, placeholder: "Beta Users" },
    ],
  },
  "roi-metric": {
    kind: "roi-metric",
    label: "Automation saving",
    plural: "Automation savings",
    statuses: [],
    fields: [
      { name: "title", label: "Activity", type: "text", column: "title", required: true, placeholder: "Automated PR reviews" },
      { name: "hours", label: "Hours saved / month", type: "number", metric: { key: "hours" }, help: "Estimated human hours at your blended rate." },
      { name: "category", label: "Category", type: "text", metric: { key: "category" }, placeholder: "Review" },
    ],
  },
};

export function recordSchema(kind: RecordKind) {
  return RECORD_SCHEMAS[kind];
}