# Integrations

The only remote-service adapter currently present is an OpenAI-compatible chat-completions client configured with `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL`. It uses a timeout and rejects non-HTTPS remote endpoints.

Jira, Confluence, Azure DevOps, Git, Qdrant, Langfuse, Playwright environments, object storage, and external deployment systems are not connected. No credentials are included in this repository.

The Integrations, Confluence, Azure DevOps, and Repositories screens have an explicit Demo Mode walkthrough using fixed fixture outputs. Those screens demonstrate the intended adapter flow and persist a local simulation/audit record; they do not authenticate, send requests, read repositories, or report live connection status. Configure and implement actual adapters before using these areas with enterprise systems.

Company profiles can store the related Jira, Confluence, Azure DevOps, documentation, CI, and repository URLs plus project/space keys. Saving a URL is configuration only: credentials are not accepted in URLs, no connection test is performed, and company selection does not isolate existing workspace data.
