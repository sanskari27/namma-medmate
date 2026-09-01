## Module 6: ERP — Sales / POS / Billing — Questionnaire

This is the highest-traffic module (every staff member touches it daily), so let's be precise.

### A. Billing/Invoice Basics
1. What does a standard sale invoice contain? (customer link, branch, billing staff, itemized products with batch selected, quantity, MRP, discount, GST breakup, payment mode, invoice number format, etc.) add more if you think it should be there 
* Invoice ID
* Invoice Number
* Invoice Date & Time
* Customer ID
* Customer Name
* Customer Phone
* Branch ID
* Billing Staff ID
* Register / POS Terminal ID
* Invoice Type
* Sale Type
* Itemized Products
* Product ID
* Batch ID
* Batch Number
* Expiry Date
* Quantity
* Unit of Measure
* MRP
* Selling Price
* Discount
* Taxable Amount
* GST Rate
* CGST
* SGST
* IGST
* GST Amount
* Line Total
* Subtotal
* Total Discount
* Total Taxable Amount
* Total GST
* Round-off
* Grand Total
* Payment Mode
* Payment Reference / Transaction ID
* Amount Paid
* Amount Due
* Change Returned
* Credit / Due Terms
* Prescription Reference
* Doctor Reference
* Notes
* Invoice Status
* Cancellation / Return Status
* Created At
* Updated At


2. What's your **invoice numbering** scheme — sequential per branch, sequential per tenant, financial-year-based reset (common in India, e.g., `INV/2025-26/BR01/00001`)? its good
3. Can an invoice have **mixed payment modes** in one transaction (e.g., ₹500 cash + ₹300 UPI + rest on credit/Khata)? yes
4. Do you need **hold/park invoice** functionality (cashier starts a bill, customer steps away, bill is parked and resumed later without losing progress)? yes
5. Is walk-in (no customer record) billing allowed, or must every sale be linked to a customer profile? walk in is allowded but will be asked to provide customer details but can be skipped as well

### B. Prescription-Linked Sales
6. For prescription-required medicines, does the cashier/pharmacist need to **attach/scan the prescription** (photo upload) before completing that line item's sale, or is it just a manual "prescription verified" checkbox?  just a manual "prescription verified" checkbox for now keep scope of photo upload and other in future as well
7. Can a single prescription be used across multiple visits (e.g., a 3-month prescription, partially fulfilled each month), requiring the system to track remaining quantity per prescription?  yes will be manually verified for now

### C. Pricing, Discounts & Tax
8. Confirmed from Module 1 — discount approval workflows are customizable. For this module: is discount applied per line-item, on total bill, or both? BOTH. Percentage-based, flat amount, or both?  BOTH
9. GST calculation — is it computed per product's own tax_category/HSN (from Module 4's product master), or manually adjustable at billing time?calculated automatically but can be adjusted at billing as wll
10. Do you need scheme/offer support (e.g., "Buy 2 Get 1 Free," seasonal discounts, bundle pricing)? Yes

### D. Payment Handling
11. What payment modes do you need — Cash, Card, UPI, Credit/Khata, Bank Transfer, others? that whould be wnough
12. Do you need payment gateway integration for card/UPI (auto-reconciliation), or is it manually marked as "paid via UPI" by staff (reconciled outside the system for now)? No payment gateway for now cashier will simply select the option for now we will be integrating in future 
13. For Credit/Khata sales — does it deduct from the customer's credit limit immediately, and is there a separate "settle credit" flow when the customer later pays off their due? yes

### E. Returns & Refunds
14. Do you need sales return/refund functionality (customer returns medicine)? YES. What triggers eligibility (time window, unopened packaging, prescription-only items non-returnable)? manually done
15. Does a sales return restock the item (back to inventory) or is it written off (common for medicines due to safety regulations)? Yes 
16. Refund modes — cash refund, credit note (adjustable against future purchase), or original payment mode reversal? cash refund, credit note 

### F. Invoice Output & Compliance
17. Do you need print-formatted invoices (thermal POS printer, 2-3 inch) alongside/instead of standard A4 PDF invoices? i need standard a4 pdf invoices
18. Any mandatory fields on the printed invoice for Indian pharmacy compliance (pharmacist name/registration no., drug license no., GSTIN, etc.)? 
* Pharmacy / Business Legal Name
* Pharmacy Address
* Pharmacy Phone / Contact
* GSTIN
* PAN
* Drug License Number
* Drug License Type / Details
* Invoice Number
* Invoice Date & Time
* Customer Name
* Customer Address — where applicable
* Customer GSTIN — for registered customers, where applicable
* Product / Medicine Name
* Batch Number
* Expiry Date
* Quantity
* Unit / Pack Size
* MRP
* Sale Price
* Discount
* HSN Code
* GST Rate
* CGST Amount
* SGST Amount
* IGST Amount — where applicable
* Total Taxable Value
* Total Invoice Value
* Payment Mode
* Prescription Number / Reference — where applicable
* Doctor Name / Registration Number — where applicable
* **Pharmacist Name**
* **Pharmacist Registration Number**
* Pharmacy / Pharmacist signature or authentication — where applicable
* Schedule / controlled-drug information — where applicable
* Return / refund terms
* Computer-generated invoice declaration, where applicable

19. Do you need e-invoice generation (GST e-invoicing/IRN) if turnover crosses the government threshold, or is that out of scope for now? yes 

### G. Offline/Connectivity
20. POS/billing is the most critical daily-use screen — do you need **offline mode** (billing continues if internet drops, syncs when back online), or is always-online assumed? lets continue with online only, if online it will show a full screen overlay till internet is back active