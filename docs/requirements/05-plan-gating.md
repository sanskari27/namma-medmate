# Requirement Doc: Plans, paywalls, seats (`plan-gating`)

## 1. Summary

The `plan-gating` module is the read-only gate for the Pharmacy Partner Console. Every Pharmacy starts on **Free**. An expired paid plan behaves like Free: paid modules lock immediately, data is retained, Free modules stay usable. This module publishes plan prices (GST 18% is applied at checkout by `saas-billing`, not here), seat limits (Free/Starter 2, Growth 5, Pro unlimited), the plan→module matrix, default role→module permissions, and `getEntitlements(tenant)` for route guards and the Manage Users seat cap. Locked pages show a lock icon; opening one shows a paywall naming the required plan and price. Extra branches and attachable add-ons are not sold; extra seat means upgrade plan. Support enable/disable per account is performed in `admin-saas-crm`; this module honours an override flag when present.

## 2. Scope

- In scope:
  - Canonical plan catalogue: Free, Starter, Growth, Pro with monthly prices, annual savings copy, seat limits, module keys.
  - `getEntitlements(tenant)` including `plan`, `status`, `seatsLimit`, `seatsUsed`, `modules: { [moduleKey]: unlocked }`.
  - Effective entitlements: expired or missing paid subscription → Free module set.
  - Always-reachable Free navigation: Dashboard, Orders (7-day), Account, Subscription, Settings, Help & Support, Refer & Earn, Manage Users (seat-capped).
  - Sidebar lock icon + `Paywall` naming required plan and price (English, i18n keys).
  - Default role→module map for **Owner**, **Manager**, **Pharmacist**, **Cashier** (Owner cannot be reduced; tick grid UX is `manage-users`).
  - Honour `module_overrides[moduleKey]` from HQ support if present (enable or disable).
  - Read `seatsUsed` from `manage-users` when available; until then accept a provided count or query a contract.
- Out of scope:
  - Cashfree checkout, GST invoice for SaaS, auto-renew toggle, billing history (`saas-billing`).
  - HQ Plans tab live billing, dunning, suspend subscription (`admin-saas-crm`, `saas-billing`).
  - Staff permission grid UI, add-user disable at cap (`manage-users` calls entitlements + seat limit).
  - Feature data for POS, inventory, CRM, kiosk, etc. (those modules remain; this module only returns unlocked true/false).
  - Extra branches product, attachable add-on SKUs, extra-seat SKU.
  - Shop-floor GMV / Cashfree on POS.

## 3. Dependencies

- Other modules/slugs and what is needed:
  - `tenancy`: Pharmacy exists; all pharmacy calls pass `location_id`.
  - `saas-billing` (later): **SaasSubscription** `{ plan, status, billing_interval, expires_at }`. Until it exists, missing subscription ⇒ Free + `status=active` on Free.
  - `manage-users` (later): `seatsUsed` = count of active Users occupying a seat; this module GETs `/manage-users/seats?location_id=` or receives seatsUsed from that service. If unavailable, `seatsUsed=0` with assumption logged.
  - `admin-saas-crm` (later): optional overrides table per tenant; this module reads `GET` contract or a `libs/db-services` row `saas_module_overrides` if HQ writes it. Honour if present.
  - `auth`: session role; Owner short-circuit: all plan-unlocked modules true regardless of ticks (ticks still stored in manage-users).
  - Every console UI module: route guard using entitlements.
- External services/APIs/libraries:
  - No Cashfree in this module (prices displayed only).
  - Persistence via `libs/db-services` for override reads and cached plan catalogue (catalogue may be code-constant in v1).
  - UI via `@namma-medmate/api-client`.

## 4. Functional Requirements

