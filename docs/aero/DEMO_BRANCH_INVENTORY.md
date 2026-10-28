# AERO demo branch: feature inventory and presenter guide

The `demo` branch is a **demonstration build** containing the existing application shell, chat and knowledge screens, guided presenter journey, development-cycle tracker and comprehensive **Demo center**.

## How to access
Navigate to **Demo center** under WORKSPACE. Pick a workflow card; use **All demo features** to return to the catalogue. The presenter rail shows progress, takes you to the next unfinished sample step and exports simulation-labelled JSON evidence.

## Included feature areas
- Command center, sessions and work items
- Individual agent chats, group chats, contextual handoffs, agent memory and knowledge context
- All six analysis styles: Quick, Standard, Deep, Research, RCA and Executive
- Round Table, plans, Dev/QA estimation, human approval and eighteen-step development cycle
- Repositories, development, reviews, tests, Playwright selection, failure diagnosis and PR preview
- Releases, environment validation, observability, analytics, incidents, flags, OKRs and security
- Confluence, Jira and Azure DevOps integration previews
- Knowledge intelligence, document upload/extraction, document library, ingestion and release notes
- Model routing, provider setup, profile, company configuration and workflow controls

The demo catalogue uses deterministic synthetic fixtures; it **does not invoke live integrations**. Some application features, such as chats and document ingestion, have independently implemented local functionality but are not available as persistent hosted services without further infrastructure work.

## Critical production restrictions
This repository stores application state in local SQLite and uses filesystem paths. Vercel deployments may build successfully while persistent APIs fail or lose data because serverless local storage is not durable. No secure role-based approval or autonomous runner is provided by the demo branch. Do not demonstrate a simulated PR, model trace, test or deployment as a real operation.

## Verification
Run `npm test && npm run lint && npm run typecheck && npm run build`; smoke-test each Demo center card, action prerequisites, presenter next-step navigation and JSON export. Confirm Vercel build and authenticated-access results separately.
