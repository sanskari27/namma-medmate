# UX behavior — journeys

**Date:** 2026-09-15  
Grouped by persona. Convenient vs actual vs smallest fix. Owner decision only when marked.

---

## Open till (cashier)

| Convenient | Actual | Hurt | Fix | Decision? |
|---|---|---|---|---|
| Land on till or cashier desk | default desk (Till today) | cashier | `home` opens default desk | no |
| Find medicine → Enter adds | Search filters only | cashier | Enter first hit; focus barcode after add | no |
| FEFO selected + near-expiry warn | Preselect yes; empty batch option; quiet suffix | cashier | Drop empty option; banner | no |
| See khata left / Use points | Neither | cashier | load credit on pick; Use points | no |
| Allergy warn + reason | Charge with no check | patient | evaluate + assertCleared | no |
| Save then Collect mixed tender | Proceed → one-mode Charge | cashier | restore amounts or document rewrite | **stories vs rewrite** |
| Print then New bill | No print; Back PATCHes COMPLETED | cashier | receipt step + `newSale` | no |
| Rail is till-only | Full ERP; extra 403s | cashier | filter nav by modules | no |

## Refill / CRM day (pharmacist / OWNER)

| Convenient | Actual | Fix |
|---|---|---|
| Patient file: family, refill, tags, merge | Directory opens CRM ops (merge, family, refill, tags, loyalty, khata) | Band 4 |
| Merge shows what moves | EXECUTE repoints sales/khata/loyalty/history/refill/tags/family | Band 4 |
| Due refill on till | Due strip on Customers + till | Band 4 |
| Rx remaining | Unused API | dispatch fulfillment |
| NDPS sale vs stock book | Nav: Register book / NDPS sale book / Schedule stock book | Band 4 |

## Month-end CA (accountant / OWNER)

| Convenient | Actual | Fix |
|---|---|---|
| Aging 0–30…90+ FIFO | Server buckets on the strip; CSV uses remaining + oldest bucket | Band 3 |
| Expense GST honest | Card: “GST in spend (inclusive)” | Band 3 |
| P&L shop profit | Taxable revenue (subtotal − returns) | Band 3 |
| Share pack with CA | Download PDF pack; GST toggle off when Growth sections omitted | Band 3 |
| Posted spend safe | Confirm before delete; evidence stays local; all-outlets pick outlet | Band 3 |

## Restock day (OWNER / inventory)

| Convenient | Actual | Fix |
|---|---|---|
| Home low stock → Guidance | Restock / Reorder → `/inventory?view=guidance` | Band 4 |
| Draft PO from reorder | Draft from this outlet reorder + PLAN_LIMIT | Band 3 |
| Partial challan | Record delivery outstanding | Band 3 |
| QC from Purchases pending | deep-link QC | Band 3 |
| Debit note after reject | keep outcome + open DN | Band 3 |

## KYC morning (MASTER / VA)

| Convenient | Actual | Fix |
|---|---|---|
| Home shows KYC pending | Pulse cards from tenant/KYC/subscription lists | Band 4 |
| Open evidence | Raw API URL 401 on split hosts | blob fetch |
| Who reviews | Generic “review” | name HQ VA/MASTER |
| Enter support from pharmacy row | Must know email; then HQ 403 | Enter as OWNER + keep MASTER chrome |
| Workflow desks gate tills | Platform rule fallback at POS | FIXED `M1-WF-001` |

## Plan / subscription

| Convenient | Actual | Decision? |
|---|---|---|
| Expired plan locks floor | Override + daily job lock ACTIVE tenant | FIXED `M2-LIFE-001` |
| Pending payment distinct | Same copy as abandon; second checkout | PENDING copy + reuse key |
| Free card | Hidden “Monthly billing” on FREE | Band 4 |
| Near-expiry register on Free | Starter gate leaked into COMPLIANCE | remove D-005 from compliance |

## UX-vs-CONTRACT (do not “fix” by inventing product)

| ID | Conflict | Owner needed |
|---|---|---|
| Orders Online filter | D-008 Phase 2 store | hide Online or name kiosk |
| Kiosk `onlineListed` | D-008 | filter on-hand only |
| Inventory Online toggle | D-008 | hide/rename |
| Home Online = 0 | D-008 | drop channel |
| QC OWNER allowed | story pharmacist-only | DECISIONS |
| PIN enroll “signs out” | D-015 | copy only |
| Story S10-AC04b | D-015 wins | doc edit |
| M2-S07 story still blocked_by D-009 | runtime built | human rewrite ACs |
| POS rewrite vs M6 ACs | till is a new product | restore **or** amend stories |
