# Auth module

Pharmacy Partner Console chemist login: password and/or WhatsApp OTP, counter PIN, opaque sessions, and saved devices. HQ IdP stays out of this module.

## Projects

- UI: `@namma-medmate/auth-ui`
- API: `@namma-medmate/auth-api`
- Docs: this folder

UI talks to the API only through `@namma-medmate/api-client`. Persistence lives in `@namma-medmate/db-services`.
