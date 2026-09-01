
## ✅ Module 7: Prescription & Regulatory Compliance — LOCKED (Phase 1 scope)

- **License/document expiry tracking**: Tenant/branch-level (drug license, GST cert, FSSAI) and individual staff (Pharmacist) registrations both tracked with expiry alerts. Notifications go to **both OWNER and MASTER**.
- **Controlled substance register**: Auto-populated from sales (product, batch, qty dispensed, prescription ref, patient details, dispensing pharmacist, date/time). Exportable in **government-prescribed NDPS format + general Excel**.
- **Standalone prescription repository**: **Deferred to Phase 2.** Phase 1 keeps prescription handling as-locked in Module 6 — a manual "verified" checkbox + reference tied to the sale itself, no pre-sale prescription entry/tracking.
- **Auto-archive**: Fulfilled/expired prescription references auto-archive (validity period configurable, default suggestion: 6 months).
- **Compliance dashboard**: Dedicated section, separate from general business reports (Module 10), for one-click regulatory exports.
- **Phase 1 reports (Bucket A — views/exports on existing data only)**:
  - Schedule H1 Sale Register
  - Purchase Register
  - Purchase Invoice/Cash Memo Records
  - Supplier Drug License Records
  - Drug License Renewal/Expiry Records
  - Controlled/Restricted Drug Stock Register
  - Batch-wise Stock Register
  - Expired Medicine Register
  - Damaged Medicine Register
  - Drug Return-to-Supplier Records
  - Stock Adjustment/Stock Loss Records
  - Stock Verification/Physical Inventory Records (only if OWNER-initiated stock-take was run, per Module 4)
  - Expiry/Near-Expiry Reports
  - Batch Traceability Reports
  - Supplier-wise Purchase Reports
  - Product-wise Purchase/Sale Traceability Reports
- **Phase 2 — deferred (Bucket B, new workflows required)**:
  - Cold-Chain Temperature Logs + Refrigerator Maintenance Logs + Temperature Excursion Records
  - Medicine Quarantine Records + Returned-Medicine Quarantine
  - Suspected Counterfeit/Spurious Drug Records
  - Adverse Drug Reaction Records
  - Drug Wastage/Destruction Register (formal workflow — basic write-off already covered in Module 4's stock adjustments)
  - Recall/Product Withdrawal Records + Product Recall Notifications
  - Pharmacist Duty/Supervision Records (roster)
  - Regulatory Inspection/Audit Records, License Inspection Records, Compliance Incident Records
  - Schedule X Prescription Register/Archive (depends on standalone prescription repository — deferred with it)
- **Access**: OWNER by default; other roles (Pharmacist, Accountant, etc.) can be permissioned to view/export specific registers via Module 1's module-level role permissions.

---