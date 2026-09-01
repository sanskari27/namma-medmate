# Employees

HR directory for one Pharmacy Location. Not payroll.

## Projects

- UI: `@namma-medmate/employees-ui`
- API: `@namma-medmate/employees-api`
- Docs: this folder

UI talks to the API only through `@namma-medmate/api-client`. PAN, Aadhaar, and bank account numbers are sealed with `@namma-medmate/encryption-utils`. Photos and documents use `@namma-medmate/storage-client` presigned PUT.

Stitch MCP was not connected in this cloud session. Screens follow requirement §7.3 and `@namma-medmate/shared-ui` (same token system as manage-users).
