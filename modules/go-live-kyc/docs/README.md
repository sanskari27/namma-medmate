# Go-live KYC

KYC status on Pharmacy and the Owner go-live wizard. HQ approve/reject is the system of record.

## Projects

- UI: `@namma-medmate/go-live-kyc-ui`
- API: `@namma-medmate/go-live-kyc-api`
- Docs: this folder

UI talks to the API only through `@namma-medmate/api-client`. Bank account numbers are sealed with `@namma-medmate/encryption-utils`. Opening-stock CSV uses `@namma-medmate/storage-client` presigned PUT.

Stitch MCP was not connected in this cloud session. Screens follow requirement §7.5 and `@namma-medmate/shared-ui`.
