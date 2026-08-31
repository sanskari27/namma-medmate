---
name: emit-audit-event
description: Emit append-only audit events for money, stock, credential, and admin actions. Use when a requirement §3 lists audit.
---

# Emit audit event

`audit` is append-only. Money/stock/credential/admin actions ingest an AuditEvent when `audit` exists.

Until `audit` is `done`: structured logger with **ids only** — no secrets, no Rx text, no phone numbers.

Other modules do not own the audit table. Do not skip login/PIN/session events listed in `06-auth.md`.
