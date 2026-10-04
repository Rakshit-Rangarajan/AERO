export type DemoAction = {
  id: string;
  label: string;
  output: string;
  requires?: { workflowId: string; actionId: string };
};

export type DemoWorkflow = {
  id: string;
  nav: string;
  title: string;
  eyebrow: string;
  description: string;
  actions: DemoAction[];
};

/** Deterministic local scenarios. These strings describe simulations, never live external results. */
export const demoWorkflows: DemoWorkflow[] = [
  { id: "connections", nav: "Integrations", title: "Integration adapters", eyebrow: "CONNECTION LAB", description: "Walk through the Jira, Confluence, and Azure DevOps adapter contracts using a fixed local scenario. No credentials are read and no service is contacted.", actions: [
    { id: "jira", label: "Preview Jira adapter", output: "MOCK MODE · Jira adapter previewed with PAY-421: ticket fields, linked issue references, comments, and attachment metadata are represented by the local fixture. No Jira request was sent." },
    { id: "confluence", label: "Preview Confluence adapter", output: "MOCK MODE · Confluence search preview contains two fixture pages for payment retry architecture. No Confluence request was sent." },
    { id: "azure", label: "Preview Azure DevOps adapter", output: "MOCK MODE · Azure DevOps fixture lists the payments-service repository and a sample pull request. No Azure DevOps request was sent." },
  ] },
  { id: "jira-analysis", nav: "Work items", title: "Jira work item intake", eyebrow: "TICKET → CONTEXT", description: "Follow a sample PAY-421 from ticket context through a dedicated AERO work-item session. Other session kinds are listed in the final fixture step.", actions: [
    { id: "ticket", label: "Load sample PAY-421", output: "MOCK MODE · Fixture ticket PAY-421: payment requests can time out while retrying. Acceptance criteria and linked issue IDs are sample data, not fetched from Jira." },
    { id: "context", label: "Assemble linked context", requires: { workflowId: "jira-analysis", actionId: "ticket" }, output: "MOCK MODE · Added fixture comments, attachment names, two related tickets, one Confluence reference, and a likely payments-service repository to the context pack." },
    { id: "session", label: "Create sample work session", requires: { workflowId: "jira-analysis", actionId: "context" }, output: "MOCK MODE · Work-item session context is ready for PAY-421. This did not create or update a Jira issue." },
    { id: "session-types", label: "Preview dedicated session types", requires: { workflowId: "jira-analysis", actionId: "session" }, output: "MOCK MODE · Supported demo session kinds: Jira Story, Epic, PI item, Bug, Task, Ticket, Document, Uploaded Document, Research, RCA, and Release. No additional session records were created." },
  ] },
  { id: "confluence", nav: "Confluence", title: "Documentation retrieval", eyebrow: "KNOWLEDGE SOURCE", description: "Preview ranked documentation retrieval and bounded context selection.", actions: [
    { id: "search", label: "Search sample space", output: "MOCK MODE · Search fixture returned Payment Retry Guidelines and Service Resilience ADR. Results are local examples; no Confluence space was queried." },
    { id: "context", label: "Build bounded context pack", requires: { workflowId: "confluence", actionId: "search" }, output: "MOCK MODE · Selected 3 short excerpts with page titles and source links for a hypothetical analysis. No full space export was performed." },
  ] },
  { id: "azure-devops", nav: "Azure DevOps", title: "Azure DevOps discovery", eyebrow: "REMOTE SOURCE", description: "Preview project, repository, branch, pull request, and build discovery with local fixtures.", actions: [
    { id: "projects", label: "List sample projects", output: "MOCK MODE · Fixture organization contains Payments and Platform projects. No remote organization was contacted." },
    { id: "repos", label: "Find related repositories", requires: { workflowId: "azure-devops", actionId: "projects" }, output: "MOCK MODE · payments-service ranked first for PAY-421 based on fixture names and commit summaries. Ranking is illustrative, not a live search." },
    { id: "builds", label: "Preview PR and build context", requires: { workflowId: "azure-devops", actionId: "repos" }, output: "MOCK MODE · Example PR 184 and build 921 are fixture records. No branch, PR, or build was read or changed." },
  ] },
  { id: "repositories", nav: "Repositories", title: "Repository intelligence", eyebrow: "REPOSITORY PROFILE", description: "Walk through safe repository registration and profile discovery using a synthetic project. No local paths are scanned.", actions: [
    { id: "register", label: "Register sample repository", output: "MOCK MODE · Registered the synthetic payments-service fixture. No path was opened and no repository was added to the filesystem." },
    { id: "inspect", label: "Build repository profile", requires: { workflowId: "repositories", actionId: "register" }, output: "MOCK MODE · Fixture profile: TypeScript, pnpm, Vitest, Playwright, GitHub Actions, current branch feature/PAY-421. These values are sample data." },
    { id: "related", label: "Map ticket to files", requires: { workflowId: "repositories", actionId: "inspect" }, output: "MOCK MODE · Sample impact map points to src/retry/policy.ts, src/retry/policy.test.ts, and tests/retry.spec.ts. Files were not read." },
  ] },
  { id: "analysis", nav: "Analysis", title: "Analysis modes", eyebrow: "ANALYSIS ENGINE", description: "Run the available response shapes against a fixed PAY-421 scenario. Outputs demonstrate format and scope, not evidence from live sources.", actions: [
    { id: "quick", label: "Run Quick analysis", output: "MOCK MODE · QUICK: likely retry-policy edge case; inspect timeout handling and existing retry tests first." },
    { id: "standard", label: "Run Standard analysis", output: "MOCK MODE · STANDARD: requirements, likely files, dependencies, test targets, and key risks assembled from the PAY-421 fixture." },
    { id: "deep", label: "Run Deep analysis", output: "MOCK MODE · DEEP: architecture, security, performance, historical-context, alternatives, and test sections shown using synthetic evidence." },
    { id: "research", label: "Run Research mode", output: "MOCK MODE · RESEARCH: comparison outline prepared for bounded retry strategies, idempotency, backoff, and observability." },
    { id: "rca", label: "Run RCA mode", output: "MOCK MODE · RCA: hypothesis tree prepared; timeout budget, retry amplification, and idempotency are candidate branches, not confirmed causes." },
    { id: "executive", label: "Run Executive mode", output: "MOCK MODE · EXECUTIVE: customer impact, delivery risk, and decision request summarized in a concise business format." },
  ] },
  { id: "round-table", nav: "Round table", title: "Round Table conference", eyebrow: "MULTI-AGENT REVIEW", description: "Compare independent sample viewpoints and a moderator synthesis. This is a deterministic fixture, not parallel model execution.", actions: [
    { id: "select", label: "Load selected agents", output: "MOCK MODE · Selected Architect Ada, Backend Ishan, QA Priya, and Security Omar for the PAY-421 fixture. No agent runtime was invoked." },
    { id: "deliberate", label: "Generate sample viewpoints", requires: { workflowId: "round-table", actionId: "select" }, output: "MOCK MODE · Architect: preserve idempotency boundaries. Backend: bound retries by the request deadline. QA: cover timeout and duplicate-delivery cases. Security: avoid replaying non-idempotent operations." },
    { id: "synthesis", label: "Moderator synthesis", requires: { workflowId: "round-table", actionId: "deliberate" }, output: "MOCK MODE · Shared recommendation: define a total time budget, retry only safe/idempotent operations, and add deterministic timeout tests. Open question: product retry policy." },
  ] },
  { id: "plans", nav: "Plans", title: "Development plan and approval", eyebrow: "HUMAN GATE", description: "Create an illustrative plan and explicitly approve it before downstream demo execution. Approval applies only to this local simulation.", actions: [
    { id: "draft", label: "Draft implementation plan", output: "MOCK MODE · Draft plan: confirm behavior; inspect retry policy; update implementation and tests; review security/performance; run relevant suites; prepare a PR preview; stop for manual deployment." },
    { id: "approve", label: "Approve demo plan", requires: { workflowId: "plans", actionId: "draft" }, output: "MOCK MODE · Demo approval recorded for the sample plan. No code, branch, external system, or deployment permission was granted." },
  ] },
  { id: "development", nav: "Development", title: "Approved development execution", eyebrow: "SANDBOXED DEMONSTRATION", description: "Exercise the execution stages against a fixture only. This demo does not launch a coding agent or touch files.", actions: [
    { id: "branch", label: "Preview branch plan", requires: { workflowId: "plans", actionId: "approve" }, output: "MOCK MODE · Proposed branch feature/PAY-421-retry-budget. No Git command was run and no branch was created." },
    { id: "implementation", label: "Simulate implementation report", requires: { workflowId: "plans", actionId: "approve" }, output: "MOCK MODE · Sample change summary: bounded retry loop, deadline check, and focused unit tests. No source files were modified." },
  ] },
  { id: "code-review", nav: "Reviews", title: "Code review and comment resolution", eyebrow: "REVIEW WORKFLOW", description: "Explore finding validation, evidence, resolution, and re-review with sample comments.", actions: [
    { id: "review", label: "Run sample code review", requires: { workflowId: "development", actionId: "implementation" }, output: "MOCK MODE · Sample findings: P1 retry loop may exceed request deadline; P2 missing duplicate-delivery assertion. No diff was inspected." },
    { id: "validate", label: "Validate sample findings", requires: { workflowId: "code-review", actionId: "review" }, output: "MOCK MODE · Finding 1 confirmed against fixture assumptions; finding 2 accepted as a test-coverage gap. No repository files were checked." },
    { id: "resolve", label: "Simulate CR resolution", requires: { workflowId: "code-review", actionId: "validate" }, output: "MOCK MODE · Proposed fix notes and targeted-test evidence attached to both sample comments. No code was changed." },
    { id: "rereview", label: "Re-review sample findings", requires: { workflowId: "code-review", actionId: "resolve" }, output: "MOCK MODE · Sample re-review shows both fixture comments resolved. This is not a real review approval." },
  ] },
  { id: "testing", nav: "Testing", title: "Test discovery and execution", eyebrow: "QUALITY GATES", description: "Preview test selection, a simulated report, Playwright scenarios, and failure triage. No tests or browsers are launched.", actions: [
    { id: "discover", label: "Discover test suites", requires: { workflowId: "development", actionId: "implementation" }, output: "MOCK MODE · Fixture discovery: 42 unit tests, 8 integration tests, and 3 Playwright specs. Counts are illustrative." },
    { id: "run", label: "Simulate test report", requires: { workflowId: "testing", actionId: "discover" }, output: "MOCK MODE · Example report: 49 passed, 1 failed. The failing fixture is retry-timeout.spec.ts; no test command was executed." },
    { id: "playwright", label: "Preview Playwright selection", requires: { workflowId: "testing", actionId: "discover" }, output: "MOCK MODE · Selected retry-timeout.spec.ts and payment-idempotency.spec.ts for a Dev environment fixture. No browser was started." },
    { id: "failure", label: "Analyze sample failure", requires: { workflowId: "testing", actionId: "run" }, output: "MOCK MODE · Failure hypothesis: a retry was scheduled after the fixture request deadline. Evidence is synthetic; reproduce in a real test run." },
  ] },
  { id: "pull-requests", nav: "Pull requests", title: "Pull request preparation", eyebrow: "REVIEW → PR", description: "Configure a target branch and prepare a PR preview after the simulated quality gate. No remote PR is created.", actions: [
    { id: "preview", label: "Prepare sample PR preview", requires: { workflowId: "testing", actionId: "run" }, output: "MOCK MODE · PR preview assembled with title, summary, test-evidence section, and target branch {{targetBranch}}. This did not create a PR." },
  ] },
  { id: "release", nav: "Releases", title: "Release readiness and manual deployment", eyebrow: "HUMAN CONTROL", description: "Review a release candidate, preserve the deployment stop, and record a manual-deployment demo event.", actions: [
    { id: "candidate", label: "Prepare release candidate", requires: { workflowId: "pull-requests", actionId: "preview" }, output: "MOCK MODE · Release candidate checklist assembled from the sample PR and test evidence. No merge or release was created." },
    { id: "manual-deploy", label: "Record demo manual deployment", requires: { workflowId: "release", actionId: "candidate" }, output: "MOCK MODE · User-confirmed demo deployment event recorded for Dev only. No environment was contacted or changed." },
  ] },
  { id: "environments", nav: "Environments", title: "Environment validation", eyebrow: "DEPLOY → VERIFY", description: "Select a target environment and preview validation steps after the explicit demo deployment gate. No network traffic is sent.", actions: [
    { id: "dev", label: "Validate Dev fixture", requires: { workflowId: "release", actionId: "manual-deploy" }, output: "MOCK MODE · Dev validation checklist: deployment fingerprint, health endpoint, selected Playwright smoke suite, and evidence bundle. No checks ran." },
    { id: "qa", label: "Validate QA fixture", requires: { workflowId: "release", actionId: "manual-deploy" }, output: "MOCK MODE · QA validation checklist: expected build, test selection, and artifact retention. No QA environment was contacted." },
    { id: "stage", label: "Validate Stage fixture", requires: { workflowId: "release", actionId: "manual-deploy" }, output: "MOCK MODE · Stage validation checklist includes stricter approval, deployment fingerprint, regression suite, and preserved evidence. No Stage environment was contacted." },
  ] },
  { id: "failure-analysis", nav: "Failure analysis", title: "Failure and regression analysis", eyebrow: "EVIDENCE FIRST", description: "Walk through evidence-based investigation of a sample regression without claiming a real root cause.", actions: [
    { id: "collect", label: "Collect sample evidence", requires: { workflowId: "testing", actionId: "run" }, output: "MOCK MODE · Fixture bundle includes a failed assertion, sample console excerpt, build identifier, and retry timeline. No real logs or artifacts were collected." },
    { id: "compare", label: "Compare sample baseline", requires: { workflowId: "failure-analysis", actionId: "collect" }, output: "MOCK MODE · Synthetic comparison flags a changed timeout boundary and one affected fixture. No historical build was queried." },
    { id: "hypothesis", label: "Draft RCA hypotheses", requires: { workflowId: "failure-analysis", actionId: "compare" }, output: "MOCK MODE · Candidate causes ranked for investigation; none are confirmed. A real RCA requires reproduction and verified source evidence." },
  ] },
  { id: "knowledge-intelligence", nav: "Knowledge intelligence", title: "Knowledge retrieval and capture", eyebrow: "REUSABLE ENGINEERING MEMORY", description: "Preview hybrid retrieval, metadata filtering, and reusable knowledge capture using synthetic documents.", actions: [
    { id: "hybrid-search", label: "Preview hybrid retrieval", output: "MOCK MODE · Dense/keyword merge preview ranks a retry policy note and a historical timeout RCA. No embedding model or vector database was called." },
    { id: "capture", label: "Capture sample learning", requires: { workflowId: "environments", actionId: "dev" }, output: "MOCK MODE · Draft Markdown knowledge record includes source, ticket, repository, environment, confidence, and evidence fields. No file was written to the knowledge root." },
  ] },
  { id: "documents", nav: "Documents", title: "Document intake and analysis", eyebrow: "DOCUMENT PIPELINE", description: "Preview supported document processing stages with a fixture. The live upload endpoint only extracts its currently supported text formats.", actions: [
    { id: "upload", label: "Select sample document", output: "MOCK MODE · Fixture selected: retry-policy.pdf. The file is illustrative; no document was uploaded." },
    { id: "extract", label: "Preview extraction and OCR", requires: { workflowId: "documents", actionId: "upload" }, output: "MOCK MODE · Extraction preview includes PDF text, page references, and an OCR-needed flag for a sample scan. No parser or OCR engine ran." },
    { id: "index", label: "Preview chunking and analysis", requires: { workflowId: "documents", actionId: "extract" }, output: "MOCK MODE · Preview created bounded chunks, metadata, an analysis summary, and a dedicated document-session outline. No vector indexing or session was created." },
  ] },
  { id: "ingestion", nav: "Ingestion", title: "Knowledge ingestion lifecycle", eyebrow: "SOURCE → INDEX", description: "Exercise ingestion status, retry, versioning, and deletion-detection states without contacting a source or index.", actions: [
    { id: "normalize", label: "Normalize source fixture", output: "MOCK MODE · Sample ticket normalized with source ID, project, repository, labels, timestamps, and document type." },
    { id: "chunk", label: "Preview chunk and metadata plan", requires: { workflowId: "ingestion", actionId: "normalize" }, output: "MOCK MODE · Deterministic chunks include source/version metadata and a pending embedding status. No embeddings were generated." },
    { id: "retry", label: "Preview retry and version status", requires: { workflowId: "ingestion", actionId: "chunk" }, output: "MOCK MODE · Example index state shows retryable failure, prior version, and deleted-source check. No queue or index was modified." },
  ] },
  { id: "model-routing", nav: "Model routing", title: "Model registry and policy", eyebrow: "CONFIGURABLE PROVIDERS", description: "Inspect sample per-workflow routing and policy boundaries. This fixture neither validates credentials nor changes provider settings.", actions: [
    { id: "registry", label: "Preview model registry", output: "MOCK MODE · Registry shape shows provider, model ID, capabilities, and availability fields. No model names are represented as configured." },
    { id: "policy", label: "Preview routing policies", requires: { workflowId: "model-routing", actionId: "registry" }, output: "MOCK MODE · Example policies route coding, review, research, QA, and executive work by capability and configured preference. No model call was made." },
    { id: "budget", label: "Preview cost controls", requires: { workflowId: "model-routing", actionId: "policy" }, output: "MOCK MODE · Context-size, timeout, token, and per-workflow budget limits displayed as policy examples; no usage or cost was measured." },
  ] },
  { id: "workflow-controls", nav: "Workflow controls", title: "Workflow state and run controls", eyebrow: "DURABLE WORKFLOW", description: "Preview explicit state transitions and stop controls using a local state fixture. No agent job is running.", actions: [
    { id: "states", label: "Inspect sample lifecycle", output: "MOCK MODE · Example path: DISCOVERED → ANALYZING → PLANNED → AWAITING_APPROVAL → APPROVED → IMPLEMENTING → REVIEWING → TESTING → PR_READY → AWAITING_DEPLOYMENT → VERIFIED." },
    { id: "pause", label: "Preview pause and resume controls", requires: { workflowId: "workflow-controls", actionId: "states" }, output: "MOCK MODE · Pause/resume transition examples are shown. No running workflow was paused or resumed." },
    { id: "cancel", label: "Preview cancellation controls", requires: { workflowId: "workflow-controls", actionId: "pause" }, output: "MOCK MODE · Cancellation and stop-point examples are shown. No job was cancelled because none was running." },
    { id: "session-delete", label: "Preview explicit session deletion", requires: { workflowId: "workflow-controls", actionId: "states" }, output: "MOCK MODE · A confirmation gate is shown for explicit General Session deletion. This preview did not delete or archive a session." },
  ] },
  { id: "observability", nav: "Observability", title: "Agent traces and evaluations", eyebrow: "TRACE LAB", description: "Inspect the trace and evaluation shapes AERO will record. This local fixture does not claim to be a Langfuse trace.", actions: [
    { id: "trace", label: "Generate sample trace", output: "MOCK MODE · Trace fixture includes workflow, agent, prompt version, retrieval references, tool-call placeholders, latency, token usage, and outcome fields. No Langfuse event was sent." },
    { id: "evaluation", label: "Preview evaluation run", output: "MOCK MODE · Evaluation fixture scores a sample analysis for completeness, evidence attribution, safety, and latency. No model replay or benchmark ran." },
  ] },
  { id: "security", nav: "Security", title: "Permissions and approval gates", eyebrow: "SAFETY MODEL", description: "Exercise permission visibility and approval boundary examples. These demo records are not authentication or authorization controls.", actions: [
    { id: "identity", label: "Preview sign-in and workspace boundary", output: "MOCK MODE · Example sign-in, user/workspace scope, and role boundary states are shown. AERO still has no authentication or multi-user isolation." },
    { id: "matrix", label: "Show sample permission matrix", output: "MOCK MODE · Architect: read context/write plans. Developer: write code only after approval. Reviewer: read diff/write findings. QA: execute tests only. Release: record release evidence; deployment remains manual." },
    { id: "gates", label: "Preview high-risk gates", output: "MOCK MODE · Approval checkpoints shown for plan approval, destructive repository operations, production testing, merge, and deployment. No policy enforcement is added by this preview." },
  ] },
];

export function getDemoWorkflow(id: string) {
  return demoWorkflows.find(workflow => workflow.id === id);
}
