# Security

The current application is a local single-user development foundation. It has no authentication, workspace isolation, RBAC, CSRF policy, secret vault, rate limiting, or production-grade SSRF defense. Do not expose it to an untrusted network or use it for enterprise data until these controls are implemented.

Current safeguards include bounded message/document sizes, an extension allowlist for text uploads, parameterized SQL search, environment-only provider credentials, configured HTTPS provider validation, and canonical-path checks for knowledge subfolders. Knowledge root itself is intentionally user-configurable.
