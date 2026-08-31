# Requirement Doc: Admin Support — Tickets, Agents, SLA, Knowledge Base (`admin-support`)

**Surface:** Platform Admin HQ.  
**Stack:** React Admin HQ + TypeScript AWS Lambdas. UI via `@namma-medmate/api-client`. Persistence via `libs/db-services`.  
**Source:** feature catalogue §4.9, §3.19 Help & Support raise-ticket; glossary `Ticket`; decomposition #40.  
**Sidebar:** **Support**. Live work is tickets; SLA breach auto-escalates (automation may also trigger the same Escalate button).

A Namma admin is not a pharmacy user. Actions save immediately. Pharmacy Help raise-ticket **creates tickets here**.

---

## 1. Summary

HQ **Support** is Namma’s chemist-support desk: **Overview**, **Tickets**, **Agents** (online/offline), **SLA & escalations**, and **Knowledge base**. A ticket drawer holds the thread, canned macros, assign, priority, and **Resolve / Reopen / Escalate**. SLA breach **auto-escalates** to L2. The pharmacy console Help form (`account-settings` / Help) POSTs into this module. Success & support in `admin-saas-crm` deep-links tickets; it does not own the thread.

---

## 2. Scope (in / out)

**In scope**

- Tabs: Overview · Tickets · Agents · SLA & escalations · Knowledge base.
- Ticket CRUD from HQ and **create-from-pharmacy** API used by Help raise-ticket.
- Drawer: message thread (chemist + HQ), canned macros, assignee, priority, status.
- Actions: Resolve, Reopen, Escalate (to L2).
- Agents: HQ users with Support (and Super admin) presence **online/offline**.
- SLA definitions per priority; breach auto-escalates (and is a button humans have).
- Knowledge base articles for agents (internal). Optional publish-to-pharmacy FAQ is **out** unless already owned by Help — keep KB internal in v1 (§10).
- Canned macros (snippet insert into reply).
- Audit of assign, priority, resolve, reopen, escalate.

**Out of scope**

- In-app telephony product (pharmacy Help may show `tel:` — that is not this module).
- Patient tickets / Rx queue — `prescriptions`.
- WhatsApp as a two-way support inbox product (sends may notify Owner via `whatsapp` on ticket updates — optional §10). Thread storage is this module.
- CSM book of business UI — `admin-saas-crm` (reads ticket counts).
- Pharmacy FAQ content owned by `account-settings` Help.

---

## 3. Dependencies

| Module                    | Need                                                                            |
| ------------------------- | ------------------------------------------------------------------------------- |
| `admin-tenants`           | Tenant identity for ticket `tenantId`.                                          |
| `account-settings` (Help) | Raise-ticket form calls **this** create API with pharmacy Owner JWT + tenantId. |
| `admin-saas-crm`          | Displays open ticket counts; CSM assign is separate.                            |
| `admin-automation`        | Seed rule “Escalate SLA-breached tickets to L2” calls Escalate API.             |
| `admin-platform-settings` | HQ users, roles, L1 vs L2 (Support default L1; Super admin L2).                 |
| `whatsapp`                | Optional Owner notify on ticket received/resolved (`support_ticket_update`).    |
| `audit`                   | Critical ticket actions.                                                        |
| `auth`                    | Pharmacy JWT for create-from-console; HQ JWT for desk.                          |

---

## 4. Functional Requirements (FR-n: The system shall ...)

### Overview

- FR-1: The system shall show Overview KPIs: open tickets, awaiting first response, SLA-breached open, resolved today, agents online.
- FR-2: The system shall show a short list of breached tickets and unassigned tickets with **Open drawer**.

### Tickets

