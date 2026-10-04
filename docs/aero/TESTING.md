# Testing

The unit suite covers the agent registry, knowledge-folder behavior, and Demo Mode catalogue integrity: unique routes/actions, explicit mock labels, resolvable prerequisite gates, and approval gates before simulated execution/release steps. Demo-mode route checks should also verify persisted run output and a 409 response when a prerequisite is missing.

Validated after the Demo Mode implementation on 2026-10-03: `npm test` passes 8 tests; `npm run lint`, `npm run typecheck`, and `npm run build` pass. HTTP smoke checks exercised all 65 actions across 22 demo workflows, confirmed prerequisite rejection, persistence and audit recording, and verified PR target-branch validation. Foundation checks confirmed 18 agent profiles, a single General Session, ticket and direct-agent session creation, local chat persistence, text upload and search, knowledge-root folder setup, and activity retrieval.

Company profile HTTP checks confirmed default BrandBuilder creation, adding/switching companies, saving/reloading company links and two repositories, and rejecting duplicate names and URLs containing credentials. The local browser visual check was not completed because browser security denied access to the local app URL.

Previously validated on 2026-10-03: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm audit` passed; local HTTP smoke checks exercised the General Session, ticket-session creation, local-adapter chat, text upload, keyword retrieval, knowledge-root settings persistence, activity retrieval, and creation/preservation of all five knowledge directories. Re-run these checks after later changes; prior results are not evidence for current unverified code.

Automated integration and Playwright suites are not yet present. The demo simulator intentionally does not run the systems it describes; do not treat its output as integration-test evidence.
