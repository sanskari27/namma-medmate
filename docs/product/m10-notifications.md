
## Module 10: Notifications & Communication — Questionnaire

We've referenced WhatsApp-based customer comms (Module 3) and various "alerts" (low-stock, expiry, license renewal, payment due) throughout. This module consolidates the **notification engine** itself — who gets notified, through what channel, and how it's configured.

### A. Channels
1. Confirmed — customer-facing comms are **WhatsApp only** (Module 3). For **internal/staff-facing** notifications (low-stock alert, approval request, transfer confirmation needed, license expiring), what channel — in-app notification bell, WhatsApp, Email, or a mix depending on urgency?
2. Do you have a WhatsApp Business API provider in mind (e.g., Gupshup, Twilio, Meta Cloud API directly), or should I note this as "TBD — needs a WhatsApp Business API integration" for the dev team to select later? Meta Cloud API directly

### B. Notification Types & Triggers
3. Let's list out every trigger we've referenced so far and confirm who should be notified for each — I'll compile a table; you just confirm/adjust the "notify whom" column:
   - Low stock / reorder needed → Inventory role, OWNER?
   - Item expiring soon → Inventory role, Pharmacist? 
   - Stock transfer requested (pull) → sending branch's Inventory role/OWNER?
   - Stock transfer awaiting receipt confirmation → receiving branch's Inventory role/OWNER?
   - Approval workflow triggered (discount, write-off, etc.) → the specific approver role?
   - Supplier payment due soon → Accountant, OWNER?
   - Tenant/branch license expiring → OWNER, MASTER (confirmed in Module 7)?
   - Staff license expiring → OWNER, the staff member themselves?
   - Customer refill due → customer (WhatsApp)?
   - Customer credit due → customer (WhatsApp), and internally to Accountant/OWNER?
   - New user account created → the new user (with login credentials)?
   - KYC approved/rejected → OWNER (tenant)?
   - Plan limit reached / upgrade needed → OWNER?
   - Subscription expiring soon → OWNER, MASTER?
These are perfect

### C. In-App Notification Center
4. Do you need a persistent **in-app notification center** (bell icon, list of past notifications, read/unread state, click-through to the relevant record), or are toast/pop-up alerts at the moment they happen enough? yes
5. Should notification preferences be configurable per user (e.g., "mute low-stock alerts for myself, only OWNER needs to see those")? no

### D. Staff-Customer Communication Templates
6. For WhatsApp messages to customers (refill reminder, credit due, campaign broadcast, birthday, etc.) — do you need **customizable message templates** per tenant (OWNER can edit wording/branding), or are these fixed system templates? can have customisable templates but all the templates will get publised on the name of MASTER whatsapp profile but can be identified with unique template name along with tenant id 



## ⚠️ One technical flag on WhatsApp templates

Meta Cloud API requires all message templates to be **pre-approved by Meta** before they can be sent (this is a WhatsApp Business policy, not a choice). Since all tenants will send under **MASTER's single WhatsApp Business number**, true free-text "OWNER edits wording" customization isn't fully possible — Meta would need to approve every unique wording variant, which doesn't scale.

Realistic approach: **OWNER customizes variable content within a pre-approved template structure** (e.g., template: *"Hi {{customer_name}}, your refill for {{medicine_name}} is due. Visit {{pharmacy_name}} to restock."* — OWNER can set their pharmacy name/branding in the `{{pharmacy_name}}` slot, maybe choose from 2-3 approved tone variants, but can't freely rewrite the whole message). Confirm this is acceptable, or if not, we'd need per-tenant WhatsApp Business numbers instead (bigger infra/cost decision) — flag which direction you want. Ok