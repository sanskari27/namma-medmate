// Copy for the pharmacy partner page. Source of truth: the founder's partner site
// (namma-medmate.netlify.app/namma, reviewed 2026-10-04). Unverified figures from that page
// (partner counts, testimonials, projected uplift, pin-code counts, third-party logos) are left out on purpose.

export const HERO_CHECKS = ["You set your own prices", "Your brand, your customers", "First 3 months free", "Delivery launching soon"];

export const DEVICES: [string, string][] = [["briefcase", "Desktop ERP"], ["card", "Tablet counter"], ["phone", "Phone on the move"], ["refill", "Realtime sync"]];

/** [icon, title, text, status] — status "soon" shows a Coming soon tag. */
export const PILLARS: [string, string, string, "soon" | "live"][] = [
  ["store", "Your digital storefront", "Your exact shop on the MedMate app: your name, your pricing, your brand. Nearby patients discover you and order online, and every customer stays yours.", "soon"],
  ["scooter", "10-minute delivery", "Ultra-fast local delivery through the shared MedMate rider network, or your own staff, with live tracking and OTP handover. Beat the dark stores without building a fleet.", "soon"],
  ["steth", "“Our Doctor, Your Medicine”", "Built-in teleconsultations for customers who need one: a registered doctor consults in the app and decides independently, and any prescription can be filled at your counter.", "soon"],
  ["card", "Unified ERP & POS", "Ring up walk-ins and online orders on one screen: fast GST billing, FEFO live inventory, batch and expiry alerts, purchases and one-tap distributor reorders.", "live"],
  ["user", "CRM, loyalty & khata", "Every sale becomes a relationship: patients and prescriptions on file, refill reminders, WhatsApp marketing, and credit khata for hospitals, wards and regulars.", "live"],
  ["percent", "Owner dashboard & insights", "Today’s sales, online-vs-counter split, top categories and stock-expiry alerts: the numbers to grow orders and cut wastage, on any device.", "live"],
];

export const TOOLKIT: [string, string, string][] = [
  ["card", "GST billing & POS", "Fast counter billing with correct CGST/SGST splits, printable and shareable invoices, and loose-strip selling."],
  ["box", "Inventory & stock alerts", "Batch-wise stock with FEFO dispensing. Near-expiry batches and low-stock items are flagged in advance, so nothing lapses or runs out."],
  ["bag", "Purchases & goods inward", "Enter a distributor bill and stock updates itself; input GST credit is tracked automatically."],
  ["refill", "Auto reorder & POs", "Low-stock lists grouped by distributor: review and send purchase orders in a couple of clicks."],
  ["pin", "Rack & bin locations", "Map every medicine to a shelf code, so staff read it on screen and walk straight to the spot."],
  ["tag", "Barcode & batch billing", "Scan a strip to pick the exact batch: accurate expiry, pricing and stock deduction every time."],
  ["percent", "Reports & GST filing", "Sales, profit, dead stock and a ready GST P&L, shared straight to your CA or accountant."],
  ["rx-doc", "Prescription queue", "Receive, verify and dispense e-prescriptions with a compliant Schedule H workflow."],
  ["heart", "Hospital & ward module", "Wards, admissions, bed maps and bill-to-hospital credit, for pharmacies inside hospitals."],
];

export const STEPS: [string, string, string][] = [
  ["phone", "Book a free demo", "A 20-minute WhatsApp or on-site walkthrough. We map your shop, stock and billing needs."],
  ["box", "We set you up", "Your catalogue, GST details and staff logins go live in about 7 days. We migrate your existing data."],
  ["card", "Go live on the console", "Billing, inventory, CRM and credit switch on from day one. Your online store and delivery go live the day we launch in Bengaluru, so you are ready first."],
  ["percent", "Grow with insights", "Reorder smarter, cut expiry losses and win repeat patients with reminders and offers."],
];

