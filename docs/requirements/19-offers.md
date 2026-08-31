# Requirement Doc: Offers (`offers`)

**Status:** v1  
**Plan gate:** Growth  
**Surface:** Pharmacy Partner Console; applied at staff POS and on kiosk **price display**  
**Owner module:** `modules/offers/{ui,api,docs}`  
**Canonical entity:** Offer  
**Stack:** React + TypeScript AWS Lambdas  
**Source:** `docs/product/namma-medmate-platform-feature-catalogue.md` §3.14, stacking §2.4; `docs/requirements/00-glossary.md`; `docs/requirements/00-decomposition-plan.md`

---

## 1. Summary

Offers is the shop coupon catalogue. The chemist creates a titled coupon: code, percent or flat ₹, applies-to (all SKUs / one category / one product), running or paused, and may delete it.

POS applies **exactly one coupon per bill** (stacked with one manual ₹ or % and loyalty redeem — those other stack legs are **not** owned here). This module exposes `validateCoupon(code, cart)` → discount allocation or error. Kiosk **price display** may show running offer-adjusted GST-inclusive prices for matching SKUs; kiosk never redeems loyalty and v1 kiosk does not take a second billing engine.

Near-expiry markdown from `purchase-returns` may **create or link** an Offer; the chemist chooses; this module **stores** the coupon.

---

## 2. Scope (in / out)

### In scope

- CRUD-ish: create Offer; pause/resume (`running` / `paused`); delete.
- Fields: title, coupon code, type `%` or flat ₹, applies-to `all | category | product`, status running/paused.
- `validateCoupon(code, cart)` for POS (and any kiosk display helper).
- Enforce one coupon code evaluation per call; POS enforces one coupon per bill.
- Link/create from purchase-returns near-expiry markdown (chemist chooses).
- Growth plan gate. Tenant + `location_id`.

### Out of scope

- Manual ₹/% discount (POS).
- Loyalty redeem (CRM).
- Second coupon on one bill (POS blocks; this API validates a single code).
- SaaS subscription coupons (`admin-saas-crm`).
- Shop-floor UPI/card offers, delivery fees.
- Automatic stacking rules beyond returning a discount for one code.
- Campaign send (`crm` may attach an optional offer code to a campaign).
- Changing historical bills that already stored a coupon code.

---

## 3. Dependencies

| Module             | Why                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `tenancy`          | Tenant + `location_id`.                                                                    |
| `plan-gating`      | Growth.                                                                                    |
| `pos-billing`      | Applies coupon at charge; one per bill; below-cost warn is POS.                            |
| `kiosk`            | Price display of running applicable offers on OTC SKUs.                                    |
| `purchase-returns` | Near-expiry markdown may create/link an Offer; chemist chooses.                            |
| `inventory`        | Category id / sku_id for applies-to; cart lines identified by `sku_id`.                    |
| `crm`              | Campaign may include optional offer code; attributed revenue reads bill.coupon_code (POS). |
| `audit`            | Create, pause, delete.                                                                     |

---

## 4. Functional Requirements

**FR-1:** The system shall require Growth (or Pro) for offers console routes and APIs; otherwise paywall / `403 PLAN_REQUIRED` with `required_plan: "growth"`. POS on a shop without Growth shall not accept a coupon code (`validateCoupon` → `403` / `PLAN_REQUIRED`). Existing Offer rows are retained if the plan expires.

**FR-2:** The system shall scope every Offer to tenant + `location_id`. Coupon **code** shall be unique per tenant (case-insensitive stored uppercase).

**FR-3:** The system shall create an Offer with required `title`, `code`, `discount_type` (`percent` | `flat`), `discount_value` (> 0), `applies_to` (`all` | `category` | `product`). If `category`, `category_id` required. If `product`, `sku_id` required. Initial status `running` or `paused` as submitted (default `running`).

**FR-4:** The system shall reject `percent` value > 100 (`400 PERCENT_INVALID`) and `flat` value that is not a positive INR amount at 2 dp.

**FR-5:** The system shall allow pause and resume (status `paused` | `running`). Paused codes fail validation with `OFFER_PAUSED`.

**FR-6:** The system shall allow delete. Deleted codes fail validation with `OFFER_NOT_FOUND`. Posted bills that stored the code remain unchanged.

**FR-7:** The system shall expose `validateCoupon(code, cart)` where `cart` is `{ lines: [{ sku_id, category_id, qty, line_sp }] }` and `line_sp` is GST-inclusive selling price **before** this coupon (MRP/list as POS computed). Return either a discount (2 dp, never exceeding eligible line SP sum) plus per-line allocation, or an error code.

**FR-8:** The system shall apply percent as `round(eligible_sp_sum * percent / 100, 2)` and flat as `min(flat, eligible_sp_sum)`. Ineligible lines (wrong category/product) get allocation 0.

**FR-9:** The system shall treat **one coupon per bill** as: a single `code` on `validateCoupon`. This module does not accept an array of codes. POS must not call twice and stack two coupons.

