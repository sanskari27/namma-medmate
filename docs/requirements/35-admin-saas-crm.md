# Requirement Doc: CRM Software — SaaS you sell (`admin-saas-crm`)

**Surface:** Platform Admin HQ.  
**Stack:** React Admin HQ + TypeScript AWS Lambdas. UI talks to API only via `@namma-medmate/api-client`. Persistence only through `libs/db-services`.  
**Source:** feature catalogue §4.3 (entire table), §2.1 plans, §4.11 (Cashfree SaaS), Refer & Earn; glossary `SaasSubscription`; decomposition #35.  
**Sidebar:** **CRM Software**. Live badge: at-risk SaaS accounts (count consumed by `admin-tenants` shell).

This is **Namma’s subscription business**, not the chemist’s patient CRM (`crm`). A Namma admin is not a pharmacy user. Actions save immediately. No attachable add-on SKUs. Change plan = live billing. Future shop-floor GMV settlement is **not in v1** (flag off in `admin-platform-settings`).

---

## 1. Summary

HQ **CRM Software** is how Namma sells and runs pharmacy subscriptions: pipeline, subscribers, plan matrix, module adoption, coupons, SaaS billing (GST 18% SAC 9983, Cashfree, Mark paid), onboarding (KYC → wizard), adoption health, CSM/support, chemist-to-chemist Refer & Earn (₹500 SaaS credit both sides), revenue analytics, and renewals/churn. The Account-360 drawer is the per-pharmacy cockpit (health, seats, change plan, billing, support, timeline, Upgrade / Mark paid / Suspend / Reactivate). Dunning is WhatsApp → grace → auto-suspend. Health score &lt; 40 opens a CSM save-play. Near seat cap triggers an upgrade offer. Automation may later press these same buttons; this module owns the buttons.

---

## 2. Scope (in / out)

**In scope**

- Chips: MRR, ARR, active subscribers, on trial, past due, at risk.
- Tabs, each fully specified below: Overview · Sales pipeline · Subscribers · Plans · Modules · Discounts · Billing · Onboarding · Adoption · Success & support · Referrals · Revenue analytics · Renewals & churn.
- Account-360 drawer: health, usage & seats, change plan, billing/contract, support, activity timeline. Actions: Upgrade, Mark paid, Suspend, Reactivate. **No add-on attach.**
- Plan cards and **module-availability matrix by tier only**. Change plan writes live billing via `saas-billing`.
- Feature adoption %; enable/disable a module per account **only as a support override** (logged); nudge eligible-but-not-using.
- Subscription coupons: % / ₹ / extra trial days, cap, first-time-only, pause/delete.
- Billing: Collected / due / overdue, DSO, dunning queue with WhatsApp Remind. Invoice drawer GST @18% SAC 9983. Cashfree collection of SaaS. Mark paid if collected offline.
- Onboarding: go-live stepper + per-stage checklist (KYC → wizard). Advance / Mark live.
- Dunning: WhatsApp reminders → grace → auto-suspend (human button **Suspend** also exists; automation may press it under cap — `admin-automation`).
- Health-score drop (&lt; 40) opens CSM save-play.
- Near seat cap triggers upgrade offer (WhatsApp to owner + HQ banner).
- Referrals: chemist-to-chemist ₹500 SaaS credit both parties, personal code, Mark joined, top referrers. Same programme as pharmacy Refer & Earn (`saas-billing`).
- Revenue analytics: MRR/ARR, NRR/GRR, Rule of 40, LTV:CAC, MRR bridge (new/expansion/contraction/churn), cohorts.
- Future GMV settlement panel: **hidden / flagged off** in v1; do not build collection or T+1 payout here.

**Out of scope**

- Patient CRM, loyalty lots, patient campaigns — `crm`.
- Chemist-facing Subscription page and Cashfree checkout UI — `saas-billing` (this module reads invoices and can Mark paid / change plan / Remind).
- Chemist-facing Refer & Earn UI — `saas-billing` (same credit ledger).
- KYC Approve/Reject UI — `admin-tenants` (this module’s Onboarding tab shows status and may deep-link).
- Command center tiles — `admin-tenants` (reads the same aggregates).
- HQ Rx audit — `admin-rx-compliance`.
- Namma SaaS GSTR-1/3B packing — `admin-finance` (this module lists invoices; Finance files tax).
- Ticket thread UI — `admin-support` (Success & support shows ticket counts and deep-links).
- Master catalogue — `master-catalogue`.
- Attachable add-on SKUs, extra-seat SKUs, API SKUs — never in v1. Extra seat = upgrade plan.
- Shop-floor GMV / UPI / Card / Cashfree on POS — not in v1.

---

## 3. Dependencies

| Module                    | Need                                                                                                                                                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `saas-billing`            | Owns `SaasSubscription`, SaaS invoices, Cashfree orders/webhooks, Refer & Earn credit ledger, auto-renew flag, Monthly/Annual. This module **changes plan**, **marks paid**, **suspends/reactivates**, **applies coupons**, **posts referral credit**. Chemist checkout remains `saas-billing`. |
| `plan-gating`             | Plan enum, seat limits, module keys per tier. Read-only matrix source. Support override is stored here as `ModuleOverride` (this module writes; `plan-gating` reads at console gate).                                                                                                           |
| `admin-tenants`           | Tenant identity, KYC status, wizard stages, notes, HQ shell badge consumer for at-risk count.                                                                                                                                                                                                   |
| `go-live-kyc`             | Wizard stage states for Onboarding tab. Advance/Mark live writes wizard “HQ marked live” only when KYC is approved **and** remaining stages are complete or skipped.                                                                                                                            |
| `whatsapp`                | Templates: `subscription_dunning`, `seat_cap_upgrade_offer`, `module_nudge`, `save_play_owner` (if used), referral joined. Send via `whatsapp` only; never Meta directly. Shop name in body.                                                                                                    |
| `admin-support`           | Open ticket count, NPS if logged on tickets, CSM assignment optional overlap. Deep-link `ticketId`.                                                                                                                                                                                             |
| `manage-users`            | Seats used vs plan limit (read).                                                                                                                                                                                                                                                                |
| `audit`                   | Plan change, mark paid, suspend, reactivate, coupon mutate, module override, referral mark-joined, save-play open.                                                                                                                                                                              |
| `admin-platform-settings` | `HqRole` permissions; Cashfree keys are **not** pasted here.                                                                                                                                                                                                                                    |
| `admin-finance`           | Refunds of SaaS fees originate in Finance; this module’s invoice shows refunded status.                                                                                                                                                                                                         |
| `admin-automation`        | May press: WhatsApp Remind, Suspend (after 3 dunning retries), open save-play, expansion nudge. Same APIs as humans.                                                                                                                                                                            |
| `auth`                    | HQ JWT.                                                                                                                                                                                                                                                                                         |

