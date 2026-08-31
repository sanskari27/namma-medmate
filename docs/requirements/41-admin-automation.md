# Requirement Doc: Admin Automation & Rules (`admin-automation`)

**Surface:** Platform Admin HQ.  
**Stack:** React Admin HQ + TypeScript AWS Lambdas. UI via `@namma-medmate/api-client`. Persistence via `libs/db-services`.  
**Source:** feature catalogue §4.10, operating principle 4; glossary `AutomationRule`; decomposition #41.  
**Sidebar:** **Automation & rules**.

**Invariant:** Automation may **only press buttons a human already has**, under a **value cap**, with a **kill-switch**. Simulation before live. A Namma admin is not a pharmacy user. Actions save immediately.

---

## 1. Summary

HQ **Automation & rules** is the operator for platform rules: a **kill-switch** at the top, auto-run interval **Off / 10s / 30s / 1 min**, **Run all now**, KPIs (active rules, actions automated today, awaiting approval, in simulation), and tabs **Overview · Rules · Activity log · Approvals · Workflows**. v1 ships five seed rules (SaaS dunning suspend after 3 WhatsApp retries; escalate SLA-breached tickets; open save-play when health &lt; 40; flag Schedule-X/Rx for audit; expansion nudge near seat cap). Workflows group those into Dunning ladder, New-subscriber onboarding, At-risk win-back, Renewal playbook. Every automated action maps 1:1 to an existing HQ/console API in `admin-saas-crm`, `admin-support`, `admin-rx-compliance`, or `whatsapp`.

---

## 2. Scope (in / out)

**In scope**

- Kill-switch (global). When on (stopped), no rule executes; humans still use all buttons.
- Auto-run interval Off / 10s / 30s / 1 min; **Run all now**.
- KPIs: active rules, actions automated today, awaiting approval, in simulation.
- Tabs: Overview, Rules, Activity log, Approvals, Workflows (four named playbooks).
- Seed rules 1–5 as specified in §4.10.
- Per-rule: simulation | live, enabled, value cap, approval required (yes/no), last run.
- Simulation: evaluate matches, write activity `simulated`, **do not** call downstream buttons.
- Approval queue: when a live action exceeds cap or rule requires approval, enqueue; HQ Approve executes the button, Reject discards.
- Activity log: every evaluation/action (ok / failed / simulated / awaiting).
- Workflows tab: documents the four ladders as ordered rule sets (enable/disable as a group).

**Out of scope**

- New capabilities that humans cannot perform (no silent GSTN filing, no POS charge, no deleting tenants).
- Patient CRM win-back as a distinct engine — chemist CRM has its own Win back; this HQ module’s “At-risk win-back” is **SaaS health save-play**.
- Shop-floor GMV automation.
- Arbitrary user-authored script/code rules in v1 — HQ toggles seed rules and caps, does not write JavaScript.
- WhatsApp Meta API direct — only `whatsapp` module.

---

## 3. Dependencies

| Module | Human button automation may press |
|---|---|
| `admin-saas-crm` | `POST .../invoices/{id}/remind` (WhatsApp dunning); `POST .../subscribers/{id}/suspend`; `POST .../save-play/open`; `POST .../upgrade-offer` (seat cap). |
| `admin-support` | `POST .../tickets/{id}/escalate` or `internal/escalate-if-breached`. |
| `admin-rx-compliance` | `POST .../flag` or `internal/auto-flag`. |
| `whatsapp` | Only via those modules’ Remind/nudge APIs (never a raw send unless the human path is that send). |
| `admin-platform-settings` | Super admin / Operations mutate automation; others read. |
| `audit` | Kill-switch, interval, rule enable, approve/reject, each live action. |

Seed rule 1 dunning: Remind is the WhatsApp button; Suspend after 3 retries is the Suspend button.

---

## 4. Functional Requirements (FR-n: The system shall ...)

### Kill-switch & runner

