# Auth module

Auth is the first domain module. It validates a caller’s OIDC access token and surfaces a minimal session identity in the dispensary app.

## Projects

- UI: `@namma-medmate/auth-ui`
- API: `@namma-medmate/auth-api`
- Docs: this folder

UI and API never import each other. The UI talks to the API only through `@namma-medmate/api-client`.