**External:** Cashfree for SaaS collection is invoked by `saas-billing`; this module does not hold keys. Offline Mark paid does not call Cashfree.

---

## 4. Functional Requirements (FR-n: The system shall ...)

### Chips (always visible on CRM Software)

- FR-1: The system shall show chip **MRR** = sum of monthly-normalised SaaS recurring revenue for subscriptions in status `active` or `past_due` (not `suspended`, not `free`, not `expired`). Annual = remaining contract value / months remaining, or list price / 12 if remaining is unavailable (see §10).
- FR-2: The system shall show chip **ARR** = MRR × 12.
- FR-3: The system shall show chip **Active subscribers** = count of pharmacies on Starter, Growth, or Pro whose subscription is `active` (not past_due, not suspended, not expired). Free is not an active subscriber.
- FR-4: The system shall show chip **On trial** = count of pharmacies with an HQ-granted trial window still open (`trialEndsAt` in the future). Trial is **not** the default start; default start is Free. Trial is created only by applying a discount of type `extra_trial_days` (or HQ “grant trial” that writes the same field).
- FR-5: The system shall show chip **Past due** = count of pharmacies with subscription status `past_due` (unpaid SaaS invoice past due date, not yet suspended).
- FR-6: The system shall show chip **At risk** = count of pharmacies with `healthScore < 40` **or** an open save-play **or** renewal risk flag. This count is the live badge for CRM Software.

### Tab: Overview

- FR-7: The system shall show MRR broken down by plan (Starter / Growth / Pro; Free = ₹0 and omitted from the MRR stack).
- FR-8: The system shall show SaaS metrics on Overview: MRR, ARR, active subscribers, churned this period (count + MRR), trial count, past due, at risk — period default calendar month IST.
- FR-9: The system shall list at-risk accounts (health &lt; 40) with shop name, plan, health score, reason tags, and **Open 360**.

### Tab: Sales pipeline

- FR-10: The system shall show a Kanban with columns **new → contacted → demo → trial → won**. There is no “lost” column required in v1; lost is a lead status that removes the card from the board (filterable).
- FR-11: The system shall provide **+ New lead** creating a `SaasLead` (shop name, phone, city optional, source). Status starts `new`.
- FR-12: The system shall allow dragging a lead between columns; the new stage saves immediately and is audited.
- FR-13: The system shall show **weighted forecast** = sum(lead expected monthly fee × stage probability). Default probabilities: new 10%, contacted 25%, demo 40%, trial 60%, won 100% (editable in v1 only via constants — see §10).
- FR-14: The system shall show **win rate** = won / (won + lost) in the selected period.
- FR-15: The system shall, when a lead is marked **won**, require a `tenantId` (existing pharmacy or one created through `tenancy` onboarding). Won does not attach add-ons.
- FR-16: The system shall allow linking a lead to an existing tenant. Moving to **trial** writes `trialEndsAt` only if HQ also applies extra trial days (or grant trial); otherwise the linked tenant stays Free and the card can still sit in trial as a sales stage (see §10).

### Tab: Subscribers

- FR-17: The system shall list subscribers (all tenants with a `SaasSubscription` row, including Free) with columns: shop, plan, seats used/limit, invoices per month (billing cadence monthly=1, annual=1/12 displayed as cadence), NPS (latest if any), health score, renews-in (days to period end; “—” on Free).
- FR-18: The system shall export the current filtered subscriber list as **CSV**.
- FR-19: The system shall filter by plan, health band, past due, trial, at risk.
- FR-20: The system shall open Account-360 from a subscriber row.

### Tab: Plans

- FR-21: The system shall show plan cards for Free, Starter, Growth, Pro with monthly list price ₹0 / ₹699 / ₹1,499 / ₹2,999 and annual saving ~0 / ~5% / ~15% / ~20%, plus 18% GST on checkout, and seat limits 2 / 2 / 5 / unlimited.
- FR-22: The system shall show a **module-availability matrix** with one column per plan and one row per gated module. Cells are included / not included. The matrix is the sold truth; there are **no add-on columns**.
- FR-23: The system shall use this matrix (owned as data by `plan-gating`, displayed here):

| Module                                                                                                                | Free | Starter | Growth | Pro |
| --------------------------------------------------------------------------------------------------------------------- | ---- | ------- | ------ | --- |
| Billing / POS & GST invoices                                                                                          | yes  | yes     | yes    | yes |
| Orders (today + last 7 days)                                                                                          | yes  | yes     | yes    | yes |
| Inventory, Purchases, Returns, Opening stock CSV                                                                      | yes  | yes     | yes    | yes |
| Invoice Settings, Manage Users (seat-capped)                                                                          | yes  | yes     | yes    | yes |
| Dashboard, Account, Subscription, Settings, Help, Refer & Earn                                                        | yes  | yes     | yes    | yes |
| Prescriptions, Customers, Credit/Khata, H1/X legal register, pharmacist-on-duty, licence alerts, Employees            | no   | yes     | yes    | yes |
| Sales ledger, Reports, CRM, CA sharing, books+GSTN+IRN, stock take, Reorder, Distributors, Offers, Expenses, Rack map | no   | no      | yes    | yes |
| Self-Order Kiosk, unlimited seats                                                                                     | no   | no      | no     | yes |

