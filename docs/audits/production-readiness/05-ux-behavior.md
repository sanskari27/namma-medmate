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
| Patient file: family, refill, tags, merge | Directory + repay only | remount existing dialogs |
| Merge shows what moves | Notifications only on server | repoint ledgers |
| Due refill on till | No UI; WhatsApp job may spam | restore due strip |
| Rx remaining | Unused API | dispatch fulfillment |
| NDPS sale vs stock book | Two “NDPS sheet” | rename |

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
| Home low stock → Guidance | Lands on Stock overview | `?view=guidance` |
| Draft PO from reorder | CSV only | remount Growth draft |
| Partial challan | Always 100% new PO | Record delivery outstanding |
| QC from Purchases pending | Hunt Inventory tab | deep-link QC |
| Debit note after reject | Flash then hunt Returns tab | keep outcome + open DN |

## KYC morning (MASTER / VA)

| Convenient | Actual | Fix |
|---|---|---|
| Home shows KYC pending | Em-dash KPIs | wire list counts |
| Open evidence | Raw API URL 401 on split hosts | blob fetch |
| Who reviews | Generic “review” | name HQ VA/MASTER |
| Enter support from pharmacy row | Must know email; then HQ 403 | Enter as OWNER + keep MASTER chrome |
| Workflow desks gate tills | Platform rule fallback at POS | FIXED `M1-WF-001` |

## Plan / subscription

| Convenient | Actual | Decision? |
|---|---|---|
| Expired plan locks floor | Override + daily job lock ACTIVE tenant | FIXED `M2-LIFE-001` |
| Pending payment distinct | Same copy as abandon; second checkout | PENDING copy + reuse key |
| Free card | “Monthly billing” | copy |
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
