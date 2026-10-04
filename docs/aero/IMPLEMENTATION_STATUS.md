# AERO implementation status

Last updated: 2026-10-03

## Repository assessment

The provided workspace was empty: no Git repository, source files, package manifest, services, database, CI, or tests were present. AERO is being initialized as a Next.js and TypeScript application. Local persistence currently uses Node's built-in SQLite module so the first slice runs without an external database service.

## Delivered foundation (0.1)

- A responsive dark engineering workspace shell with Command Center, working session/work-item lists, agent selection, and explicit `NOT CONFIGURED` states for unfinished screens.
- One persistent General Session per local database, plus dedicated session records for work items.
- Persisted user and agent messages, session records, document metadata/content, and auditable session events in SQLite under `AERO_DATA_DIR` (defaults to `./data`).
- A read-only activity feed for stored session, message, provider-response/error, and upload audit events.
- A first-run BYOK setup for local demo, OpenAI-compatible endpoints, and Google Vertex AI. Provider settings can be imported from `.env`; Vertex service-account JSON is accepted as base64. Credentials are saved in the local data folder and are not returned to the browser. The Vertex and OpenAI-compatible adapters issue real model requests after a user-initiated connection check or agent message.
- A Windows standalone export command, `npm run export:app`, which creates a local-only runnable bundle at `dist/aero-app.zip`.
- Eighteen individual agent profile modules with distinct names, personas, response signatures, specialties, and session-chat-only permissions. The directory and chat selector use the registry; the server applies the selected profile's private system instructions to configured model calls.
- Settings view allows entering and saving an absolute local knowledge-root path. Setup creates only missing `Tickets/`, `Notes/`, `RCAS/`, `Research/`, and `.aero/` folders without overwriting existing content.
- Text, Markdown, JSON, CSV, DOCX, and text-based PDF uploads (2 MB maximum) are extracted, persisted, and attached to their session. PDF extraction is limited to 100 pages and 250,000 characters; scanned PDFs still need OCR.
- Local substring search over uploaded document titles and extracted content.
- A Documents library supports filtering, semantic reindexing, and source deletion with Qdrant point cleanup.
- `.env.example` and local-data ignores. Secrets are not checked in.

## Delivered local feature simulator (0.2)

- Added a Demo Mode workbench for the product areas that do not yet have service/runtime integrations. It is deliberately presented as a simulator, not as a working external integration.
- Added individually navigable demo screens for Jira work-item intake, Confluence and Azure DevOps, repository intelligence, analysis modes, Round Table, plan approval, development, review/comment resolution, test and Playwright selection, PR preparation, manual deployment, environment validation, failure analysis, knowledge retrieval/capture, document ingestion, model routing, workflow controls, permissions, traces, and evaluations.
- Every demo action returns a fixed `MOCK MODE` result; actions and output are persisted to a local SQLite `demo_runs` table and also written to the audit log. Prerequisite gates are checked by the server. The demo records never represent live changes or genuine success.
- Added the `GET/POST /api/demo` route and catalogue integrity tests. Existing chat, upload, search, and knowledge-folder behaviors remain distinct from simulated product flows.

## Delivered company configuration (0.3)

- Added a persisted company directory with an active-company selector in the workspace header and the Companies screen. New local databases start with a `BrandBuilder` example profile; additional companies can be created and switched.
- Company profiles store Jira site/project keys, Confluence URL/space keys, Azure DevOps organization/project, documentation/runbook URL, CI dashboard URL, team context, and default branch.
- Each company can keep up to 30 named repository links with provider and default branch; the editor supports adding/removing multiple repositories in one save.
- URLs are validated and stored as configuration only. The app does not authenticate, connect, clone, or scan linked systems. Existing sessions and knowledge remain shared in the current single-user workspace and are not partitioned by company.

## Delivered local integrations (0.4)

- Document uploads use the configured OpenAI-compatible or Vertex AI provider to create dense text embeddings and store document chunks in Qdrant. Knowledge searches combine SQLite keyword matches with Qdrant vector matches; Qdrant or embedding failures degrade to the existing keyword search.
- Agent replies receive up to five matching keyword/semantic knowledge excerpts with source titles. Retrieved document text is marked as untrusted reference material; retrieval source IDs/titles are recorded in the audit event and Langfuse trace metadata.
- Existing documents are indexed in small batches on demand after the embedding provider is configured. Vector payloads include the document title, source, type, and text chunk. The configured provider's embedding model is used; defaults are `text-embedding-3-small` and `gemini-embedding-001`, with `AERO_EMBEDDING_MODEL` override.
- Agent chat replies are exported as OTLP/HTTP JSON generation observations to Langfuse v4 when its base URL and project credentials are configured. Trace delivery failures are recorded in the local audit log and do not fail the chat response.
- Local Qdrant and Langfuse stack credentials can be copied from the ignored `infra/containers/.env` into root `.env.local`; the example env documents these settings. The Langfuse trace contains the submitted prompt and generated reply.

## Delivered document management (0.5)

- Added selectable-text PDF and DOCX extraction with an explicit size/page/text limit and clear OCR-needed errors for scanned PDFs.
- Added a Documents library with searchable listing, indexing status, manual reindex, and confirmed deletion.
- Reindex and deletion remove vectors from each recorded Qdrant collection first. If Qdrant cleanup fails, the original document remains intact.
- Added PDF/DOCX extraction fixtures and exercised upload, list, keyword search, local-only reindex, and delete through the standalone production HTTP server.

## Delivered session lifecycle control (0.6)