- FR-1: The system shall show a **kill-switch** at the top of Automation. Default **armed** (rules may run). Toggling to **killed** saves immediately, stops the scheduler, and leaves in-flight HTTP calls to finish without starting new actions.
- FR-2: The system shall show auto-run interval **Off / 10s / 30s / 1 min**. Off means only **Run all now** (and still respects kill-switch).
- FR-3: The system shall **Run all now** for Super admin / Operations when kill-switch is armed; if killed, return `409 KILL_SWITCH`.
- FR-4: The system shall not run rules when interval is Off except Run all now.
- FR-5: The system shall persist interval and kill state as platform settings (this module).

### KPIs

- FR-6: The system shall show **active rules** = count enabled and not solely in a disabled workflow.
- FR-7: The system shall show **actions automated today** = live (non-simulated) successful button presses since 00:00 IST.
- FR-8: The system shall show **awaiting approval** = open approval queue size.
- FR-9: The system shall show **in simulation** = count of enabled rules whose mode is `simulation`.

### Rules & seed set

- FR-10: The system shall ship these **v1 seed rules** (ids stable):

| id | Name | When | Button pressed | Cap |
|---|---|---|---|---|
| `dunning_saas` | Dunning on overdue SaaS invoices (suspend after 3 retries) | Invoice overdue | 1) WhatsApp Remind if retries &lt; 3; 2) Suspend if retries ≥ 3 | Max 50 Remind/hour; max 10 Suspend/day |
| `sla_escalate` | Escalate SLA-breached tickets to L2 | Ticket `slaBreach` and not escalated | Escalate | Max 100 escalations/hour |
| `health_save_play` | Open save-play when health score &lt; 40 | `healthScore < 40` and no open play | Open save-play | Max 20 opens/day |
| `flag_schedule_x` | Flag Schedule-X / Rx sales for audit | New X register line or X Rx dispense | Flag `schedule_x` | Max 500 flags/hour |
| `seat_cap_nudge` | Expansion nudge near seat cap | seats used/limit ≥ 0.8, limit finite, no nudge in 7d | Upgrade offer WhatsApp | Max 30 nudges/day |

- FR-11: The system shall not invent additional live rules in v1 beyond these five (HQ cannot author new rule code).
- FR-12: The system shall allow enable/disable per seed rule (immediate) and mode `simulation` | `live`.
- FR-13: The system shall, in **simulation**, log would-be actions with payload preview and **not** call downstream APIs.
- FR-14: The system shall, in **live**, call the downstream API with `actor=automation` where those APIs accept it.
- FR-15: The system shall enqueue **Approvals** when (a) the rule’s “require approval” is on, or (b) executing would exceed the remaining cap — wait for HQ Approve rather than silently dropping, except overflow of the approval queue max 500 (`409 QUEUE_FULL` skip with activity `skipped_cap`).
- FR-16: The system shall default seed rules to **simulation** on first deploy until Super admin sets live (safe default — §10).
- FR-17: The system shall show each rule’s last run at, last error, match count last run.

### Activity log

- FR-18: The system shall append an activity row per attempted action: ruleId, at, mode, target (tenantId/ticketId/sourceLineId), result `simulated` | `success` | `failed` | `awaiting_approval` | `skipped_kill` | `skipped_cap`, HTTP error if failed.
- FR-19: The system shall filter activity by rule, result, date; paginate.

### Approvals

- FR-20: The system shall list pending approvals with rule, target summary, proposed button, created-at.
- FR-21: The system shall **Approve** (executes the button now if kill-switch armed) and **Reject** (no call). Immediate. Super admin / Operations.
- FR-22: The system shall not Approve when kill-switch is killed (`409 KILL_SWITCH`).

### Workflows

- FR-23: The system shall show four workflows:

| Workflow | Rules included (v1) |
|---|---|
| **Dunning ladder** | `dunning_saas` (Remind → grace display in CRM → Suspend after 3) |
| **New-subscriber onboarding** | No extra button in seed 1–5; workflow is **documentation + optional enable of future** — v1 links to CRM Onboarding and does **not** fake a sixth rule. Show checklist: KYC queue (`admin-tenants`) is human; automation does not Approve KYC. |
| **At-risk win-back** | `health_save_play` |
| **Renewal playbook** | `dunning_saas` (if past due) + `seat_cap_nudge` (expansion) |