- FR-3: The system shall list tickets filterable by status (`open` / `pending` / `resolved` / `escalated`), priority (`low` / `normal` / `high` / `urgent`), assignee, tenant, SLA state (`ok` / `breach`).
- FR-4: The system shall create a ticket from HQ (`tenantId`, subject, body, priority) and from pharmacy Help: `{ subject, body, category? }` bound to the caller’s tenant; status `open`, priority default `normal`.
- FR-5: The system shall open a **drawer** with chronological thread, chemist messages vs HQ replies, macros, assign, priority.
- FR-6: The system shall **assign** a ticket to an HQ agent (or Unassign); saves immediately.
- FR-7: The system shall change **priority** immediately; SLA clocks recompute from created-at using the new priority’s first-response and resolve targets (see FR-16). If first response already sent, only resolve target changes.
- FR-8: The system shall insert a **canned macro** into the reply box (not auto-send) then HQ sends the reply.
- FR-9: The system shall **Resolve** (status `resolved`, `resolvedAt`), **Reopen** (back to `open`), **Escalate** (status `escalated`, level L2, unassigned or assigned to an L2 agent).
- FR-10: The system shall on Escalate set `escalatedAt`, `escalatedBy` (hq user or `automation`), and require L2 visibility.
- FR-11: The system shall auto-escalate when the ticket is still `open` or `pending` and now &gt; SLA resolve-by **or** first-response-by with no HQ message yet — same Escalation payload as the button. Idempotent if already `escalated`.
- FR-12: The system shall allow the chemist to add a follow-up message on an open ticket via Help; resolved tickets accept follow-up that **Reopens**.
- FR-13: The system shall not allow pharmacy users to assign, escalate, or see other tenants’ tickets.

### Agents

- FR-14: The system shall list HQ users eligible as agents (role Support or Super admin) with presence `online` / `offline` (self-toggle, saves immediately) and open-ticket load.
- FR-15: The system shall treat offline agents as still assignable; Overview “agents online” counts presence only.

### SLA & escalations

- FR-16: The system shall use these SLA targets (IST business hours 09:00–18:00 Mon–Sat unless Super admin edits — v1 constants, see §10):

| Priority | First response | Resolve  |
| -------- | -------------- | -------- |
| urgent   | 1 hour         | 4 hours  |
| high     | 4 hours        | 24 hours |
| normal   | 8 hours        | 48 hours |
| low      | 24 hours       | 5 days   |

- FR-17: The system shall show SLA & escalations tab: policy table (read-only in v1 except Super admin constants), list of auto-escalations today, L1 vs L2 definition (L1 = Support; L2 = Super admin or Support flagged `isL2`).
- FR-18: The system shall compute `firstResponseDueAt` and `resolveDueAt` at create/priority-change and persist them.
- FR-19: The system shall mark `slaBreach=true` when a due timestamp passes without the corresponding event (first HQ reply / resolve).

### Knowledge base

- FR-20: The system shall CRUD **internal** KB articles (title, body, tags) for agents; search from the ticket drawer.
- FR-21: The system shall not publish KB to the pharmacy Help FAQ in v1 (FAQ remains `account-settings`).

### Cross-cutting

- FR-22: The system shall save all ticket field changes immediately.
- FR-23: The system shall audit assign, priority change, resolve, reopen, escalate, auto-escalate.
- FR-24: The system shall gate HQ mutations: Support and Super admin full; Operations view; Finance/Compliance view.

---

## 5. Non-Functional Requirements

- NFR-1: Ticket list p95 ≤ 400 ms.
- NFR-2: Pharmacy create-ticket p95 ≤ 300 ms.
- NFR-3: Auto-escalate is safe under concurrent runners (unique transition to `escalated`).
- NFR-4: Thread messages append-only; edits not allowed (except macro is pre-send).
- NFR-5: English / i18n-ready.
- NFR-6: PII in tickets is tenant-scoped for pharmacy APIs; HQ sees the tenant’s ticket only with HQ JWT.

---

## 6. Data Model / Entities

### `Ticket` (owned — glossary)

