# AERO automated development cycle: architecture and implementation truth

## New working slice
The Engineering → Development cycle UI creates ticket-bound local lifecycle records in SQLite, tracks stage completion with evidence and actor identity, persists an append-only event history, and blocks three checkpoints without an explicit approval checkbox. Data remains local and is not role-authenticated. This is a **manual tracker**, not automatic task execution.

## Intended fully automated loop
Ticket ingestion (Jira/Azure DevOps) → knowledge retrieval and source-scoped context pack → Quick/Standard/Deep/Research/RCA/Executive analysis → Round Table with architect, backend, frontend, QA, security and product → Dev and QA estimates, story points and assumptions → approval → sandboxed branch creation → code changes → unit/integration tests → diff review and comment resolution → Playwright with artifact retention → quality approval → draft PR → stage validation → release approval → guarded deploy → post-release checks → learning written to knowledgebase.

## Human-in-the-loop rules
- Plan approval is required before writing or modifying source files.
- Quality approval is required before opening/promoting a reviewable PR.
- Release approval is required before production deployment. Production must additionally require secure environment credentials and a separate deployment actor.
- Every gate must bind an authenticated actor, content hash, relevant evidence, and audit record. The current tracker **does not authenticate actors**; names are self-declared.
- Rejection, rework, rollback, pause/resume, scoped permissions, retries and concurrency leases must be implemented before enabling background execution.

## Knowledge and chats
Existing AERO features include single- and group-agent conversations, local document extraction, keyword and optional vector search and retrieval into chats. Future implementation should bind ticket ID, company/workspace, repository, source revision, and evidence IDs in each context pack. Never allow retrieved text to act as untrusted tool instructions.

## Missing services
Real Jira/Confluence/Azure DevOps adapters, repository checkout/tool sandbox, background job scheduler, model/tool permission enforcement, authenticated approval records, CI execution, Playwright artifact capture, deployment integrations, and tenant isolation are not supplied by this patch. Do not use the local dashboard on a shared enterprise network.

## Verify
Run `npm install`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
Smoke test new cycle creation, stage evidence recording, gate rejection, refresh persistence, concurrent update rejection, and local audit trail. Keep separate test cases for live integrations once implemented.