**FR-10:** The system shall fail validation when code is unknown/deleted (`OFFER_NOT_FOUND`), paused (`OFFER_PAUSED`), or no cart line is eligible (`OFFER_NOT_APPLICABLE`).

**FR-11:** The system shall list Offers for the console (title, code, type, value, applies-to, status) with create / pause / delete actions.

**FR-12:** The system shall accept create-or-link from `purchase-returns` for near-expiry markdown: chemist chooses to create a new Offer (typically `product` + `%` or `flat`) or link an existing `offer_id` to that markdown decision. This module stores the coupon; it does not decide return vs markdown.

**FR-13:** The system shall expose a read for **running** offers that apply to a SKU (kiosk/POS price display): given `sku_id` + `category_id`, return the best **single** running offer discount on that SKU’s current SP (if multiple match, the one with the larger discount; ties: newest `created_at`). Kiosk still charges only via staff POS cash token; display is informational of the POS coupon that staff may apply — see §10.

**FR-14:** The system shall emit AuditEvent on create, status change, delete, and markdown-linked create.

**FR-15:** The system shall not send WhatsApp. Campaigns that mention an offer are `crm` → `whatsapp`.

---

## 5. Non-Functional Requirements

- English UI; i18n-ready.
- `validateCoupon` p95 < 200ms (POS payment step).
- Idempotent create from purchase-returns uses `markdown_ref` unique per tenant when provided.
- Codes are not global across pharmacies.
- Growth gate; data retained on downgrade; validation then fails closed (no discount).
- UI via `@namma-medmate/api-client`. Persistence `libs/db-services`.

---

## 6. Data Model / Entities

### Offer

| Field                       | Type                          | Notes                                               |
| --------------------------- | ----------------------------- | --------------------------------------------------- |
| `offer_id`                  | UUID                          | PK                                                  |
| `tenant_id` / `location_id` | UUID                          |                                                     |
| `title`                     | string                        |                                                     |
| `code`                      | string                        | unique per tenant, stored uppercase                 |
| `discount_type`             | enum `percent\|flat`          |                                                     |
| `discount_value`            | decimal                       | percent 0–100 or INR                                |
| `applies_to`                | enum `all\|category\|product` |                                                     |
| `category_id`               | UUID                          | nullable                                            |
| `sku_id`                    | UUID                          | nullable                                            |
| `status`                    | enum `running\|paused`        |                                                     |
| `deleted_at`                | timestamptz                   | nullable (soft delete so bills still resolve title) |
| `markdown_ref`              | string                        | nullable; purchase-return near-expiry id            |
| `created_at` / `updated_at` | timestamptz                   |                                                     |
| `created_by_user_id`        | UUID                          |                                                     |

