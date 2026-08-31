# Requirement Doc: Admin Marketing — Chemist WhatsApp Campaigns (`admin-marketing`)

**Surface:** Platform Admin HQ.  
**Stack:** React Admin HQ + TypeScript AWS Lambdas. UI via `@namma-medmate/api-client`. Persistence via `libs/db-services`.  
**Source:** feature catalogue §4.7, §2.5 WhatsApp-only, §3.24 templates, §4.11 WABA; glossary; decomposition #38.  
**Sidebar:** **Marketing**. Write: Super admin, Operations. Read: others.

Campaigns target **chemist accounts** (renewals, onboarding), **not** patients. Sends use the **Namma MedMate WABA** via `whatsapp`. Chemists do not bring their own number. A Namma admin is not a pharmacy user. Actions save immediately.

---

## 1. Summary

HQ **Marketing** lets Namma launch and pause **WhatsApp campaigns to chemist Owners** (renewal reminders, onboarding nudges) from the single Namma WABA. Each campaign has an audience (segment of pharmacies), a template, **Launch / Pause**, and a **cost estimator**. Delivery, retries, and the inbox log live in `whatsapp`. This is distinct from Growth **patient CRM campaigns** (`crm`).

---

## 2. Scope (in / out)

**In scope**

- Campaign list: name, purpose (`renewal` / `onboarding` / `other`), status (`draft` / `running` / `paused` / `completed`), audience size, sent/failed, created-at.
- Create/edit: title, template key from `whatsapp` catalogue (chemist-facing), audience filters, schedule now or at timestamp IST.
- Audience filters: plan, subscription status, onboarding incomplete, renewing in 30d, KYC pending, custom tenant id list.
- **Launch** and **Pause** (immediate).
- **Cost estimator:** recipients × ₹ per conversation (HQ-configured rate; default assumption §10).
- Send path: `whatsapp` send API only; shop name in template body; Owner WhatsApp number from tenant/Owner user.
- History: attributed? Catalogue does not require attributed GMV for HQ chemist campaigns — show sent/delivered/read/failed only.

**Out of scope**

- Patient CRM campaigns, consent, refill, loyalty — `crm`.
- WABA token paste — `admin-platform-settings`.
- Login OTP, licence expiry transactional, dunning transactional — those modules call `whatsapp` directly; this module does not steal those templates as “campaigns” unless HQ explicitly clones a marketing template.
- SMS fallback — never in v1.
- Chemist-owned WhatsApp number.
- Email marketing.

---

## 3. Dependencies

| Module | Need |
|---|---|
| `whatsapp` | Template catalogue, send with `purpose=hq_campaign`, at-least-once, 3 retries, inbox statuses delivered/read/failed. WABA is platform-scoped. |
| `admin-tenants` | Tenant list, Owner contact phone, KYC/onboarding flags. |
| `admin-saas-crm` / `saas-billing` | Plan, period end, trial, past due for segments. |
| `go-live-kyc` | Wizard incomplete segment. |
| `admin-platform-settings` | Permission; optional `whatsappConversationRatePaise` for estimator. |
| `audit` | Launch/Pause. |
| `auth` | HQ JWT. |

**External:** Meta only via `whatsapp`.

---

## 4. Functional Requirements (FR-n: The system shall ...)

- FR-1: The system shall list HQ chemist campaigns with status, purpose, audience size, sent, failed, last launched-at.
- FR-2: The system shall create a campaign with title, purpose `renewal` | `onboarding` | `other`, `templateKey` that exists in `whatsapp` and is approved for utility/marketing to businesses, and audience filter JSON.
- FR-3: The system shall resolve audience to distinct Owner phones (one send per tenant). Tenants without Owner phone are counted as `skipped_no_phone`.
- FR-4: The system shall show a **cost estimator** before Launch: `audienceSize × ratePaise` (and skipped count). Rate comes from platform setting; if unset, use default 8000 paise (₹80) per conversation (§10) and label “estimate”.
- FR-5: The system shall **Launch** a `draft` or `paused` campaign: status `running`, enqueue sends via `whatsapp` immediately or at `scheduledAt`. Launch saves immediately.
- FR-6: The system shall **Pause** a `running` campaign: stop further enqueues; in-flight sends finish. Status `paused`.
- FR-7: The system shall mark `completed` when all enqueued sends have a terminal status (delivered, read, or failed after retries).
- FR-8: The system shall not send to patients, kiosk shoppers, or staff other than the Owner (unless the template is the Owner number).
- FR-9: The system shall interpolate **shop name** into the template body via `whatsapp` (required).
- FR-10: The system shall not require patient marketing consent (these are B2B messages to the chemist). Transactional vs marketing template category is enforced by `whatsapp`/Meta; if Meta rejects, row Failed.
- FR-11: The system shall show per-campaign send log (tenant, phone masked except last 4, status, error).
- FR-12: The system shall refuse Launch when audience size is 0 (`409 EMPTY_AUDIENCE`).
- FR-13: The system shall cap a single Launch at 5,000 tenants (`400 AUDIENCE_CAP`); HQ must filter.
- FR-14: The system shall allow Super admin and Operations to Launch/Pause; Finance/Support/Compliance read-only.
- FR-15: The system shall audit Launch and Pause (actor, campaignId, audience size).
- FR-16: The system shall distinguish UI copy: “Chemist accounts — not patient CRM”.

---

## 5. Non-Functional Requirements

