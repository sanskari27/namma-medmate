
## Module 1: Authentication & User Roles — Questionnaire

### A. User Types
1. Who are all the distinct user types in your system?
MASTER (saas owner), PHARMACY (tenant) for now but these users can have subaccounts to manage their portal based on roles
like MASTER: ACCOUNTANT,SUPPORT etc PHARMACY: OWNER,PHARMACIST,CASHIER,INVENTORY,ACCOUNTANT etc 
think of more roles as well and each can can create custom roles as well which can be provided some access that specific role can access it
2. Is this a **single pharmacy** product, a **multi-branch chain**, or a **multi-tenant SaaS** (many independent pharmacy businesses using the same platform)?multi-tenant SaaS
3. Can one physical person hold multiple roles (e.g., owner who is also a pharmacist)? Should the system support multi-role assignment per user? yes
4. Will customers/patients have their own login (self-service portal/app), or are they only records managed by staff? no not for now staff of pharmacy will be doing everything on their own
5. Will doctors/prescribers have any login/portal access (e.g., to send e-prescriptions), or are they just a reference entity? currently doctors portal is not required they are just a reference entity for now

### B. Roles & Permissions
6. Do you want **fixed predefined roles** or a **fully customizable role-permission matrix** (admin can create new roles and assign granular permissions)? Yes
7. What is the permission granularity you need? Module-level (e.g., "can access Inventory") or action-level (e.g., "can view stock but not edit price" / "can create invoice but not cancel it")? module level
8. Should permissions be assignable **per branch/location** (e.g., a manager has full rights in Branch A but only view rights in Branch B)? no it should be throughout
9. Do you need approval workflows where one role's action requires another role's sign-off (e.g., stock write-off needs Owner approval, discount above X% needs Manager approval)? yes and it should be customizable
10. Should there be a role hierarchy (e.g., Owner > Branch Manager > Pharmacist > Cashier) that affects what data each level can see (their own vs. their team's vs. entire branch vs. entire org)? no role hierarcy is not required but if user has access to the branch they can see to that specific branch  
a user can have multi branch permissions as well

### C. Registration & Onboarding
11. How are staff accounts created — self-registration with admin approval, or admin creates and invites every user? admin creates every user with password himself (user can set a pin based login for themself)
so user will have option to login but if screeen has no activity for 5 mins then ui is locked and requires that pin to unlock the portal 
12. How are customer/patient accounts created — self-signup, created by staff at point of sale, or both? patients will be create from staff for now. can be using a dialog box that can be reused wherever required.
13. What mandatory fields are needed at signup for each user type (name, phone, email, pharmacy license number for pharmacists, GST/tax ID for business accounts, etc.)? name, phone,email, license no, gst_no, and few other basic but optional details 
14. Do pharmacists/staff need license/certification number verification as part of onboarding (regulatory requirement in your region)? yes it will be verifies by MASTER or some agent that have the role to verify thsi created from MASTER
15. Is there a KYC step for the pharmacy/tenant itself (business registration docs, drug license, GST certificate) before it goes live on the platform? YES while registering they will uplload all sorts of required docs that will be verified by MASTER or some agent that have the role to verify thsi created from MASTER

### D. Authentication Methods
16. Login via: Email+Password, Phone+OTP, Username+Password, or a combination? Should the user choose, or does it differ by role (e.g., staff use email/password, customers use OTP)? EMAIL + Password and if screeen has no activity for 5 mins then ui is locked and requires that pin to unlock the portal 
17. Do you need Social Login (Google/Apple) for the customer-facing side? No customer side for now
18. Do you need 2FA/MFA? If yes, mandatory for which roles (e.g., mandatory for Admin/Owner, optional for others)? NO
19. Do you need Single Sign-On (SSO) if this integrates with a larger hospital/enterprise system?  NO
20. Should there be a separate login flow/app for staff (web/POS terminal) vs customers (mobile app/web)? No customer side for now

### E. Session, Password & Security Policies
21. Password policy requirements — minimum length, complexity rules, expiry period, reuse restriction? min length 8 expiry 3 months and cannot be reused
22. Session timeout duration — should it differ by role (e.g., POS terminal auto-logout after 5 min idle, admin dashboard after 30 min)?  5 mins then ui is locked and requires that pin to unlock the portal for pharmacy and admin portal. both
23. Should the system support/restrict concurrent logins (same user logged in on multiple devices at once)? restrict and force logout the previous login
24. Forgot password/reset flow — via email link, OTP on phone, or admin-assisted reset only? user created by PHARMACY user will be updated by PHARMACY : OWNER login but the main account like MASTER and PHARMACY can reset using email password reset link
25. Do you need device/IP-based restrictions (e.g., POS login only allowed from registered store devices)? no
26. Should failed login attempts trigger account lockout? After how many attempts, and lockout duration? no

### F. Audit, Compliance & Data Access
27. Do you need a full audit trail of who logged in, when, from where, and what actions they performed (critical for pharmacy compliance)? yes
28. Are there data privacy regulations you must comply with (HIPAA, GDPR, India's DPDP Act, local pharmacy board regulations)? This affects how patient data access is logged and restricted.  Add regulation based on india only
29. Should there be "sensitive action" logging separate from general logs — e.g., every prescription dispense, controlled-substance sale, or price override gets a mandatory audit entry with user ID and timestamp? not too sensetive data but ids should be logged so that it can be tracked down
30. Do deactivated/offboarded staff accounts need to be soft-deleted (data retained for audit) rather than hard-deleted? yes soft delete

### G. Multi-Branch / Multi-Tenant Specifics
31. If multi-branch: can a user be assigned to multiple branches and switch between them after login? yes
32. If multi-tenant SaaS: is data fully isolated per tenant (separate schema/DB) or shared DB with tenant ID filtering? (This is more of a dev decision, but tell me your compliance/scale expectations so we can note it.) shared db with tenant id filtering
33. Is there a "God mode" super-admin (you, the platform owner) who can access/support any tenant's account for troubleshooting? MASTER is basically super admin that can controll everything in this saas platform, MASTER can create roles that can manage other modules as well to make tasks easy 



## Quick clarifications needed

1. **PIN unlock** — Is the PIN per-user (they set it once, works on any device) or per-device? per user works on any device. How many digits? 6. And when the screen locks with PIN, does that count as the "same session" (no forced logout of the other concurrent-login rule) or does inactivity + PIN failure eventually force a full re-login?  3 pin failes leads to log out but sucuessful pin continues the same login
2. **OWNER's own password reset** — For a PHARMACY tenant, is **OWNER** the "main account" (like MASTER is for the SaaS)? YES. If so, does OWNER reset their own password via email link (like MASTER) YES, while OWNER resets everyone *under* them (Pharmacist, Cashier, etc.) manually?YES Just confirming OWNER sits in the "main account" bucket, not the "sub-account created by admin" bucket. YES
3. **Feature/module gating by subscription plan** — Since this is multi-tenant SaaS, can MASTER restrict which *modules* a PHARMACY tenant even has access to (e.g., a "Basic" plan tenant doesn't get CRM, only ERP)? Or does every tenant get all modules and only role-permissions inside the tenant vary? Yes it will be based on plans and it can be customsized per tenant as well so that each can get their own curent set of modules
4. **Custom role creation limits** — When PHARMACY:OWNER creates a custom role, can they only grant permissions from the modules *their plan* includes, and only permissions *they themselves* have (i.e., no privilege escalation)? Confirming this is the intended guardrail. these will be based on plans
5. **Approval workflow scope** — You said approval workflows should be customizable. For Module 1's purposes, I just need to know: is the *approval workflow builder itself* a permission-controlled module (e.g., only OWNER can define "discount >10% needs approval" rules), or can any role with rights configure it? Detailed workflow rules (which actions, thresholds) we'll define in the relevant functional module (Sales, Inventory etc.) — not here. ole with rights configure it
6. **Audit log retention & visibility** — Who can *view* the audit trail — MASTER only, or can PHARMACY:OWNER see their own tenant's audit log too? Any retention period (keep logs forever, or purge after N years)? audit logs should retain for 90 days 