# Knowledge

Uploaded text, Markdown, JSON, and CSV content is stored in the local SQLite database and can be searched by title or substring. The Settings view stores an absolute knowledge root in local workspace settings (initial default: `AERO_KNOWLEDGE_ROOT`). Setup creates only missing `Tickets`, `Notes`, `RCAS`, `Research`, and `.aero` directories without replacing existing content.

PDF/DOCX/OCR, Markdown note export, source synchronization, metadata filters, embeddings, Qdrant, hybrid ranking, retries, and version management are not implemented. Search results currently use the `local-keyword` mode.