- FR-24: The system shall change a tenant’s plan from Account-360 or Plans → account picker; the change is **live billing**: `saas-billing` issues/credits the SaaS invoice immediately (proration assumption in §10).
- FR-25: The system shall not offer attachable add-on SKUs, extra-seat SKUs, or à-la-carte module SKUs anywhere on this tab.
- FR-26: The system shall treat extra seats as **upgrade plan** (2 → 5 via Growth, unlimited via Pro).

### Tab: Modules

- FR-27: The system shall compute **feature adoption %** per module = (tenants on a plan that includes the module **and** that have used it in the last 30 days) / (tenants whose plan includes the module), excluding Free-only modules’ “included but unused” if the tenant cannot access them.
- FR-28: The system shall list, per module, eligible-but-not-using tenants (plan includes module, no use in 30 days).
- FR-29: The system shall **nudge** an eligible-but-not-using tenant by sending WhatsApp template `module_nudge` to the Owner via `whatsapp` (shop name + module name). Nudge is logged; max one nudge per tenant per module per 7 days.
- FR-30: The system shall allow Support and Super admin to **enable or disable** a module for one account as a **support override**. This is not an SKU. Override is logged (`audit`) with before/after. Disabled-on-plan hides the module as if gated. Enabled-off-plan unlocks the module without changing plan price.
- FR-31: The system shall show the override badge on Account-360 usage panel.

### Tab: Discounts

- FR-32: The system shall CRUD subscription coupons with type `%` **or** flat ₹ **or** `extra_trial_days` (exactly one type per coupon).
- FR-33: The system shall store: code, type, value (percent 1–100 or paise or integer days), max redemptions **cap**, **first-time-only** flag (first paid invoice of that tenant), status running/paused, optional expiry.
- FR-34: The system shall **pause** or **delete** a coupon. Delete is blocked if already redeemed; pause always allowed. Paused codes cannot be applied.
- FR-35: The system shall apply a coupon only to SaaS invoices (never shop POS). `%` and ₹ reduce taxable SaaS amount **before** 18% GST. `extra_trial_days` extends `trialEndsAt` and does not change GST.
- FR-36: The system shall reject a first-time-only coupon if the tenant has any prior paid SaaS invoice.
- FR-37: The system shall reject application when cap is reached (`409 COUPON_CAP`).

### Tab: Billing

- FR-38: The system shall show totals **Collected** (paid SaaS in period), **Due** (issued, not yet due), **Overdue** (past due, unpaid), in paise, period selectable.
- FR-39: The system shall show **DSO** = (overdue+due AR paise / collected-in-period paise) × days in period, or “—” if collected is 0.
- FR-40: The system shall show a **dunning queue** of overdue unpaid SaaS invoices with last remind-at, retry count (0–3), and **WhatsApp Remind**.
- FR-41: The system shall, on WhatsApp Remind, send template `subscription_dunning` to the Owner via `whatsapp`, increment retry count, log the send, and save immediately.
- FR-42: The system shall open an **invoice drawer** showing: invoice number, tenant, plan, period, taxable, GST **18%**, SAC **9983**, total, Cashfree order id if any, status (`draft` / `issued` / `paid` / `overdue` / `refunded` / `void`).
- FR-43: The system shall collect SaaS only via **Cashfree** when the chemist pays in the console (`saas-billing` webhook marks paid). HQ does not paste Cashfree keys here.
- FR-44: The system shall provide **Mark paid** for invoices collected **offline** (NEFT/cheque/cash to Namma). Mark paid requires Super admin, Operations, or Finance, a payment-date, and a note; it does not call Cashfree; it is audited; it sets invoice `paid` and subscription `active` if this invoice was the blocker.
- FR-45: The system shall not Mark paid an invoice already `paid` or `void` (`409 INVOICE_NOT_MARKABLE`).
- FR-46: The system shall expose **Suspend** from the dunning row (same API as Account-360 / `admin-tenants`) after retries; humans may suspend earlier. Auto-suspend after 3 retries is a rule in `admin-automation` calling this same button.

### Tab: Onboarding

- FR-47: The system shall list tenants in onboarding (KYC not approved **or** wizard not complete/skipped) with a stepper: KYC → profile → opening stock → opening books → invoice print sample → first user/PIN.
- FR-48: The system shall show a per-stage checklist from `go-live-kyc` (complete / skipped / incomplete). HQ cannot fill chemist documents here.
- FR-49: The system shall **Advance** a stage only when `go-live-kyc` allows HQ skip of that stage (opening stock may be zero; opening books “Start at ₹0”). Advance is blocked for KYC — KYC is Approve in `admin-tenants`.
- FR-50: The system shall **Mark live** only if KYC is `approved` **and** every wizard stage is complete or skipped-where-allowed. Mark live writes wizard complete and is the same gate POS uses.
- FR-51: The system shall refuse Mark live when KYC is rejected or pending (`409 GO_LIVE_BLOCKED`).

### Tab: Adoption

- FR-52: The system shall band each tenant: **Power** / **healthy** / **low** / **dormant** using last-active-at (any Owner/Manager/Pharmacist/Cashier console session): Power = last active ≤ 24 h and at least one paid-module action in 7 days if on a paid plan (Free: last active ≤ 24 h); healthy = ≤ 7 days; low = 8–30 days; dormant = &gt; 30 days or never.
- FR-53: The system shall show last active timestamp on each row and filter by band.

