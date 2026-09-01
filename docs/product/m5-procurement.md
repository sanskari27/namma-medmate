
## Module 5: ERP — Procurement & Vendor Management — Questionnaire

### A. Supplier/Vendor Master
1. What fields define a supplier record? (name, GST no., drug license no., contact person, phone, email, address, payment terms/credit period, bank details for payments, product categories they supply, etc.)
| Field                  | Type      |    Required | Description                                                 |
| ---------------------- | --------- | ----------: | ----------------------------------------------------------- |
| `id`                   | UUID      |         Yes | Unique supplier ID                                          |
| `supplier_code`        | String    |         Yes | Internal vendor code, e.g. `SUP-000123`                     |
| `legal_name`           | String    |         Yes | Registered business/legal name                              |
| `trade_name`           | String    |          No | Trading/operating name                                      |
| `supplier_type`        | Enum      |         Yes | Distributor, Wholesaler, Manufacturer, Super Stockist, etc. |
| `gstin`                | String    | Conditional | GST registration number                                     |
| `pan`                  | String    |          No | PAN of supplier/business                                    |
| `drug_license_number`  | String    | Conditional | Drug license number                                         |
| `drug_license_type`    | Enum      |          No | Wholesale / Retail / Manufacturing etc.                     |
| `drug_license_expiry`  | Date      |          No | License expiry date                                         |
| `fssai_license_number` | String    |          No | Useful if supplying applicable food/nutraceutical products  |
| `contact_person_name`  | String    |         Yes | Primary contact                                             |
| `contact_person_role`  | String    |          No | Sales Representative, Accounts, Manager, etc.               |
| `phone`                | String    |         Yes | Primary phone                                               |
| `alternate_phone`      | String    |          No | Secondary phone                                             |
| `email`                | String    |          No | Primary email                                               |
| `website`              | String    |          No | Supplier website                                            |
| `address_line_1`       | String    |         Yes | Address                                                     |
| `address_line_2`       | String    |          No | Address                                                     |
| `city`                 | String    |         Yes | City                                                        |
| `state`                | String    |         Yes | State                                                       |
| `pincode`              | String    |         Yes | PIN code                                                    |
| `country`              | String    |         Yes | Country                                                     |
| `payment_terms`        | Enum      |         Yes | COD / Advance / Credit                                      |
| `credit_period_days`   | Integer   |          No | e.g. 30, 45, 60 days                                        |
| `credit_limit`         | Decimal   |          No | Maximum outstanding credit                                  |
| `bank_name`            | String    |          No | Bank name                                                   |
| `account_holder_name`  | String    |          No | Account holder                                              |
| `account_number`       | String    |          No | Bank account                                                |
| `ifsc_code`            | String    |          No | IFSC                                                        |
| `upi_id`               | String    |          No | Optional payment identifier                                 |
| `categories`           | Relation  |          No | Product categories supplied                                 |
| `status`               | Enum      |         Yes | Active / Inactive / Blocked                                 |
| `notes`                | Text      |          No | Internal notes                                              |
| `created_at`           | Timestamp |         Yes | Created timestamp                                           |
| `updated_at`           | Timestamp |         Yes | Last updated                                                |

2. Can the same supplier be shared across branches of a tenant, or is each branch's supplier list independent? shared
3. Do you need supplier rating/performance tracking (e.g., on-time delivery %, quality rejection rate)? no

### B. Purchase Order Flow
4. Who can create a Purchase Order — Inventory role, OWNER, or a dedicated Procurement role? Does PO creation need approval before being sent to the supplier (ties to approval workflow)? owner + inventory
5. What does a PO contain — product list, quantity, agreed rate, expected delivery date, payment terms? Do you need PO versioning if it's edited after creation? yes
6. Do you support **auto-PO suggestion** based on the reorder CSV report (Module 4), where the reorder list can be converted into a draft PO with one click for a specific supplier? yes
7. Can a single PO span multiple suppliers, or is it always one PO = one supplier? PO span multiple suppliers

### C. Goods Receipt & Quality Check
8. Who performs Goods Receipt entry, and does it require matching against the original PO (qty ordered vs. qty received, price match)? inventory role will do and cross check as well
9. What does "Quality Check" involve in your workflow — visual inspection sign-off, or is it just a checklist/approval step before stock-in? Who's authorized to do this (Pharmacist only, given regulatory context)? visual + checklist - Pharmacist 
10. If QC fails for a batch/item, what happens — full rejection & return to supplier, partial acceptance, or hold for review? partal acceptance

### D. Supplier Payments & Ledger
11. Do you need a supplier ledger tracking amount owed per supplier (running payables, linked to POs/invoices received)? yes 
12. Do you need to record supplier payments made (partial/full, payment mode, reference no.) and track outstanding dues? yes
13. Do you need payment due-date reminders/alerts (based on agreed credit period with supplier)? yes

### E. Purchase Returns (Debit Notes)
14. Confirmed from Module 4 — purchase returns reduce stock immediately. Do you need to generate a formal **Debit Note** document for the supplier when returning goods? yes
15. Does a purchase return adjust the supplier payable balance automatically (reduce what's owed)? Yes

### F. Multi-Branch & Plan Gating
16. Is procurement handled centrally (OWNER/HQ negotiates and places POs for all branches) or independently per branch (each branch's Inventory role manages its own supplier relationships and POs)? branch manages their own
17. Any features here you'd consider Growth/Pro exclusive vs. available from Free? Not till now TBD, use your judgment




1. **"PO can span multiple suppliers" (Q7)** — This is unusual: a Purchase Order is legally/practically issued *to one supplier* (the supplier needs a single document listing what they must deliver at what rate). What I think you actually mean is: **the reorder report can span multiple suppliers, and converting it to POs auto-splits into one PO per supplier** (so procurement staff doesn't have to do it manually product-by-product). I'll lock it that way — flag me if you truly meant one PO document listing products from different suppliers, but that would break standard accounting/GST invoice-matching. ok then PO can span single supplier only
2. **QC "partial acceptance" (Q10)** — When a batch is partially accepted (say 60 of 100 units pass QC), does the **rejected 40** automatically trigger a return-to-supplier + Debit Note, or does it just sit in a "rejected/hold" state until someone manually decides return vs. destroy vs. escalate? trigger automatically

## Plan-gating proposal for Procurement (since you asked for a better idea)

Feature-gating procurement itself would be odd (you can't half-run a pharmacy's purchasing). Better lever: **gate by *volume/automation sophistication*, not existence**:
- **Free/Starter**: Manual PO creation only, one supplier per PO, basic GRN/QC, manual debit notes.
- **Growth**: + Auto-PO generation from reorder report (one-click), supplier payment due-date reminders/alerts.
- **Pro**: + Bulk PO operations, PO analytics (spend-by-supplier trends) — feeds into Module 10 (Reporting).

This mirrors how your table already gates "reorder & distributors" at Growth. Confirm or adjust.
