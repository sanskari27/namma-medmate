# Security and isolation

**Date:** 2026-09-15  
Parent security pass + Wave 0/1. **D-013 / M1-S09 is BLOCKED**, not a fake implementation gap.

---

## Residual impersonation (D-001 closed)

Product: no audit, no TTL, nested forbidden. Live matches that. Residual **launch risk**:

| Residual | ID |
|---|---|
| No forensic trail | `SEC-001` / `M1-IMPERSON-001` |
| Idle lock off during support | `AUTH-ADM-001` FIXED 2026-09-15 |
| Rotate target password/PIN | `M1-PWD-003` FIXED 2026-09-15 |
| PIN unlock drops `act_*` | `M1-PIN-004` FIXED 2026-09-17 |
| Target offboard does not end acting JWT | `SEC-NEW-001` |
| HQ chrome uses acting pharmacy role | `M1-IMPERSON-002` FIXED 2026-09-15 |
| Enter allowed on locked tenants | `M1-IMPERSON-004` |

Compensating controls that **add audit** would change D-001 — owner needed. Keep UI disclosure.

---

## Authz / session

- **M1-AUTH-001** FIXED 2026-09-15 — wrong-app Sign in logs out and forgets; saved list filtered by app roles. Cookie still written on login then cleared by SPA.
- **SEC-NEW-002** Public register `EMAIL_TAKEN` email oracle.
- **SEC-NEW-003** No throttle on login/PIN/reset/register (AC06 forbids *account lockout*; IP throttle is different).
- **PII-001** Saved-login list returns email (`permitAll`).
- **SEC-NEW-004** Any authenticated user can scrape `/actuator/prometheus`.
- **SEC-NEW-006** WONTFIX 2026-09-17 — cookie + Bearer remain until owner asks cookie-only.
- **SEC-NEW-007** FIXED 2026-09-17 — GET Cashfree status is read-only; POST `/reconcile` mutates.

---

## Tenancy / branch

Sampled list/get paths include `tenant_id`. No P0 cashier-A-reads-B IDOR found.

| ID | Issue |
|---|---|
| `TENANT-001` | Soft-deleted tenant not locked (`FIXED` 2026-09-17) |
| `M1-BRANCH-003` | Session `activeBranchId` not re-checked (`FIXED` 2026-09-17) |
| `STATE-POS-001` | Cart kept across outlet switch |
| `OWN-EXP-001` | All-outlets expense → `branches[0]` |
| `M5-REO-002` | Reorder price fallback this branch (`FIXED`) |
| `M5-QC-003` | QC GST join missing `branch_id` |
| `TENANT-NEW-001` | Approval listeners lock by request id only (defense in depth) |

---

## Webhooks / secrets

- HMAC compare is constant-time. **No skew window** (`SEC-002`).
- Resend apply no `FOR UPDATE` (`IDEMP-001`).
- `.env` gitignored; TF JWT random. WhatsApp keys in SSM seed (`SECRET-SSM-WHATSAPP` FIXED).
- Prod email URLs HTTPS (`OPS-EMAIL-URL` FIXED). Existing SSM may still need one-time `update-prod-env.sh set`.
- `M11-MAIL-003` unescaped invoice/onboarding HTML.
- Kiosk PIN plaintext default `0000` in API (`M2-KIOSK-003`).

---

## Cookies / CORS / headers

- Cookie: httpOnly, Lax, host-only. Secure in prod overlay (`SEC-003` FIXED 2026-09-17 — prod fail-fast).
- CORS allowlist + credentials; no `*`.
- CSRF off (`SEC-004`).
- Nginx: no CSP / frame-ancestors / HSTS (`SEC-NEW-005`).

---

## PII / DPDP

- `PII-001` saved-login emails; `PII-002` CA advisors in localStorage; `PII-003` auth blob in localStorage.
- **Do not** implement M1-S09 while D-013 is open.

---

## Clinical / kiosk

- POS complete without safety assert (`M3-SAFE-001`) is a **patient-safety** issue, not only UX.
- Kiosk public tablet = full OWNER session.