### Tab: Success & support

- FR-54: The system shall show open ticket counts per tenant (from `admin-support`) and latest NPS if present.
- FR-55: The system shall show a **CSM book of business**: HQ users with role Support (and Super admin optionally) assigned as CSM on a tenant; list their tenants, health, MRR, open tickets.
- FR-56: The system shall allow assigning/unassigning a CSM on a tenant (saves immediately). Unassigned is valid.

### Tab: Referrals

- FR-57: The system shall implement the same chemist-to-chemist programme as pharmacy Refer & Earn: both parties receive **₹500 SaaS credit** (not shop khata), personal code per pharmacy.
- FR-58: The system shall list referrals: referrer tenant, code, referee shop/phone, status (`invited` / `joined` / `credited`), credited-at.
- FR-59: The system shall provide **Mark joined** when the referee tenant exists and KYC is approved (or go-live ready — see §10), posting ₹500 credit to both SaaS ledgers via `saas-billing` (idempotent on `referralId`).
- FR-60: The system shall show **top referrers** by credited count and total credit paise.
- FR-61: The system shall not pay shop khata or cash for this programme.

### Tab: Revenue analytics

- FR-62: The system shall show MRR and ARR for the selected period end.
- FR-63: The system shall show **NRR** (net revenue retention) = (starting MRR + expansion − contraction − churned MRR) / starting MRR for the period.
- FR-64: The system shall show **GRR** (gross revenue retention) = (starting MRR − contraction − churned MRR) / starting MRR.
- FR-65: The system shall show **Rule of 40** = (YoY MRR growth %) + (SaaS gross margin %). Gross margin = (collected − refunds − Cashfree fees if available, else collected − refunds) / collected. If YoY is undefined (product younger than 12 months), use annualised MoM growth and annotate “annualised”.
- FR-66: The system shall show **LTV:CAC**. LTV = (ARPU monthly / monthly logo churn rate) when churn rate &gt; 0. CAC = HQ-entered sales-and-marketing spend for the period (Finance/Super admin). If CAC is 0 or unset, show LTV and CAC as “—” for the ratio.
- FR-67: The system shall show **MRR bridge**: new + expansion − contraction − churn = ending − starting MRR.
- FR-68: The system shall show **cohorts**: tenants grouped by go-live month (or first paid month if never live), cells = retained logo % or retained MRR % (toggle).

### Tab: Renewals & churn

- FR-69: The system shall list tenants **renewing in 30 days** (paid period end ≤ 30 days) with auto-renew on/off, risk flag, plan.
- FR-70: The system shall record a **churn reason** when a paid subscription expires without renewal or is cancelled (reasons: price, missing feature, competition, closed shop, other + note).
- FR-71: The system shall show a **save-play banner** on this tab when any tenant has health &lt; 40 or renewal risk, linking to the save-play on Account-360.
- FR-72: The system shall treat expired paid plan as Free (modules revoked, data retained) — display as churned logo if they were paid at period start.

### Account-360 drawer

- FR-73: The system shall open Account-360 for a `tenantId` with panels: health (score + tags), usage & seats, change plan, billing/contract, support (tickets + CSM), activity timeline.
- FR-74: The system shall provide actions **Upgrade** (change to a higher plan, live billing), **Mark paid** (latest overdue invoice), **Suspend**, **Reactivate**. There shall be no **Attach add-on** action.
- FR-75: The system shall change Monthly ↔ Annual from the billing panel (live billing via `saas-billing`).
- FR-76: The system shall append timeline events: plan change, invoice paid, dunning remind, KYC decision, go-live, ticket, override, referral, suspend/reactivate.
- FR-77: The system shall open a **save-play** panel when health drops below 40: checklist (call owner, WhatsApp, offer coupon, assign CSM) with items that save immediately; opening the play is audited and is the same action automation may press.
- FR-78: The system shall, when seats used ≥ 80% of limit (and limit is not unlimited), show an upgrade-offer banner and allow sending WhatsApp `seat_cap_upgrade_offer` to the Owner (the expansion nudge). At 100% the chemist cannot add users (`manage-users`); HQ still only offers plan upgrade.

### Dunning state machine

- FR-79: The system shall move subscription to `past_due` when a SaaS invoice is unpaid after its due date (`saas-billing` event).
- FR-80: The system shall allow WhatsApp dunning reminders up to **3** retries (human or automation). After 3 retries, the human (or automation) **Suspend** button is the next step; this module shall not auto-suspend by itself unless invoked via the Suspend API.
- FR-81: The system shall apply a **grace** display (days past due) on the dunning queue; grace does not collect money.

### Cross-cutting

- FR-82: The system shall require HQ JWT; pharmacy JWTs receive `403`.
- FR-83: The system shall save mutations immediately and audit critical actions (plan change, mark paid, suspend, reactivate, coupon mutate, module override, mark joined, save-play open, CSM assign).
- FR-84: The system shall not display shop-floor GMV, UPI, or settlement tiles in v1.
- FR-85: The system shall gate tab mutations by `HqRole` (see matrix in §10 / `admin-platform-settings`): Finance may Mark paid and see billing; Support may override modules and CSM; Compliance is read-only here; Super admin all; Operations pipeline + onboarding + dunning remind.

---

## 5. Non-Functional Requirements

- NFR-1: Subscriber list p95 ≤ 500 ms for 10,000 rows (paginated).
- NFR-2: Account-360 p95 ≤ 400 ms including health, seats, last 20 timeline events.
- NFR-3: Chip aggregates p95 ≤ 500 ms (shared read model with `admin-tenants` MRR).
- NFR-4: Mark paid and plan change are **idempotent** on `idempotencyKey` (client-generated UUID).
- NFR-5: Referral credit is idempotent on `referralId`.
- NFR-6: WhatsApp sends go only through `whatsapp`; 3 retries are that module’s job; failed remind stays visible as Failed on the dunning row.
- NFR-7: English / i18n-ready. Amounts formatted as ₹ with 2 decimals in UI; paise on the wire.
- NFR-8: No Cashfree or WABA secrets in this UI.
- NFR-9: CSV export of subscribers ≤ 10,000 rows per request; larger = `400 EXPORT_TOO_LARGE` (use filters).
- NFR-10: GST on every SaaS invoice is 18% SAC 9983; the drawer must show SAC 9983 verbatim.

