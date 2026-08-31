---
name: add-i18n-keys
description: Add English i18n keys via @namma-medmate/i18n. Use when adding user-visible copy in module UI. No hardcoded strings in components.
---

# Add i18n keys

- Keys: `{slug}.*` (example: `tenancy.badge.shopName`, `tenancy.errors.locationIdRequired`).
- Lookup via `@namma-medmate/i18n`. v1 ships English; catalogs grow with product copy.
- Error `i18n_key` in API envelopes must match UI keys from the requirement §9.

Do not hardcode user-facing strings in JSX.
