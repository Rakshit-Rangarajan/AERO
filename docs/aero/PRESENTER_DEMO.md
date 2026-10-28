# AERO — presenter demo pack

## Operating mode

**Everything in this presenter journey is a deterministic local simulation.** It does not query Jira/Confluence/Azure DevOps, inspect source code, execute tests, open PRs, release software, or validate environments. The locally persisted run log is a record of demo clicks, **not engineering evidence**. Keep the DEMO MODE warning visible in a client demonstration.

## How to present

1. Run `npm install && npm run dev` on Node.js 22.13+ and open the local URL (default http://127.0.0.1:3000).
2. Enable Demo Mode in AERO; open a feature listed in the left-hand navigation. The **Presenter journey** appears at the top of every demo workbench screen.
3. Click **Next uncompleted step**. AERO navigates to the correct fixture workflow. Click **Run demo** for the highlighted action. Repeat through the narrative.
4. Use **Export demo evidence** to download a local JSON summary of simulation actions and timestamps. Do not present it as logs of actual test execution.
5. For a fresh live audience, use a new local AERO data directory rather than deleting production or personal records.

## Executive story: PAY-421 payment retry timeout

| Chapter | Steps | Message |
|---|---|---|
| Discover | Intake, context, deep analysis | A single ticket expands into explicit requirements and risks |
| Deliberate | Round table, synthesis | Architecture, backend, QA and security each contribute |
| Govern | Plan, approval | No implementation without a human gate |
| Execute (simulated) | Code summary, review | Proposed work and findings remain inspectable |
| Verify (simulated) | Test discovery, report, failure analysis | Failures are surfaced, not hidden |
| Deliver (simulated) | PR preview, release, manual deployment, Dev validation | Release approval and deployment are separate |
| Learn | Knowledge capture | Reuse findings in subsequent work |

## Talking points

- Current working foundation: local persistent agent chat, documents, semantic/keyword search when configured, company configuration, group agent handoffs, and Langfuse trace forwarding when configured.
- Demo-only workflows: remote integrations, repository intelligence, automated development, code review, tests, pull requests, deployment and environment validation.
- Guardrails: explicit human approvals, visible simulated outputs, no live integrations triggered by presentation clicks.
- Demonstrate value using **hypotheses**, not invented productivity numbers: intake time, approval turnaround, review cycle, failed-build diagnosis, and release traceability are potential metrics to measure once real adapters exist.

## Verification before presenting

Run `npm test && npm run lint && npm run typecheck && npm run build`. In a browser, confirm journey navigation, persistence, locked gates, and the export label. Live browser and container integrations must be tested separately; this pack does not assert their success.