---

## 6. Data Model / Entities

### `SaasSubscription` (owned with `saas-billing`; HQ fields this module writes)

| Field                     | Type                 | Notes                                                    |
| ------------------------- | -------------------- | -------------------------------------------------------- |
| `tenantId`                | UUID PK              |                                                          |
| `plan`                    | enum                 | `free` `starter` `growth` `pro`                          |
| `cadence`                 | enum                 | `monthly` `annual`                                       |
| `status`                  | enum                 | `free` `active` `past_due` `suspended` `expired` `trial` |
| `seatsLimit`              | int or null          | null = unlimited (Pro)                                   |
| `periodStart` `periodEnd` | date                 |                                                          |
| `autoRenew`               | bool                 | chemist-toggled in console; HQ visible                   |
| `trialEndsAt`             | timestamptz nullable | HQ-granted only                                          |
| `healthScore`             | int 0–100            | see §10 formula                                          |
| `csmHqUserId`             | UUID nullable        |                                                          |
| `mrrPaise`                | int                  | denormalised                                             |
| `dunningRetries`          | int                  | 0–3                                                      |
| `lastDunnedAt`            | timestamptz nullable |                                                          |
| `renewalRisk`             | bool                 | HQ or rule                                               |

Status `trial` is only when `trialEndsAt` is in the future **and** plan is still Free (trial is a window, not a sold SKU).

### `SaasInvoice` (owned with `saas-billing`)

| Field                     | Type                 | Notes                                               |
| ------------------------- | -------------------- | --------------------------------------------------- |
| `invoiceId`               | UUID                 |                                                     |
| `tenantId`                | UUID                 |                                                     |
| `number`                  | string               | unique per Namma FY                                 |
| `status`                  | enum                 | `draft` `issued` `paid` `overdue` `refunded` `void` |
| `taxablePaise`            | int                  |                                                     |
| `gstPaise`                | int                  | 18% of taxable                                      |
| `totalPaise`              | int                  |                                                     |
| `sac`                     | const                | `9983`                                              |
| `gstRate`                 | const                | `1800` (18.00%)                                     |
| `cashfreeOrderId`         | string nullable      |                                                     |
| `paidAt`                  | timestamptz nullable |                                                     |
| `paidVia`                 | enum nullable        | `cashfree` `offline`                                |
| `offlineNote`             | text nullable        |                                                     |
| `dueAt`                   | date                 |                                                     |
| `periodStart` `periodEnd` | date                 |                                                     |
| `couponId`                | UUID nullable        |                                                     |

### `SaasCoupon` (owned here)

| Field           | Type                 | Notes                               |
| --------------- | -------------------- | ----------------------------------- |
| `couponId`      | UUID                 |                                     |
| `code`          | string unique        |                                     |
| `type`          | enum                 | `percent` `flat` `extra_trial_days` |
| `percentBps`    | int nullable         | e.g. 1000 = 10%                     |
| `flatPaise`     | int nullable         |                                     |
| `extraDays`     | int nullable         |                                     |
| `cap`           | int nullable         | max redemptions                     |
| `redeemedCount` | int                  |                                     |
| `firstTimeOnly` | bool                 |                                     |
| `status`        | enum                 | `running` `paused`                  |
| `expiresAt`     | timestamptz nullable |                                     |

### `SaasLead` (owned here)

| Field              | Type          | Notes                                         |
| ------------------ | ------------- | --------------------------------------------- |
| `leadId`           | UUID          |                                               |
| `shopName`         | text          |                                               |
| `phone`            | text          |                                               |
| `city`             | text nullable |                                               |
| `stage`            | enum          | `new` `contacted` `demo` `trial` `won` `lost` |
| `expectedMrrPaise` | int           |                                               |
| `tenantId`         | UUID nullable |                                               |
| `lostReason`       | text nullable |                                               |
| `createdAt`        | timestamptz   |                                               |

### `SaasReferral` (owned with `saas-billing`)

| Field              | Type          | Notes                         |
| ------------------ | ------------- | ----------------------------- |
| `referralId`       | UUID          |                               |
| `referrerTenantId` | UUID          |                               |
| `code`             | string        | personal code                 |
| `refereeTenantId`  | UUID nullable |                               |
| `status`           | enum          | `invited` `joined` `credited` |
| `creditPaiseEach`  | const         | 50000 (₹500)                  |

### `SaasModuleOverride` (owned here; read by `plan-gating`)

| Field                    | Type        | Notes                          |
| ------------------------ | ----------- | ------------------------------ |
| `tenantId` + `moduleKey` | PK          |                                |
| `mode`                   | enum        | `force_enable` `force_disable` |
| `setByHqUserId`          | UUID        |                                |
| `setAt`                  | timestamptz |                                |

### `SaasSavePlay` (owned here)

| Field                         | Type  | Notes                                                |
| ----------------------------- | ----- | ---------------------------------------------------- |
| `playId`                      | UUID  |                                                      |
| `tenantId`                    | UUID  |                                                      |
| `openedAt` `openedByHqUserId` |       | actor may be automation                              |
| `status`                      | enum  | `open` `won` `lost`                                  |
| `checklist`                   | jsonb | `{ called, whatsapped, couponOffered, csmAssigned }` |

### `SaasCacEntry` (owned here)

