# Admin UI contract

MASTER / platform CRM for Namma MedMate operators. Not the pharmacy POS and
not a clone of dispensary with a dark theme swapped in.

## Voice and chrome

- Copy: platform and tenant — HQ sign in, tenant, KYC, impersonation, plan.
  Avoid chemist-floor words (counter, bill, patient) unless the story truly
  shows tenant data in those terms.
- Visual: distinct dark/platform chrome started in `admin/src/layouts/AuthLayout.tsx`
  (slate-900 canvas, sky accent). Keep that identity. Do not import dispensary
  light/emerald tokens.
- Layout: tenant-level navigation and oversight density. Prefer scanability
  of many pharmacies over a single-branch counter layout.

## Uniqueness

- Implement screens in `admin/` only. Do not paste dispensary pages, light
  shop-floor chrome, or “Pharmacy sign in” copy.
- Personas are MASTER / platform staff. Do not add OWNER/staff branch-switch
  chrome unless the story lists admin for that behavior.

## States

Every story screen still needs loading, empty, validation, denied, conflict,
failure, and success with operator-facing messages (tenant, permission,
lockout), not counter instructions.
