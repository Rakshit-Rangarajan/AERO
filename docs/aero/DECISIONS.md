# AERO implementation decisions

## 2026-10-03 — Start with a runnable local web foundation

The workspace contained no application or framework constraints. Start with Next.js, React, and TypeScript in a single app so a usable shell and server endpoints can be delivered before introducing distributed services.

## 2026-10-03 — SQLite for the first local persistence slice

Use Node's built-in SQLite API for durable local sessions and messages without an extra native package. It is a development foundation, not the target enterprise data store; migrate structured records to PostgreSQL with explicit migrations before multi-user/network deployment.

## 2026-10-03 — Explicitly labeled local model adapter

When no provider configuration exists, persist the user's message and return a transparent local-mode response. Do not imply a real model was called. For configured providers, use one OpenAI-compatible HTTP adapter with model and endpoint from environment configuration.

## 2026-10-03 — Document-parser scope

The initial upload endpoint accepts text, Markdown, JSON, and CSV only. PDF, DOCX, OCR, and vector indexing require parser and ingestion dependencies; reject those types explicitly rather than report unsupported analysis as successful.

## 2026-10-03 — Local knowledge-folder setup

The knowledge root is configured by `AERO_KNOWLEDGE_ROOT` and defaults inside the project. Setup creates only missing required folders, preserves existing contents, and checks canonical folder locations for symlink escape.
