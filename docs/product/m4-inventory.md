
## Module 4: ERP — Inventory & Stock Management — Questionnaire

### A. Product/Item Master
1. What fields define a product/medicine record? (name, generic name, manufacturer/brand, category — Tablet/Syrup/Injection/Device etc., composition/salt, HSN code, unit of measure, pack size, prescription-required flag, schedule classification like H/H1/X for controlled drugs, etc.)

| Field                     | Type        | Required | Description                                            |
| ------------------------- | ----------- | -------: | ------------------------------------------------------ |
| `id`                      | UUID        |      Yes | Unique product ID                                      |
| `sku`                     | String      |      Yes | Internal unique SKU                                    |
| `barcode`                 | String      |       No | Primary barcode/GTIN                                   |
| `name`                    | String      |      Yes | Commercial medicine/product name                       |
| `generic_name`            | String      |       No | Generic/non-brand name                                 |
| `brand_name`              | String      |       No | Brand/manufacturer brand                               |
| `manufacturer_id`         | UUID        |       No | Reference to manufacturer                              |
| `category_id`             | UUID        |      Yes | Medicine/product category                              |
| `dosage_form`             | Enum        |      Yes | Tablet, Capsule, Syrup, Injection, Cream, Device, etc. |
| `composition`             | JSON        |       No | Active ingredients/salts and strengths                 |
| `strength`                | String      |       No | e.g. `500 mg`, `10 mg/5 ml`                            |
| `route`                   | Enum        |       No | Oral, IV, IM, Topical, etc.                            |
| `prescription_required`   | Boolean     |      Yes | Whether prescription is required                       |
| `schedule_classification` | Enum        |       No | OTC, H, H1, X, NDPS, etc.                              |
| `hsn_code`                | String      |       No | GST/HSN classification                                 |
| `gst_rate`                | Decimal     |       No | Applicable GST rate                                    |
| `base_unit`               | Enum        |      Yes | Tablet, ml, piece, vial, strip, etc.                   |
| `pack_size`               | Decimal     |      Yes | Quantity contained in a selling pack                   |
| `pack_unit`               | Enum        |      Yes | Tablets/strips/ml/pieces/etc.                          |
| `pack_description`        | String      |       No | e.g. `10 tablets/strip`                                |
| `storage_conditions`      | String/JSON |       No | e.g. `Store below 25°C`                                |
| `requires_cold_storage`   | Boolean     |      Yes | Whether refrigeration is required                      |
| `is_active`               | Boolean     |      Yes | Whether product can be sold                            |
| `created_at`              | Timestamp   |      Yes | Creation timestamp                                     |
| `updated_at`              | Timestamp   |      Yes | Last update                                            |


product_type — Medicine / Device / Surgical / OTC / FMCG 
dosage_form — Tablet / Capsule / Syrup / Injection / etc. 
therapeutic_class 
manufacturer_id 
brand_id 
generic_id 
schedule_id 
barcode_type 
alternate_barcodes[] 
rack_location 
reorder_level 
reorder_quantity 
minimum_stock 
maximum_stock 
is_discontinued 
is_returnable 
is_taxable 
tax_category 
requires_batch_tracking 
requires_expiry_tracking 
requires_serial_tracking — especially for devices 
controlled_substance — preferably derived from regulatory classification 
notes

2. Do you need a **master/shared product catalog** (common medicine database MASTER maintains, so tenants just pick from it) alongside tenant-specific custom products, or is every product created independently per tenant? no
3. Should products support **multiple units** with conversion (e.g., a strip has 10 tablets, a box has 10 strips — sell as strip or as individual tablet)? yes
4. Do you need barcode/QR generation & scanning support for products?no 

### B. Batch & Expiry
5. Is stock tracked at **batch level** (batch no., mfg date, expiry date, batch-specific purchase price) — I'm assuming yes since your plan table explicitly says "batches & expiry"? YES 
6. What's the expiry alert workflow — e.g., auto-flag items expiring within X days (customizable), and should near-expiry stock be blocked from sale, warned-but-allowed, or require approval to sell? warned-but-allowed
7. Stock issuing logic — FEFO (First-Expiry-First-Out) or FIFO (First-In-First-Out) by default? FEFO but while product selection billing agent will select witch batch they are billing

### C. Stock Levels & Alerts
8. Do you need reorder-level/minimum-stock-level configuration per product per branch, triggering low-stock alerts? yes reordering will generate a csv report of whats needs to be reorder then pharmacist can manually order them
9. Should there be a **max stock level** too (to flag overstocking)? no
10. Do you need stock valuation methods (Weighted Average, FIFO cost, etc.) for accounting purposes, or just simple purchase-price-based valuation? no

### D. Stock Adjustments
11. What types of stock adjustments do you need — damage/breakage write-off, expiry write-off, theft/loss, physical-count correction, sample/free-goods removal? Should each require an approval workflow (ties back to Module 1's customizable approvals)? yes 
12. Do you need periodic **stock-take / physical audit** functionality where staff counts physical stock and system reconciles vs. book stock? owner can request to do so but not necessary

### E. Purchases → Inventory Link
13. When goods are received (goods-inward, from your plan table), does that directly create the batch entry, or is there a separate "Purchase Order → Goods Receipt → Quality Check → Stock-in" flow?  its separate Purchase Order → Goods Receipt → Quality Check → Stock-in flow
14. Do you need to handle **partial deliveries** (ordered 100 units, received 60, rest pending)? yes
15. Do you need purchase returns to supplier (e.g., damaged/expired stock sent back), and should that reduce stock immediately? yes

### F. Controlled Substances / Regulatory
16. For Schedule H/H1/X (controlled/narcotic) drugs, do you need special handling — e.g., mandatory prescription attachment before sale, separate register/log, restricted role access (only Pharmacist can dispense, not Cashier)? yes 
17. Do you need any government-mandated stock reporting (e.g., narcotics register maintained for drug inspector audits)? yes

### G. Multi-Branch Inventory
18. Confirmed from Module 2 — inter-branch transfer needs receiving-branch confirmation. For this module: does a transfer request need to be **initiated** only by Inventory-role/OWNER at the sending branch, or can the receiving branch also **request** stock from another branch (pull request)? both options are viable
19. Should low-stock alerts suggest "available at Branch X, transfer from there" automatically? yes

### H. Plan-based Feature Gating
20. Since Free plan already includes "inventory, batches & expiry, purchases & goods-inward" — what inventory features (if any) are Growth/Pro exclusive? (e.g., is multi-branch inventory itself Growth+, or is it available even on Free/Starter for a single branch?) Not sure 




## ⚠️ One inconsistency to flag

You said **"no"** to barcode/QR generation & scanning support (Q4), but your own product field list includes `barcode`, `barcode_type`, and `alternate_barcodes[]`. Please clarify: do you mean **no barcode scanning at billing/POS** (i.e., staff searches products manually by name), while barcode is still stored just as a *data field* for reference/future use? Or should I strip barcode fields out entirely for now? My assumption going forward (unless corrected): **store barcode as a data field, but no scan-to-search/scan-to-bill functionality in this phase** — flag if wrong. remove barcode flags 

**Plan gating proposal** (since you said "not sure"): Since Module 2 locked Free/Starter at 1 branch and Growth+ at 3+/unlimited branches, **multi-branch inventory & inter-branch transfer becomes naturally Growth+ exclusive** (single-branch tenants don't need it anyway). Reorder CSV export, batch/expiry tracking, and stock adjustments stay available on all plans including Free, per your table. Confirm this is fine. Ok lets continue with that 