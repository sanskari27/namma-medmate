
## Module 11: Integrations — Questionnaire

We've flagged several "future integration" points already (payment gateway, e-invoicing/IRN, WhatsApp Business API). Let's consolidate everything integration-related in one place.

### A. Payments
1. Confirmed from Module 6 — no payment gateway in Phase 1 (manual mode selection). For **when** it's added later, do you have a preferred gateway in mind (Razorpay, PayU, Cashfree — common for Indian SaaS), or TBD? Cashfree but in future. implement cashfree for Tenenat subscriptions for now
2. Is this just for **customer-facing bill payment** (UPI/card at POS), or do you also need it for **tenant subscription billing** (charging the PHARMACY tenant their monthly/annual SaaS fee)? These could use different gateways/flows. Add cashfree for tenant subscription billing for now will extend to customer facing bill payments in future

### B. Government/Regulatory Integrations
3. Confirmed — GST e-invoicing/IRN generation is in scope (Module 6). Do you want this as a **direct government GSP (GST Suvidha Provider) API integration**, or via a **third-party e-invoicing API** (e.g., ClearTax, Vayana) that handles GSP complexity for you? Skip it for now will integrate API later
4. Any other government system integration anticipated — e.g., direct GSTR filing, DIGIPHARMACIST/state drug-license verification portals, Ayushman Bharat Digital Mission (ABDM) health ID linkage? Will be integrated in phase 2

### C. Communication
5. Confirmed — Meta WhatsApp Cloud API directly (Module 10). Any need for SMS as a fallback channel (e.g., if WhatsApp delivery fails, or for OTP-like transactional alerts), or WhatsApp-only stays firm? Whatsapp only

### D. Third-Party Business Tools
6. Any accounting software export/integration beyond the CA-PDF (Module 8) planned for later — Tally, Zoho Books, QuickBooks? Not now
7. Do you need e-commerce/online store integration? (Your Growth plan mentions "online store, orders" — is this a **built-in storefront module** we need to spec separately, or integration with an external platform like Shopify/WooCommerce?) We will have owr own ecommer in phase 2

### E. Labs/Insurance/TPA
8. Any lab integration needed (e.g., pharmacy also handles diagnostic test bookings/reports)? No
9. Any insurance/TPA (Third Party Administrator) integration for cashless/insurance-covered medicine purchases? No

### F. Infrastructure-Level
10. Do you need SMS/Email OTP infra for anything **outside** customer comms — e.g., is email used anywhere for system-level transactional mail (password reset links, invoice copies to customer email if provided)? use resend for mail sending 