# Pharmacy CRM + ERP — Master Requirements Document (v1)
**Status:** Modules 1–11 locked. Module 12 (Non-Functional Requirements) deferred — see note at end.
**Type:** Multi-tenant SaaS

---

## Module 1: Authentication & User Roles

### Tenancy & Hierarchy
- Multi-tenant SaaS, shared DB with tenant-ID row filtering.
- `MASTER` (platform owner) → sub-roles: Accountant, Support, KYC/Verification Agent, and other custom roles MASTER creates.
- `PHARMACY` tenant → `OWNER` (main account) → sub-roles: Pharmacist, Cashier, Inventory, Accountant, and other custom roles OWNER creates.
- One person can hold multiple roles. One user can be assigned to multiple branches and switch between them post-login.

### Customers & Doctors
- No login for customers or doctors in Phase 1 — both are staff-managed reference records.
- Customers created via a reusable dialog component usable across modules.

### Permissions
- Module-level granularity (not action-level).
- Not branch-restricted by design, but data visibility is filtered by the branches a user is assigned to.
- Custom roles are capped by: (a) tenant's active subscription plan's module access, and (b) creating user's own permission set (no privilege escalation).
- Approval workflows are customizable (thresholds/rules defined per functional module); the workflow *builder* is accessible to any role with explicit rights to it (not owner-locked).

### Onboarding
- No self-registration for staff — admin creates accounts and sets initial password.
- User sets a **6-digit PIN** post-onboarding (per-user) so this device can save them for PIN sign-in.
- Staff license/registration verified by MASTER or a MASTER-created Verification Agent role.
- Tenant KYC: docs uploaded at registration, approved by MASTER/Verification Agent before account unlocks.

### Authentication
- First-factor login is email + password (no OTP, social login, SSO, or 2FA in Phase 1).
- After the user sets a 6-digit PIN, this browser may keep that person as a **saved login**. Several people can be saved on one till or HQ console. Tap a saved person, enter PIN, start a new session. “Use another account” is email + password. Sign out ends the session and keeps saved people. A binding lasts **30 days** from the last successful PIN or password login on that device (sliding). 3 failed PINs drop that person on this device (password still works). Password change or reset revokes all of that user’s saved devices. PIN is accepted only with a device binding — it is not a global password.
- **Idle:** 5-minute inactivity on a PIN-enrolled session **signs out** (session ends; saved people stay). Relogin is PIN on this device’s saved-login picker. There is no idle lock overlay.
- **Password policy:** min 8 characters, 90-day expiry, no reuse.
- **Concurrent sessions:** not allowed — new login force-logs-out the previous session.
- **Password reset:** MASTER & OWNER reset their own via email link. All other sub-accounts reset manually by their creating admin (OWNER for pharmacy staff).
- No account lockout on failed login attempts. No device/IP restrictions.

### Audit & Compliance
- Full login + action audit trail (user IDs, timestamps), retained for **90 days**.
- Compliance baseline: India's DPDP Act (no HIPAA/GDPR).
- Soft delete for all deactivated/offboarded accounts.
- **MASTER impersonation:** MASTER can log in as any tenant user for support. ⚠️ Per client decision, this is **not** audit-logged — flagged as a compliance/dispute-resolution risk; recommend reconsidering before launch.

### Multi-Branch
- Users can be assigned to multiple branches, switch post-login.
- Shared DB, tenant-ID filtered (not separate schema/DB per tenant).

---

## Module 2: Organization / Tenant & Branch Structure

### Tenant Lifecycle
- Registration: business name + email + phone + password → email verification → KYC doc upload → MASTER/Agent approval → account unlocked → auto-assigned **Free plan**.
- No pre-KYC trial/setup mode — fully locked until approved.
- Tenant statuses: `VERIFICATION_REQUIRED`, `ACTIVE`, `SUSPENDED`, `EXPIRED`, `TERMINATED`.
- Post-approval, tenant can self-serve upgrade in-app; MASTER can also manually override plan/status/expiry.

### Branches
- Default branch auto-created from KYC address; editable afterward.
- **Branch fields:** name, auto-generated unique branch code, full address, state, city, pincode, contact phone, contact email, branch-specific drug license no. (mandatory), branch-specific GST no. (if state differs), day-wise operating hours, branch type (Retail / Kiosk), status, opening date, is-default-branch flag, linked-warehouse flag (future-proofing).
- Inventory tracked strictly per branch — no cross-branch fulfillment without an inter-branch transfer.
- **Inter-branch transfer:** either branch can initiate (push from sender or pull-request from receiver); requires receiving branch's Inventory role/OWNER confirmation before completing.
- Pricing/tax can differ per branch; settings can be snapshot-copied from another branch (not live-linked).
- Screen/module visibility is role-driven; OWNER sees all screens (consolidated + per-branch drill-down).