| Field                               | Type                 | Notes                                   |
| ----------------------------------- | -------------------- | --------------------------------------- |
| `ticketId`                          | UUID                 |                                         |
| `tenantId`                          | UUID                 |                                         |
| `subject`                           | text                 |                                         |
| `status`                            | enum                 | `open` `pending` `resolved` `escalated` |
| `priority`                          | enum                 | `low` `normal` `high` `urgent`          |
| `assigneeHqUserId`                  | UUID nullable        |                                         |
| `level`                             | enum                 | `L1` `L2`                               |
| `createdBy`                         | enum                 | `pharmacy` `hq`                         |
| `createdByUserId`                   | UUID                 | pharmacy user or HQ user                |
| `firstResponseDueAt` `resolveDueAt` | timestamptz          |                                         |
| `firstHqRepliedAt`                  | timestamptz nullable |                                         |
| `slaBreach`                         | bool                 |                                         |
| `escalatedAt` `escalatedBy`         | nullable             | `hq:{id}` or `automation`               |
| `resolvedAt`                        | nullable             |                                         |
| `nps`                               | int nullable         | 0–10 optional on resolve                |

### `TicketMessage` (owned)

| Field          | Type        | Notes           |
| -------------- | ----------- | --------------- |
| `messageId`    | UUID        |                 |
| `ticketId`     | UUID        |                 |
| `authorType`   | enum        | `pharmacy` `hq` |
| `authorUserId` | UUID        |                 |
| `body`         | text        |                 |
| `createdAt`    | timestamptz |                 |

### `SupportMacro` (owned)

| Field     | Type | Notes |
| --------- | ---- | ----- |
| `macroId` | UUID |       |
| `title`   | text |       |
| `body`    | text |       |

### `KbArticle` (owned)

| Field                 | Type        | Notes |
| --------------------- | ----------- | ----- |
| `articleId`           | UUID        |       |
| `title` `body` `tags` |             |       |
| `updatedAt`           | timestamptz |       |

### `HqAgentPresence` (owned)

| Field       | Type        | Notes              |
| ----------- | ----------- | ------------------ |
| `hqUserId`  | UUID PK     |                    |
| `presence`  | enum        | `online` `offline` |
| `updatedAt` | timestamptz |                    |

---

## 7. API / Interface Contracts (REST JSON, events, UI)

### 7.1 Pharmacy (Partner Console Help)

`POST /help/tickets`  
Auth: pharmacy JWT (Owner/Manager as Help allows).

```json
{ "subject": "IRN failing", "body": "Bill INV-24-12 stuck", "category": "gst" }
```

`200`: `{ "ticketId", "status": "open" }`

`GET /help/tickets` — caller tenant only.

`POST /help/tickets/{ticketId}/messages` `{ "body": "..." }` — reopens if resolved.

### 7.2 HQ

Base `/admin/support`. HQ JWT.

`GET /admin/support/overview`

`GET /admin/support/tickets?status=&priority=&assignee=&sla=&q=&cursor=`

`POST /admin/support/tickets` `{ "tenantId", "subject", "body", "priority" }`

`GET /admin/support/tickets/{ticketId}` — drawer payload + messages

`POST /admin/support/tickets/{ticketId}/messages` `{ "body": "..." }` — sets `firstHqRepliedAt` if first HQ message; may set status `pending`

`POST /admin/support/tickets/{ticketId}/assign` `{ "assigneeHqUserId": "uuid" | null }`

`POST /admin/support/tickets/{ticketId}/priority` `{ "priority": "high" }`

`POST /admin/support/tickets/{ticketId}/resolve` `{ "nps": 9 }` nps optional

`POST /admin/support/tickets/{ticketId}/reopen`

`POST /admin/support/tickets/{ticketId}/escalate` `{ "note": "Needs engineering" }`

`GET /admin/support/agents`

`PUT /admin/support/agents/me/presence` `{ "presence": "online" }`

`GET /admin/support/macros`

`POST /admin/support/macros` `{ "title", "body" }`

`GET /admin/support/kb?q=`

`POST /admin/support/kb` `{ "title", "body", "tags": [] }`

`PATCH /admin/support/kb/{articleId}`

`GET /admin/support/sla` — policy + recent escalations