/** Comparison: 1 = yes, 0 = no, 0.5 = partly, "soon" = coming soon. Columns: paper register, generic software, e-pharmacy / dark store, MedMate. */
export type Cell = 1 | 0 | 0.5 | "soon";
export const COMPARE_COLS = ["Paper register", "Generic pharmacy software", "E-pharmacy or dark store", "MedMate"];
export const COMPARE: [string, Cell, Cell, Cell, Cell][] = [
  ["Fast GST billing & POS", 0, 1, 0, 1],
  ["Live inventory with expiry and restock alerts", 0, 0.5, 0, 1],
  ["Your own storefront and brand online", 0, 0, 0, "soon"],
  ["10-minute delivery from a shop nearby", 0, 0, 0.5, "soon"],
  ["“Our Doctor, Your Medicine” teleconsultations", 0, 0, 0, "soon"],
  ["Your customers stay yours", 1, 1, 0, 1],
  ["Customer CRM, refills and loyalty", 0, 0.5, 0, 1],
  ["One console for walk-in and online orders", 0, 0.5, 0, 1],
];

export type Plan = { name: string; price: number; line: string; plus?: string; features: string[]; popular?: boolean };
export const PLANS: Plan[] = [
  { name: "Essential", price: 299, line: "Your shop, online: the essentials, done right.", features: ["Business dashboard", "Billing & GST invoices", "Sales history", "Inventory with expiry and restock alerts", "Purchase entry", "Online store (at launch)", "2 user logins"] },
  { name: "Care", price: 499, line: "Keep every patient close.", plus: "Essential", features: ["Prescriptions & customers", "Credit khata", "WhatsApp reminders & invoices", "Email support", "Up to 2 user logins"] },
  { name: "Growth", price: 999, line: "Run and grow like a pro.", plus: "Care", popular: true, features: ["Reports & insights", "CRM & CA sharing", "Reorder & distributors", "Up to 3 user logins"] },
  { name: "Flagship", price: 1499, line: "The complete pharmacy, front to back.", plus: "Growth", features: ["Hospital billing & ward indents", "Self-order kiosk", "Rack & location", "Priority support", "3 to 4 user logins"] },
];

export const ECOSYSTEM: [string, string, string, "Live" | "Rolling out" | "Coming soon"][] = [
  ["box", "Distributor & pharma catalogues", "Live product masters, MRP, pack sizes and HSN codes from distributors and manufacturers, so you never key in a medicine by hand.", "Rolling out"],
  ["shield", "Insurance & cashless claims", "Claim-ready invoices and cashless billing for government health schemes and private insurers, so patients pay less and you are reimbursed faster.", "Coming soon"],
  ["upi", "Payments & UPI", "Take UPI, cards and cash at the counter, reconciled automatically into the day’s sales, with online collection ready for your store.", "Live"],
  ["id", "Compliance & data safety", "GST-ready invoicing, a Schedule H workflow, daily encrypted backups and role-based access. Your records are yours to export any time.", "Live"],
];

export const FAQS: [string, string][] = [
  ["How long does setup take?", "Most pharmacies are live in about 7 days. We migrate your existing stock, distributor list and GST details, then train your staff on WhatsApp or on-site."],
  ["Do I need to buy new hardware?", "No. The console runs on any laptop, tablet or phone you already have: desktop for the full ERP, tablet at the counter, phone on the move. A basic thermal printer is all you need for bills."],
  ["How much does the Partner console cost?", "Plans start at ₹299 a month (Essential) and go up to ₹1,499 a month (Flagship). Every plan is free for the first 3 months, with no setup fee and no lock-in. Pharmacies with two or more branches get a custom quote."],
  ["Is my data safe and GST-compliant?", "Yes. Invoices are GST-ready, data is encrypted and backed up daily, and you can export everything any time. We are working towards ISO 27001 and DPDP Act compliance."],
  ["Can I keep my current suppliers?", "Yes. The console manages purchases, batches and reorders with your existing distributors, with one-tap reorder when stock runs low."],
  ["How does the online store work?", "Your online store is part of every plan and is launching soon in Bengaluru. Set up the console now and your shop goes live online the day it opens. Orders come straight to your counter at your prices, and every customer stays yours. We walk you through how online orders work in your free demo."],
  ["How does delivery work?", "Delivery is coming soon. When it launches you can assign your own staff or use the shared MedMate rider network, with live tracking and OTP handover on every order, typically to the door in about 30 minutes."],
  ["Which areas do you cover?", "We are onboarding chemists across Bengaluru: south, east, north, west, central and greater Bengaluru, and expanding across Karnataka. Book a demo and we will tell you your area’s status."],
];