Bill stores `coupon_code` + discount amount on the POS document (not duplicated as a second ledger here).

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/v1/locations/{location_id}/offers`  
Auth: session Bearer.

### 7.1 REST

**GET** `/v1/locations/{location_id}/offers`

Query: `status=running|paused|all` (default all non-deleted).

```json
{
  "items": [
    {
      "offer_id": "o_1",
      "title": "Monsoon 10%",
      "code": "MONSOON10",
      "discount_type": "percent",
      "discount_value": 10,
      "applies_to": "all",
      "category_id": null,
      "sku_id": null,
      "status": "running"
    }
  ]
}
```

**POST** `/v1/locations/{location_id}/offers`

```json
{
  "title": "Monsoon 10%",
  "code": "monsoon10",
  "discount_type": "percent",
  "discount_value": 10,
  "applies_to": "all",
  "status": "running",
  "markdown_ref": null
}
```

Code normalized to `MONSOON10`. `409 CODE_TAKEN` if another non-deleted offer has that code.

**PATCH** `/v1/locations/{location_id}/offers/{offer_id}`  
`status` pause/resume. Title may be patched. **Code and discount math are immutable after create** (avoid bill replay confusion). To change value: delete and create a new code — unless status-only. If product allows editing value while paused, see §10: v1 **status + title only** on PATCH.

**DELETE** `/v1/locations/{location_id}/offers/{offer_id}`  
Soft delete. `204`.

**POST** `/v1/locations/{location_id}/offers/validate`  
`validateCoupon(code, cart)`

```json
{
  "code": "MONSOON10",
  "cart": {
    "lines": [
      {
        "line_id": "l1",
        "sku_id": "sku_pcm",
        "category_id": "cat_fever",
        "qty": 2,
        "line_sp": 80.0
      }
    ]
  }
}
```

Success:

```json
{
  "ok": true,
  "offer_id": "o_1",
  "code": "MONSOON10",
  "title": "Monsoon 10%",
  "discount_total": 8.0,
  "allocations": [{ "line_id": "l1", "sku_id": "sku_pcm", "discount": 8.0 }]
}
```

Failure:

```json
{
  "ok": false,
  "error": { "code": "OFFER_NOT_APPLICABLE", "message": "No cart line matches this coupon." }
}
```

Error codes: `OFFER_NOT_FOUND`, `OFFER_PAUSED`, `OFFER_NOT_APPLICABLE`, `CODE_REQUIRED`, `PLAN_REQUIRED`.

**GET** `/v1/locations/{location_id}/offers/price-display?sku_id=&category_id=&sp=`

Kiosk/POS card:

```json
{
  "sku_id": "sku_pcm",
  "sp": 40.0,
  "display_sp": 36.0,
  "offer": {
    "offer_id": "o_1",
    "code": "MONSOON10",
    "discount": 4.0
  }
}
```

No running match: `offer` null, `display_sp` = `sp`.

**POST** `/v1/locations/{location_id}/offers/from-markdown`  
Called by purchase-returns UI/API after chemist chooses markdown.

```json
{
  "markdown_ref": "pr_exp_55",
  "title": "Near expiry — PCM 500",
  "code": "EXPPCM",
  "discount_type": "percent",
  "discount_value": 20,
  "applies_to": "product",
  "sku_id": "sku_pcm",
  "link_offer_id": null
}
```

If `link_offer_id` set, do not create; return that offer (chemist chose existing). Idempotent on `markdown_ref`.

### 7.2 Events

| Event                                              | Listeners            |
| -------------------------------------------------- | -------------------- |
| `offer.created` / `offer.paused` / `offer.deleted` | `audit`, kiosk cache |
| `offer.markdown_linked`                            | `purchase-returns`   |

Consumed: none required. POS does not emit coupons here; it stores code on the Bill.

### 7.3 UI

- Route `/offers` (Growth). List + create form: title, code, % or flat ₹, applies-to (all / category picker / one product picker), running/paused toggle, delete.
- No campaign builder here.
- purchase-returns near-expiry flow: modal “Create offer” / “Link existing” / “Return to distributor” — only the first two hit this module.

---

## 8. User Stories & Acceptance Criteria

### US-1: Create and apply one coupon

**Given** a Growth shop  
**When** the Owner creates title “Monsoon 10%”, code `MONSOON10`, 10% off all, running  
**Then** the offer is listed and `validateCoupon("monsoon10", cart of ₹80)` returns `discount_total` 8.00.

**Given** POS already applied `MONSOON10`  
**When** staff try a second code on the same bill  
**Then** POS blocks the second coupon; this API is only called with one code.

### US-2: Paused / not applicable

**Given** a product-scoped coupon for SKU A  
**When** the cart contains only SKU B  
**Then** validation returns `OFFER_NOT_APPLICABLE` and POS must not reduce payable.

**Given** the chemist pauses the offer  
**When** POS validates the code  
**Then** `OFFER_PAUSED`.

### US-3: Near-expiry markdown stores a coupon

**Given** a near-expiry batch in purchase-returns  
**When** the chemist chooses markdown and submits 20% off that SKU with code `EXPPCM`  
**Then** an Offer exists with `applies_to=product` and `markdown_ref` set, and POS can validate `EXPPCM` on that SKU.

---

## 9. Edge Cases & Error Handling

| Case                                     | Behaviour                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| Duplicate code                           | `409 CODE_TAKEN`                                                               |
| Flat ₹ larger than eligible SP           | discount = eligible SP (not above line totals)                                 |
| Percent 0 or 100+                        | `400`                                                                          |
| Empty cart                               | `OFFER_NOT_APPLICABLE`                                                         |
| Plan not Growth                          | `403 PLAN_REQUIRED`; no discount                                               |
| Deleted offer                            | `OFFER_NOT_FOUND`                                                              |
| Two running offers on same SKU (display) | larger discount wins; POS still one **entered** code                           |
| Kiosk shopper                            | price display only; no loyalty; charge at staff POS — staff may enter the code |
| `markdown_ref` retry                     | same offer returned                                                            |
| Below-cost after coupon                  | POS warn + PIN; this module does not know cost                                 |

---

## 10. Open Questions / Assumptions

1. **Coupon codes are case-insensitive**, stored uppercase.
2. **PATCH** in v1 changes title and status only. Amount/scope changes = new offer (new code) to keep validation deterministic.
3. **Soft delete** so historical bills can still show the title via `offer_id`/`code`.
4. **Kiosk price display:** running offers that match the SKU can reduce **displayed** price. Catalogue says offers apply at POS and kiosk price display; kiosk §3.15 does not mention entering a coupon. **Assume:** display may show markdown; the posted bill gets the coupon when **staff** apply the code at cash settlement (or POS auto-applies a single running product markdown if that is how the chemist set it). Auto-apply of `product` markdown at POS is **not** specified — POS must call `validateCoupon` when staff enter a code. Display endpoint is for strikethrough/sale price only.
5. **Best display offer** when several running offers match: maximum discount, then newest.
6. **Category id** is the inventory/product category used on the SKU (same as POS category chips’ backing id).
7. Tax recompute after coupon is POS (`taxable` on discounted SP). This module returns GST-inclusive discount rupees only.
8. One coupon + loyalty + one manual is POS stacking; this module never sees loyalty.
9. SaaS plan coupons are a different product (`admin-saas-crm`).
