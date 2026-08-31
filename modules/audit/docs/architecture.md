# Architecture

`audit-api` is an Express Lambda (`lambda-bootstrap`) with three routes:

- `POST /audit/events` — service token ingest
- `GET /audit/events` — pharmacy or HQ query
- `GET /audit/events/:audit_event_id` — one event

Rows live in `audit_events` via `@namma-medmate/db-services`. The repository has insert and select only. Pharmacy events validate `tenant_id` + `location_id` against `tenancy`.