- FR-1: The system shall treat a Pharmacy with no **SaasSubscription** as plan `free`, `status=active`, Free module map, seatsLimit 2.
- FR-2: The system shall, when **SaasSubscription**.status is `expired` or `past_due` that the product treats as expired, compute entitlements as Free (paid modules false) while still returning the purchased `plan` name and `status=expired`.
- FR-3: The system shall use seat limits: Free=2, Starter=2, Growth=5, Pro=`null` (unlimited). Expired paid uses Free’s seat limit 2.
- FR-4: The system shall not offer extra branches, e-invoice add-on, WhatsApp add-on, extra-seat SKU, API SKU, or analytics SKU.
- FR-5: The system shall expose module keys exactly as in §6 of this document (packaging table).
- FR-6: The system shall set always-reachable keys true on every plan including Free: `dashboard`, `orders`, `account`, `subscription`, `settings`, `help-support`, `refer-earn`, `manage-users` (Manage Users remains seat-capped, not paywalled).
- FR-7: The system shall also unlock Free packaging modules on every plan including expired: `pos-billing`, `inventory`, `purchases`, `returns`, `purchase-returns`, `invoice-settings`.
- FR-8: The system shall unlock Starter keys only when effective plan is Starter, Growth, or Pro: `prescriptions`, `customers`, `khata`, `statutory-registers`, `employees`.
- FR-9: The system shall unlock Growth keys only when effective plan is Growth or Pro: `sales-ledger`, `reports`, `crm`, `ca-sharing`, `books-gst`, `stock-take`, `distributors-reorder`, `offers`, `expenses`, `racks`.
- FR-10: The system shall unlock `kiosk` only when effective plan is Pro.
- FR-11: The system shall apply support overrides after the plan map: override `true` forces unlocked; override `false` forces locked; always-reachable keys cannot be overridden off (HQ cannot disable POS/Orders/Manage Users via this gate — if HQ sends those keys false, ignore and keep true). Assumption: support override is for paid modules, not to strip Free billing.
- FR-12: The system shall return `seatsUsed` as the number of active seat-occupying Users; `seatsLimit` null means unlimited.
- FR-13: The system shall expose default role→module map: Owner all keys true (for modules the plan unlocks); Manager/Pharmacist/Cashier as specified in §7; `manage-users` and `settings` default false for non-Owner.
- FR-14: The system shall not persist per-user ticks; `manage-users` stores ticks and ANDs them with entitlements.unlocked.
- FR-15: The system shall show a lock icon on console nav items whose moduleKey is false for the tenant (plan-locked), even if the user role would allow it after upgrade.
- FR-16: The system shall, when a locked route is opened, render Paywall with required plan name, monthly price ₹, and “+ 18% GST at checkout” copy without charging.
- FR-17: The system shall use English UI with i18n keys; prices displayed as integer rupees for monthly list price.
- FR-18: The system shall include `location_id` on every pharmacy entitlements query and validate via `tenancy`.
- FR-19: The system shall return annual savings text as “~5% off”, “~15% off”, “~20% off” for Starter/Growth/Pro without inventing exact annual rupee totals (checkout is `saas-billing`).
- FR-20: The system shall not mark Pro as “unlimited branches”.

## 5. Non-Functional Requirements

- NFR-1: `getEntitlements` p95 ≤ 150 ms (cache per tenant 30s acceptable).
- NFR-2: Gate is fail-closed for paid modules if **SaasSubscription** cannot be read (treat as Free, log error); fail-open for always-reachable Free keys so a chemist can still bill.
- NFR-3: English copy; keys `planGating.paywall.*`, `planGating.nav.lock`, `planGating.plans.*`.
- NFR-4: Module layout `modules/plan-gating/{ui,api,docs}`.
- NFR-5: This module does not write Cashfree or GMV; display-only prices.
- NFR-6: i18n-ready for later language packs on paywall strings.

## 6. Data Model / Entities

- Entities/fields this module owns:
  - **PlanCatalogue** (code or seed table, not chemist-editable here)
    - `plan` (`free` | `starter` | `growth` | `pro`)
    - `monthly_inr` (0, 699, 1499, 2999)
    - `annual_savings_copy` (null | `~5% off` | `~15% off` | `~20% off`)
    - `seats_limit` (2 | 2 | 5 | null)
    - `module_keys` (boolean map)
  - **RoleModuleDefault** (seed)
    - `role` (`Owner` | `Manager` | `Pharmacist` | `Cashier`)
    - `module_key`
    - `allowed` (boolean)
  - This module does **not** own **SaasSubscription** (reference only).
  - This module does **not** own override rows if HQ stores them; it reads:
    - **SaasModuleOverride** (owned writer: `admin-saas-crm`) — `{ tenant_id, module_key, enabled, source: support_override }` if the table is shared via db-services. If the table is absent, overrides = {}.