- FR-24: The system shall allow enabling/disabling a workflow which toggles its member rules together (onboarding workflow has **zero automated buttons** in v1 — enable is a no-op with copy “KYC Approve and Mark live stay human”).
- FR-25: The system shall not auto-Approve KYC or Mark live (those buttons exist for humans; they are **not** in the seed rule list, so automation must not press them).

### Safety

- FR-26: The system shall refuse to call any API not listed in §3 for that rule.
- FR-27: The system shall pass through downstream `409` as activity `failed` without retry storms (max 1 retry per target per interval).
- FR-28: The system shall require HQ JWT for all HQ mutations; runner uses an internal automation principal recorded as actor `automation` in audit.

---

## 5. Non-Functional Requirements

- NFR-1: A 10s interval must complete a pass in &lt; 10s p95 for v1 volumes (index overdue invoices, breached tickets, health &lt; 40, recent X lines, near-cap seats). If a pass overruns, skip overlapping run.
- NFR-2: Kill-switch p95 ≤ 200 ms to persist; next scheduler tick observes it.
- NFR-3: Activity log is append-only.
- NFR-4: Caps are sliding window IST as defined per rule.
- NFR-5: English / i18n-ready.
- NFR-6: No secrets in this UI.

---

## 6. Data Model / Entities

### `AutomationSettings` (owned, singleton)

| Field | Type | Notes |
|---|---|---|
| `killSwitch` | bool | true = killed (stopped) |
| `interval` | enum | `off` `10s` `30s` `1m` |

### `AutomationRule` (owned — glossary)

| Field | Type | Notes |
|---|---|---|
| `ruleId` | text PK | seed ids |
| `enabled` | bool | |
| `mode` | enum | `simulation` `live` |
| `requireApproval` | bool | |
| `capRemindPerHour` etc. | jsonb | per-rule caps |
| `lastRunAt` | timestamptz nullable | |

### `AutomationActivity` (owned)

| Field | Type | Notes |
|---|---|---|
| `activityId` | UUID | |
| `ruleId` | text | |
| `at` | timestamptz | |
| `mode` | enum | |
| `targetType` `targetId` | | |
| `result` | enum | |
| `detail` | jsonb | |

### `AutomationApproval` (owned)

| Field | Type | Notes |
|---|---|---|
| `approvalId` | UUID | |
| `ruleId` | text | |
| `payload` | jsonb | enough to call the button |
| `status` | enum | `pending` `approved` `rejected` |
| `decidedByHqUserId` | nullable | |

---

## 7. API / Interface Contracts (REST JSON, events, UI)

Base: `/admin/automation`. HQ JWT.

`GET /admin/automation` → settings + KPIs + rules summary

```json
{
  "success": true,
  "data": {
    "killSwitch": false,
    "interval": "1m",
    "kpis": {
      "activeRules": 5,
      "actionsToday": 12,
      "awaitingApproval": 1,
      "inSimulation": 5
    }
  }
}
```

`PUT /admin/automation/kill-switch` `{ "killed": true }`

`PUT /admin/automation/interval` `{ "interval": "10s" }`  // `off` | `10s` | `30s` | `1m`

`POST /admin/automation/run-all` → `202` `{ "runId": "uuid" }` or `409 KILL_SWITCH`

`GET /admin/automation/rules`

`PATCH /admin/automation/rules/{ruleId}` `{ "enabled": true, "mode": "live", "requireApproval": false }`

`GET /admin/automation/activity?ruleId=&result=&cursor=`

`GET /admin/automation/approvals?status=pending`

`POST /admin/automation/approvals/{approvalId}/approve`

`POST /admin/automation/approvals/{approvalId}/reject` `{ "note": "" }`

`GET /admin/automation/workflows`

`POST /admin/automation/workflows/{workflowId}/enable` `{ "enabled": true }`  
`workflowId`: `dunning_ladder` | `new_subscriber_onboarding` | `at_risk_winback` | `renewal_playbook`

### Events

