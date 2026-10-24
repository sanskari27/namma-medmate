# Backend delivery roadmap

This is the only status source for pharmacy backend slices. The `/api/v1` handlers, Postgres document, and screen sync are in place. B01–B15 are `done` after an independent verifier pass.

A row can be selected when it is `ready`, or `pending` with every dependency `done`. Status values are `pending`, `ready`, `in_progress`, `implemented`, `verified`, `done`, and `blocked`.

The behavior and paths for each slice are in [api-catalog.md](api-catalog.md). Do not add a route from a later slice early.

| ID | Status | Depends | Module | Acceptance |
|----|--------|---------|--------|------------|
| B01 | done | — | Session, profile, invoice settings, kiosk settings, setup | Verify replaces demo sign-in with a server session. Profile and settings reads and writes survive a new browser. Pharmacy scope is server-side. |
| B02 | done | B01 | Inventory, batches, racks, scan | Product, batch, rack, and location changes from the inventory and rack screens persist. Scan returns the same product and batch as `findScan`. |
| B03 | done | B02 | Purchases and distributors | Goods receipt updates stock once under an idempotency key. Supplier and supply-list changes match the distributors screen, including supplier deletion. |
| B04 | done | B02 | Purchase orders | Reorder creates a purchase order and can mark it received without changing stock by itself. Stock still changes through B03 goods receipt. |
| B05 | done | B02 | POS checkout and sales ledger | Checkout creates the invoice, deducts stock once, and lists it on the sales screen. Replay of the same idempotency key does not deduct again. |
| B06 | done | B05 | Online orders and kiosk | Accept, pack, scan, seal, hand over, cancel, and mark paid match the orders screen. Cancel restocks only picked quantity. Kiosk checkout follows the same stock rule. |
| B07 | done | B05 | Prescriptions | Approve, reject, and dispense match the prescriptions screen. Dispense returns the lines the POS screen loads today. |
| B08 | done | B05 | Offers and online listing | Offers, direct offers, online flags, and online prices change the same totals `computeInvoice` and `onlineOfferPrice` produce. |
| B09 | done | B05 | Customers, khata, CRM | Customer and patient lists stay derived from sales. Credit payments, patient meta, campaigns, feedback, reminders, and redemptions persist. Campaign and reminder routes do not send messages. |
| B10 | done | B01 | Expenses, employees, users | CRUD matches the three screens. User permissions are stored. Enforcement begins here for mutations introduced by this slice; older slices gain checks only when their owning slice is revised. |
| B11 | done | B01 | Subscription, bank, CA | Plan changes and bank details persist. Verification and CA share keep today's non-sending behavior. |
| B12 | done | B03, B05, B10 | Reports and exports | All 31 report IDs return the same rows as `runReport` for the same data and date range. CSV export uses the existing export helpers. |
| B13 | done | B02, B05 | Hospital wards, admissions, doctors, departments | Hospital routes reject a pharmacy session. Ward occupancy blocks deletion. Departments stay read-only. |
| B14 | done | B13 | Hospital billing, indents, claims | Issue, return, and settlement move stock or payment state once. Pricing changes require the pricing-unlock step. TPA claim status persists even though no screen calls it yet. |
| B15 | done | B01 | Support tickets | Tickets persist per pharmacy. Referrals remain the current static content. |
