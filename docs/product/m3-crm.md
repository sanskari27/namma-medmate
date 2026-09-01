## Module 3: CRM — Customer/Patient Management — Questionnaire

While you think through Module 2's open points, here's Module 3 to review in parallel.

### A. Customer Record & Identity
1. What fields define a customer record? (name, phone — is phone the unique identifier/dedup key across a branch or across the whole tenant? — email, DOB, gender, address, blood group, allergies, chronic conditions, etc.) yes these values are enough for now 
2. Is a customer record scoped to a **single branch** or shared **tenant-wide** (i.e., if the same person buys at Branch A and Branch B, is it one unified record or two)? shared tenant-wide
3. Do you need duplicate-detection/merge (e.g., system flags "a customer with this phone already exists")? yes
4. Do you need family/dependent linking (e.g., a customer profile with linked family members whose purchases/prescriptions roll up under one account, common in pharmacy CRM for repeat medication tracking)? yes

### B. Prescription & Medical History Linkage
5. Should each customer have a running prescription history tied to their profile (auto-attached whenever a prescription-based sale happens), viewable at next visit? yes and it can be checked in portal easily
6. Do you need to store known allergies/drug interactions per customer and get a warning at billing time if a dispensed medicine conflicts? yes
7. Should the system support recurring/refill reminders (e.g., "customer usually refills this medicine every 30 days" → auto reminder to staff or customer via SMS)? yes and it can be customized

### C. Loyalty, Credit & Engagement
8. Do you need a loyalty points system (Growth plan mentions CRM — should points be earned per purchase and redeemable)? yes
9. You mentioned "credit/Khata ledger" in the Starter plan — please confirm: this is store credit where a customer buys on credit and pays later, tracked per customer, with a running balance and payment history?yes and can be family wide as well so that credit store remains clean
10. Any credit limit enforcement per customer (block sale if outstanding balance exceeds X)? it can be customized by OWNER
11. Do you need customer segmentation/tagging for marketing (e.g., "diabetic patients", "senior citizens", "high-value customers") to enable targeted campaigns? yes

### D. Communication
12. What channels for customer communication — SMS, WhatsApp, Email, or all three? (This ties into Module 11 — Notifications — but I need to know if CRM triggers these from customer-side events like refill due, credit due, birthday, etc.) FOR now communication will be based on whatsapp only
13. Do you need campaign/broadcast messaging (e.g., send a promo to all customers tagged "diabetic" about a new diabetes-care product)? yes it can be created based on  role created by owner to do so

### E. CRM ↔ Sales/Doctor linkage
14. Growth plan mentions "CRM & CA sharing" — could you clarify what "CA sharing" means here? (Chartered Accountant data sharing? Something else?) Chartered Accountant data sharing a report that can be directly shared to ca that will have all the details in a pdf segmented grough and organized so that their work becomes easy as well
15. Since doctors are reference-only entities (per Module 1), should a customer's purchase/prescription record link to a referring doctor, mainly for reporting purposes (e.g., "which doctor's patients buy the most")? yes for now keep them for reference only will further can be extended as a user if required 

## ⚠️ Two things to flag before locking

1. **Family-wide credit limit** — You said credit/Khata can be family-wide "so credit stays clean," and separately that credit limits are OWNER-customizable per customer. Please confirm: when linked as a family, is there **one shared credit limit** for the whole family group (any member's purchase eats into the same pool), or does each individual still have their own limit and "family-wide" just means they can view/pay off each other's dues collectively? This changes the ledger schema. it will be one shared credit limit for all the members limit will be set by owner, although individual still have their own limit 
2. **Branch limits : **Free: 1 branch, Starter: 2 branch, Growth: 3 branches, Pro: 5.** can be customized by MASTER as well