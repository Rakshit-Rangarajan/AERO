# Workflows

Implemented real local workflow paths: create/reopen the persistent General Session; create/reopen direct agent chats and ticket-kind sessions; persist messages and local/configured-provider responses; extract and persist supported text uploads; initialize a local knowledge folder tree; search uploaded document text; inspect the stored audit feed.

## Demo Mode workflows

Areas without their real integration are available as deterministic, persisted simulations under **Demo Mode**. Open each named navigation item, then run its actions in sequence. The API enforces declared prerequisites, including plan approval before simulated development, sample development before review/testing, test evidence before PR preparation, and explicit simulated manual deployment before environment-validation previews.

The demo catalogue covers Jira intake, Confluence, Azure DevOps, repository intelligence, six analysis modes, Round Table, planning/approval, development, code review and CR resolution, unit/integration/Playwright selection, PR preparation, release/deployment, Dev/QA/Stage validation, failure analysis, knowledge retrieval/capture, document ingestion, model routing, workflow controls, security boundaries, and observability/evaluation shapes. Each result carries `MOCK MODE`, is stored in `demo_runs`, and emits an audit event. The simulator does not contact services, scan repositories, invoke agents, execute tests, create PRs, write knowledge files, or deploy.

There is no durable production workflow state machine, real pause/resume/cancel, or real plan approval enforcement yet. Demo gates are for education and UI walkthroughs only.
