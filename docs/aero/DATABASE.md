# Database

Node's built-in SQLite module stores local sessions, messages, uploaded document text, audit events, workspace settings, demo runs, company profiles, and company repository links in `AERO_DATA_DIR/aero.sqlite` (defaults to `./data/aero.sqlite`). Foreign keys, WAL journaling, a busy timeout, and indexes are enabled. The General Session has a partial unique index to prevent duplicate active instances. Company selection is stored as a workspace setting. Company links are not credentials and do not represent active integrations.

This schema has no migration framework and is not the enterprise target. Add versioned migrations and move authoritative structured state to PostgreSQL before multi-user use. Qdrant, if added, will remain a retrieval index rather than the source of truth.