- Relationships to entities owned elsewhere (reference by name, don't redefine):
  - **Pharmacy / Location** — `tenancy`.
  - **SaasSubscription** — `saas-billing`.
  - **User (login)** — `manage-users` (seatsUsed, ticks).
  - **AuditEvent** — plan change ingested by `saas-billing`, not this read-only gate.

### Module keys (packaging table — must match)

| moduleKey | Plan gate (effective) | Notes |
|---|---|---|
| `dashboard` | always | Always reachable |
| `pos-billing` | Free | Core billing cash\|khata, hold, thermal/scanner consumers |
| `orders` | always | 7-day on Free; older bills link to `sales-ledger` |
| `inventory` | Free | Opening stock CSV included |
| `purchases` | Free | GRN |
| `returns` | Free | Customer CreditNote |
| `purchase-returns` | Free | Tied to purchases |
| `invoice-settings` | Free | Part of Account settings |
| `manage-users` | always | Seat-capped |
| `account` | always | |
| `subscription` | always | |
| `settings` | always | Pharmacy profile |
| `help-support` | always | |
| `refer-earn` | always | SaaS credit, not shop khata |
| `prescriptions` | Starter | |
| `customers` | Starter | |
| `khata` | Starter | |
| `statutory-registers` | Starter | H1/X legal register, duty, licence alerts |
| `employees` | Starter | HR, not payroll |
| `sales-ledger` | Growth | |
| `reports` | Growth | Includes Audit Trail chrome |
| `crm` | Growth | Campaigns; transactional WhatsApp is not this key |
| `ca-sharing` | Growth | |
| `books-gst` | Growth | Books, GSTN prepare, IRN, period/FY lock |
| `stock-take` | Growth | |
| `distributors-reorder` | Growth | Reorder + distributors |
| `offers` | Growth | |
| `expenses` | Growth | |
| `racks` | Growth | |
| `kiosk` | Pro | Locked self-order; unlimited seats are plan seatsLimit null |

Transactional WhatsApp is not a module key (available on every plan via `whatsapp`).

## 7. API / Interface Contracts

### 7.1 Entitlements

**GET `/plan-gating/entitlements?location_id={uuid}`**

Pharmacy session required. `tenant_id` from session.

Response `200`:

```json
{
  "data": {
    "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
    "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
    "plan": "growth",
    "effective_plan": "free",
    "status": "expired",
    "seatsLimit": 2,
    "seatsUsed": 2,
    "modules": {
      "dashboard": true,
      "pos-billing": true,
      "orders": true,
      "inventory": true,
      "purchases": true,
      "returns": true,
      "purchase-returns": true,
      "invoice-settings": true,
      "manage-users": true,
      "account": true,
      "subscription": true,
      "settings": true,
      "help-support": true,
      "refer-earn": true,
      "prescriptions": false,
      "customers": false,
      "khata": false,
      "statutory-registers": false,
      "employees": false,
      "sales-ledger": false,
      "reports": false,
      "crm": false,
      "ca-sharing": false,
      "books-gst": false,
      "stock-take": false,
      "distributors-reorder": false,
      "offers": false,
      "expenses": false,
      "racks": false,
      "kiosk": false
    },
    "overrides": {
      "reports": true
    }
  }
}
```

If status is expired, `modules.reports` is false unless override `reports: true`. `overrides` lists only keys HQ set.

Active Growth example: `plan=growth`, `effective_plan=growth`, `status=active`, `seatsLimit=5`, Growth keys true, `kiosk` false.

**Computation order:** (1) load SaasSubscription (2) derive effective_plan (expired → free) (3) apply plan→module map (4) apply overrides except always-reachable cannot be false (5) seatsLimit from effective_plan (6) seatsUsed from manage-users.

### 7.2 Plan catalogue (pharmacy + HQ read)

**GET `/plan-gating/plans`**

Response `200`:

```json
{
  "data": {
    "gst_note": "18% GST applied at checkout",
    "i18n_key_gst": "planGating.plans.gstNote",
    "items": [
      {
        "plan": "free",
        "monthly_inr": 0,
        "annual_savings_copy": null,
        "seats_limit": 2,
        "label_i18n": "planGating.plans.free.name"
      },
      {
        "plan": "starter",
        "monthly_inr": 699,
        "annual_savings_copy": "~5% off",
        "seats_limit": 2,
        "label_i18n": "planGating.plans.starter.name"
      },
      {
        "plan": "growth",
        "monthly_inr": 1499,
        "annual_savings_copy": "~15% off",
        "seats_limit": 5,
        "label_i18n": "planGating.plans.growth.name"
      },
      {
        "plan": "pro",
        "monthly_inr": 2999,
        "annual_savings_copy": "~20% off",
        "seats_limit": null,
        "label_i18n": "planGating.plans.pro.name"
      }
    ]
  }
}
```

Pro card must not include unlimited branches.

### 7.3 Paywall metadata

**GET `/plan-gating/paywall?module_key=kiosk&location_id={uuid}`**

Response `200`:

```json
{
  "data": {
    "module_key": "kiosk",
    "unlocked": false,
    "required_plan": "pro",
    "required_plan_label_i18n": "planGating.plans.pro.name",
    "monthly_inr": 2999,
    "gst_note": "18% GST applied at checkout",
    "title_i18n": "planGating.paywall.title",
    "body_i18n": "planGating.paywall.body"
  }
}
```

If already unlocked: `unlocked: true`, paywall UI should not show.

Minimum plan that includes the key: first of Starter/Growth/Pro that maps true.

### 7.4 Role defaults

**GET `/plan-gating/role-defaults`**

Response `200`:

```json
{
  "data": {
    "Owner": { "dashboard": true, "pos-billing": true, "manage-users": true, "settings": true, "kiosk": true },
    "Manager": {
      "dashboard": true,
      "pos-billing": true,
      "orders": true,
      "prescriptions": true,
      "khata": true,
      "inventory": true,
      "purchases": true,
      "racks": true,
      "distributors-reorder": true,
      "reports": true,
      "crm": true,
      "manage-users": false,
      "settings": false,
      "account": true,
      "subscription": false,
      "help-support": true,
      "refer-earn": false
    },
    "Pharmacist": {
      "pos-billing": true,
      "orders": true,
      "prescriptions": true,
      "inventory": true,
      "racks": true,
      "crm": true,
      "manage-users": false,
      "settings": false,
      "khata": false
    },
    "Cashier": {
      "pos-billing": true,
      "orders": true,
      "khata": true,
      "manage-users": false,
      "settings": false,
      "inventory": false
    }
  }
}
```

Keys omitted default to false except Owner: any known moduleKey is true (Owner map may be returned as `"*" : true` plus explicit true for all keys in the packaging table). Owner role and access cannot be reduced: `manage-users` must not store a reduced Owner grid; this module’s `evaluateAccess(role, moduleKey, ticks)` returns true for Owner whenever entitlements.modules[moduleKey] is true.

Manager defaults from source: Dashboard, billing, orders, prescriptions, credit, inventory, purchases, racks, distributors, reports, CRM — not user-admin/settings unless granted.

Pharmacist: Billing, orders, prescriptions, inventory, racks, CRM.

Cashier: Billing/POS, counter bills, credit (khata).

Always-reachable account surfaces: Cashier/Pharmacist can open Help; Subscription pay is Owner. `subscription` and `refer-earn` default Owner-only (source: Owner pays SaaS). `account` readable by staff for sign-out — default true for all roles. Assumption logged.

### 7.5 Evaluate (optional helper for other Lambdas)

**POST `/plan-gating/evaluate`**

Request:

```json
{
  "tenant_id": "8f1c0a7e-2b3d-4e5f-8a90-123456789abc",
  "location_id": "1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809",
  "module_key": "crm",
  "role": "Manager",
  "ticks": { "crm": true }
}
```

Response: `{ "data": { "allowed": true | false, "reason": "plan_locked" | "role_denied" | "ok" } }`.

Owner ignores `ticks` (always allowed if plan unlocked or override).

### 7.6 Events emitted

- None required on read. If entitlements cache invalidation is needed, listen to `SaasSubscriptionChanged` from `saas-billing` (do not emit a competing plan-change event).

### 7.7 UI routes / components

- Pharmacy Partner Console:
  - `PlanGate` route wrapper: if `modules[key]===false`, show `Paywall` instead of page.
  - `NavLockIcon` on sidebar items (i18n `planGating.nav.locked`).
  - `Paywall`: title “Unlock {{plan}}”, body “This feature is included in {{plan}} at ₹{{monthly_inr}} / month + 18% GST at checkout.” CTA links to `/subscription` (`saas-billing` UI). Keys: `planGating.paywall.title`, `planGating.paywall.body`, `planGating.paywall.cta`.
  - Always-reachable routes must not mount Paywall: `/`, `/orders`, `/account`, `/subscription`, `/settings`, `/help`, `/refer-earn`, `/users`.
- Platform Admin HQ:
  - No chemist paywall. HQ module matrix UX is `admin-saas-crm`; it should reuse GET `/plan-gating/plans` and the module key list so matrices cannot drift.

## 8. User Stories & Acceptance Criteria

### US-1: New pharmacy is Free and can bill

As an Owner on day one I can open POS and Orders.

- AC-1: Given no **SaasSubscription**, when I GET entitlements, then `plan=free`, `effective_plan=free`, `seatsLimit=2`, `modules.pos-billing=true`, `modules.orders=true`, `modules.kiosk=false`, `modules.crm=false`.
- AC-2: Given I open `/orders`, then no Paywall is shown.
- AC-3: Given I open `/kiosk`, then Paywall names Pro and monthly ₹2999.

### US-2: Expired Growth behaves like Free

As an Owner whose paid plan lapsed I keep data but lose Growth screens.

- AC-1: Given subscription `plan=growth` `status=expired`, when I GET entitlements, then `effective_plan=free`, `modules.reports=false`, `modules.pos-billing=true`, `seatsLimit=2`.
- AC-2: Given I open Reports, then Paywall names Growth and ₹1499.
- AC-3: Given I open Inventory, then the page loads (no paywall).

### US-3: Support override unlocks one module

As HQ Support I enable Reports for a Free account without selling add-on SKUs.

- AC-1: Given override `{ reports: true }` on a Free tenant, when GET entitlements, then `modules.reports=true` and `overrides.reports=true`.
- AC-2: Given override `{ pos-billing: false }`, when GET entitlements, then `modules.pos-billing` remains true.
- AC-3: Given override `{ kiosk: false }` on Pro, when GET entitlements, then `modules.kiosk=false`.

### US-4: Extra seat is not an add-on

As an Owner at 2 seats on Starter I cannot buy a seat SKU here.

- AC-1: Given GET `/plan-gating/plans`, when I inspect items, then there is no extra-seat or extra-branch product.
- AC-2: Given Starter entitlements, when `seatsLimit` is read, then it is 2, not unlimited.
- AC-3: Given Pro entitlements active, when `seatsLimit` is read, then it is `null`.

### US-5: Owner cannot be permission-stripped by ticks

As Owner I keep every unlocked module.

- AC-1: Given evaluate with role Owner, `ticks.crm=false`, effective Growth, when posted, then `allowed=true` for `crm`.
- AC-2: Given evaluate with role Cashier, `module_key=inventory`, default ticks empty, when posted, then `allowed=false` with `role_denied` even on Free (inventory unlocked for tenant but Cashier default off).
- AC-3: Given evaluate Cashier `khata` on Free (khata plan-locked), then `allowed=false` with `plan_locked`.

## 9. Edge Cases & Error Handling

- Missing `location_id`: `400 LOCATION_ID_REQUIRED`.
- Unknown `module_key` on paywall: `400 UNKNOWN_MODULE`.
- `saas-billing` timeout: effective Free + always-reachable true; log error; do not 500 the console shell (NFR fail-open Free).
- `manage-users` timeout for seatsUsed: return `seatsUsed=0` and `seats_used_unknown: true` (extra field) so UI does not block; assumption.
- Suspended subscription: treat like expired for modules (paid locked) unless source says POS stays — source §4.2 suspends subscription; §10 “Plan expired” keeps Free modules. Treat `suspended` like expired for entitlements.
- Annual vs monthly: this module does not change module maps by interval.
- Kiosk shopper: not a User; kiosk UI still checks `modules.kiosk` for the Pharmacy.

| Code | HTTP | When |
|---|---|---|
| `LOCATION_ID_REQUIRED` | 400 | Missing location |
| `LOCATION_TENANT_MISMATCH` | 403 | Pairing |
| `UNKNOWN_MODULE` | 400 | Bad module_key |
| `PHARMACY_SESSION_REQUIRED` | 403 | HQ hitting pharmacy entitlements without tenant context |

## 10. Open Questions / Assumptions

- Assumption: exact annual rupee prices are not in the source (`~5% / ~15% / ~20%`); this module displays monthly + savings copy; `saas-billing` computes payable + 18% GST.
- Assumption: `past_due` without product “grace still paid” is treated as expired for module unlocks (dunning grace is `saas-billing` / automation). If HQ later defines a grace window that keeps Growth open, `saas-billing` must keep `status=active`.
- Assumption: always-reachable keys cannot be support-overridden to false so a shop can always bill.
- Assumption: `subscription` and `refer-earn` default Owner-only in the role map; always reachable in the nav for Owner; other roles may still see Help.
- Assumption: `seatsUsed` counts active Users only (inactive HR-linked logins off do not consume seats) — `manage-users` confirms.
- Assumption: override storage is a row written by `admin-saas-crm`; this module only reads.
- Vague: sidebar grouping Main / Catalogue / Business / Account is owned by the console shell; this module only supplies lock/paywall.
- Out of v1: attachable add-ons, extra branches, extra-seat SKU, shop UPI.
---