| Event | Payload |
|---|---|
| `automation.kill_switch` | `{ killed, actorHqUserId }` |
| `automation.action` | `{ ruleId, targetId, result }` |
| `automation.approved` | `{ approvalId, ruleId }` |

### UI

`/admin/automation?tab=overview|rules|activity|approvals|workflows`  
Kill-switch + interval + Run all now sticky at top.

---

## 8. User Stories & Acceptance Criteria (Given/When/Then)

### US-1 Kill-switch

As Super admin, I want to stop all rules instantly, so that a bad rule cannot keep suspending shops.

- Given interval 10s and live `dunning_saas`, When I set kill-switch killed, Then the next tick does not Remind or Suspend, activity may record `skipped_kill`, and I can still Suspend manually in CRM.
- Given killed, When I Run all now, Then `409 KILL_SWITCH`.

### US-2 Simulation then live

As Operations, I want to simulate dunning, so that I see who would be messaged before WhatsApp goes out.

- Given `dunning_saas` in simulation and 3 overdue invoices retries=0, When I Run all now, Then 3 activity rows `simulated` and `whatsapp` send count for dunning is 0.
- Given I set live and kill-switch armed, When I Run all now, Then Remind API is called (human-equivalent).

### US-3 Suspend only after 3 retries

As Finance, I want automation to press Suspend only after 3 WhatsApp retries, so that we match the catalogue.

- Given retries=2, When the rule runs live, Then it calls Remind (retries become 3), not Suspend.
- Given retries≥3, When the rule runs live, Then it calls Suspend, not a fourth Remind (`429 DUNNING_CAP` on Remind is expected if attempted).

### US-4 Other seed rules

- Given health 32 and no open save-play, When `health_save_play` runs live, Then save-play open API is called.
- Given a new X sale, When `flag_schedule_x` runs, Then Flag is called once per `sourceLineId`.
- Given seats 4/5, When `seat_cap_nudge` runs, Then upgrade-offer API is called; again within 7 days → skip.
- Given SLA-breached ticket, When `sla_escalate` runs, Then Escalate is called.

### US-5 Onboarding workflow is human

- Given I enable New-subscriber onboarding workflow, When the runner runs, Then it does not Approve KYC or Mark live.

### US-6 Approval queue

- Given `requireApproval` on `dunning_saas` Suspend, When retries≥3, Then an approval row exists and Suspend has not run.
- Given I Approve, When kill-switch is armed, Then Suspend runs.

---

## 9. Edge Cases & Error Handling

| Case | Behaviour |
|---|---|
| Overlapping 10s ticks | Single flight lock; skip overlapping. |
| Downstream 403/500 | activity `failed`; do not disable the rule automatically. |
| Cap exceeded + requireApproval false | skip `skipped_cap` (do not violate cap). |
| Cap exceeded + requireApproval true | enqueue approval if under 500 pending. |
| Duplicate flag | downstream idempotent; activity success. |
| Interval Off + kill armed | only Run all now. |
| Support PATCH rule | `403`. |
| Unknown ruleId PATCH | `404`. |
| Workflow onboarding enable | success message, zero jobs. |

---

## 10. Open Questions / Assumptions

1. **Buttons only:** Remind, Suspend, Escalate, Flag, Open save-play, Upgrade-offer. Not KYC Approve, not Mark paid, not Mark live, not refund, not catalogue ban.
2. **Caps** in FR-10 are assumptions; catalogue said “under a cap” without numbers.
3. **Default simulation** on first deploy so production WhatsApp/suspend cannot fire until a human sets live.
4. **New-subscriber onboarding** workflow has no seed automated button; KYC stays human (`admin-tenants`).
5. **Grace** is a CRM display, not a separate automation action.
6. **Actor** on downstream APIs is `automation` for audit; kill-switch does not erase human access.
7. No user-authored DSL in v1.
8. `flag_schedule_x` may overlap POS-time auto-flag in `admin-rx-compliance`; both idempotent on `sourceLineId`.
9. Interval 10s is allowed by catalogue; implementation may coalesce work.
10. Value cap is both rate caps and “do not press unknown buttons”.
