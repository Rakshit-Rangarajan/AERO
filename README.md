# AERO

AERO is an engineering operations workspace. This repository currently contains the first runnable local foundation; the full enterprise release platform is still under phased development.

## Run locally

Requirements: Node.js 22.13 or newer and npm.

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. Local SQLite data is stored in `data/aero.sqlite`. Configure `AERO_DATA_DIR` and `AERO_KNOWLEDGE_ROOT` to use different local paths.

Without a model provider configured, AERO uses a clearly labeled local development adapter. To use an OpenAI-compatible chat-completions API, set `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL` in the environment. Do not commit secrets. Provider configuration does not enable repository tools or autonomous development.

## Verify

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npm audit
```

## Current scope

The foundation includes persistent local sessions, role-selected chat, an audit feed, text/Markdown/JSON/CSV/PDF/DOCX extraction, document management, hybrid keyword and semantic search, retrieved knowledge context in agent replies, Langfuse agent traces, and safe creation of the standard knowledge folders. PDF upload extracts selectable text (up to 100 pages); scanned PDFs still require OCR. Authentication, multi-user security, database migrations/PostgreSQL, enterprise integrations, autonomous coding, code review, Playwright orchestration, PRs, and deployment validation are not implemented. See [the implementation status](docs/aero/IMPLEMENTATION_STATUS.md) before using the app beyond local development.

The navigation also includes a **Demo Mode** workbench for walking through the planned integration and release lifecycle. Demo outputs are fixed, locally persisted simulations; they never contact external services, scan repositories, run code/tests, create PRs, or deploy.

The **Companies** screen starts with a BrandBuilder example and lets you add/switch company profiles, save related service links, and manage multiple repository URLs with provider/default-branch details. These links are configuration only; current sessions and knowledge are still shared across company profiles.

## Local knowledge and agent observability services

The optional Podman Compose stack in `infra/containers/compose.yaml` runs Qdrant for semantic knowledge retrieval and the official Langfuse v4 self-hosted stack for agent/model traces and prompt/evaluation management, with persistent volumes. The containers bind to localhost only. Langfuse uses port `3010` so it does not conflict with AERO's port `3000`; Qdrant is on `6333` (REST) and `6334` (gRPC).

1. Install Podman Desktop and its Podman engine, then initialize a WSL 2 or Hyper-V machine from Podman Desktop. Windows may request administrator approval and a restart for the virtualization features.
2. From `D:\AERO`, run `podman machine init` and `podman machine start` if Desktop has not already created and started a machine.
3. Start services: `podman compose -f infra/containers/compose.yaml up -d`.
4. Check status: `podman compose -f infra/containers/compose.yaml ps`; Qdrant dashboard: `http://127.0.0.1:6333/dashboard`; Langfuse: `http://127.0.0.1:3010`.
5. The generated local Langfuse bootstrap login and Qdrant/Langfuse keys are stored in the ignored file `infra/containers/.env`. Keep it private. Copy `QDRANT_API_KEY`, `LANGFUSE_INIT_PROJECT_PUBLIC_KEY`, and `LANGFUSE_INIT_PROJECT_SECRET_KEY` into root `.env.local` as `QDRANT_API_KEY`, `LANGFUSE_PUBLIC_KEY`, and `LANGFUSE_SECRET_KEY`. The app defaults to `http://127.0.0.1:6333` and `http://127.0.0.1:3010`.

Stop the containers with `podman compose -f infra/containers/compose.yaml down`. Persistent data remains in Podman volumes; add `-v` only when you intend to erase that data. With an embedding-capable BYOK provider configured, document uploads are embedded and stored in Qdrant, and Knowledge search merges semantic results with SQLite keyword matches. Agent chats retrieve up to five relevant excerpts; the model is told to treat document content as untrusted reference material, not instructions. The default embedding model is `text-embedding-3-small` for OpenAI-compatible endpoints and `gemini-embedding-001` for Vertex AI; set `AERO_EMBEDDING_MODEL` to override it. Embeddings and chat calls may incur provider charges. If Qdrant or embeddings are unavailable, search safely falls back to keyword-only mode. Completed agent replies send OTLP traces to Langfuse when project keys are configured; traces contain the submitted prompt, agent reply, and retrieved document titles.

## First-run AI setup and app export

On a fresh data folder, AERO opens **Setup & AI**. Select local demo mode, an OpenAI-compatible BYOK endpoint, or Google Vertex AI. Use **Download sample.env** for a Vertex service-account template; encode the Google Cloud service-account JSON as base64, then import the completed `.env` from the setup screen. The import is parsed on the AERO server, validated, and saved to `data/ai-provider.json`. Credentials are not sent back to the browser, but the local config file is plain text: keep the local `data` folder private and out of shared exports/backups. The app is designed to run on localhost, not as a shared unauthenticated server. The Vertex service account needs permission to invoke Vertex AI models in the selected Google Cloud project; connection check performs one model request and can incur provider charges.

To create a portable production bundle on Windows, run `npm run export:app`. The script builds Next.js standalone output and writes `dist/aero-app.zip`; extract it and launch `start-app.cmd` with Node.js 22.13 or newer installed. The standalone server binds to `127.0.0.1`. Keep the generated `data` folder beside the app between upgrades to retain conversations, settings, and provider credentials. The bundle does not include secrets or local data.