### Plan Limits
- Breach behavior: soft block on the specific action only (e.g., can't add 11th user) + upgrade prompt; rest of the system keeps working.
- **Free plan:** OWNER + 2 sub-accounts (3 users total), 1 branch.
- **Starter:** 1 branch.
- **Growth:** 3 branches.
- **Pro:** unlimited branches, unlimited users.

### MASTER Administration
- MASTER can create sub-roles (Accountant, Support, KYC Agent, etc.) with custom permissions.
- MASTER can impersonate tenant users (not audit-logged — see Module 1 flag).
- MASTER can suspend/terminate a tenant, cascading lock to all branches/users under it.

---

## Module 3: CRM — Customer/Patient Management

- **Customer record:** name, phone (dedup key, tenant-wide unique), email, DOB, gender, address, blood group, allergies, chronic conditions.
- **Scope:** Tenant-wide (not per-branch) — one unified profile across all branches.
- Duplicate detection on phone number match, with merge capability.
- **Family/dependent linking:** profiles grouped, shared visibility into purchase/prescription history. ⚠️ *Open item: confirm whether family-linked credit limit is one shared pool or individual limits with collective payoff visibility — pending final decision.*
- Prescription history auto-attached to profile on every prescription-based sale; viewable anytime in portal.
- Allergy/drug-interaction warning triggered at billing time against dispensed medicine.
- Refill reminders: auto-calculated (e.g., every 30 days), sent via WhatsApp, customizable per customer/medicine.
- Loyalty points: earned per purchase, redeemable (Growth+ plans).
- Credit/Khata ledger: per-customer (or per-family) running balance + payment history; credit limit enforcement is OWNER-configurable.
- Customer segmentation/tagging for targeted marketing (e.g., "diabetic," "senior citizen," "high-value").
- **Communication channel:** WhatsApp only (Meta Cloud API — see Module 10/11).
- Campaign/broadcast messaging: role-permissioned (OWNER-assignable).
- **CA Sharing:** generates a categorized/organized PDF of tenant financial/sales data, shareable with the tenant's CA.
- Doctor linkage: purchases/prescriptions can reference a doctor (reference-only entity, no login) for reporting (e.g., top-referring doctors). Flagged as a future extension point (potential doctor login/portal later).

*(B2B lead/pipeline tracking explicitly out of scope — client decision.)*

---

## Module 4: ERP — Inventory & Stock Management

### Product Master
Full field set: id, SKU, barcode (data field only — **no scan-to-search/scan-to-bill in Phase 1**), name, generic/brand name, manufacturer_id, category_id, product_type (Medicine/Device/Surgical/OTC/FMCG), dosage_form, therapeutic_class, composition, strength, route, prescription_required, schedule_classification (OTC/H/H1/X/NDPS), hsn_code, gst_rate, base_unit, pack_size, pack_unit, pack_description, storage_conditions, requires_cold_storage, rack_location, reorder_level, reorder_quantity, minimum_stock, is_discontinued, is_returnable, is_taxable, tax_category, requires_batch_tracking, requires_expiry_tracking, requires_serial_tracking, controlled_substance, notes, is_active, timestamps.
- No shared master catalog — every product created independently per tenant.
- Multi-unit support with conversion (e.g., strip ↔ tablet).

### Batch & Expiry
- Batch-level tracking mandatory: batch no., mfg date, expiry date, batch-specific purchase price.
- Expiry alerts: configurable "X days before expiry" threshold; near-expiry stock is **warned but still sellable** (not blocked).
- Issuing logic: system suggests FEFO; billing staff can manually override batch selection at sale time.

### Stock Levels
- Reorder-level/min-stock per product per branch → triggers low-stock alert → generates **CSV reorder report** → pharmacist manually places order (no auto-PO).
- No max-stock ceiling. No FIFO/weighted-average costing — simple purchase-price-based valuation.

### Adjustments
- Types: damage/breakage, expiry write-off, theft/loss, physical-count correction, sample/free-goods removal — all routed through the customizable approval workflow (Module 1).
- Optional OWNER-initiated stock-take/physical audit (not mandatory periodic).

### Purchase → Inventory Link
- Full pipeline: **PO → Goods Receipt → Quality Check → Stock-in** (not direct stock-in).
- Partial deliveries supported (partial receipt against PO, remainder stays pending).
- Purchase returns to supplier reduce stock immediately on return confirmation.

### Controlled Substances
- Schedule H/H1/X/NDPS: mandatory prescription-verified checkbox before sale, dispensing restricted to Pharmacist role (not Cashier), separate register maintained, government-format stock reporting available.

### Multi-Branch
- Inter-branch transfer: push (sender-initiated) or pull-request (receiver-initiated), both supported; requires receiving-branch Inventory/OWNER confirmation.
- Low-stock alerts proactively suggest "available at Branch X — transfer?" when applicable.

### Plan Gating
- Multi-branch inventory & transfer effectively Growth+ (tied to branch-count plan limits).
- Core inventory/batch/purchase features available from Free upward.

---

## Module 5: ERP — Procurement & Vendor Management

### Supplier Master
Full field set: id, supplier_code, legal_name, trade_name, supplier_type (Distributor/Wholesaler/Manufacturer/Super Stockist), gstin, pan, drug_license_number/type/expiry, fssai_license_number, contact person details, phone/email/website, full address, payment_terms (COD/Advance/Credit), credit_period_days, credit_limit, bank details (name, account holder, account no., IFSC, UPI), categories supplied, status, notes, timestamps.
- Shared across all branches of a tenant, but procurement (PO placement, relationship) managed **independently per branch**.
- No supplier rating/performance tracking.

### Purchase Orders
- Created by OWNER + Inventory role.
- **One PO = one supplier only** (no multi-supplier POs).
- PO versioning supported (edit history retained).
- Reorder CSV can auto-generate draft PO(s), auto-split by supplier if the reorder list spans multiple suppliers.

### Goods Receipt & QC
- GRN done by Inventory role, cross-checked against original PO (qty + price match).
- QC: visual inspection + checklist, authorized to **Pharmacist role only**.
- Partial QC acceptance supported; rejected portion **auto-triggers** return-to-supplier + Debit Note.

### Payments
- Supplier ledger tracks running payables per supplier.
- Payments recorded (partial/full, mode, reference no.); outstanding dues tracked with due-date reminders based on credit period.

### Returns
- Formal Debit Note generated on purchase return; automatically reduces stock and reduces supplier payable balance.

### Plan Gating
- **Free/Starter:** manual PO creation only, single supplier per PO, basic GRN/QC, manual debit notes.
- **Growth:** + auto-PO generation from reorder report, supplier payment due-date reminders/alerts.
- **Pro:** + bulk PO operations, PO/spend analytics.

---

## Module 6: ERP — Sales / POS / Billing

### Invoice
Fields: Invoice ID/Number, Date & Time, Customer ID/Name/Phone, Branch ID, Billing Staff ID, Register/POS Terminal ID, Invoice Type, Sale Type, itemized products (Product ID, Batch ID/Number, Expiry Date, Qty, UOM, MRP, Selling Price, Discount, Taxable Amount, GST Rate, CGST/SGST/IGST, GST Amount, Line Total), Subtotal, Total Discount, Total Taxable Amount, Total GST, Round-off, Grand Total, Payment Mode, Payment Reference, Amount Paid/Due, Change Returned, Credit/Due Terms, Prescription Reference, Doctor Reference, Notes, Invoice Status, Cancellation/Return Status, timestamps.
- **Numbering:** financial-year + branch-based sequential (`INV/2025-26/BR01/00001`).
- Mixed payment modes per invoice supported (e.g., cash + UPI + credit split).
- Hold/park invoice supported.
- Walk-in billing allowed; customer details requested but skippable.

### Prescription-Linked Sales
- Manual "prescription verified" checkbox only in Phase 1 (no photo upload — architecture should leave room for this later).
- Multi-visit/partial-fulfillment prescriptions tracked, manually verified.

### Pricing & Tax
- Discounts: both line-item and total-bill level; both percentage and flat-amount. Ties into Module 1's approval workflow (e.g., discount >X% needs sign-off).
- GST auto-calculated from product's tax_category/HSN, manually adjustable at billing time.
- Scheme/offer support (BOGO, seasonal, bundle pricing) — needs its own rule-engine sub-spec at build time.

### Payments
- Modes: Cash, Card, UPI, Credit/Khata, Bank Transfer.
- No payment gateway integration in Phase 1 (staff manually marks mode); Cashfree planned for tenant subscription billing only (Module 11), not POS.
- Credit/Khata sales deduct from credit limit immediately; separate "settle credit" flow for payoff.

### Returns & Refunds
- Sales returns supported; eligibility manually judged by staff.
- Returned stock goes back to inventory (restocked into originating batch).
- Refund modes: cash refund or credit note.

### Invoice Output & Compliance
- **A4 PDF only** (no thermal POS printer format).
- Mandatory compliance fields: Pharmacy legal name/address/contact, GSTIN, PAN, Drug License No./Type, Invoice No./Date, Customer details, per-line product/batch/expiry/qty/MRP/price/discount/HSN/GST breakup, Total Taxable/Invoice Value, Payment Mode, Prescription/Doctor reference, **Pharmacist Name & Registration Number**, signature/authentication where applicable, Schedule/controlled-drug info, return/refund terms, computer-generated invoice declaration.
- GST e-invoicing/IRN generation in scope for later (tenant-level toggle once turnover threshold applies) — external GSP integration deferred (Module 11).

### Connectivity
- Online-only. Full-screen blocking overlay on connection loss; billing resumes on reconnect. No offline mode/sync.

---

## Module 7: Prescription & Regulatory Compliance (Phase 1 Scope)

- **License/document expiry tracking:** tenant/branch-level (drug license, GST, FSSAI) and individual staff (Pharmacist) registrations, both alert-tracked. Notifications to **both OWNER and MASTER**.
- **Controlled substance register:** auto-populated from sales (product, batch, qty, prescription ref, patient details, dispensing pharmacist, date/time). Exportable in **government-prescribed NDPS format + general Excel**.
- **Standalone prescription repository:** deferred to Phase 2. Phase 1 keeps prescription handling as a sale-time reference only (Module 6).
- Auto-archive for fulfilled/expired prescription references (default suggested validity: 6 months, confirm exact period at build).
- Dedicated compliance/regulatory dashboard, separate from general business reports, for one-click regulatory exports.

### Phase 1 Reports (data views/exports on existing tables)
Schedule H1 Sale Register · Purchase Register · Purchase Invoice/Cash Memo Records · Supplier Drug License Records · Drug License Renewal/Expiry Records · Controlled/Restricted Drug Stock Register · Batch-wise Stock Register · Expired Medicine Register · Damaged Medicine Register · Drug Return-to-Supplier Records · Stock Adjustment/Stock Loss Records · Stock Verification/Physical Inventory Records · Expiry/Near-Expiry Reports · Batch Traceability Reports · Supplier-wise Purchase Reports · Product-wise Purchase/Sale Traceability Reports.

### Phase 2 — Deferred (new workflows required)
Cold-Chain Temperature Logs & Refrigerator Maintenance Logs & Temperature Excursion Records · Medicine Quarantine / Returned-Medicine Quarantine Records · Suspected Counterfeit/Spurious Drug Records · Adverse Drug Reaction Records · Drug Wastage/Destruction Register (formal workflow) · Recall/Product Withdrawal Records & Notifications · Pharmacist Duty/Supervision Roster · Regulatory Inspection/Audit Records, License Inspection Records, Compliance Incident Records · Schedule X Prescription Register/Archive (depends on standalone prescription repository).

### Access
- OWNER by default; other roles (Pharmacist, Accountant, etc.) can be permissioned to view/export specific registers via Module 1's module-level role permissions.

---

## Module 8: Finance & Accounting

- **Scope:** Lightweight finance layer on top of Sales/Procurement — not a full accounting system (no journal entries, chart of accounts, trial balance, balance sheet). Output channel: CA-shared PDF only (Module 3) — no Tally/Zoho/QuickBooks integration.
- No cash drawer/register management (not needed per client decision).
- **Expense tracking:** basic categorized tracking (rent, electricity, salaries, misc.), recorded by Accountant role. No mandatory approval threshold defined — flag if one should be added via Module 1's workflow engine.
- **Consolidated AR/AP dashboard:** rolls up customer credit (Module 3) + supplier payables (Module 5), with aging analysis (0-30/30-60/60-90+ days).
- **Core reports:** Day Book, Sales Summary, Purchase Summary, GST Summary, Profit & Loss (revenue − COGS − expenses), plus Expense Summary Report, AR Aging Report, AP Aging Report, Branch-wise P&L comparison.
- **GST reports:** generated from invoice data (GSTR-1 style sales summary, GSTR-3B style summary).
- TDS handling: out of scope for Phase 1.
- Reports filterable branch-wise; consolidated tenant-wide view available to OWNER.
- **Access:** Accountant + OWNER only. Cashier does not get financial reports.

---

## Module 9: Reporting & Analytics / Dashboards

- **Dashboard structure:** distinct default dashboard per role (Cashier: today's sales + pending holds; Inventory: low-stock + pending transfers/GRN; Accountant: AR/AP + expenses; OWNER: consolidated view).
- **OWNER dashboard:** today's sales (branch-wise + total), low-stock alerts, expiring-soon items, pending approvals, AR/AP summary, top-selling products, pending inter-branch transfers, pending KYC/license renewals due, open PO status.
- Date-range comparison supported (week/month over week/month).
- **Custom report builder:** field/filter/date-range/branch selection for ad-hoc reports.
- Export formats: PDF and Excel/CSV for all reports.
- **Analytics/BI:** trend charts — sales trend, top-selling products, slow-moving/dead stock, customer purchase frequency. No predictive/forecasting elements.
- No scheduled report delivery — on-demand only.
- **Plan gating (depth-tiered):**
  - Free: basic reports only (Day Book, Sales Summary, Purchase Summary).
  - Starter: + a few additional reports (Expense Summary, basic Expiry/Near-Expiry).
  - Growth: + full analytics/charts, AR/AP aging, GST reports, custom report builder.
  - Pro: everything + Pro-exclusive volume features from other modules.
  - *(Exact Starter-vs-Growth split to be finalized before build.)*

---

## Module 10: Notifications & Communication

- **Provider:** Meta WhatsApp Cloud API directly, single MASTER-owned WhatsApp Business number shared across tenants, templates namespaced by tenant ID + unique template name.
- **Template customization:** OWNER can customize **variable content within Meta-pre-approved template structures** (not free-text rewrite, due to Meta's template approval policy).
- **Internal/staff notifications:** in-app notification bell (persistent center: list, read/unread, click-through to record) is the primary channel for all internal alerts.
- **Notification triggers → recipients (confirmed):**
  - Low stock/reorder needed → Inventory role, OWNER
  - Item expiring soon → Inventory role, Pharmacist
  - Stock transfer requested (pull) → sending branch's Inventory/OWNER
  - Transfer awaiting receipt confirmation → receiving branch's Inventory/OWNER
  - Approval workflow triggered → specific approver role
  - Supplier payment due soon → Accountant, OWNER
  - Tenant/branch license expiring → OWNER, MASTER
  - Staff license expiring → OWNER, staff member
  - Customer refill due → customer (WhatsApp)
  - Customer credit due → customer (WhatsApp) + Accountant/OWNER (internal)
  - New user account created → new user (login credentials)
  - KYC approved/rejected → OWNER
  - Plan limit reached → OWNER
  - Subscription expiring soon → OWNER, MASTER
- No per-user notification preference/muting.

---

## Module 11: Integrations

- **Payments:** Cashfree integrated in Phase 1 — **scoped only for tenant subscription billing** (PHARMACY → MASTER). Customer-facing POS gateway deferred.
- **GST e-invoicing/IRN:** deferred; leave extension point in invoice status model.
- **Other govt integrations** (GSTR filing, license verification portals, ABDM): Phase 2.
- **Communication:** WhatsApp only, no SMS fallback.
- **Accounting software export** (Tally/Zoho/QuickBooks): not planned.
- **E-commerce/storefront:** own built-in storefront, Phase 2 (not third-party platform integration).
- **Labs/Insurance/TPA:** out of scope.
- **Transactional email:** Resend (password reset links for MASTER/OWNER, invoice copies if customer email present, etc.).

---

## Module 12: Non-Functional Requirements — ⚠️ DEFERRED

Not yet specified. Covers: hosting/cloud provider & data residency, staff platform access (web/mobile/native), POS hardware assumptions, performance/scale targets, backup & disaster recovery policy, business-data retention period (distinct from the 90-day audit log retention in Module 1), data export/portability on tenant churn, localization/multi-language, and staging/production environment setup.

**Recommendation:** Revisit this before development kickoff — items like data residency (DPDP Act compliance) and business-data retention period have real architectural and legal implications and shouldn't be left entirely to implementation-time judgment.

---

## Open Items Requiring Final Confirmation
1. Module 1: MASTER impersonation not being audit-logged — flagged risk, recommend reconsidering.
2. Module 3: Family-linked credit limit — shared single pool vs. individual limits with collective visibility.
3. Module 7: Exact prescription-reference auto-archive validity period (default suggested: 6 months).
4. Module 8: Whether expense recording needs an approval threshold.
5. Module 9: Exact Starter vs. Growth report/analytics split.
6. Module 12: Entire module pending.