- Added explicit session deletion from the Sessions view with a confirmation prompt. A deleted General Session is replaced atomically with a fresh empty General Session; deleting the active conversation returns the UI to the replacement.
- Session deletion hides the conversation from normal workspace queries but retains its messages in SQLite for local audit/history purposes. This is a soft delete, not a secure erase.

## Delivered group agent chats (0.7)

- Create named or automatically named group conversations with 2–6 agents from the agent registry. Membership is persisted independently from each agent's profile and existing session-chat-only permissions.
- Every user message requests one reply from each selected agent in parallel. Replies are stored in the shared conversation with the responding agent's identity, preserving each persona and signature. Partial failures are reported while successful replies remain available.
- Group sessions appear in the Chats list with participant names/avatars and reopen with their shared message history and participant panel. Each agent reply gets a separate audit event and Langfuse trace when configured.
- The creation dialog explains that each message triggers multiple provider requests; group size can increase usage and charges. Group chats do not enable peer-to-peer agent turns or grant additional tools/permissions.

## Delivered contextual agent handoffs (0.8)

- Agent prompts include bounded recent conversation history, the exact current user request, and replies already produced during the current turn. Group agents respond in sequence so each later response can build on earlier replies.
- When a model response names another registered agent by their complete name, AERO adds that agent to the group and queues a contextual handoff. The referred agent receives the shared transcript and a cue naming the agent who referred them.
- A direct agent chat is promoted in place to a group when its agent refers another agent; its existing messages stay in the same session. Existing group chats add newly referred agents without making a second chat.
- Each agent can respond at most once per user turn, so handoffs cannot loop indefinitely. Routing only matches complete registered names, and a conversation can involve at most the 18 agents in the registry. Provider calls and cost can grow with the number of agents involved.

## Known limitations / not implemented

- No authentication, user accounts, workspace isolation, RBAC, or secret vault. The current server is a single-user local development foundation and is not safe to expose to a network or use for enterprise data.
- Authentication, user/workspace separation, CSRF/rate limiting, PostgreSQL, migration tooling, and object storage are not integrated into the application runtime.
- No OCR pipeline or knowledge Markdown writer. Scanned/image-only PDFs cannot yet be analyzed.
- No real Jira, Confluence, Azure DevOps, remote/local repository integration, coding runtime, review, test orchestration, PR, or environment validation.
- Agent specialties shape prompts only; no agent has repository, Jira, browser, or other tool access. The local adapter is explicitly a mock and claims no external execution.
- No CSRF/rate limiting, account controls, multi-tenant isolation, provider allowlist, hardened SSRF defenses, or production command sandbox. Do not deploy this foundation as an enterprise service.
- The 0.2 demo screens are not substitute implementations: no external service, repository, browser, test runner, model trace, PR provider, or environment is contacted. Simulated approvals authorize only simulated downstream steps.
- Company profiles are workspace-local configuration. Company selection does not yet scope sessions, agent runs, audit events, or knowledge; do not treat it as multi-company data isolation.

## Verification

The initial dependency set used an outdated, critically vulnerable Next.js pin; npm audit identified the issue, and it was upgraded to Next.js 16.3.8 and React 19.3.0. The unit suite covers agent registry integrity, distinct signatures/prompts, public profile boundaries, contextual full-name handoff detection, prompt transcript framing, knowledge-context safety framing, knowledge-folder creation, PDF/DOCX/text extraction, and demo-catalogue safety/gates. `npm test` (16 tests), `npm run lint`, `npm run typecheck`, and `npm run build` pass. Production standalone HTTP checks passed with isolated databases: PDF and DOCX uploads, listing, keyword search, keyword-only reindex fallback, and deletion; General Session replacement on delete, deleted-session rejection, ticket-session deletion, and audit recording. Group chat HTTP checks passed: invalid membership was rejected, a three-agent group persisted and reopened with its membership/history, one message produced three separately attributed replies, and deletion succeeded. A mock OpenAI-compatible HTTP provider verified that an Ada→Gideon full-name handoff promotes a direct chat, adds Gideon to the group, passes the deployment/rollback transcript, and records Gideon's context-aware reply. The browser walkthrough created a named two-agent group and confirmed its Chats list entry, participant details, and group welcome/composer UI. `npm run start` also passed a standalone-server smoke check. The Langfuse OTLP path was exercised through a local agent chat and its observation was confirmed through the Langfuse API. Qdrant health, collection creation, and hybrid search were checked locally with a mock embedding endpoint; production embedding/upsert/ranking and vector deletion against live Qdrant remain unverified until configured. Keyword fallback remains available. `npm audit --omit=dev` reports zero runtime vulnerabilities; full audit reports five high findings in the eslint-config-next development toolchain, whose suggested fix requires an incompatible major downgrade. The standalone ZIP export was built and inspected for its launcher, server, PDF worker, and sample.env, and verified to exclude local env files, container secrets, and SQLite data. Local HTTP checks exercised all 22 demo workflows, prerequisite rejection with HTTP 409, persisted action output, and audit-feed recording. No Turbopack warnings remain.

## Next vertical slices

1. Authentication, workspace/user schema, CSRF and authorization boundaries; move structured persistence to PostgreSQL and add versioned migrations.
2. OCR for scanned/image sources, human-readable Markdown knowledge generation, object storage, and durable ingestion status/retry.
3. Production agent registry permissions, richer context packs, and durable workflow state.
4. Credential-backed Jira/Confluence/Azure DevOps and local/remote repository adapters.
5. Sandboxed coding, real code review and CR resolution, repository test/Playwright execution, PR creation, manual deployment records, and actual environment validation.
6. Replace each simulator action with its adapter-backed implementation while retaining explicit human gates and audit evidence.

## Decisions

- See [DECISIONS.md](DECISIONS.md) for initial foundation tradeoffs.