- NFR-1: Audience preview p95 ≤ 1 s for 10,000 tenants.
- NFR-2: Launch enqueue is async; API returns `202` with campaign status `running` without waiting for all Meta acks.
- NFR-3: Dedup: same `campaignId + tenantId` cannot send twice (whatsapp dedupe key).
- NFR-4: English / i18n-ready templates already in `whatsapp`.
- NFR-5: No WABA token in this UI.
- NFR-6: Failed sends: no SMS; show Failed as `whatsapp` does.

---

## 6. Data Model / Entities

### `HqChemistCampaign` (owned)

| Field | Type | Notes |
|---|---|---|
| `campaignId` | UUID | |
| `title` | text | |
| `purpose` | enum | `renewal` `onboarding` `other` |
| `templateKey` | text | |
| `audienceFilter` | jsonb | `{ plans?, statuses?, renewingWithinDays?, kyc?, wizardIncomplete?, tenantIds? }` |
| `status` | enum | `draft` `running` `paused` `completed` |
| `scheduledAt` | timestamptz nullable | |
| `ratePaiseSnapshot` | int | frozen at launch for estimator vs actual |
| `createdByHqUserId` | UUID | |
| `launchedAt` `pausedAt` | nullable | |

### `HqChemistCampaignSend` (owned)

| Field | Type | Notes |
|---|---|---|
| `campaignId` + `tenantId` | PK | |
| `messageId` | UUID | from `whatsapp` |
| `status` | enum | `queued` `sent` `delivered` `read` `failed` `skipped_no_phone` |
| `error` | text nullable | |

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/admin/marketing`. HQ JWT.

`GET /admin/marketing/campaigns`

`POST /admin/marketing/campaigns`

```json
{
  "title": "Renewal Sept",
  "purpose": "renewal",
  "templateKey": "subscription_renewal_nudge",
  "audienceFilter": { "renewingWithinDays": 30, "plans": ["starter", "growth", "pro"] },
  "scheduledAt": null
}
```

`PATCH /admin/marketing/campaigns/{campaignId}` — edit only in `draft`.

`POST /admin/marketing/campaigns/{campaignId}/preview`

```json
{
  "success": true,
  "data": {
    "audienceSize": 40,
    "skippedNoPhone": 2,
    "ratePaise": 8000,
    "estimatedCostPaise": 320000
  }
}
```

`POST /admin/marketing/campaigns/{campaignId}/launch` → `202` `{ "status": "running" }`

`POST /admin/marketing/campaigns/{campaignId}/pause` → `{ "status": "paused" }`

`GET /admin/marketing/campaigns/{campaignId}/sends?cursor=`

Errors: `409 EMPTY_AUDIENCE`, `400 AUDIENCE_CAP`, `409 NOT_DRAFT` on edit, `409 NOT_PAUSABLE`.

### Events

| Event | Payload |
|---|---|
| `hq.campaign.launched` | `{ campaignId, audienceSize, actorHqUserId }` |
| `hq.campaign.paused` | `{ campaignId, actorHqUserId }` |

Sends: request `whatsapp` `POST` send `{ templateKey, to, tenantId, purpose: "hq_campaign", campaignId }`.

### UI

`/admin/marketing` list + drawer. Buttons **Launch** · **Pause**. Estimator visible pre-launch.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

### US-1 Launch renewal campaign

As Operations, I want to WhatsApp chemists renewing in 30 days, so that we remind them on the Namma WABA.

- Given 10 paid shops with period end ≤ 30 days and Owner phones, When I preview, Then audienceSize = 10 and estimatedCostPaise = 10 × rate.
- Given I Launch, When sends enqueue, Then each Owner gets one template with shop name; patient CRM is untouched.
- Given I Pause, When 3 were still queued, Then those 3 are not sent.

### US-2 Distinct from patient CRM

As Super admin, I want this module labelled for chemist accounts, so that agents do not blast patients.

- Given a campaign, When I pick audience, Then filters are pharmacy plan/KYC/renewal, not patient segments Chronic/Lapsed.
- Given `crm` campaign APIs, When HQ Marketing Launch runs, Then it does not call `crm` campaign send.

### US-3 Empty / cap

- Given filters match 0 tenants, When I Launch, Then `409 EMPTY_AUDIENCE`.
- Given 5,001 tenants, When I Launch, Then `400 AUDIENCE_CAP`.

---

## 9. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| Owner phone missing | Skip; count skipped_no_phone; do not fail campaign. |
| WhatsApp fail after 3 retries | Send status failed; campaign can still complete. |
| Duplicate Launch | Second Launch on `running` → `409`. |
| Template not in catalogue | `400 UNKNOWN_TEMPLATE`. |
| Meta marketing window | Failed visible; no SMS. |
| Support Launch | `403`. |
| ScheduledAt in the past | `400`. |

---

## 10. Open Questions / Assumptions

1. **Default conversation rate ₹80** (8000 paise) if platform setting unset — catalogue asked for a cost estimator but not Meta’s live tariff.
2. **One send per tenant** to the Owner WhatsApp used for licence/dunning, not every staff user.
3. **No attributed pharmacy GMV** for HQ campaigns in v1 (patient CRM has 14-day offer attribution; that does not apply here).
4. **Purpose renewal/onboarding** are tags; templates must exist in `whatsapp` (`subscription_renewal_nudge`, `onboarding_nudge` or equivalent keys agreed with `whatsapp`).
5. **Cap 5,000** per launch is an operational assumption.
6. Patient consent is irrelevant; these are B2B chemist messages.
7. WABA is Namma’s; chemists do not connect a number.
