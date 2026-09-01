# Manage users

Staff login records, seat cap, permissions, and credential controls for one Pharmacy Location.

## Projects

- UI: `@namma-medmate/manage-users-ui`
- API: `@namma-medmate/manage-users-api`
- Docs: this folder

UI talks to the API only through `@namma-medmate/api-client`. Password and PIN hashes stay in `AuthRepository`. WhatsApp share is a `wa.me` deep-link only.

Stitch MCP was not available in this environment; Manage Users list and user drawer follow spec §7.4 anatomy with `@namma-medmate/shared-ui`.