| Field        | Type    | Notes                 |
| ------------ | ------- | --------------------- |
| `periodYm`   | char(7) | `2026-08`             |
| `spendPaise` | int     | S&M spend for LTV:CAC |

### `SaasChurnEvent` (owned here)

| Field                                      | Type | Notes |
| ------------------------------------------ | ---- | ----- |
| `tenantId` `at` `fromPlan` `reason` `note` |      |       |

### Referenced

Pharmacy — `tenancy`. Tickets — `admin-support`. KYC/wizard — `go-live-kyc`. Seat usage — `manage-users`. AuditEvent — `audit`.

### Health score (0–100) — owned computation

```
healthScore =
  30 if subscription.status == active else 0 if past_due else 10 if free/trial else 0
+ 25 if lastActiveHours <= 24 else 15 if <= 168 else 5 if <= 720 else 0
+ 20 * adoptionRatioPaidModules   // 0–1
+ 15 if nps >= 8 else 8 if nps >= 6 else 0
+ 10 if openTickets == 0 else 0
clamp 0–100
```

At risk ⇔ score &lt; 40. Formula is an assumption (§10); changing weights is a code constant in v1, not a HQ editor.

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/admin/crm`. Auth: HQ JWT. Envelope as in `admin-tenants`. Money = paise.

### 7.1 Chips & Overview

`GET /admin/crm/overview?period=2026-08`

```json
{
  "success": true,
  "data": {
    "chips": {
      "mrrPaise": 249900,
      "arrPaise": 2998800,
      "activeSubscribers": 12,
      "onTrial": 1,
      "pastDue": 2,
      "atRisk": 3
    },
    "mrrByPlan": [
      { "plan": "starter", "mrrPaise": 69900 },
      { "plan": "growth", "mrrPaise": 149900 },
      { "plan": "pro", "mrrPaise": 299900 }
    ],
    "atRisk": [
      {
        "tenantId": "uuid",
        "shopName": "X",
        "plan": "growth",
        "healthScore": 28,
        "tags": ["dormant", "past_due"]
      }
    ]
  }
}
```

### 7.2 Pipeline

`GET /admin/crm/pipeline`

`POST /admin/crm/leads` body `{ "shopName", "phone", "city?", "expectedMrrPaise", "source?" }`

`PATCH /admin/crm/leads/{leadId}` body `{ "stage", "tenantId?", "lostReason?", "expectedMrrPaise?" }`

`GET /admin/crm/pipeline/stats?period=2026-08` → `{ "weightedForecastPaise", "winRate", "won", "lost" }`

### 7.3 Subscribers

`GET /admin/crm/subscribers?plan=&band=&pastDue=&trial=&q=&cursor=&limit=50`

`GET /admin/crm/subscribers.csv` same filters; `Content-Type: text/csv`

`GET /admin/crm/subscribers/{tenantId}` → Account-360 payload:

```json
{
  "success": true,
  "data": {
    "tenantId": "uuid",
    "shopName": "Sri Krishna Medicals",
    "plan": "growth",
    "cadence": "monthly",
    "status": "active",
    "healthScore": 72,
    "seatsUsed": 4,
    "seatsLimit": 5,
    "nearSeatCap": true,
    "trialEndsAt": null,
    "periodEnd": "2026-09-30",
    "autoRenew": true,
    "csmHqUserId": "uuid",
    "overrides": [{ "moduleKey": "kiosk", "mode": "force_enable" }],
    "savePlay": null,
    "invoices": [
      { "invoiceId": "uuid", "status": "paid", "totalPaise": 176882, "dueAt": "2026-08-01" }
    ],
    "ticketsOpen": 1,
    "timeline": [
      { "at": "2026-08-01T10:00:00Z", "type": "plan_changed", "summary": "Starter → Growth" }
    ]
  }
}
```

### 7.4 Plans

`GET /admin/crm/plans` → cards + matrix rows as FR-23.

`POST /admin/crm/subscribers/{tenantId}/plan`

```json
{
  "plan": "pro",
  "cadence": "annual",
  "idempotencyKey": "uuid"
}
```

`200` returns new subscription + issued invoice. Errors: `409 PLAN_UNCHANGED`, `403 FORBIDDEN`.

No endpoint for add-on attach.

### 7.5 Modules

`GET /admin/crm/modules/adoption` → `[{ "moduleKey", "includedTenants", "usedLast30d", "adoptionPct", "eligibleUnused": [{ "tenantId", "shopName" }] }]`

`POST /admin/crm/subscribers/{tenantId}/modules/{moduleKey}/override`

```json
{ "mode": "force_disable" | "force_enable" | "clear" }
```

`POST /admin/crm/subscribers/{tenantId}/modules/{moduleKey}/nudge` → `{ "messageId" }` or `429 NUDGE_COOLDOWN`.

### 7.6 Discounts

`GET /admin/crm/coupons`

`POST /admin/crm/coupons` `{ "code", "type", "percentBps?", "flatPaise?", "extraDays?", "cap?", "firstTimeOnly", "expiresAt?" }`

`POST /admin/crm/coupons/{couponId}/pause`

`DELETE /admin/crm/coupons/{couponId}` → `409 COUPON_HAS_REDEMPTIONS` if redeemedCount &gt; 0

`POST /admin/crm/subscribers/{tenantId}/coupons/apply` `{ "code" }`

### 7.7 Billing

`GET /admin/crm/billing?period=2026-08` → `{ collectedPaise, duePaise, overduePaise, dsoDays }`

`GET /admin/crm/billing/dunning` → overdue invoices + `dunningRetries` + `lastDunnedAt`

`POST /admin/crm/invoices/{invoiceId}/remind` → WhatsApp send; `429 DUNNING_CAP` if retries ≥ 3 (still allow Suspend)

`GET /admin/crm/invoices/{invoiceId}` → drawer (GST 18%, SAC 9983, Cashfree id)

`POST /admin/crm/invoices/{invoiceId}/mark-paid`

```json
{
  "paidAt": "2026-08-31",
  "note": "NEFT UTR 123",
  "idempotencyKey": "uuid"
}
```

### 7.8 Onboarding

`GET /admin/crm/onboarding`

`POST /admin/crm/onboarding/{tenantId}/advance` `{ "stageKey": "opening_books" }`

`POST /admin/crm/onboarding/{tenantId}/mark-live` → `409 GO_LIVE_BLOCKED` if KYC not approved or stages incomplete.

### 7.9 Adoption, success, referrals, analytics, renewals

`GET /admin/crm/adoption?band=`

`GET /admin/crm/success` → CSM books + ticket/NPS rollup

`PUT /admin/crm/subscribers/{tenantId}/csm` `{ "csmHqUserId": "uuid" | null }`

`GET /admin/crm/referrals`

`GET /admin/crm/referrals/top`

`POST /admin/crm/referrals/{referralId}/mark-joined` `{ "refereeTenantId": "uuid" }`

`GET /admin/crm/analytics?period=2026-08` → NRR, GRR, ruleOf40, ltvPaise, cacPaise, ltvCac, bridge `{ new, expansion, contraction, churn }`, cohorts

`PUT /admin/crm/analytics/cac` `{ "periodYm": "2026-08", "spendPaise": 5000000 }` Finance/Super admin

`GET /admin/crm/renewals?withinDays=30`

`POST /admin/crm/subscribers/{tenantId}/churn-reason` `{ "reason": "price", "note": "" }`

### 7.10 Account-360 actions

`POST /admin/crm/subscribers/{tenantId}/suspend` `{ "reason" }` — same effect as `admin-tenants` (shared `saas-billing` command)

`POST /admin/crm/subscribers/{tenantId}/reactivate`

`POST /admin/crm/subscribers/{tenantId}/save-play/open` — health may be any; automation uses this when score &lt; 40

`PATCH /admin/crm/save-plays/{playId}` `{ "checklist": { "called": true } }`

`POST /admin/crm/subscribers/{tenantId}/upgrade-offer` — WhatsApp seat-cap nudge; `409 NOT_NEAR_CAP` if used/limit &lt; 80% or unlimited

### 7.11 Events

| Event                           | Payload                                                                     |
| ------------------------------- | --------------------------------------------------------------------------- |
| `saas.plan.changed`             | `{ tenantId, fromPlan, toPlan, cadence, actorHqUserId }`                    |
| `saas.invoice.marked_paid`      | `{ invoiceId, tenantId, via: "offline", actorHqUserId }`                    |
| `saas.dunning.reminded`         | `{ invoiceId, tenantId, retry }`                                            |
| `saas.subscription.suspended`   | `{ tenantId }`                                                              |
| `saas.subscription.reactivated` | `{ tenantId }`                                                              |
| `saas.health.save_play_opened`  | `{ tenantId, playId, healthScore }`                                         |
| `saas.module.overridden`        | `{ tenantId, moduleKey, mode }`                                             |
| `saas.module.nudged`            | `{ tenantId, moduleKey }`                                                   |
| `saas.referral.credited`        | `{ referralId, referrerTenantId, refereeTenantId, creditPaiseEach: 50000 }` |
| `saas.seat_cap.upgrade_offered` | `{ tenantId, seatsUsed, seatsLimit }`                                       |
| `saas.lead.stage_changed`       | `{ leadId, stage }`                                                         |
| `saas.go_live.marked`           | `{ tenantId }`                                                              |

### 7.12 UI

Route: `/admin/crm` with tab query `?tab=overview|pipeline|subscribers|plans|modules|discounts|billing|onboarding|adoption|success|referrals|analytics|renewals`.

Drawer: `/admin/crm/subscribers/:tenantId` (or overlay). Deep-link from `admin-tenants` `crmHref`.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

### US-1 Chips distinguish Free, trial, paid

As a Super admin, I want chips that match how we sell, so that Free is not counted as a subscriber and trial is an HQ override.

- Given 10 Free, 1 HQ trial (extra trial days), 5 Growth active, 1 past due, 2 health &lt; 40, When I open CRM Software, Then Active subscribers = 5 (past due excluded), On trial = 1, Past due = 1, At risk = 2.
- Given no coupon extra trial days, When a shop signs up, Then they are Free, not On trial.

### US-2 Change plan is live billing

As Finance, I want to upgrade a shop to Pro, so that billing and seats update immediately.

- Given Growth monthly, When I set plan Pro monthly with an idempotency key, Then plan is Pro, seats unlimited, a SaaS invoice with GST 18% SAC 9983 is issued, timeline shows plan change, and there is no add-on control.
- Given the same idempotency key retried, Then a second invoice is not issued.

### US-3 Support module override

As Support, I want to disable CRM on one Growth account (logged), so that we can handle a dispute without changing SKUs.

- Given Growth includes CRM, When I force_disable `crm`, Then the chemist sees the paywall/lock for CRM, audit has before/after, plan remains Growth, price unchanged.
- Given I nudge a tenant who used CRM yesterday, Then they are not in eligible-but-not-using.
- Given I nudged 3 days ago, When I nudge again, Then `429 NUDGE_COOLDOWN`.

### US-4 Dunning and Mark paid

As Operations, I want to Remind on WhatsApp and Mark paid if they NEFT us, so that Cashfree is not the only path.

- Given overdue invoice retry 0, When I WhatsApp Remind, Then `subscription_dunning` is requested, retry = 1.
- Given retry = 3, When I Remind again, Then `429 DUNNING_CAP` and Suspend remains available.
- Given offline UTR, When Finance Marks paid, Then invoice `paid`, `paidVia=offline`, subscription `active` if that invoice was the blocker, Cashfree not called.

### US-5 Referrals ₹500 both sides

As Operations, I want Mark joined to credit both chemists ₹500 SaaS, so that HQ and the pharmacy Refer & Earn page share one programme.

- Given referrer code and referee tenant KYC approved, When I Mark joined, Then both SaaS credit ledgers increase ₹500, status `credited`, top referrers updates.
- Given I Mark joined again, Then no second ₹500 (idempotent).
- Given the credit, When either chemist checks Refer & Earn, Then the same ₹500 appears (via `saas-billing`).

### US-6 Save-play and seat cap

As Support, I want a save-play when health is 32 and an upgrade offer at 4/5 seats, so that we can retain and expand.

- Given health 32, When I (or automation) open save-play, Then a play exists, banner shows on Renewals, audit row exists.
- Given seats 4/5, When I send upgrade offer, Then Owner WhatsApp `seat_cap_upgrade_offer` is sent.
- Given Pro unlimited seats, When I send upgrade offer, Then `409 NOT_NEAR_CAP`.

### US-7 Mark live

As Operations, I want to Mark live only after KYC and wizard, so that POS cannot be unblocked from CRM alone.

- Given KYC pending, When I Mark live, Then `409 GO_LIVE_BLOCKED`.
- Given KYC approved and all stages complete or skipped, When I Mark live, Then wizard complete and POS gate opens (`go-live-kyc`).

### US-8 Pipeline forecast

As Super admin, I want a Kanban and weighted forecast, so that I can see SaaS sales, not patient CRM.

- Given a lead expected MRR ₹1,499 in `demo` (40%), When I view stats, Then that lead contributes 149900 × 0.40 paise to weighted forecast.
- Given I drag to `won` without tenantId, Then `400 VALIDATION`.

---

## 9. Edge Cases & Error Handling

| Case                            | Behaviour                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| Expired paid → Free             | Active subscribers drop; MRR drops (churn); data retained; chips update.              |
| Trial window ends               | Status leaves `trial`; shop stays Free unless they paid; On trial chip decrements.    |
| Coupon % + GST                  | Discount on taxable; GST 18% of discounted taxable; SAC still 9983.                   |
| Flat coupon &gt; taxable        | Taxable floors at 0; GST 0; do not credit cash.                                       |
| Cashfree pending                | Invoice not paid; Mark paid still allowed for offline; POS of the chemist unaffected. |
| Duplicate Cashfree webhook      | Ignored by `saas-billing`; HQ shows single paid.                                      |
| WhatsApp dunning fail           | Retry inside `whatsapp`; row shows Failed; HQ can Remind again if retries &lt; 3.     |
| Suspend from tenants and CRM    | Same `saas-billing` command; second call `409 ALREADY_SUSPENDED`.                     |
| Health score exactly 40         | Not at-risk; save-play not auto-opened; HQ may still open manually.                   |
| NPS missing                     | Health component for NPS = 0.                                                         |
| CAC unset                       | LTV:CAC shown as "—"; other analytics still render.                                   |
| Cohort with one tenant          | Table still renders; do not hide.                                                     |
| GMV flag on in settings         | Still **do not** show GMV settlement UI in this module in v1.                         |
| Lead phone duplicates a tenant  | Allow link; do not auto-won.                                                          |
| Delete coupon with redemptions  | `409`; pause instead.                                                                 |
| Finance role on module override | `403`.                                                                                |
| Support role on Mark paid       | `403`.                                                                                |

---

## 10. Open Questions / Assumptions

1. **“On trial”** means an HQ-granted window via discount `extra_trial_days` (or equivalent grant that sets `trialEndsAt`). **Free is the sold default start.** The catalogue lists an “on trial” chip but §2.1 says every pharmacy starts on Free — both are honoured this way.
2. **Pipeline “trial” stage** can hold a lead even if the linked tenant is Free without `trialEndsAt`. Granting extra trial days is a separate billing action. Won requires a `tenantId`.
3. **Stage probabilities** are constants (10/25/40/60/100). No HQ editor in v1.
4. **Proration:** upgrade charges the difference for the remainder of the period on the next issued invoice; downgrade applies at `periodEnd` unless Super admin forces immediate (immediate = new invoice + credit note on unused time). Logged so `saas-billing` and HQ do the same.
5. **MRR for annual:** list monthly equivalent (annual price / 12), not remaining/12, so MRR is stable. Command center uses the same.
6. **Health formula** is specified in §6; catalogue only says “health” and “&lt; 40”. Weights are assumptions.
7. **Near seat cap** = used/limit ≥ 0.8, limit finite.
8. **Mark joined** requires referee `tenantId` and KYC `approved` so credit is not paid to a fake shop.
9. **₹500** = 50000 paise each side, SaaS credit applied to the next SaaS invoice (never khata).
10. **Support override enable-off-plan** is a logged exception, not an add-on SKU and not billed.
11. **DSO** uses the formula in FR-39; catalogue named DSO but did not define it.
12. **Rule of 40 / LTV:CAC** need a margin and CAC; CAC is a HQ-entered amount; fees omitted if Cashfree fee is not in `saas-billing` yet.
13. **NPS** is captured on tickets or a CSM note in v1 (integer 0–10); no separate survey product.
14. **Advance** on onboarding only skips stages `go-live-kyc` already allows the Owner to skip; HQ cannot skip KYC.
15. **No GMV settlement** UI even if the platform flag exists.
16. **Same Suspend API** as `admin-tenants`; both are facades over `saas-billing`.
17. **Automation** may call Remind, Suspend, open save-play, upgrade-offer, Flag is not this module. Caps and kill-switch live in `admin-automation`.
18. **CSM** assignment is Support HQ users; Super admin may also be assigned.
19. **Invoices/mo** on the subscriber table means billing cadence (monthly vs annual), not shop POS invoice volume.
20. **Churn reasons** enum is an assumption (price, missing feature, competition, closed shop, other).
