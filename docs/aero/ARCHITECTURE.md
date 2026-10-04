# Architecture

## Current foundation

The UI and HTTP handlers live in one Next.js 16.3 application. Route handlers call domain adapters and a local SQLite persistence module; React does not access the database directly. The local model adapter selects a configured OpenAI-compatible endpoint from environment variables or returns an explicitly labeled development response.

```text
Browser → Next.js UI → route handlers → agent adapter / SQLite (sessions, docs, audit)
                               └──────→ local knowledge folder
```

This is a single-user local foundation. It is not a multi-user deployment architecture yet. PostgreSQL, queues, vector retrieval, provider observability, and tenant isolation are future slices.
