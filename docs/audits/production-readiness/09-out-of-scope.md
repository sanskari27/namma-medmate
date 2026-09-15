# Out of scope — do not implement as Phase 1 gaps

**Date:** 2026-09-15  
This file exists so the next agent does not treat blocked, deferred, or excluded work as missing features.

---

## Open decisions — BLOCKED / OWNER NEEDED

| ID | Blocks | What is *not* a code todo |
|---|---|---|
| **D-013** | **M1-S09** | DPDP inventory, consent, principal requests, erasure, grievance, breach, retention, accountable roles. Absence of those screens/APIs is **not** MISSING. Inventing a policy is forbidden. |
| **D-006** | **M12-S01** | Hosting, India residency, DR, backups, scale, retention, localization, environments. Current single-EC2 + 7-day RDS backup is a *fact*, not an approved NFR. `OPS-STORAGE` file-backup **policy** waits here; the bind-mount risk is still documented in `07-production-ops.md`. |

Do not mark M1-S09 or M12-S01 `done` while the decision is Open.

---

## Deferred stories (tracker)

| Story | Why not a Phase 1 gap |
|---|---|
| **M7-S05** | Phase 2 compliance (cold-chain / quarantine / recall / Schedule X repository as scoped in the story). |
| **M11-S03** | Phase 2 integration backlog. |
| **M12-S01** | Deferred on D-006. |

---

## Closed decisions that forbid “helpful” product

| ID | Do not |
|---|---|
| **D-001** | Silently add impersonation audit, TTL, or nested sessions. Residual launch risk is documented (`M1-IMPERSON-001`). Reopen the decision if audit is required to launch. |
| **D-002** | Implement a shared family credit pool. Individual limits + family visibility is the contract. |
| **D-004** | Reintroduce expense approval thresholds. Expenses post now. |
| **D-005** | Invent a different Free/Starter/Growth report matrix. Fix *misapplication* (e.g. `M7-REG-001`, `M9-DASH-005`) without rewriting D-005. |
| **D-007** | Use product-compiled Starter-1 / Pro-unlimited. Caps are 1/2/3/5. |
| **D-008** | Build ecommerce / online store / Growth `ONLINE_STORE`. Orders “Online” chrome is `UX-vs-CONTRACT` — hide or rename, do not ship a store. |
| **D-009** | Strip kiosk self-order because it is incomplete. Fix kiosk (`M2-KIOSK-*`) inside the closed workflow; do not revert to “label only.” |
| **D-010–D-012, D-014, D-015** | Re-litigate offer precedence, warn-only safety, loyalty math, saved PIN, idle lock. Implement against the closed record. Story S10-AC04b still saying idle sign-out is **doc drift** (`M1-SAVED-001`); code follows D-015. |

---

## Explicit product exclusions (never Phase 1 todos)

From architecture, product compile, and this audit’s hard rules:

- Customer login; doctor login.
- Offline POS **sync** (connectivity overlay is in-scope; local queue + replay is not).
- Thermal / 80mm invoices (A4 PDF is the Phase 1 copy).
- SMS fallback for WhatsApp.
- B2B lead pipeline; support ticketing.
- Ecommerce / online store (D-008).
- GST/GSP **filing** and government e-invoice / e-NDPS / e-way integrations. Shop books GSTR-* **reports** are in-scope; pushing to a portal is not.
- Shared product catalogue across tenants.
- Generated API clients; shared UI package; npm workspaces.
- Tally / cash-drawer hardware (404 by contract on finance reports).

---

## UX-vs-CONTRACT (owner decision, not silent rewrite)

Convenient UX that **conflicts** with a story or closed decision. Recorded in [`05-ux-behavior.md`](05-ux-behavior.md). Do not “fix” by inventing a module.

| Topic | Conflict |
|---|---|
| Orders **Online** filter | D-008 Phase 2 store |
| Kiosk / inventory `onlineListed` | D-008 |
| Home **Online** channel = 0 | D-008 |
| QC allowed for OWNER | Story pharmacist-only (`M5-QC-002`) |
| PIN enroll “signs out” | D-015 idle lock |
| M2-S07 story still `blocked_by` D-009 | Runtime built after close — human rewrite ACs |
| Live POS vs M6 ACs | Restore chrome **or** amend stories (`M6-POS-001`) |
| Walk-in vs last-patient sticky | `UX-CRM-001` — may be safer; owner |

---

## Not “production ready” just because stories are `done`

Independent verifier PASS was against **pre-rewrite** floors. Tracker `done` is not a launch certificate. See [`01-executive-summary.md`](01-executive-summary.md).

---

## What *is* in scope for the next implementer

Everything in [`08-fix-backlog.md`](08-fix-backlog.md) that is **not** marked owner-blocked, plus copy/test rewrites that restore contracted chrome without new product modules.
