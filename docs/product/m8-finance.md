## Module 8: Finance & Accounting — Questionnaire

### A. Scope & Boundaries
1. Is this module a **full accounting system** (ledgers, journal entries, chart of accounts, trial balance, P&L, balance sheet) — or a **lighter finance layer** on top of Sales/Procurement (cash flow, expense tracking, day-book, sales/purchase summaries) that then **exports to external accounting software** (e.g., Tally, Zoho Books) or the CA (per Module 3's "CA sharing" PDF)? lighter finance layer on top of Sales/Procurement
2. Do you already have a target integration in mind (Tally, Zoho Books, QuickBooks, GST portal directly), or is CA-shared PDF the only output channel for now? CA-shared PDF the only output channel for now

### B. Day-to-Day Cash/Register Management
3. Do you need **cash register/drawer management** — opening balance at shift start, expected vs. actual cash at shift end (cash-up/reconciliation), denomination-wise counting? no
4. Is this tracked **per staff shift** (each cashier's session) or **per branch per day** (one combined drawer)? 

### C. Expenses
5. Do you need **expense tracking** (rent, electricity, salaries, misc. purchases not tied to inventory) with categories, so P&L can be more complete? yes basic tracking can be added as well
6. Who can record expenses, and do expenses above a threshold need approval (ties to Module 1's workflow engine)? Accountant role can record 

### D. Payables & Receivables (Consolidated View)
7. Modules 3 (customer credit) and 5 (supplier payables) already track their own ledgers — do you need a **consolidated Accounts Receivable / Accounts Payable dashboard** here that rolls both up (total owed to us, total we owe suppliers, aging analysis — 0-30/30-60/60-90 days overdue)?  Yes

### E. Reports
8. What core financial reports do you need at minimum for Phase 1 — Day Book, Sales Summary, Purchase Summary, GST Summary (for GST return filing prep), Profit & Loss (simple, revenue - COGS - expenses)? Anything else?  these are fine. you can add more records if it seems appropriate
9. Do these reports need to be filterable/exportable per branch and consolidated across the tenant, per Module 2's OWNER-sees-all rule? branch wise

### F. GST & Statutory
10. Do you need GST return-prep reports (GSTR-1 sales summary, GSTR-3B style summary) generated from invoice data, or is that fully external (handled by CA using the exported data)? Generate from invoice data 
11. Any TDS (Tax Deducted at Source) handling needed, e.g., on supplier payments above a threshold, or is that out of scope for Phase 1? Out of scopr

### G. Access & Roles
12. Which roles access this module — Accountant + OWNER only, or broader? Should Cashier see only their own register/shift data, not full financial reports? Yes