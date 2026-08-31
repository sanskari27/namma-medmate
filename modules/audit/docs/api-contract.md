# API contract

Owned swagger: `modules/audit/api/contract/swagger.yaml`.

- Ingest `201` / deduped `200`
- Query newest-first with `next_cursor`
- Error envelope `{ error: { code, message, i18n_key } }` using `audit.errors.*`
- PATCH / PUT / DELETE are not implemented