### 7.3 Internal (automation)

`POST /admin/support/internal/escalate-if-breached` `{ "ticketId" }`  
or batch `POST /admin/support/internal/run-sla` — escalates all due. Same as human Escalate. Idempotent.

### 7.4 Events

| Event                      | Payload                             |
| -------------------------- | ----------------------------------- |
| `support.ticket.created`   | `{ ticketId, tenantId, createdBy }` |
| `support.ticket.escalated` | `{ ticketId, actor }`               |
| `support.ticket.resolved`  | `{ ticketId }`                      |
| `support.ticket.reopened`  | `{ ticketId }`                      |

`admin-saas-crm` listens for counts. `admin-automation` listens for SLA or polls.

### 7.5 UI

`/admin/support?tab=overview|tickets|agents|sla|kb`  
Drawer `/admin/support/tickets/:ticketId`

Pharmacy: Help form already in console — wires to §7.1.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

### US-1 Raise from pharmacy

As an Owner, I want Help raise-ticket to appear in HQ, so that Support can answer.

- Given I submit subject+body on Help, When the request succeeds, Then a ticket exists for my tenant, HQ Overview open count increments, and I cannot see other shops’ tickets.
- Given the ticket is resolved, When I send another message from Help, Then status is `open` (reopened).

### US-2 Drawer actions

As Support, I want macros, assign, and Resolve, so that I can close chemist issues.

- Given an open ticket, When I assign it to myself and send a reply, Then `firstHqRepliedAt` is set and first-response SLA is satisfied.
- Given I Resolve, When the chemist opens Help, Then they see resolved; I can Reopen from HQ.

### US-3 SLA auto-escalate

As Super admin, I want breached tickets at L2, so that nothing sits on L1 forever.

- Given priority normal, no HQ reply, When first-response due passes, Then status `escalated`, level L2, event `support.ticket.escalated` actor `automation`.
- Given already escalated, When the SLA runner runs again, Then no duplicate escalate audit.
- Given automation kill-switch on, When a human clicks Escalate, Then it still works (kill-switch does not block humans).

### US-4 Presence

As Support, I want online/offline, so that Overview shows coverage.

- Given I set online, When Overview loads, Then agents online includes me.
- Given I am offline, When someone assigns me a ticket, Then assign succeeds.

---

## 9. Edge Cases & Error Handling

| Case                                                | Behaviour                                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Empty ticket list                                   | Empty state.                                                                                                        |
| Assign to Finance user                              | `400 NOT_AGENT` unless Super admin.                                                                                 |
| Escalate resolved ticket                            | `409`.                                                                                                              |
| Pharmacy JWT on `/admin/support`                    | `403`.                                                                                                              |
| HQ JWT on `/help/tickets` create for another tenant | Impossible — tenant from token.                                                                                     |
| Concurrent resolve + message                        | Resolve wins or message reopens — last write: if message after resolve, reopen (transaction: compare `resolvedAt`). |
| Macro empty body                                    | `400`.                                                                                                              |
| SLA constants                                       | Not editable in v1 except Super admin PATCH if implemented; default FR-16.                                          |

---

## 10. Open Questions / Assumptions

1. **SLA hours** are not in the catalogue; FR-16 is the locked assumption. Business hours IST; timestamps stored in UTC.
2. **L1 = Support, L2 = Super admin or Support `isL2`**. Catalogue said “Escalate” and automation “to L2”.
3. **KB is internal** in v1; pharmacy FAQ stays in Help (`account-settings`).
4. **NPS on resolve** optional 0–10 feeds `admin-saas-crm` health.
5. **WhatsApp notify** on create/resolve is optional; thread is the system of record. If implemented, template `support_ticket_update` to Owner; not a two-way WhatsApp inbox.
6. **Category** on pharmacy form is a tag only.
7. Auto-escalate is a human button; automation presses it under cap/kill-switch in `admin-automation`.
8. `pending` means waiting on chemist after HQ reply; SLA resolve clock still runs.
