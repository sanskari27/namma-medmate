## Module 2: Organization / Tenant & Branch Structure — Questionnaire

### A. Tenant Setup
1. What info is captured when a new PHARMACY tenant registers? (business name, legal entity name, drug license no., GST no., PAN, address, contact person, bank details for settlements if any, etc.) 
while registeration take business name, email, phone, password. after email based verification, pharmacy will see option to complete its kyc to further perform any action otherwise actions will be locked. after kyc form submits master or the master agent will role will approve that request so that actions can be unlocked
2. Does a tenant pick a **subscription plan** at signup, or does MASTER assign it after KYC approval? tenant will pick after sucessful KYC when actions gets unlocked they will get a FREE plan by default to continue with then we will be having PRO and GROWTH plan for further module based access.
3. Can a tenant operate before KYC is approved (e.g., limited "trial/setup" mode), or is the account fully locked until MASTER/agent verifies docs? no
4. What are the possible tenant statuses — Pending Verification, Active, Suspended, Expired/Trial-ended, Terminated? What triggers each (e.g., non-payment → auto-suspend)?  VERIFICATION_REQUIRED, ACTIVE, SUSPENDED, EXPIRED, TERMINATED

### B. Branch Structure
5. Is "Branch" mandatory even for a single-outlet pharmacy (i.e., every tenant has at least one default branch), or is branch an optional add-on layer only for chains? thay will have a default branch although their details will be filled while KYC although it can be updated afterwards as well
6. What info is captured per branch? (branch name, address, contact number, branch-specific drug license no., GST registration if different per state, operating hours, etc.) analyse youself for all the scenarios possible
7. Is inventory tracked **per branch** (separate stock per location) or is there a shared central warehouse/stock pool with branches drawing from it? it will be tracked per branch
8. Can a sale/invoice at Branch A be fulfilled using stock transferred from Branch B? Do you need an inter-branch stock transfer workflow? no order can-t be fulfilled but their will be a panel for inter-branch stock transfer after which order can be fulfilled
9. Are pricing, discounts, and tax rates the same across all branches of a tenant, or can they differ per branch (e.g., different state = different tax)? they can defer based on branch but  can be copied from another branch as well for faster setup
10. Is there a "central/HQ" reporting view where OWNER sees consolidated numbers across all branches vs. per-branch drill-down? these screens will be decided based on role by which user has been logged in 
if logged in by OWNER thay can see entire diffrent screens but when logged in with other role can see diffrent screens. although OWNER will have access for all the screens 

### C. Subscription & Billing (SaaS side)
11. What defines a subscription plan's limits — number of branches, number of users, number of invoices/month, storage, specific modules (CRM/ERP/both)? List what should be limitable. plans and their modiules are listed below but you can add more features and restrictions based on current market  plans are listed at the end 
12. How does MASTER bill tenants — fixed monthly/annual fee, usage-based, or a mix (e.g., base fee + per-branch fee)? TENANTS will be having subscritpion based approch although MASTER can manipulate their subscriptions and feature accordingly
13. What happens when a tenant exceeds a plan limit (e.g., tries to add an 11th user on a 10-user plan) — hard block, soft warning, or auto-upgrade prompt? upgrade prompt but it should be blocked if not upgraded
14. Do you need in-app plan upgrade/downgrade self-service for tenants, or is that handled manually by MASTER/support? in app option will be their but master can also manipulate their subscriptions status and features and expiry etc 

### D. Master-Level Administration
15. What sub-roles do you foresee under MASTER besides Accountant and Support? (e.g., KYC Verification Agent, Sales/Onboarding Agent, Technical Support, Compliance Officer) not sure for now but add your self accordingly based on product
16. Should MASTER be able to impersonate/log in as a tenant user for support/debugging? If yes, should that action itself be specially audit-logged (since it's sensitive)? yes but not audit loged
17. Can MASTER suspend/terminate a specific tenant, and does that cascade (all branches and users under it get locked simultaneously)? yes 

| Plan        |        Price | Best For                              | Key Features                                                                                                   |
| ----------- | -----------: | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Free**    |   ₹0 forever | Basic pharmacy billing                | POS & GST billing, inventory, batches & expiry, purchases & goods-inward, up to 2 users                        |
| **Starter** |   ₹699/month | Single-counter pharmacies             | Everything in Free + prescriptions, customers, credit/Khata ledger, email support                              |
| **Growth**  | ₹1,499/month | Growing pharmacies                    | Everything in Starter + online store, orders, reports, CRM & CA sharing, reorder & distributors, up to 5 users |
| **Pro**     | ₹2,999/month | Hospitals, kiosks & larger pharmacies | Everything in Growth + hospital/IPD billing, self-order kiosk, unlimited users & branches, priority support    |


## ⚠️ One inconsistency to resolve
You said tenant gets a **"BASIC" plan by default** after KYC, but your plan table lists **Free, Starter, Growth, Pro** — there's no "Basic" in that list. Also, **Free plan has no expiry mentioned** ("₹0 forever") — so is Free actually the default post-KYC plan (i.e., "Basic" was just a placeholder word you used, and you mean **Free**)? Please confirm which of the 4 plans is the true default, and I'll rename it consistently everywhere in the doc. BASIC means free

## Module 2 — Remaining clarifications needed

1. **Branch fields** — I'll draft the full field list myself as requested (below), just confirm: should each branch also require its **own drug license number** mandatorily (since Indian pharmacy law generally requires a license per premises), or is one tenant-level license enough with branches just being sub-locations under it? it should be branch level
2. **Per-branch tax/pricing copy** — When copying pricing/tax setup from another branch, should this be a one-time copy (snapshot, then edited independently) or a "linked" copy that stays in sync until manually unlinked? snapshot, then edited independently
3. **Plan limit breach — hard block specifics** — When blocked (e.g., 11th user on a 10-user plan), does *only the specific action* get blocked (can't add the 11th user, but everything else works fine), or does it escalate to blocking broader functionality until upgrade? only the specific action get blocked 
4. **Inter-branch stock transfer** — Does a transfer need **receiving-branch confirmation** (goods-in-transit state until accepted) or is it instant (deduct from A, add to B immediately on dispatch)? receiving-branch confirmation from whoever has inventory role or OWNER
5. **Free plan's "up to 2 users"** — Does that 2-user cap include the OWNER account itself, or is OWNER unlimited/free and the cap applies to additional sub-accounts? OWNER + 2 additional sub accounts
6. **Branch limit per plan** — Your table doesn't specify branch limits for Free/Starter/Growth (only Pro says "unlimited branches"). What are the branch caps for Free, Starter, and Growth? add accordingly whatever seems appropriate

### My proposed branch field list (based on your "analyse yourself"):
Branch name, branch code (auto-generated, unique), full address, state (for tax purposes), city, pincode, contact phone, contact email, branch-specific drug license no. (pending your answer to Q1), branch-specific GST registration no. (if state differs), operating hours (day-wise), branch type (Retail/Hospital-IPD/Kiosk — since your Pro plan mentions hospital/IPD and kiosk modes), status (Active/Inactive), opening date, is-default-branch flag, and a linked-warehouse flag if you ever separate "sales counter" from "stock godown" in future.

remove hospital/IPD billing for now