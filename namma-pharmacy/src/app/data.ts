// ══════════════════════════════════════════════════════════════
// Namma MedMate — Pharmacist Dashboard data model
// Inventory · batches · GST billing · online+offline sales · Rx
// ══════════════════════════════════════════════════════════════

export const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");
export const inr2 = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── drug schedule (regulatory) ──────────────────────────────────
// OTC = over-the-counter, H/H1 = prescription-only (H1 = extra register),
// X = highly regulated (psychotropics etc.)
export type Schedule = "OTC" | "H" | "H1" | "X";
export const SCHEDULE_META: Record<Schedule, { label: string; rx: boolean; note: string }> = {
  OTC: { label: "OTC", rx: false, note: "Over the counter — no prescription needed" },
  H:   { label: "Sch. H", rx: true, note: "Prescription required" },
  H1:  { label: "Sch. H1", rx: true, note: "Prescription + H1 register entry" },
  X:   { label: "Sch. X", rx: true, note: "Highly regulated — duplicate Rx & register" },
};

export type DosageForm = "Tablet" | "Capsule" | "Syrup" | "Drops" | "Injection" | "Cream" | "Device" | "Other";

// A purchased lot of a product. Stock & expiry are tracked per batch.
export type Batch = {
  batchNo: string;
  expiry: string;      // "YYYY-MM"
  qty: number;         // units in this batch
  mrp: number;         // printed MRP (GST-inclusive)
  ptr: number;         // price-to-retailer (cost)
};

export type InvProduct = {
  id: string;
  name: string;
  composition: string;     // salt / molecule
  manufacturer: string;
  form: DosageForm;
  pack: string;            // "Strip of 15 tablets"
  category: string;        // category key (see CATEGORIES)
  hsn: string;             // HSN code for GST
  gst: number;             // GST % (0 / 5 / 12 / 18)
  schedule: Schedule;
  rack: string;            // primary rack/bin location code (e.g. "A3-12") — matches the physical label
  rackAlt?: string;        // optional 2nd slot for overflow / bulk stock
  reorderLevel: number;    // low-stock threshold (units)
  online: boolean;         // visible on the customer app/site
  onlinePrice?: number;    // optional online selling price override (else MRP)
  offerId?: string;        // applied offer (online)
  supplierId?: string;     // allotted distributor for reordering
  looseAllowed?: boolean;  // owner's choice: allow per-tablet/loose selling (default on for eligible)
  looseUnits?: number;     // opened loose tablets/capsules currently in stock (from a broken strip)
  emoji: string;
  image?: string;          // product photo (data URL) — falls back to emoji
  batches: Batch[];
};

export type CategoryKey =
  | "fever" | "cold" | "diabetes" | "heart" | "stomach" | "vitamins"
  | "skin" | "baby" | "devices" | "personal" | "ayush" | "firstaid";

export const CATEGORIES: { key: CategoryKey; label: string; emoji: string }[] = [
  { key: "fever", label: "Fever & Pain", emoji: "🤒" },
  { key: "cold", label: "Cough & Cold", emoji: "🤧" },
  { key: "diabetes", label: "Diabetes", emoji: "🩸" },
  { key: "heart", label: "Heart & BP", emoji: "🫀" },
  { key: "stomach", label: "Stomach", emoji: "🍽️" },
  { key: "vitamins", label: "Vitamins", emoji: "💊" },
  { key: "skin", label: "Skin Care", emoji: "🧴" },
  { key: "baby", label: "Baby Care", emoji: "🍼" },
  { key: "devices", label: "Devices", emoji: "🩺" },
  { key: "personal", label: "Personal", emoji: "🪥" },
  { key: "ayush", label: "Ayurveda", emoji: "🌿" },
  { key: "firstaid", label: "First Aid", emoji: "🩹" },
];
export const catLabel = (key: string) => CATEGORIES.find((c) => c.key === key)?.label ?? key;

// ── seed inventory ──────────────────────────────────────────────
// expiries are intentionally varied so "expiring soon" demoes well (today = 2026-06).
export const SEED_INVENTORY: InvProduct[] = [
  { id: "p1", name: "Dolo 650", composition: "Paracetamol 650mg", manufacturer: "Micro Labs", form: "Tablet", pack: "Strip of 15", category: "fever", hsn: "3004", gst: 12, schedule: "OTC", rack: "A1", reorderLevel: 40, online: true, emoji: "💊",
    batches: [ { batchNo: "DL6A229", expiry: "2027-03", qty: 120, mrp: 34, ptr: 24.5 }, { batchNo: "DL6A187", expiry: "2026-09", qty: 36, mrp: 34, ptr: 24.5 } ] },
  { id: "p2", name: "Crocin Advance", composition: "Paracetamol 500mg", manufacturer: "GSK", form: "Tablet", pack: "Strip of 15", category: "fever", hsn: "3004", gst: 12, schedule: "OTC", rack: "A1", reorderLevel: 30, online: true, emoji: "💊",
    batches: [ { batchNo: "CRA5521", expiry: "2027-01", qty: 64, mrp: 33, ptr: 23 } ] },
  { id: "p3", name: "Combiflam", composition: "Ibuprofen 400mg + Paracetamol 325mg", manufacturer: "Sanofi", form: "Tablet", pack: "Strip of 20", category: "fever", hsn: "3004", gst: 12, schedule: "OTC", rack: "A2", reorderLevel: 25, online: true, emoji: "💊",
    batches: [ { batchNo: "CMB8830", expiry: "2026-08", qty: 18, mrp: 52, ptr: 38 } ] },
  { id: "p4", name: "Volini Gel", composition: "Diclofenac Diethylamine 1.16%", manufacturer: "Sun Pharma", form: "Cream", pack: "30 g tube", category: "fever", hsn: "3004", gst: 12, schedule: "OTC", rack: "A3", reorderLevel: 15, online: true, emoji: "🧴",
    batches: [ { batchNo: "VOL3092", expiry: "2027-06", qty: 40, mrp: 165, ptr: 120 } ] },
  { id: "p5", name: "Vicks Action 500", composition: "Paracetamol + Phenylephrine + Caffeine", manufacturer: "P&G", form: "Tablet", pack: "Strip of 10", category: "cold", hsn: "3004", gst: 12, schedule: "OTC", rack: "B1", reorderLevel: 25, online: true, emoji: "💊",
    batches: [ { batchNo: "VA51120", expiry: "2026-12", qty: 52, mrp: 49, ptr: 35 } ] },
  { id: "p6", name: "Cetirizine 10mg", composition: "Cetirizine HCl 10mg", manufacturer: "Cipla", form: "Tablet", pack: "Strip of 10", category: "cold", hsn: "3004", gst: 5, schedule: "H", rack: "B1", reorderLevel: 30, online: true, emoji: "💊",
    batches: [ { batchNo: "CTZ4471", expiry: "2027-04", qty: 88, mrp: 24, ptr: 15 } ] },
  { id: "p7", name: "Benadryl Cough Syrup", composition: "Diphenhydramine + Ammonium Chloride", manufacturer: "J&J", form: "Syrup", pack: "150 ml bottle", category: "cold", hsn: "3004", gst: 12, schedule: "H", rack: "B2", reorderLevel: 12, online: true, emoji: "🍯",
    batches: [ { batchNo: "BDL7781", expiry: "2026-07", qty: 9, mrp: 138, ptr: 104 } ] },
  { id: "p9", name: "Metformin 500mg", composition: "Metformin HCl 500mg", manufacturer: "USV", form: "Tablet", pack: "Strip of 15", category: "diabetes", hsn: "3004", gst: 5, schedule: "H", rack: "C1", reorderLevel: 50, online: true, emoji: "💊",
    batches: [ { batchNo: "MET2218", expiry: "2027-02", qty: 140, mrp: 38, ptr: 22 }, { batchNo: "MET1990", expiry: "2026-10", qty: 60, mrp: 38, ptr: 22 } ] },
  { id: "p10", name: "Accu-Chek Active Strips", composition: "Glucose test strips", manufacturer: "Roche", form: "Device", pack: "Box of 50", category: "diabetes", hsn: "3822", gst: 12, schedule: "OTC", rack: "C2", reorderLevel: 8, online: true, emoji: "🩸",
    batches: [ { batchNo: "ACS5540", expiry: "2027-05", qty: 22, mrp: 1100, ptr: 880 } ] },
  { id: "p11", name: "Glycomet GP1", composition: "Metformin 500mg + Glimepiride 1mg", manufacturer: "USV", form: "Tablet", pack: "Strip of 15", category: "diabetes", hsn: "3004", gst: 5, schedule: "H", rack: "C1", reorderLevel: 30, online: false, emoji: "💊",
    batches: [ { batchNo: "GMP3361", expiry: "2026-11", qty: 45, mrp: 124, ptr: 92 } ] },
  { id: "p12", name: "Amlodipine 5mg", composition: "Amlodipine 5mg", manufacturer: "Cipla", form: "Tablet", pack: "Strip of 15", category: "heart", hsn: "3004", gst: 5, schedule: "H", rack: "D1", reorderLevel: 40, online: true, emoji: "💊",
    batches: [ { batchNo: "AML6612", expiry: "2027-07", qty: 96, mrp: 32, ptr: 18 } ] },
  { id: "p13", name: "Atorvastatin 10mg", composition: "Atorvastatin 10mg", manufacturer: "Sun Pharma", form: "Tablet", pack: "Strip of 15", category: "heart", hsn: "3004", gst: 5, schedule: "H", rack: "D1", reorderLevel: 30, online: true, emoji: "💊",
    batches: [ { batchNo: "ATR8120", expiry: "2026-08", qty: 14, mrp: 112, ptr: 78 } ] },
  { id: "p14", name: "Ecosprin 75", composition: "Aspirin 75mg", manufacturer: "USV", form: "Tablet", pack: "Strip of 14", category: "heart", hsn: "3004", gst: 5, schedule: "H", rack: "D2", reorderLevel: 30, online: true, emoji: "💊",
    batches: [ { batchNo: "ECO1145", expiry: "2027-03", qty: 110, mrp: 16, ptr: 9 } ] },
  { id: "p15", name: "Pan-D", composition: "Pantoprazole 40mg + Domperidone 30mg", manufacturer: "Alkem", form: "Capsule", pack: "Strip of 15", category: "stomach", hsn: "3004", gst: 12, schedule: "H", rack: "E1", reorderLevel: 30, online: true, emoji: "💊",
    batches: [ { batchNo: "PND9912", expiry: "2027-01", qty: 70, mrp: 168, ptr: 120 } ] },
  { id: "p16", name: "Digene Gel Mint", composition: "Antacid suspension", manufacturer: "Abbott", form: "Syrup", pack: "200 ml bottle", category: "stomach", hsn: "3004", gst: 12, schedule: "OTC", rack: "E2", reorderLevel: 15, online: true, emoji: "🍯",
    batches: [ { batchNo: "DIG3320", expiry: "2026-09", qty: 30, mrp: 168, ptr: 124 } ] },
  { id: "p17", name: "ORS Orange", composition: "Oral rehydration salts", manufacturer: "FDC", form: "Other", pack: "5 sachets", category: "stomach", hsn: "3004", gst: 5, schedule: "OTC", rack: "E3", reorderLevel: 20, online: true, emoji: "🥤",
    batches: [ { batchNo: "ORS7781", expiry: "2027-08", qty: 64, mrp: 120, ptr: 86 } ] },
  { id: "p19", name: "Shelcal 500", composition: "Calcium Carbonate + Vit D3", manufacturer: "Torrent", form: "Tablet", pack: "Strip of 15", category: "vitamins", hsn: "3004", gst: 12, schedule: "OTC", rack: "F1", reorderLevel: 25, online: true, emoji: "💊",
    batches: [ { batchNo: "SHL2240", expiry: "2027-05", qty: 80, mrp: 128, ptr: 92 } ] },
  { id: "p20", name: "Vitamin D3 60K", composition: "Cholecalciferol 60000 IU", manufacturer: "Mankind", form: "Capsule", pack: "4 sachets", category: "vitamins", hsn: "3004", gst: 12, schedule: "OTC", rack: "F1", reorderLevel: 20, online: true, emoji: "🟡",
    batches: [ { batchNo: "VD36005", expiry: "2027-09", qty: 56, mrp: 140, ptr: 96 } ] },
  { id: "p22", name: "Ensure Powder Vanilla", composition: "Nutritional supplement", manufacturer: "Abbott", form: "Other", pack: "400 g jar", category: "vitamins", hsn: "2106", gst: 18, schedule: "OTC", rack: "F2", reorderLevel: 10, online: true, emoji: "🥛",
    batches: [ { batchNo: "ENS4410", expiry: "2026-10", qty: 16, mrp: 670, ptr: 540 } ] },
  { id: "p25", name: "Sunscreen SPF 50", composition: "Avobenzone + Octinoxate", manufacturer: "Brinton", form: "Cream", pack: "50 g tube", category: "skin", hsn: "3304", gst: 18, schedule: "OTC", rack: "G1", reorderLevel: 12, online: true, emoji: "🧴",
    batches: [ { batchNo: "SUN5530", expiry: "2027-04", qty: 28, mrp: 399, ptr: 300 } ] },
  { id: "p28", name: "Omron BP Monitor", composition: "Automatic digital BP monitor", manufacturer: "Omron", form: "Device", pack: "1 unit", category: "devices", hsn: "9018", gst: 12, schedule: "OTC", rack: "H1", reorderLevel: 4, online: true, emoji: "🩺",
    batches: [ { batchNo: "OMR7702", expiry: "2030-01", qty: 7, mrp: 2495, ptr: 1850 } ] },
  { id: "p29", name: "Pulse Oximeter", composition: "Fingertip SpO₂ monitor", manufacturer: "BPL", form: "Device", pack: "1 unit", category: "devices", hsn: "9018", gst: 12, schedule: "OTC", rack: "H1", reorderLevel: 5, online: true, emoji: "🫁",
    batches: [ { batchNo: "PLX2218", expiry: "2030-01", qty: 11, mrp: 1399, ptr: 990 } ] },
  { id: "p30", name: "Digital Thermometer", composition: "Flexible-tip thermometer", manufacturer: "Dr Trust", form: "Device", pack: "1 unit", category: "devices", hsn: "9025", gst: 12, schedule: "OTC", rack: "H2", reorderLevel: 8, online: true, emoji: "🌡️",
    batches: [ { batchNo: "THR9091", expiry: "2030-01", qty: 24, mrp: 280, ptr: 180 } ] },
  { id: "p33", name: "Ashwagandha Tablets", composition: "Withania somnifera extract", manufacturer: "Himalaya", form: "Tablet", pack: "Bottle of 60", category: "ayush", hsn: "3004", gst: 5, schedule: "OTC", rack: "I1", reorderLevel: 10, online: true, emoji: "🌿",
    batches: [ { batchNo: "ASH3340", expiry: "2027-02", qty: 30, mrp: 450, ptr: 330 } ] },
  { id: "p35", name: "Band-Aid Washproof", composition: "Adhesive bandages", manufacturer: "J&J", form: "Other", pack: "20 strips", category: "firstaid", hsn: "3005", gst: 12, schedule: "OTC", rack: "J1", reorderLevel: 20, online: true, emoji: "🩹",
    batches: [ { batchNo: "BND1102", expiry: "2028-03", qty: 60, mrp: 110, ptr: 78 } ] },
  { id: "p31", name: "Colgate Total", composition: "Toothpaste", manufacturer: "Colgate", form: "Other", pack: "150 g · 2 pack", category: "personal", hsn: "3306", gst: 18, schedule: "OTC", rack: "K1", reorderLevel: 15, online: true, emoji: "🪥",
    batches: [ { batchNo: "CLG6620", expiry: "2027-11", qty: 44, mrp: 230, ptr: 168 } ] },
];

// ── suppliers / distributors ────────────────────────────────────
export type Supplier = {
  id: string;
  name: string;
  gstin: string;
  phone: string;
  contactPerson?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  dlNo?: string;          // distributor's drug licence
  paymentTerms?: string;  // e.g. "30 days credit"
  outstanding?: number;   // amount payable to this distributor
  active?: boolean;
};
export const SEED_SUPPLIERS: Supplier[] = [
  { id: "s1", name: "Bengaluru Pharma Distributors", gstin: "29ABCDE1234F1Z5", phone: "+91 80 4123 7788", contactPerson: "Ramesh Gupta", email: "orders@blrpharma.in", address: "12, Avenue Road", city: "Bengaluru", state: "Karnataka", dlNo: "KA-W-2291", paymentTerms: "30 days credit", outstanding: 18400, active: true },
  { id: "s2", name: "Karnataka Medical Agencies", gstin: "29PQRST5678G2Z1", phone: "+91 80 2556 9090", contactPerson: "Lata Shenoy", email: "sales@kmagencies.in", address: "44, Sultanpet", city: "Bengaluru", state: "Karnataka", dlNo: "KA-W-1184", paymentTerms: "15 days credit", outstanding: 0, active: true },
  { id: "s3", name: "Apollo Wholesale", gstin: "29LMNOP9012H3Z9", phone: "+91 80 6677 1234", contactPerson: "Vinod Kumar", email: "wholesale@apollo.in", address: "HSR Layout", city: "Bengaluru", state: "Karnataka", dlNo: "KA-W-3320", paymentTerms: "Advance", outstanding: 7200, active: true },
];

// ── sales (both channels) ───────────────────────────────────────
export type Channel = "online" | "offline";
export type PayMode = "cash" | "upi" | "card" | "cod" | "credit" | "insurance";
export const PAY_LABEL: Record<PayMode, string> = { cash: "Cash", upi: "UPI", card: "Card", cod: "Cash on Delivery", credit: "Credit (Khata)", insurance: "Insurance / TPA" };
// modes that actually collect money at the time of sale (credit + insurance are deferred / on account)
export const SETTLED_MODES: PayMode[] = ["cash", "upi", "card", "cod"];

// ── hospital sale source (where the sale originated) ─────────────
export type SaleSource = "opd" | "counter" | "ward" | "emergency" | "online";
export const SALE_SOURCES: { key: SaleSource; label: string; short: string; emoji: string }[] = [
  { key: "opd", label: "OPD Prescription", short: "OPD Rx", emoji: "📋" },
  { key: "counter", label: "Pharmacy Counter", short: "Counter", emoji: "🧾" },
  { key: "ward", label: "Ward / IPD", short: "Ward", emoji: "🛏️" },
  { key: "emergency", label: "Emergency / Casualty", short: "Emergency", emoji: "🚑" },
  { key: "online", label: "Online", short: "Online", emoji: "🌐" },
];
export const SALE_SOURCE_LABEL: Record<SaleSource, string> = Object.fromEntries(SALE_SOURCES.map((s) => [s.key, s.label])) as Record<SaleSource, string>;
// effective source for any sale (falls back to channel for non-hospital / legacy sales)
export const saleSourceOf = (s: { source?: SaleSource; channel: Channel }): SaleSource =>
  s.source ?? (s.channel === "online" ? "online" : "counter");

// online order lifecycle; offline sales are "completed" immediately
export type OrderStatus = "new" | "accepted" | "packed" | "out" | "delivered" | "completed" | "cancelled";
export const ONLINE_FLOW: OrderStatus[] = ["new", "accepted", "packed", "out", "delivered"];
export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New order", accepted: "Accepted", packed: "Packed", out: "Out for delivery",
  delivered: "Delivered", completed: "Completed", cancelled: "Cancelled",
};

export type SaleItem = {
  productId: string;
  name: string;
  batchNo: string;
  expiry: string;
  hsn: string;
  qty: number;       // packs, or loose tablet/capsule count when loose
  mrp: number;       // unit MRP (GST-inclusive) — per pack, or per tablet when loose
  price: number;     // unit selling price (GST-inclusive, after any item discount)
  gst: number;       // GST %
  loose?: boolean;   // true = sold as individual tablets/capsules
};

export type StatusEvent = { status: OrderStatus; at: number; note?: string };

// ── online-order fulfilment (pick → scan-pack → seal → handover) ──
// A picking checklist line: how many units of an item have been scanned/packed,
// and the batch they were drawn from (so stock is deducted at the batch level).
export type PackLine = { productId: string; name: string; qty: number; scanned: number; batchNo?: string };
export type Rider = { name: string; phone?: string; vehicle?: string };
export type Fulfillment = {
  lines?: PackLine[];     // picking checklist with live scan progress
  sealed?: boolean;       // all items scanned → invoice generated + sealed in a Namma MedMate packet
  sealedAt?: number;
  rider?: Rider;          // assigned delivery partner
  handedAt?: number;      // handed over to the delivery partner (dispatched)
};
export const packTotal = (s: Sale) => s.items.reduce((a, i) => a + i.qty, 0);
export const packDone = (s: Sale) => (s.fulfillment?.lines ?? []).reduce((a, l) => a + l.scanned, 0);
export const packComplete = (s: Sale) => {
  const lines = s.fulfillment?.lines;
  if (!lines || !lines.length) return false;
  return lines.every((l) => l.scanned >= l.qty);
};

export type Sale = {
  id: string;                 // invoice no e.g. "INV-2607"
  channel: Channel;
  status: OrderStatus;
  customer: { name: string; phone?: string; address?: string; email?: string; doctor?: string; rxSource?: "doctor" | "self" };
  items: SaleItem[];
  discount: number;           // flat ₹ off (pre-tax-inclusive total)
  payMode: PayMode;
  rx: boolean;                // contained Rx-only items
  rxId?: string;              // linked prescription
  createdAt: number;
  history?: StatusEvent[];    // status-change audit trail w/ timestamps
  paid?: boolean;             // false = unpaid bill sent to reception/billing counter (default paid)
  reception?: boolean;        // routed to reception/billing counter
  ward?: string;              // hospital ward / room (optional)
  source?: SaleSource;        // hospital sale origin (OPD/counter/ward/emergency/online)
  insurer?: string;           // insurer / TPA when payMode === "insurance"
  patientId?: string;         // hospital UHID / IP number — groups an in-patient's bills for settlement
  fulfillment?: Fulfillment;  // online-order pick/pack/handover state
};

/** Build a plausible status history for a seeded order (timestamps between createdAt & now). */
export function seedHistory(channel: Channel, status: OrderStatus, createdAt: number, now: number): StatusEvent[] {
  if (channel === "offline") return [{ status: "completed", at: createdAt }];
  if (status === "cancelled") return [{ status: "new", at: createdAt }, { status: "cancelled", at: createdAt + 4 * 60000 }];
  const idx = ONLINE_FLOW.indexOf(status);
  const span = Math.max(now - createdAt, idx * 6 * 60000);
  const evs: StatusEvent[] = [];
  for (let i = 0; i <= idx; i++) evs.push({ status: ONLINE_FLOW[i], at: Math.round(createdAt + (span * i) / (idx + 1)) });
  return evs;
}

// ── prescriptions queue ─────────────────────────────────────────
export type RxStatus = "pending" | "approved" | "dispensed" | "rejected";
// how the prescription reached the pharmacy:
//  • "uploaded" → customer uploaded a photo/scan of a doctor's paper prescription
//  • "digital"  → e-prescription issued by a Namma MedMate doctor (teleconsult)
export type RxKind = "uploaded" | "digital";
export type RxMed = { name: string; dose: string; days?: number };
export type Prescription = {
  id: string;
  patient: string;
  phone: string;
  doctor: string;
  uploadedAt: number;
  channel: Channel;
  status: RxStatus;
  items: string[];            // product ids the pharmacist verified
  note?: string;
  kind: RxKind;               // uploaded photo vs Namma MedMate digital Rx
  fileType?: "image" | "pdf"; // uploaded file format (default image)
  image?: string;             // uploaded photo (data URL) — for kind "uploaded"
  regNo?: string;             // doctor's medical-council reg no (digital)
  signedAt?: number;          // e-signature timestamp (digital)
  meds?: RxMed[];             // structured medicines with dosage (digital)
  approvedAt?: number;        // when the pharmacist approved it
  dispensedAt?: number;       // when it was billed & dispensed
  rejectedAt?: number;        // when it was rejected
  rejectReason?: string;      // why it was rejected (shown to customer)
  reviewedBy?: string;        // pharmacist who actioned it
  urgent?: boolean;           // patient flagged it urgent
};
const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Build a believable "scanned paper prescription" image (used when a real photo
// isn't attached) so the pharmacist can view an uploaded-style Rx.
export const rxImageDataUrl = (rx: Prescription): string => {
  const body = (rx.note ? [rx.note] : []).concat((rx.meds ?? []).map((m) => `${m.name} — ${m.dose}`)).slice(0, 6);
  const lines = body.length ? body : ["Tab. as advised", "Take after food", "Review after 2 weeks"];
  const sig = rx.doctor.replace(/^Dr\.?\s*/i, "");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='560' viewBox='0 0 420 560'>
<rect width='420' height='560' fill='#fbfaf3'/>
<rect width='420' height='72' fill='#1B3D29'/>
<text x='22' y='34' fill='#ffffff' font-family='Georgia,serif' font-size='19' font-weight='bold'>${xmlEsc(rx.doctor)}</text>
<text x='22' y='55' fill='#cfe6d8' font-family='Arial' font-size='11.5'>MBBS, MD (Gen. Med.) · Reg. ${xmlEsc(rx.regNo ?? "KMC-44219")}</text>
<text x='22' y='118' fill='#1B3D29' font-family='Georgia,serif' font-size='42' font-weight='bold'>&#8478;</text>
<text x='86' y='100' fill='#333' font-family='Arial' font-size='13'>Patient: ${xmlEsc(rx.patient)}</text>
<text x='86' y='120' fill='#777' font-family='Arial' font-size='11.5'>Date: ____ / ____ / ______</text>
<line x1='22' y1='138' x2='398' y2='138' stroke='#dcdcd0'/>
${lines.map((l, i) => `<text x='30' y='${182 + i * 46}' fill='#243' font-family='Comic Sans MS,cursive' font-size='16'>&#8226; ${xmlEsc(l)}</text>`).join("")}
<text x='250' y='516' fill='#1B3D29' font-family='Brush Script MT,cursive' font-size='27' font-style='italic'>${xmlEsc(sig)}</text>
<line x1='250' y1='524' x2='398' y2='524' stroke='#999'/>
<text x='250' y='540' fill='#888' font-family='Arial' font-size='10.5'>Signature &amp; seal</text>
</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
};

// ── offers / promotions ─────────────────────────────────────────
export type OfferType = "pct" | "flat";
export type OfferScope = "all" | "category" | "product";
export type Offer = {
  id: string;
  title: string;
  code: string;
  type: OfferType;
  value: number;              // % or ₹
  scope: OfferScope;
  target?: string;            // category key or product id
  online: boolean;            // show on customer app
  active: boolean;
};
export const SEED_OFFERS: Offer[] = [
  { id: "of1", title: "Monsoon Health Sale", code: "NAMMA25", type: "pct", value: 25, scope: "all", target: undefined, online: true, active: true },
  { id: "of2", title: "Diabetes care 10% off", code: "SUGAR10", type: "pct", value: 10, scope: "category", target: "diabetes", online: true, active: true },
  { id: "of3", title: "Flat ₹50 off Devices", code: "DEV50", type: "flat", value: 50, scope: "category", target: "devices", online: true, active: false },
];

// ── pharmacy profile (used on invoices & business settings) ─────
export type BizDetail = { label: string; value: string };
export type PharmacyProfile = {
  name: string;
  tagline: string;
  logo?: string;           // data URL
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstRegistered: boolean;
  gstin: string;
  eInvoicing: boolean;
  pan: string;
  dlNo: string;            // drug licence no
  fssai: string;           // FSSAI licence no
  enableTDS: boolean;
  enableTCS: boolean;
  businessTypes: string[];
  industryType: string;
  registrationType: string;
  signature?: string;      // data URL (shown on invoices)
  extraDetails: BizDetail[]; // MSME, Website, etc.
  storeOpen: boolean;      // accepting online orders
  pharmacist: string;
};
// ── payout bank account ─────────────────────────────────────────
export type BankAccount = {
  holderName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  branch?: string;
  accountType: "Savings" | "Current";
  upiVpa?: string;
  verified: boolean;       // penny-drop verification status
  addedOn?: string;        // ISO date
};
export const maskAccount = (n: string) => (n.length <= 4 ? n : "•••• " + n.slice(-4));
// basic IFSC sanity check: 4 letters + 0 + 6 alphanumerics
export const isValidIfsc = (s: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(s.trim().toUpperCase());

export const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
export const PHARMACY_BUSINESS_TYPES = ["Retail Pharmacy", "Wholesale / Distribution", "Hospital Pharmacy", "Online Pharmacy", "Ayurvedic / Generic", "Surgicals & Equipment"];
export const REGISTRATION_TYPES = ["Proprietorship", "Partnership", "Private Limited Company", "LLP", "HUF", "Public Limited Company", "Not Registered"];
export const INDUSTRY_TYPES = ["Pharmacy & Healthcare", "Retail", "Wholesale", "Hospital / Clinic", "Diagnostics"];
export const DEFAULT_PROFILE: PharmacyProfile = {
  name: "Sri Sai Medicals",
  tagline: "Your neighbourhood pharmacy",
  logo: "data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='80' height='80' rx='18' fill='#1B3D29'/><path d='M34 21h12v13h13v12H46v13H34V46H21V34h13z' fill='#ffffff'/><circle cx='59' cy='23' r='8' fill='#D9A648' stroke='#1B3D29' stroke-width='2'/></svg>"),
  phone: "+91 98860 12345",
  email: "srisai@nammamedmate.in",
  address: "142, 7th Cross, Jayanagar 4th Block, Bengaluru 560011",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560011",
  gstRegistered: true,
  gstin: "29ABCDE1234F1Z2",
  eInvoicing: false,
  pan: "AAHCI9279D",
  dlNo: "KA-B-20B/20C-118822",
  fssai: "10020064002808",
  enableTDS: false,
  enableTCS: false,
  businessTypes: ["Retail Pharmacy"],
  industryType: "Pharmacy & Healthcare",
  registrationType: "Private Limited Company",
  extraDetails: [{ label: "Website", value: "www.srisaimedicals.in" }],
  storeOpen: true,
  pharmacist: "Rajesh Kumar, B.Pharm (Reg. KSP 44192)",
};

// ── seed sales (mix of online + offline, varied times) ──────────
// times are minutes-ago offsets resolved against a stamped "now" at hydrate.
type SeedSale = Omit<Sale, "createdAt"> & { minsAgo: number };
const SI = (productId: string, qty: number): SaleItem => {
  const p = SEED_INVENTORY.find((x) => x.id === productId)!;
  const b = p.batches[0];
  return { productId, name: p.name, batchNo: b.batchNo, expiry: b.expiry, hsn: p.hsn, qty, mrp: b.mrp, price: p.onlinePrice ?? b.mrp, gst: p.gst };
};
export const SEED_SALES: SeedSale[] = [
  { id: "INV-2601", channel: "offline", status: "completed", customer: { name: "Walk-in" }, items: [SI("p1", 2), SI("p15", 1)], discount: 0, payMode: "cash", rx: false, minsAgo: 38 },
  { id: "INV-2602", channel: "online", status: "new", customer: { name: "Priya Sharma", phone: "+91 99012 33445", address: "12, 8th Main, Jayanagar" }, items: [SI("p9", 2), SI("p12", 1)], discount: 0, payMode: "cod", rx: true, rxId: "RX-118", minsAgo: 12 },
  { id: "INV-2603", channel: "online", status: "accepted", customer: { name: "Arun Nair", phone: "+91 98800 11223", address: "WeWork, HSR Layout" }, items: [SI("p6", 1), SI("p20", 1)], discount: 0, payMode: "upi", rx: false, minsAgo: 26 },
  { id: "INV-2604", channel: "offline", status: "completed", customer: { name: "Walk-in" }, items: [SI("p5", 1), SI("p17", 2)], discount: 10, payMode: "upi", rx: false, minsAgo: 64 },
  { id: "INV-2605", channel: "online", status: "out", customer: { name: "Lakshmi Devi", phone: "+91 98452 77881", address: "8, 3rd Cross, Malleshwaram" }, items: [SI("p13", 1), SI("p14", 1)], discount: 0, payMode: "cod", rx: true, rxId: "RX-115", minsAgo: 92 },
  { id: "INV-2606", channel: "offline", status: "completed", customer: { name: "Walk-in", doctor: "Dr. Mehta" }, items: [SI("p28", 1)], discount: 100, payMode: "card", rx: false, minsAgo: 140 },
  { id: "INV-2599", channel: "online", status: "delivered", customer: { name: "Suresh K", phone: "+91 97411 22556", address: "BTM Layout 2nd Stage" }, items: [SI("p19", 2), SI("p33", 1)], discount: 0, payMode: "upi", rx: false, minsAgo: 280 },
  { id: "INV-2598", channel: "offline", status: "completed", customer: { name: "Walk-in" }, items: [SI("p2", 3), SI("p35", 2)], discount: 0, payMode: "cash", rx: false, minsAgo: 320 },
  // credit (khata) bills — recorded on a customer's account, settled later
  { id: "INV-2596", channel: "offline", status: "completed", customer: { name: "Ramesh Gupta", phone: "+91 98801 44556" }, items: [SI("p9", 3), SI("p13", 2)], discount: 0, payMode: "credit", rx: false, minsAgo: 1500, paid: false },
  { id: "INV-2590", channel: "offline", status: "completed", customer: { name: "Ramesh Gupta", phone: "+91 98801 44556" }, items: [SI("p15", 2), SI("p19", 1)], discount: 0, payMode: "credit", rx: false, minsAgo: 6800, paid: false },
  // hospital sales by source — OPD / ward / emergency / insurance (only surfaced in Hospital Pharmacy mode)
  { id: "INV-2607", channel: "offline", status: "completed", customer: { name: "Mohan Das", phone: "+91 90080 44551", doctor: "Dr. R. Menon", rxSource: "doctor" }, items: [SI("p9", 1), SI("p2", 2)], discount: 0, payMode: "insurance", insurer: "Star Health (Medi Assist)", source: "opd", rx: true, minsAgo: 22 },
  { id: "INV-2608", channel: "offline", status: "completed", customer: { name: "Asha Devi" }, items: [SI("p13", 2), SI("p15", 1)], discount: 0, payMode: "insurance", insurer: "Ayushman Bharat (PM-JAY)", source: "ward", ward: "General Ward A", patientId: "UHID-100245", rx: false, minsAgo: 70, paid: false },
  { id: "INV-2613", channel: "offline", status: "completed", customer: { name: "Asha Devi" }, items: [SI("p9", 1), SI("p19", 2)], discount: 0, payMode: "cash", source: "ward", ward: "General Ward A", patientId: "UHID-100245", rx: false, minsAgo: 50, paid: false },
  { id: "INV-2609", channel: "offline", status: "completed", customer: { name: "Rahul (casualty)" }, items: [SI("p1", 1), SI("p5", 1)], discount: 0, payMode: "cash", source: "emergency", patientId: "UHID-100401", rx: false, minsAgo: 105, paid: false },
  { id: "INV-2610", channel: "offline", status: "completed", customer: { name: "Priya N." }, items: [SI("p35", 2)], discount: 0, payMode: "cash", source: "ward", ward: "Maternity Ward", patientId: "UHID-100312", rx: false, minsAgo: 180, paid: false },
  { id: "INV-2611", channel: "offline", status: "completed", customer: { name: "OPD walk-in", doctor: "Dr. M. Iyer", rxSource: "doctor" }, items: [SI("p2", 1)], discount: 0, payMode: "upi", source: "opd", rx: false, minsAgo: 240 },
  { id: "INV-2612", channel: "offline", status: "completed", customer: { name: "Rakesh K.", phone: "+91 98112 55003" }, items: [SI("p6", 1), SI("p20", 2)], discount: 0, payMode: "insurance", insurer: "ICICI Lombard", source: "counter", rx: false, minsAgo: 410, paid: false },
];

// seed repayments so the khata ledger has history (resolved against the app clock)
type SeedCreditPayment = Omit<CreditPayment, "at"> & { daysAgo: number };
export const SEED_CREDIT_PAYMENTS: SeedCreditPayment[] = [
  { id: "CR-1001", custKey: "+91 98801 44556", custName: "Ramesh Gupta", custPhone: "+91 98801 44556", amount: 200, mode: "upi", note: "Part payment", daysAgo: 2 },
];
export const resolveSeedCreditPayments = (now: number): CreditPayment[] =>
  SEED_CREDIT_PAYMENTS.map(({ daysAgo, ...rest }) => ({ ...rest, at: now - daysAgo * 86400000 }));

type SeedRx = Omit<Prescription, "uploadedAt"> & { minsAgo: number; approvedMinsAgo?: number; dispensedMinsAgo?: number; rejectedMinsAgo?: number };
export const SEED_RX: SeedRx[] = [
  // ── pending review (the working queue) ──
  { id: "RX-121", patient: "Ravi Menon", phone: "+91 98861 20034", doctor: "Dr. Ananya Rao", channel: "online", status: "pending", items: ["p13", "p12"], note: "New — chest pain follow-up, please prioritise", minsAgo: 4, urgent: true,
    kind: "digital", regNo: "KMC-58213", meds: [{ name: "Atorvastatin 10mg", dose: "0-0-1", days: 30 }, { name: "Amlodipine 5mg", dose: "1-0-0", days: 30 }] },
  // Namma MedMate digital e-prescription (teleconsult)
  { id: "RX-118", patient: "Priya Sharma", phone: "+91 99012 33445", doctor: "Dr. Ananya Rao", channel: "online", status: "pending", items: ["p9", "p12"], note: "Refill — diabetes & BP", minsAgo: 12,
    kind: "digital", regNo: "KMC-58213", meds: [{ name: "Metformin 500mg", dose: "1-0-1 after food", days: 30 }, { name: "Amlodipine 5mg", dose: "0-0-1", days: 30 }] },
  // patient-uploaded photo of a paper prescription (waited past SLA)
  { id: "RX-117", patient: "Mohan Das", phone: "+91 90080 44551", doctor: "Dr. Vikram Nair", channel: "online", status: "pending", items: ["p13"], note: "Atorvastatin 10mg — 0-0-1 × 30 days", minsAgo: 148, kind: "uploaded", fileType: "pdf" },
  { id: "RX-116", patient: "Fatima Sheikh", phone: "+91 90350 88120", doctor: "Dr. Kavya Reddy", channel: "online", status: "pending", items: ["p15", "p16"], note: "Acidity + gas, 2 weeks", minsAgo: 66, kind: "uploaded" },
  // ── approved, awaiting dispense ──
  { id: "RX-115", patient: "Lakshmi Devi", phone: "+91 98452 77881", doctor: "Dr. S. Iyer", channel: "online", status: "approved", items: ["p13", "p14"], note: "Atorvastatin + Ecosprin, lifelong", minsAgo: 95, approvedMinsAgo: 40, reviewedBy: "Anjali Menon", kind: "uploaded" },
  { id: "RX-114", patient: "Arjun Nair", phone: "+91 99525 61200", doctor: "Dr. Ananya Rao", channel: "online", status: "approved", items: ["p19", "p20"], note: "Calcium + Vit D3, 60 days", minsAgo: 130, approvedMinsAgo: 70, reviewedBy: "Anjali Menon",
    kind: "digital", regNo: "KMC-58213", meds: [{ name: "Shelcal 500", dose: "0-0-1", days: 60 }, { name: "Vitamin D3 60K", dose: "1/week", days: 56 }] },
  // ── dispensed (history — used for turnaround analytics) ──
  { id: "RX-110", patient: "Walk-in (counter)", phone: "—", doctor: "Dr. Mehta", channel: "offline", status: "dispensed", items: ["p11"], minsAgo: 200, approvedMinsAgo: 196, dispensedMinsAgo: 190, reviewedBy: "Suresh Babu",
    kind: "digital", regNo: "KMC-31180", meds: [{ name: "Glycomet GP1", dose: "1-0-0 before breakfast", days: 30 }] },
  { id: "RX-108", patient: "Sunita Rao", phone: "+91 98803 41190", doctor: "Dr. S. Iyer", channel: "online", status: "dispensed", items: ["p9", "p10"], note: "Diabetes refill", minsAgo: 320, approvedMinsAgo: 300, dispensedMinsAgo: 292, reviewedBy: "Anjali Menon", kind: "uploaded" },
  { id: "RX-105", patient: "Imran Khan", phone: "+91 90084 55217", doctor: "Dr. Vikram Nair", channel: "offline", status: "dispensed", items: ["p6", "p7"], minsAgo: 460, approvedMinsAgo: 455, dispensedMinsAgo: 450, reviewedBy: "Suresh Babu", kind: "uploaded" },
  { id: "RX-102", patient: "Deepa Krishnan", phone: "+91 99011 20345", doctor: "Dr. Kavya Reddy", channel: "online", status: "dispensed", items: ["p13", "p12", "p14"], note: "Cardiac maintenance", minsAgo: 1180, approvedMinsAgo: 1140, dispensedMinsAgo: 1130, reviewedBy: "Anjali Menon",
    kind: "digital", regNo: "KMC-77410", meds: [{ name: "Atorvastatin 10mg", dose: "0-0-1", days: 30 }, { name: "Amlodipine 5mg", dose: "1-0-0", days: 30 }, { name: "Ecosprin 75", dose: "0-1-0", days: 30 }] },
  // ── rejected ──
  { id: "RX-112", patient: "Anonymous upload", phone: "+91 90000 00000", doctor: "Illegible", channel: "online", status: "rejected", items: [], note: "Photo blurred, prescriber not verifiable", minsAgo: 240, rejectedMinsAgo: 232, rejectReason: "Prescription illegible — please re-upload a clear photo", reviewedBy: "Anjali Menon", kind: "uploaded" },
];

// ════════════════════════════════════════════════════════════════
// derived helpers
// ════════════════════════════════════════════════════════════════
export const stockOf = (p: InvProduct) => p.batches.reduce((a, b) => a + b.qty, 0);

// ── rack / bin locations ────────────────────────────────────────
// A medicine's location code (e.g. "A3-12" = Rack A, shelf 3, bin 12) maps the
// physical shelving so a pharmacist reads the code on screen and walks to the spot.
// The code is tied to the MEDICINE, not the batch — new stock of the same item
// always returns to the same bin, so the code never changes on a restock.
export const hasLocation = (p: InvProduct) => !!(p.rack && p.rack.trim());
export const locationCodes = (p: InvProduct): string[] =>
  [p.rack, p.rackAlt].map((x) => (x || "").trim()).filter((x) => !!x);
// the "zone" = the leading rack/almirah token (letters or a prefix before a separator),
// used to group & sort locations together (A1, A2, A3 sit under zone "A")
export const rackZone = (code: string) => {
  const c = (code || "").trim();
  const m = c.match(/^[A-Za-z]+/) || c.match(/^[^\s\-_/.]+/);
  return (m ? m[0] : c).toUpperCase();
};
// compose Rack + Shelf + Bin into a single code, e.g. ("A","3","12") → "A3-12"
export const composeRack = (rack: string, shelf: string, bin: string) => {
  const r = (rack || "").trim().toUpperCase();
  const s = (shelf || "").trim();
  const b = (bin || "").trim();
  if (!r) return "";
  return `${r}${s}${b ? "-" + b : ""}`;
};
export const normalizeRack = (code: string) => (code || "").trim().toUpperCase();
// distinct location codes actually used across the inventory (for seeding the rack registry)
export const distinctRacks = (inv: InvProduct[]): string[] =>
  [...new Set(inv.map((p) => normalizeRack(p.rack)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
export type RackGroup = { code: string; zone: string; items: InvProduct[] };
// group inventory by primary location code, sorted naturally (A1 < A2 < A10 < B1).
// `registry` codes are always included even when no medicine sits there yet (manually-created empty racks).
export const groupByLocation = (inv: InvProduct[], registry: string[] = []): RackGroup[] => {
  const map = new Map<string, InvProduct[]>();
  for (const c of registry) { const code = normalizeRack(c); if (code && !map.has(code)) map.set(code, []); }
  for (const p of inv) {
    const c = normalizeRack(p.rack);
    if (!c) continue;
    if (!map.has(c)) map.set(c, []);
    map.get(c)!.push(p);
  }
  return [...map.entries()]
    .map(([code, items]) => ({ code, zone: rackZone(code), items }))
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: "base" }));
};
// does a search term match this product's location code(s)? (rack → medicine lookups)
export const matchesLocation = (p: InvProduct, term: string) => {
  const t = term.trim().toLowerCase();
  if (!t) return false;
  return locationCodes(p).some((c) => c.toLowerCase().includes(t));
};

// ── barcode / batch scanning ────────────────────────────────────
// Each batch carries a deterministic scannable barcode (GS1-ish), so a scanner
// resolves the exact product + batch. Used by POS & Hospital billing.
export const batchBarcode = (p: InvProduct, b: Batch): string => {
  let h = 5381; const s = p.id + "|" + b.batchNo;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return "890" + String(h).padStart(10, "0").slice(-10);
};
export type ScanHit = { product: InvProduct; batch?: Batch };
const scanNorm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
// resolve a scanned/typed code → product + batch (barcode → batch no. → product name/id)
export const findScan = (inv: InvProduct[], raw: string): ScanHit | null => {
  const code = (raw || "").trim(); if (!code) return null;
  const nc = scanNorm(code);
  for (const p of inv) for (const b of p.batches) if (batchBarcode(p, b) === code) return { product: p, batch: b };
  for (const p of inv) for (const b of p.batches) if (b.batchNo && scanNorm(b.batchNo) === nc) return { product: p, batch: b };
  const p = inv.find((x) => scanNorm(x.id) === nc || scanNorm(x.name) === nc) || inv.find((x) => nc.length >= 3 && scanNorm(x.name).includes(nc));
  return p ? { product: p } : null;
};

export const sellPrice = (p: InvProduct) => p.onlinePrice ?? (p.batches[0]?.mrp ?? 0);
export const mrpOf = (p: InvProduct) => p.batches[0]?.mrp ?? 0;

// ── prescription analytics helpers ──
export const RX_SLA_MINS = 120;                              // target: review within 2 hours
export const rxNeedsAction = (r: Prescription) => r.status === "pending" || r.status === "approved";
// minutes a pending Rx has been waiting (0 for actioned ones)
export const rxWaitMins = (r: Prescription, now: number) => r.status === "pending" ? Math.max(0, Math.round((now - r.uploadedAt) / 60000)) : 0;
export const rxOverdue = (r: Prescription, now: number) => r.status === "pending" && rxWaitMins(r, now) > RX_SLA_MINS;
// upload → dispensed/rejected turnaround in minutes (null if still open)
export const rxTurnaroundMins = (r: Prescription): number | null => {
  const end = r.dispensedAt ?? r.rejectedAt;
  return end ? Math.max(0, Math.round((end - r.uploadedAt) / 60000)) : null;
};
// verified line items → live stock + pricing
export type RxAvailability = { items: { p: InvProduct; stock: number; price: number; rx: boolean }[]; value: number; total: number; inStock: number; outOfStock: InvProduct[] };
export const rxAvailability = (r: Prescription, inventory: InvProduct[]): RxAvailability => {
  const items = r.items.map((id) => inventory.find((p) => p.id === id)).filter(Boolean).map((p) => {
    const prod = p as InvProduct;
    return { p: prod, stock: stockOf(prod), price: sellPrice(prod), rx: SCHEDULE_META[prod.schedule].rx };
  });
  const outOfStock = items.filter((x) => x.stock <= 0).map((x) => x.p);
  return { items, value: items.reduce((a, x) => a + x.price, 0), total: items.length, inStock: items.filter((x) => x.stock > 0).length, outOfStock };
};
// count of Rx-schedule (Sch-H/H1/X) items on the prescription
export const rxScheduledCount = (r: Prescription, inventory: InvProduct[]) =>
  r.items.map((id) => inventory.find((p) => p.id === id)).filter((p) => p && SCHEDULE_META[p.schedule].rx).length;
// friendly minutes → "1h 20m" / "45m" / "2d"
export const fmtMins = (m: number | null): string => {
  if (m == null) return "—";
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60 ? (m % 60) + "m" : ""}`.trim();
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`.trim();
};
// the per-product "direct offer" created from the online-store page (id = "od-<productId>")
export const directOfferId = (productId: string) => "od-" + productId;
export const directOfferOf = (p: InvProduct, offers: Offer[]): Offer | undefined =>
  offers.find((o) => o.id === directOfferId(p.id));
// customer-facing online price after the product's applied offer (offerId)
export const onlineOfferPrice = (p: InvProduct, offers: Offer[]): number => {
  const base = p.onlinePrice ?? mrpOf(p);
  const of = offers.find((o) => o.id === p.offerId && o.active && o.online);
  if (!of) return base;
  return of.type === "pct" ? Math.round(base * (1 - of.value / 100)) : Math.max(0, base - of.value);
};

// ── loose / per-tablet selling (offline counter) ────────────────
const round2 = (n: number) => Math.round(n * 100) / 100;
/** Tablets/capsules per pack, parsed from the pack label (e.g. "Strip of 15" → 15). */
export const unitsPerPack = (p: InvProduct): number => {
  const m = p.pack.match(/(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
};
/** Physically splittable into individual tablets/capsules (form + multi-unit pack). */
export const isLooseEligible = (p: InvProduct) => (p.form === "Tablet" || p.form === "Capsule") && unitsPerPack(p) > 1;
/** Sold loose = eligible AND the owner has enabled it (defaults on for eligible items). */
export const looseSellable = (p: InvProduct) => isLooseEligible(p) && (p.looseAllowed ?? true);
export const unitNoun = (p: InvProduct) => (p.form === "Capsule" ? "capsule" : "tablet");
/** Auto-calculated price of one loose tablet/capsule. */
export const perUnitPrice = (p: InvProduct) => round2(sellPrice(p) / unitsPerPack(p));
export const perUnitMrp = (p: InvProduct) => round2(mrpOf(p) / unitsPerPack(p));

// ── strip + loose-unit stock display ────────────────────────────
/** The selling-unit noun for a product's full pack — strip / bottle / tube / jar / vial / box. */
export const packNoun = (p: InvProduct): string => {
  const pk = (p.pack || "").toLowerCase();
  if (/\btube\b/.test(pk)) return "tube";
  if (/\bbottle\b/.test(pk)) return "bottle";
  if (/\bjar\b/.test(pk)) return "jar";
  if (/\bsachet\b/.test(pk)) return "sachet";
  if (/\bvial\b|\bampoule\b/.test(pk)) return "vial";
  if (/\bbox\b/.test(pk)) return "box";
  if (/\bstrip\b/.test(pk)) return "strip";
  switch (p.form) {
    case "Tablet":
    case "Capsule": return "strip";
    case "Syrup": return "bottle";
    case "Drops": return "bottle";
    case "Cream": return "tube";
    case "Injection": return "vial";
    case "Device": return "unit";
    default: return "pack";
  }
};
/** Pluralise a pack/unit noun (box → boxes, strip → strips). */
export const plural = (noun: string, n: number) => (n === 1 ? noun : noun.endsWith("x") ? noun + "es" : noun + "s");
export const looseUnitsOf = (p: InvProduct) => p.looseUnits ?? 0;
/** Total sellable tablets = full strips × units + opened loose units. */
export const totalUnits = (p: InvProduct) => stockOf(p) * unitsPerPack(p) + looseUnitsOf(p);
/** Human stock label: "155 strips + 11 tablets", "9 bottles", "40 tubes". */
export const stockLabel = (p: InvProduct) => {
  const packs = stockOf(p), loose = looseUnitsOf(p);
  if (looseSellable(p) || loose > 0) {
    const base = `${packs} ${plural(packNoun(p), packs)}`;
    return loose > 0 ? `${base} + ${loose} ${plural(unitNoun(p), loose)}` : base;
  }
  return `${packs} ${plural(packNoun(p), packs)}`;
};

export const isLowStock = (p: InvProduct) => stockOf(p) <= p.reorderLevel;

/** Earliest-expiring batch (FEFO — first-expiry-first-out). */
export const earliestBatch = (p: InvProduct): Batch | null => {
  const withStock = p.batches.filter((b) => b.qty > 0);
  if (!withStock.length) return p.batches[0] ?? null;
  return [...withStock].sort((a, b) => a.expiry.localeCompare(b.expiry))[0];
};

/** Months until a "YYYY-MM" expiry relative to a stamped now (ms). */
export const monthsToExpiry = (expiry: string, now: number) => {
  const d = new Date(now);
  const [y, m] = expiry.split("-").map(Number);
  return (y - d.getFullYear()) * 12 + (m - (d.getMonth() + 1));
};
export const isExpiringSoon = (p: InvProduct, now: number, withinMonths = 4) => {
  const b = earliestBatch(p);
  if (!b) return false;
  const mo = monthsToExpiry(b.expiry, now);
  return mo <= withinMonths; // includes already-expired (negative)
};
export const isExpired = (expiry: string, now: number) => monthsToExpiry(expiry, now) < 0;

export const stockValue = (p: InvProduct) => p.batches.reduce((a, b) => a + b.qty * b.ptr, 0);

// ── GST-inclusive invoice maths ─────────────────────────────────
// MRP/selling price is GST-inclusive (Indian retail). We back out the
// taxable value and split tax into CGST + SGST (intra-state).
export type TaxLine = { gst: number; taxable: number; cgst: number; sgst: number };
export type InvoiceTotals = {
  gross: number;          // sum(price*qty), GST-inclusive
  discount: number;
  net: number;            // gross - discount (inclusive)
  taxable: number;        // net ex-GST
  totalTax: number;
  cgst: number;
  sgst: number;
  roundOff: number;
  payable: number;        // rounded net
  lines: TaxLine[];       // tax slab breakup
  savings: number;        // MRP savings vs gross
};

export function computeInvoice(
  items: { qty: number; mrp: number; price: number; gst: number }[],
  discount = 0
): InvoiceTotals {
  const gross = items.reduce((a, it) => a + it.price * it.qty, 0);
  const mrpTotal = items.reduce((a, it) => a + it.mrp * it.qty, 0);
  const disc = Math.min(discount, gross);
  const net = gross - disc;
  const factor = gross > 0 ? net / gross : 1; // spread discount proportionally

  const slabs = new Map<number, number>(); // gst% -> inclusive line total (post-discount)
  for (const it of items) {
    const lineNet = it.price * it.qty * factor;
    slabs.set(it.gst, (slabs.get(it.gst) ?? 0) + lineNet);
  }
  const lines: TaxLine[] = [];
  let taxable = 0, totalTax = 0;
  for (const [gst, incl] of [...slabs.entries()].sort((a, b) => a[0] - b[0])) {
    const tax = incl - incl / (1 + gst / 100);
    const tx = incl - tax;
    taxable += tx; totalTax += tax;
    lines.push({ gst, taxable: tx, cgst: tax / 2, sgst: tax / 2 });
  }
  const payable = Math.round(net);
  const roundOff = payable - net;
  return {
    gross, discount: disc, net, taxable, totalTax,
    cgst: totalTax / 2, sgst: totalTax / 2,
    roundOff, payable, lines,
    savings: mrpTotal - gross + disc,
  };
}

export const channelLabel = (c: Channel) => (c === "online" ? "Online" : "Counter");

export const timeAgo = (ts: number, now: number) => {
  const mins = Math.max(0, Math.round((now - ts) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return mins + " min ago";
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + " hr ago";
  return Math.round(hrs / 24) + " d ago";
};

export const fmtDateTime = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// ════════════════════════════════════════════════════════════════
// Purchases / goods-inward (GRN) — distributor billing auto-stocks
// ════════════════════════════════════════════════════════════════
// A line on a distributor's purchase invoice. On save, each line either
// tops up an existing batch or creates a new batch / new product.
export type PurchaseItem = {
  productId: string | null;   // null = a brand-new product to add to the catalogue
  name: string;
  batchNo: string;
  expiry: string;             // "YYYY-MM"
  qty: number;                // billed (charged) units
  freeQty: number;            // scheme/free goods — stocked but not charged
  ptr: number;                // purchase rate per unit (ex-GST, "price to retailer")
  mrp: number;                // printed MRP for this batch
  gst: number;                // GST %
  hsn: string;
  // catalogue meta — used only when productId === null (new product)
  composition?: string;
  manufacturer?: string;
  form?: DosageForm;
  pack?: string;
  category?: string;
  schedule?: Schedule;
  reorderLevel?: number;
  emoji?: string;
};

export type Purchase = {
  id: string;                 // internal GRN no e.g. "GRN-3104"
  supplierId: string;
  supplierName: string;
  invoiceNo: string;          // distributor's invoice number
  invoiceDate: string;        // "YYYY-MM-DD"
  items: PurchaseItem[];
  createdAt: number;
};

export type PurchaseTotals = { taxable: number; gst: number; total: number; units: number; lines: number };
export function purchaseTotals(items: PurchaseItem[]): PurchaseTotals {
  let taxable = 0, gst = 0, units = 0;
  for (const it of items) {
    const t = it.ptr * it.qty;          // free goods are not charged
    taxable += t; gst += (t * it.gst) / 100; units += it.qty + (it.freeQty || 0);
  }
  return { taxable, gst, total: taxable + gst, units, lines: items.length };
}

// a fresh blank purchase line (defaults inherited from a product if given)
export const blankPurchaseItem = (p?: InvProduct): PurchaseItem => ({
  productId: p?.id ?? null,
  name: p?.name ?? "",
  batchNo: "",
  expiry: "2027-06",
  qty: 0,
  freeQty: 0,
  ptr: p?.batches[0]?.ptr ?? 0,
  mrp: p ? mrpOf(p) : 0,
  gst: p?.gst ?? 12,
  hsn: p?.hsn ?? "3004",
  composition: "", manufacturer: "", form: "Tablet", pack: "", category: "fever",
  schedule: "OTC", reorderLevel: 20, emoji: "💊",
});

// ════════════════════════════════════════════════════════════════
// Staff / users · subscription · invoice settings · kiosk · CA · PO
// ════════════════════════════════════════════════════════════════

// ── staff & roles ───────────────────────────────────────────────
export type UserRole = "Owner" | "Manager" | "Pharmacist" | "Cashier";
export const ROLE_PERMS: Record<UserRole, string[]> = {
  Owner: ["Full access", "Billing", "Inventory", "Reports & accounts", "Manage users", "Settings"],
  Manager: ["Billing", "Inventory", "Purchases", "Reports", "Online store"],
  Pharmacist: ["Billing", "Prescriptions", "Inventory", "Dispense Rx"],
  Cashier: ["Billing / POS", "Counter orders"],
};
export type StaffUser = { id: string; name: string; role: UserRole; phone: string; email: string; active: boolean; lastActiveMins: number; pin: string; username?: string; password?: string; permissions?: string[] };
export const SEED_USERS: StaffUser[] = [
  { id: "u1", name: "Rajesh Kumar", role: "Owner", phone: "+91 98860 12345", email: "rajesh@srisai.in", active: true, lastActiveMins: 2, pin: "1101", username: "rajesh.owner", password: "Rajesh@2481" },
  { id: "u2", name: "Anjali Menon", role: "Pharmacist", phone: "+91 99016 55421", email: "anjali@srisai.in", active: true, lastActiveMins: 38, pin: "2202", username: "anjali.rx", password: "Anjali@7730" },
  { id: "u3", name: "Suresh Babu", role: "Cashier", phone: "+91 97411 90087", email: "suresh@srisai.in", active: true, lastActiveMins: 140, pin: "3303", username: "suresh.pos", password: "Suresh@5192" },
  { id: "u4", name: "Deepa Rao", role: "Manager", phone: "+91 90080 33219", email: "deepa@srisai.in", active: false, lastActiveMins: 5880, pin: "4404", username: "deepa.mgr", password: "Deepa@3648" },
];

// ── granular module permissions (what a user can see & use) ──────
export type PermModule = { key: string; label: string; desc: string };
export type PermGroup = { group: string; items: PermModule[] };
export const PERMISSION_CATALOG: PermGroup[] = [
  { group: "Sales & billing", items: [
    { key: "pos", label: "Billing / POS", desc: "Create bills & take payments" },
    { key: "orders", label: "Online orders", desc: "View & fulfil delivery orders" },
    { key: "prescriptions", label: "Prescriptions", desc: "View & dispense Rx" },
    { key: "credit", label: "Credit / Khata", desc: "Customer credit ledgers" },
  ] },
  { group: "Inventory", items: [
    { key: "inventory", label: "Inventory & stock", desc: "Stock, batches & expiry" },
    { key: "purchases", label: "Purchases", desc: "Record supplier purchases" },
    { key: "rackmap", label: "Rack & locations", desc: "Arrange medicine racks" },
    { key: "distributors", label: "Distributors", desc: "Supplier directory" },
  ] },
  { group: "Insights", items: [
    { key: "dashboard", label: "Dashboard", desc: "Sales analytics & KPIs" },
    { key: "reports", label: "Reports & accounts", desc: "Financial reports & GST" },
    { key: "crm", label: "CRM / Patients", desc: "Customer 360° profiles" },
  ] },
  { group: "Store & administration", items: [
    { key: "online_store", label: "Online store & offers", desc: "Storefront & promotions" },
    { key: "employees", label: "Employees & payroll", desc: "HR records & documents" },
    { key: "users", label: "Manage users", desc: "Add staff & set access" },
    { key: "settings", label: "Settings & billing setup", desc: "Business & invoice config" },
  ] },
];
export const PERM_LABEL: Record<string, string> = Object.fromEntries(
  PERMISSION_CATALOG.flatMap((g) => g.items.map((i) => [i.key, i.label])),
);
export const ALL_PERM_KEYS: string[] = PERMISSION_CATALOG.flatMap((g) => g.items.map((i) => i.key));
export const ROLE_DEFAULT_PERMS: Record<UserRole, string[]> = {
  Owner: [...ALL_PERM_KEYS],
  Manager: ["dashboard", "pos", "orders", "prescriptions", "credit", "inventory", "purchases", "rackmap", "distributors", "reports", "crm", "online_store"],
  Pharmacist: ["pos", "orders", "prescriptions", "inventory", "rackmap", "crm"],
  Cashier: ["pos", "orders", "credit"],
};
// Effective permission set for a user (explicit list, else role defaults)
export const userPerms = (u: StaffUser): string[] => u.permissions ?? ROLE_DEFAULT_PERMS[u.role];
// Human-friendly password: Capitalised base + symbol + 4 digits. Call inside an event handler only.
export const genPassword = (name?: string): string => {
  const base = (name || "Namma").replace(/[^a-zA-Z]/g, "").slice(0, 8) || "Namma";
  const cap = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
  const n = 1000 + Math.floor(Math.random() * 9000);
  return `${cap}@${n}`;
};
export const suggestUsername = (name: string, role: UserRole): string => {
  const first = (name.trim().split(/\s+/)[0] || "user").toLowerCase().replace(/[^a-z0-9]/g, "");
  const tag = role === "Owner" ? "owner" : role === "Manager" ? "mgr" : role === "Pharmacist" ? "rx" : "pos";
  return `${first || "user"}.${tag}`;
};

// ── subscription / SaaS plan ────────────────────────────────────
export type Plan = "Free" | "Starter" | "Growth" | "Pro";
export type PlanInfo = { key: Plan; name: string; price: number; seats: string; tagline: string; features: string[] };
export const PLANS: PlanInfo[] = [
  { key: "Free", name: "Free", price: 0, seats: "2 users", tagline: "Core billing — free forever", features: ["Billing / POS & GST invoices", "Inventory, batches & expiry", "Purchases & goods-inward", "Up to 2 users"] },
  { key: "Starter", name: "Starter", price: 699, seats: "2 users", tagline: "Single counter", features: ["Everything in Free", "Prescriptions & customers", "Credit / Khata ledger", "Email support"] },
  { key: "Growth", name: "Growth", price: 1499, seats: "5 users", tagline: "Most popular", features: ["Everything in Starter", "Online store + orders", "Reports, CRM & CA sharing", "Reorder & distributors", "Up to 5 users"] },
  { key: "Pro", name: "Pro", price: 2999, seats: "Unlimited", tagline: "Hospital, kiosk & more", features: ["Everything in Growth", "Hospital / IPD billing suite", "Self-order kiosk", "Unlimited users & branches", "Priority support"] },
];
export type BillingCycle = "monthly" | "annual";
// annual-billing discount per plan tier (paid yearly upfront)
export const ANNUAL_DISCOUNT: Record<Plan, number> = { Free: 0, Starter: 0.05, Growth: 0.15, Pro: 0.20 };
export const GST_RATE = 0.18; // SaaS subscription GST
// list price for a plan on the chosen billing cycle (annual = 12 mo less tier discount)
export const planPrice = (p: PlanInfo, cycle: BillingCycle): number =>
  cycle === "annual" ? Math.round(p.price * 12 * (1 - ANNUAL_DISCOUNT[p.key])) : p.price;
// what you save in a year by paying annually vs 12 monthly bills
export const annualSavings = (p: PlanInfo): number => Math.round(p.price * 12 * ANNUAL_DISCOUNT[p.key]);
// effective per-month price when billed annually
export const annualPerMonth = (p: PlanInfo): number => Math.round(planPrice(p, "annual") / 12);
export const cycleNoun = (c: BillingCycle) => (c === "annual" ? "year" : "month");

export type Subscription = { plan: Plan; cycle: BillingCycle; status: "active" | "expiring" | "expired"; renewsOn: string; since: string; autoRenew: boolean };
export const DEFAULT_SUBSCRIPTION: Subscription = { plan: "Free", cycle: "monthly", status: "active", renewsOn: "—", since: "2026-07-01", autoRenew: false };

// ── freemium gating ─────────────────────────────────────────────
// Core features that are FREE FOR EVERYONE, forever — no subscription needed.
export const FREE_ROUTES: string[] = ["pos", "inventory", "purchases", "invoicing"];
// Account / shell routes that are always reachable (so users can manage & upgrade).
export const ALWAYS_ROUTES: string[] = ["dashboard", "account", "subscription", "settings", "support", "notifications", "menu", "refer"];
// a paid plan (Free never unlocks the premium modules; expired plans lock too)
export const planUnlocksAll = (sub: Subscription) => sub.plan !== "Free" && sub.status !== "expired";
export const routeIsFree = (route: string) => FREE_ROUTES.includes(route) || ALWAYS_ROUTES.includes(route);
// is this route behind the paywall for the current subscription?
export const routeLocked = (route: string, sub: Subscription) => !routeIsFree(route) && !planUnlocksAll(sub);
// smallest paid plan that unlocks a given premium route (for the upsell copy)
export const planForRoute = (route: string): Plan => {
  if (route === "prescriptions" || route === "customers" || route === "khata") return "Starter";
  if (["wards", "hospbill", "ptbills", "salesreg", "indents", "departments", "doctors", "kiosk"].includes(route)) return "Pro";
  return "Growth";
};

// ── invoice settings (drives the printed invoice) ───────────────
export type InvoiceTemplate = "classic" | "modern" | "minimal" | "thermal";
export const INVOICE_TEMPLATES: { key: InvoiceTemplate; name: string; desc: string }[] = [
  { key: "classic", name: "Classic", desc: "Traditional GST invoice, ruled header" },
  { key: "modern", name: "Modern", desc: "Coloured header band with logo" },
  { key: "minimal", name: "Minimal", desc: "Clean, airy, thin lines" },
  { key: "thermal", name: "Thermal", desc: "80mm receipt / counter roll" },
];
export const INVOICE_ACCENTS = ["#1B3D29", "#2F7D52", "#1f7d8c", "#2f5fd0", "#6d4fc4", "#b9842f", "#c0392b"];
export const INVOICE_TITLES = ["TAX INVOICE", "INVOICE", "RETAIL INVOICE", "BILL OF SUPPLY", "CASH MEMO", "CREDIT NOTE"];
export type InvoiceSettings = {
  prefix: string;
  terms: string;
  footerNote: string;
  showSavings: boolean;
  includeDoctor: boolean;
  showBank: boolean;
  bankLine: string;
  signatory: string;
  // ── customisation ──
  template: InvoiceTemplate;
  accent: string;          // brand accent colour (header band / totals / title)
  title: string;           // document title text
  showLogo: boolean;       // render the pharmacy brand logo (profile.logo)
  showStamp: boolean;      // render the signature / seal stamp
  stamp?: string;          // data URL of an uploaded rubber-stamp / seal image
  showHsn: boolean;        // include the HSN column
};
export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  prefix: "INV-",
  terms: "Goods once sold are not returnable. Subject to local jurisdiction.",
  footerNote: "Thank you — get well soon! Powered by Namma MedMate.",
  showSavings: true,
  includeDoctor: true,
  showBank: false,
  bankLine: "HDFC Bank · A/c 50100XXXXXX · IFSC HDFC0000123",
  signatory: "Authorised signatory",
  template: "classic",
  accent: "#1B3D29",
  title: "TAX INVOICE",
  showLogo: true,
  showStamp: false,
  showHsn: true,
};

// ── self-order kiosk (Mc-model) ─────────────────────────────────
export type KioskConfig = {
  enabled: boolean;
  displayName: string;
  pin: string;
  welcome: string;
  showPrices: boolean;
  allowRx: boolean;
  payModes: PayMode[];
  idleResetSec: number;
  accent: "green" | "dark" | "gold";
};
export const DEFAULT_KIOSK: KioskConfig = {
  enabled: true,
  displayName: "Sri Sai Medicals — Self Order",
  pin: "4321",
  welcome: "Tap to order your medicines & wellness products",
  showPrices: true,
  allowRx: true,
  payModes: ["upi", "card", "cash"],
  idleResetSec: 60,
  accent: "green",
};

// ── CA report sharing ───────────────────────────────────────────
export type AdvisorType = "CA" | "Accountant";
export type Advisor = { id: string; type: AdvisorType; name: string; firm: string; email: string; phone: string };
export const SEED_ADVISORS: Advisor[] = [
  { id: "adv1", type: "CA", name: "CA Sunil Sharma", firm: "Sharma & Associates", email: "sunil@sharmaca.in", phone: "+91 98450 70012" },
  { id: "adv2", type: "Accountant", name: "Meena Iyer", firm: "In-house Accounts", email: "meena@srisai.in", phone: "+91 98861 22019" },
];
export const CA_REPORT_TYPES = [
  { key: "gst", label: "GST summary (GSTR-ready)", icon: "🧾" },
  { key: "sales", label: "Sales register", icon: "🛒" },
  { key: "purchase", label: "Purchase register", icon: "🚚" },
  { key: "pl", label: "Profit & Loss statement", icon: "📈" },
  { key: "stock", label: "Closing stock valuation", icon: "📦" },
];
export type CAShare = { id: string; period: string; reports: string[]; sentTo: string; recipient: string; createdAt: number };
type SeedShare = Omit<CAShare, "createdAt"> & { minsAgo: number };
export const SEED_CA_SHARES: SeedShare[] = [
  { id: "CA-204", period: "May 2026", reports: ["gst", "sales", "pl"], sentTo: "sunil@sharmaca.in", recipient: "CA Sunil Sharma", minsAgo: 26 * 1440 },
];

// ── purchase orders (reorder → distributor) ─────────────────────
export type POItem = { productId: string; name: string; qty: number };
export type POStatus = "draft" | "sent" | "received";
export type PurchaseOrder = { id: string; supplierId: string; supplierName: string; items: POItem[]; status: POStatus; note?: string; createdAt: number };
type SeedPO = Omit<PurchaseOrder, "createdAt"> & { minsAgo: number };
export const SEED_PURCHASE_ORDERS: SeedPO[] = [
  { id: "PO-512", supplierId: "s1", supplierName: "Bengaluru Pharma Distributors", items: [{ productId: "p7", name: "Benadryl Cough Syrup", qty: 24 }], status: "sent", minsAgo: 180 },
];

// ── distributor supply list (which products each distributor supplies) ──
// many-to-many: the SAME medicine can be sourced from several distributors,
// each quoting their own purchase price (PTR) so prices can be compared.
export type SupplyEntry = {
  id: string;
  productId: string;
  supplierId: string;
  purchasePrice: number;   // ₹ per pack quoted by this distributor (cost / PTR)
  mrp?: number;            // MRP quoted by this distributor (optional)
  preferred?: boolean;     // owner's preferred source for this product
  bonusBuy?: number;       // free-goods scheme: buy N …
  bonusFree?: number;      // … get M free (e.g. 10 + 1)
  note?: string;           // e.g. "free shipping above ₹5000", credit note, etc.
};
// free-goods scheme label, e.g. "10+1" (or "" if none)
export const schemeLabel = (e: SupplyEntry): string =>
  (e.bonusBuy && e.bonusFree) ? `${e.bonusBuy}+${e.bonusFree}` : "";
// landed cost per pack AFTER applying the free-goods bonus scheme
export const effectiveSupplyPrice = (e: SupplyEntry): number => {
  const buy = e.bonusBuy || 0, free = e.bonusFree || 0;
  if (buy > 0 && free > 0) return (e.purchasePrice * buy) / (buy + free);
  return e.purchasePrice;
};
export const SEED_SUPPLY: SupplyEntry[] = [
  // Dolo 650 — common item, 3 distributors. s1 lists higher but a 10+1 scheme
  // makes its LANDED price the lowest (₹24.50 → ₹22.27/pack).
  { id: "sl1", productId: "p1", supplierId: "s1", purchasePrice: 24.5, mrp: 34, preferred: true, bonusBuy: 10, bonusFree: 1, note: "10+1 scheme" },
  { id: "sl2", productId: "p1", supplierId: "s2", purchasePrice: 23.8, mrp: 34 },
  { id: "sl3", productId: "p1", supplierId: "s3", purchasePrice: 25.1, mrp: 34 },
  // Crocin Advance
  { id: "sl4", productId: "p2", supplierId: "s1", purchasePrice: 23.0, mrp: 33 },
  { id: "sl5", productId: "p2", supplierId: "s3", purchasePrice: 22.4, mrp: 33, preferred: true },
  // Combiflam
  { id: "sl6", productId: "p3", supplierId: "s2", purchasePrice: 38.0, mrp: 52 },
  { id: "sl7", productId: "p3", supplierId: "s3", purchasePrice: 37.2, mrp: 52, preferred: true },
  // Vicks Action 500
  { id: "sl8", productId: "p5", supplierId: "s1", purchasePrice: 35.0, mrp: 49 },
  { id: "sl9", productId: "p5", supplierId: "s2", purchasePrice: 34.5, mrp: 49, preferred: true },
  // Cetirizine 10mg — common item, 3 distributors. s3's 9+1 scheme makes its
  // landed price the lowest (₹14.80 → ₹13.32/pack).
  { id: "sl10", productId: "p6", supplierId: "s1", purchasePrice: 15.0, mrp: 24 },
  { id: "sl11", productId: "p6", supplierId: "s2", purchasePrice: 14.2, mrp: 24, preferred: true },
  { id: "sl12", productId: "p6", supplierId: "s3", purchasePrice: 14.8, mrp: 24, bonusBuy: 9, bonusFree: 1, note: "9+1 scheme" },
  // Metformin 500mg
  { id: "sl13", productId: "p9", supplierId: "s1", purchasePrice: 22.0, mrp: 38 },
  { id: "sl14", productId: "p9", supplierId: "s3", purchasePrice: 21.0, mrp: 38, preferred: true },
  // Accu-Chek Active Strips (medical device)
  { id: "sl15", productId: "p10", supplierId: "s2", purchasePrice: 880, mrp: 1100 },
  { id: "sl16", productId: "p10", supplierId: "s3", purchasePrice: 865, mrp: 1100, preferred: true },
  // Glycomet GP1
  { id: "sl17", productId: "p11", supplierId: "s1", purchasePrice: 92, mrp: 124 },
  { id: "sl18", productId: "p11", supplierId: "s2", purchasePrice: 90.5, mrp: 124, preferred: true },
  // Amlodipine 5mg
  { id: "sl19", productId: "p12", supplierId: "s2", purchasePrice: 18.0, mrp: 32 },
  { id: "sl20", productId: "p12", supplierId: "s3", purchasePrice: 17.4, mrp: 32, preferred: true },
  // Atorvastatin 10mg
  { id: "sl21", productId: "p13", supplierId: "s1", purchasePrice: 78, mrp: 112 },
  { id: "sl22", productId: "p13", supplierId: "s2", purchasePrice: 76.5, mrp: 112, preferred: true },
];
// cheapest supply row for a product by LANDED price (after free-goods bonus)
export const bestSupplyFor = (productId: string, list: SupplyEntry[]): SupplyEntry | undefined => {
  const rows = list.filter((s) => s.productId === productId);
  if (!rows.length) return undefined;
  return rows.reduce((a, b) => (effectiveSupplyPrice(b) < effectiveSupplyPrice(a) ? b : a));
};
// is this product a medical device (vs a medicine)?
export const isDevice = (p: InvProduct): boolean => p.form === "Device" || p.category === "devices";

// allotted distributor for a product (explicit, else deterministic fallback)
export const allottedSupplierId = (p: InvProduct, suppliers: Supplier[]): string => {
  if (p.supplierId && suppliers.some((s) => s.id === p.supplierId)) return p.supplierId;
  const list = suppliers.length ? suppliers : SEED_SUPPLIERS;
  return list[(p.id.charCodeAt(1) + (p.id.charCodeAt(2) || 0)) % list.length].id;
};
// suggested distributor for reordering: owner's explicit choice wins, else the
// cheapest landed-price supplier (after bonus), else the deterministic fallback.
export const suggestedSupplierId = (p: InvProduct, suppliers: Supplier[], supplyList: SupplyEntry[]): string => {
  if (p.supplierId && suppliers.some((s) => s.id === p.supplierId)) return p.supplierId;
  const cheapest = bestSupplyFor(p.id, supplyList);
  if (cheapest && suppliers.some((s) => s.id === cheapest.supplierId)) return cheapest.supplierId;
  return allottedSupplierId(p, suppliers);
};
// suggested reorder qty to bring stock up to ~2× the reorder level
export const suggestedReorderQty = (p: InvProduct) => Math.max(0, p.reorderLevel * 2 - stockOf(p));

type SeedPurchase = Omit<Purchase, "createdAt"> & { minsAgo: number };
export const SEED_PURCHASES: SeedPurchase[] = [
  { id: "GRN-3102", supplierId: "s1", supplierName: "Bengaluru Pharma Distributors", invoiceNo: "BPD/26-27/8841", invoiceDate: "2026-06-14", minsAgo: 7200,
    items: [
      { productId: "p1", name: "Dolo 650", batchNo: "DL6A229", expiry: "2027-03", qty: 100, freeQty: 20, ptr: 24.5, mrp: 34, gst: 12, hsn: "3004" },
      { productId: "p9", name: "Metformin 500mg", batchNo: "MET2218", expiry: "2027-02", qty: 140, freeQty: 0, ptr: 22, mrp: 38, gst: 5, hsn: "3004" },
    ] },
  { id: "GRN-3103", supplierId: "s3", supplierName: "Apollo Wholesale", invoiceNo: "AW-114520", invoiceDate: "2026-06-16", minsAgo: 4320,
    items: [
      { productId: "p28", name: "Omron BP Monitor", batchNo: "OMR7702", expiry: "2030-01", qty: 7, freeQty: 0, ptr: 1850, mrp: 2495, gst: 12, hsn: "9018" },
    ] },
];

// ════════════════════════════════════════════════════════════════
// Reports & analytics — periods, bucketing, GST, platform payout
// ════════════════════════════════════════════════════════════════

// ── period ranges (day / week / month / year / FY / custom) ─────
export type PeriodKind = "today" | "week" | "month" | "year" | "fy" | "custom";
export const PERIOD_LABEL: Record<PeriodKind, string> = {
  today: "Today", week: "This week", month: "This month",
  year: "This year", fy: "Financial year", custom: "Custom",
};
export type DateRange = { from: number; to: number; label: string; kind: PeriodKind };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

// the Indian financial year (Apr 1 → Mar 31) that contains ts
export const fyOf = (ts: number) => {
  const d = new Date(ts);
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; // Apr = month 3
  return {
    from: new Date(y, 3, 1).getTime(),
    to: new Date(y + 1, 2, 31, 23, 59, 59, 999).getTime(),
    label: `FY ${y}-${String(y + 1).slice(2)}`,
  };
};

export function periodRange(kind: PeriodKind, now: number, from?: number, to?: number): DateRange {
  const d = new Date(now);
  switch (kind) {
    case "week": {
      const dow = (d.getDay() + 6) % 7; // Monday = 0
      const mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
      return { from: startOfDay(mon), to: endOfDay(d), label: "This week", kind };
    }
    case "month":
      return { from: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), to: endOfDay(d), label: d.toLocaleString("en-IN", { month: "long", year: "numeric" }), kind };
    case "year":
      return { from: new Date(d.getFullYear(), 0, 1).getTime(), to: endOfDay(d), label: String(d.getFullYear()), kind };
    case "fy": { const f = fyOf(now); return { ...f, kind }; }
    case "custom": {
      const a = from ?? startOfDay(d), b = to ?? endOfDay(d);
      const lab = `${new Date(a).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })} – ${new Date(b).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}`;
      return { from: a, to: Math.max(a, b), label: lab, kind };
    }
    default:
      return { from: startOfDay(d), to: endOfDay(d), label: "Today", kind: "today" };
  }
}
export const inRange = (ts: number, r: DateRange) => ts >= r.from && ts <= r.to;

// ── per-sale money helpers ──────────────────────────────────────
export const saleTotals = (s: Sale) =>
  computeInvoice(s.items.map((i) => ({ qty: i.qty, mrp: i.mrp, price: i.price, gst: i.gst })), s.discount);
export const salePayable = (s: Sale) => saleTotals(s).payable;
export const validSales = (sales: Sale[]) => sales.filter((s) => s.status !== "cancelled");

// ── sales bucketing for charts (grain auto-picked from span) ────
export type Grain = "hour" | "day" | "week" | "month";
export type Bucket = { key: string; label: string; from: number; to: number; online: number; offline: number; bills: number; total: number };

export function grainOf(r: DateRange): Grain {
  const span = r.to - r.from, DAY = 86400000;
  if (span <= 1.5 * DAY) return "hour";
  if (span <= 35 * DAY) return "day";
  if (span <= 130 * DAY) return "week";
  return "month";
}
export const GRAIN_LABEL: Record<Grain, string> = { hour: "Hourly", day: "Day-wise", week: "Weekly", month: "Month-wise" };

export function bucketSales(sales: Sale[], r: DateRange): Bucket[] {
  const grain = grainOf(r), DAY = 86400000;
  const buckets: Bucket[] = [];
  const add = (from: number, to: number, key: string, label: string) =>
    buckets.push({ key, label, from, to, online: 0, offline: 0, bills: 0, total: 0 });

  if (grain === "hour") {
    const b = new Date(r.from);
    for (let h = 0; h < 24; h += 2) {
      const from = new Date(b.getFullYear(), b.getMonth(), b.getDate(), h).getTime();
      if (from > r.to) break;
      add(from, from + 2 * 3600000 - 1, "h" + h, `${String(h).padStart(2, "0")}h`);
    }
  } else if (grain === "day") {
    let cur = new Date(r.from); cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
    while (cur.getTime() <= r.to) {
      const from = cur.getTime();
      add(from, from + DAY - 1, "d" + from, cur.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }));
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    }
  } else if (grain === "week") {
    let cur = new Date(r.from);
    const dow = (cur.getDay() + 6) % 7;
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() - dow);
    while (cur.getTime() <= r.to) {
      const from = cur.getTime();
      add(from, from + 7 * DAY - 1, "w" + from, cur.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }));
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7);
    }
  } else {
    let cur = new Date(r.from); cur = new Date(cur.getFullYear(), cur.getMonth(), 1);
    while (cur.getTime() <= r.to) {
      const from = cur.getTime();
      const to = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      add(from, to, "m" + from, cur.toLocaleDateString("en-IN", { month: "short" }) + " '" + String(cur.getFullYear()).slice(2));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }

  for (const s of sales) {
    if (s.status === "cancelled" || !inRange(s.createdAt, r)) continue;
    const b = buckets.find((x) => s.createdAt >= x.from && s.createdAt <= x.to);
    if (!b) continue;
    const v = salePayable(s);
    if (s.channel === "online") b.online += v; else b.offline += v;
    b.bills += 1; b.total += v;
  }
  return buckets;
}

// ── channel split + headline totals for a set of sales ──────────
export type SalesSummary = { total: number; online: number; offline: number; bills: number; onlineBills: number; offlineBills: number; tax: number; avg: number; items: number };
export function salesSummary(sales: Sale[]): SalesSummary {
  let total = 0, online = 0, offline = 0, tax = 0, items = 0, onlineBills = 0, offlineBills = 0;
  const ok = validSales(sales);
  for (const s of ok) {
    const t = saleTotals(s);
    total += t.payable; tax += t.totalTax;
    items += s.items.reduce((a, i) => a + i.qty, 0);
    if (s.channel === "online") { online += t.payable; onlineBills++; } else { offline += t.payable; offlineBills++; }
  }
  return { total, online, offline, tax, items, bills: ok.length, onlineBills, offlineBills, avg: ok.length ? total / ok.length : 0 };
}

// ── GST slab summary (CGST + SGST split) ────────────────────────
export type GstSlabRow = { gst: number; taxable: number; cgst: number; sgst: number; tax: number };
export function gstSummary(sales: Sale[]): { rows: GstSlabRow[]; taxable: number; tax: number } {
  const m = new Map<number, { taxable: number; tax: number }>();
  for (const s of validSales(sales)) {
    for (const ln of saleTotals(s).lines) {
      const e = m.get(ln.gst) ?? { taxable: 0, tax: 0 };
      e.taxable += ln.taxable; e.tax += ln.cgst + ln.sgst; m.set(ln.gst, e);
    }
  }
  const rows = [...m.entries()].sort((a, b) => a[0] - b[0]).map(([gst, e]) => ({ gst, taxable: e.taxable, tax: e.tax, cgst: e.tax / 2, sgst: e.tax / 2 }));
  return { rows, taxable: rows.reduce((a, r) => a + r.taxable, 0), tax: rows.reduce((a, r) => a + r.tax, 0) };
}

// ── top-selling products by revenue ─────────────────────────────
export function topProducts(sales: Sale[], inventory: InvProduct[], n = 8): { id: string; name: string; rev: number; qty: number }[] {
  const rev = new Map<string, number>(), qty = new Map<string, number>();
  for (const s of validSales(sales)) for (const it of s.items) {
    rev.set(it.productId, (rev.get(it.productId) ?? 0) + it.price * it.qty);
    qty.set(it.productId, (qty.get(it.productId) ?? 0) + it.qty);
  }
  return [...rev.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([id, r]) => ({ id, name: inventory.find((p) => p.id === id)?.name ?? id, rev: r, qty: qty.get(id) ?? 0 }));
}

// ── Namma MedMate settlement (receivable on online sales) ───────
// Online orders are collected by Namma MedMate, then settled to the pharmacy
// after deducting the platform commission (+ GST on it) and 1% TCS (e-commerce
// operator, u/s 52 — claimable). Funds settle on a T+SETTLE_DAYS cycle.
export const PLATFORM_COMMISSION = 0.08; // 8% of order value
export const PLATFORM_TCS = 0.01;        // 1% TCS
export const SETTLE_DAYS = 7;            // T+7 settlement
export type PayoutLine = { sale: Sale; gross: number; commission: number; commissionGst: number; tcs: number; net: number; settled: boolean; settleOn: number };
export function payoutOf(s: Sale, now: number): PayoutLine {
  const gross = salePayable(s);
  const commission = gross * PLATFORM_COMMISSION;
  const commissionGst = commission * GST_RATE;
  const tcs = gross * PLATFORM_TCS;
  const net = gross - commission - commissionGst - tcs;
  const settleOn = s.createdAt + SETTLE_DAYS * 86400000;
  const settled = now >= settleOn && (s.status === "delivered" || s.status === "completed");
  return { sale: s, gross, commission, commissionGst, tcs, net, settled, settleOn };
}
export type PayoutSummary = { lines: PayoutLine[]; gross: number; commission: number; commissionGst: number; tcs: number; net: number; settled: number; pending: number };
export function payoutSummary(sales: Sale[], now: number): PayoutSummary {
  const lines = validSales(sales).filter((s) => s.channel === "online").map((s) => payoutOf(s, now))
    .sort((a, b) => b.sale.createdAt - a.sale.createdAt);
  const sum = (f: (l: PayoutLine) => number) => lines.reduce((a, l) => a + f(l), 0);
  return {
    lines,
    gross: sum((l) => l.gross), commission: sum((l) => l.commission),
    commissionGst: sum((l) => l.commissionGst), tcs: sum((l) => l.tcs), net: sum((l) => l.net),
    settled: lines.filter((l) => l.settled).reduce((a, l) => a + l.net, 0),
    pending: lines.filter((l) => !l.settled).reduce((a, l) => a + l.net, 0),
  };
}

// ── synthetic sales history ─────────────────────────────────────
// ~13 months of believable counter+online sales so the day/week/month/year/FY
// reports and charts have real depth. Deterministic (seeded LCG, no Math.random)
// and computed per-session in the Reports screen — never persisted.
const HIST_PRODUCTS = ["p1", "p2", "p3", "p5", "p6", "p7", "p9", "p12", "p13", "p15", "p16", "p17", "p19", "p20", "p25", "p28", "p30", "p33", "p35", "p31"];
const HIST_NAMES = ["Anil R", "Kavya S", "Manoj P", "Divya N", "Ravi T", "Sneha M", "Girish B", "Pooja H", "Vimal K", "Asha D", "Naveen G", "Reena C"];
export function buildSalesHistory(now: number, days = 400): Sale[] {
  let seed = 987654321;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const out: Sale[] = [];
  let serial = 1000;
  for (let day = days; day >= 1; day--) {
    const dayTs = now - day * 86400000;
    const d = new Date(dayTs);
    const dow = d.getDay(), month = d.getMonth();
    const seasonal = month >= 5 && month <= 8 ? 1.3 : month === 11 || month === 0 ? 1.15 : 1; // monsoon + winter bump
    const base = dow === 0 ? 2.5 : dow === 6 ? 4 : 3.2;
    const count = Math.max(1, Math.round((base + rnd() * 2.5) * seasonal));
    for (let k = 0; k < count; k++) {
      const online = rnd() < 0.42;
      const at = dayTs + Math.floor((9 + rnd() * 12) * 3600000);
      const nItems = 1 + Math.floor(rnd() * 3);
      const items: SaleItem[] = [];
      for (let j = 0; j < nItems; j++) {
        const pid = pick(HIST_PRODUCTS);
        const p = SEED_INVENTORY.find((x) => x.id === pid)!;
        const b = p.batches[0];
        const qty = 1 + Math.floor(rnd() * 3);
        items.push({ productId: p.id, name: p.name, batchNo: b?.batchNo ?? "-", expiry: b?.expiry ?? "-", hsn: p.hsn, qty, mrp: b?.mrp ?? 0, price: p.onlinePrice ?? b?.mrp ?? 0, gst: p.gst });
      }
      const discount = rnd() < 0.18 ? Math.round((10 + rnd() * 40)) : 0;
      out.push({
        id: "INV-" + (++serial),
        channel: online ? "online" : "offline",
        status: online ? "delivered" : "completed",
        customer: online ? { name: pick(HIST_NAMES), phone: "+91 9" + (700000000 + Math.floor(rnd() * 99999999)) } : { name: "Walk-in" },
        items, discount,
        payMode: online ? (rnd() < 0.5 ? "upi" : "cod") : (rnd() < 0.45 ? "cash" : rnd() < 0.8 ? "upi" : "card"),
        rx: items.some((it) => { const p = SEED_INVENTORY.find((x) => x.id === it.productId); return !!p && p.schedule !== "OTC"; }),
        createdAt: at,
        history: [{ status: online ? "delivered" : "completed", at }],
      });
    }
  }
  return out;
}

// ════════════════════════════════════════════════════════════════
// Expenses — out-of-pocket business spend (rent, salaries, utilities…)
// Feeds the Expense Category / Expense Transaction reports.
// ════════════════════════════════════════════════════════════════
export const EXPENSE_CATEGORIES = [
  "Employee Salaries & Advances", "Rent Expense", "Electricity Bill",
  "Telephone & Internet Expense", "Printing and Stationery", "Repair & Maintenance",
  "Transportation & Travel", "Raw Material", "Marketing & Promotion",
  "Bank Charges", "Miscellaneous",
];

export type Expense = {
  id: string;            // "EXP-1009"
  number: string;        // shown in lists (e.g. "EXP-1009")
  date: number;          // when it was incurred
  party: string;         // paid to (landlord, staff, vendor…)
  category: string;      // one of EXPENSE_CATEGORIES (or custom)
  paymentMode: PayMode;  // how it was paid
  amount: number;        // total paid (GST-inclusive)
  gst?: number;          // GST % (if a tax invoice), else 0
  note?: string;
};

type SeedExpense = Omit<Expense, "date"> & { daysAgo: number };
export const SEED_EXPENSES: SeedExpense[] = [
  { id: "EXP-1008", number: "EXP-1008", party: "Skyline Estates", category: "Rent Expense", paymentMode: "upi", amount: 35000, gst: 0, note: "Shop rent — current month", daysAgo: 5 },
  { id: "EXP-1007", number: "EXP-1007", party: "BESCOM", category: "Electricity Bill", paymentMode: "upi", amount: 4280, gst: 0, note: "Power bill", daysAgo: 6 },
  { id: "EXP-1006", number: "EXP-1006", party: "Rajesh Kumar", category: "Employee Salaries & Advances", paymentMode: "card", amount: 28000, gst: 0, note: "Pharmacist salary", daysAgo: 8 },
  { id: "EXP-1005", number: "EXP-1005", party: "ACT Fibernet", category: "Telephone & Internet Expense", paymentMode: "upi", amount: 1180, gst: 18, note: "Broadband", daysAgo: 9 },
  { id: "EXP-1004", number: "EXP-1004", party: "Sai Printers", category: "Printing and Stationery", paymentMode: "cash", amount: 2360, gst: 18, note: "Bill books & labels", daysAgo: 14 },
  { id: "EXP-1003", number: "EXP-1003", party: "CoolCare Services", category: "Repair & Maintenance", paymentMode: "cash", amount: 1800, gst: 18, note: "Fridge servicing", daysAgo: 22 },
  { id: "EXP-1002", number: "EXP-1002", party: "Ola Cabs", category: "Transportation & Travel", paymentMode: "upi", amount: 640, gst: 0, note: "Stock pickup", daysAgo: 33 },
  { id: "EXP-1001", number: "EXP-1001", party: "Skyline Estates", category: "Rent Expense", paymentMode: "upi", amount: 35000, gst: 0, note: "Shop rent — last month", daysAgo: 36 },
];
export const resolveSeedExpenses = (now: number): Expense[] =>
  SEED_EXPENSES.map(({ daysAgo, ...rest }) => ({ ...rest, date: now - daysAgo * 86400000 }));

export const expenseTaxable = (e: Expense) => (e.gst ? e.amount / (1 + e.gst / 100) : e.amount);
export const expenseTax = (e: Expense) => e.amount - expenseTaxable(e);

// ════════════════════════════════════════════════════════════════
// Employees — HR record of every team member (payroll, bank, IDs).
// Distinct from app-login "users" (StaffUser): this is the personnel
// register a pharmacy keeps for salary, statutory & bank details.
// ════════════════════════════════════════════════════════════════
export const EMPLOYEE_POSITIONS = [
  "Owner", "Manager", "Pharmacist", "Cashier", "Delivery Executive",
  "Store Helper", "Accountant", "Housekeeping",
];
export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract"] as const;
export type EmploymentType = typeof EMPLOYMENT_TYPES[number];

export type Employee = {
  id: string;              // employee code, e.g. "EMP-001"
  name: string;
  position: string;        // designation
  department?: string;
  phone: string;
  email?: string;
  address?: string;
  dob?: string;            // YYYY-MM-DD
  joinedOn: string;        // YYYY-MM-DD
  employment: EmploymentType;
  salary: number;          // monthly gross ₹
  status: "active" | "inactive";
  // statutory ids
  pan?: string;
  aadhaar?: string;
  // salary bank account
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  upi?: string;
  // emergency contact
  emergencyName?: string;
  emergencyPhone?: string;
  note?: string;
  emoji: string;
  photo?: string;          // employee photo (data URL) — used on the digital ID card
  bloodGroup?: string;     // shown on the ID card
  documents?: EmployeeDoc[]; // uploaded ID proofs / certificates (image or PDF, stored as data URLs)
};
// an uploaded HR document — Aadhaar/PAN/licence/certificate etc. (image or PDF)
export type EmployeeDoc = { id: string; label: string; kind: "image" | "pdf"; fileName: string; dataUrl: string; at: number };
export const DOC_LABELS = ["Aadhaar card", "PAN card", "Pharmacist licence", "Appointment letter", "Educational certificate", "Experience letter", "Bank passbook", "Address proof", "Photograph", "Other"];
export const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];

export const SEED_EMPLOYEES: Employee[] = [
  { id: "EMP-001", name: "Rajesh Kumar", position: "Owner", department: "Management", phone: "+91 98860 12345", email: "rajesh@srisai.in", address: "12, 4th Block, Jayanagar, Bengaluru", dob: "1982-03-14", joinedOn: "2019-06-01", employment: "Full-time", salary: 90000, status: "active", pan: "ABCPK1234L", aadhaar: "4321 8765 9012", bankName: "HDFC Bank", accountName: "Rajesh Kumar", accountNumber: "50100234567890", ifsc: "HDFC0001234", upi: "rajesh@okhdfcbank", emergencyName: "Latha Kumar", emergencyPhone: "+91 98861 00011", emoji: "🧑‍💼" },
  { id: "EMP-002", name: "Anjali Menon", position: "Pharmacist", department: "Dispensing", phone: "+91 99016 55421", email: "anjali@srisai.in", address: "8, 2nd Cross, BTM Layout, Bengaluru", dob: "1994-09-22", joinedOn: "2021-02-15", employment: "Full-time", salary: 38000, status: "active", pan: "BXYPM5678K", aadhaar: "9988 7766 5544", bankName: "ICICI Bank", accountName: "Anjali Menon", accountNumber: "002601567890", ifsc: "ICIC0000026", upi: "anjali@oksbi", emergencyName: "Suresh Menon", emergencyPhone: "+91 99016 22113", emoji: "👩‍⚕️" },
  { id: "EMP-003", name: "Suresh Babu", position: "Cashier", department: "Billing", phone: "+91 97411 90087", email: "suresh@srisai.in", address: "45, 7th Main, HSR Layout, Bengaluru", dob: "1990-12-05", joinedOn: "2022-08-10", employment: "Full-time", salary: 24000, status: "active", pan: "CLMPB9012J", bankName: "State Bank of India", accountName: "Suresh Babu", accountNumber: "30987654321", ifsc: "SBIN0004567", upi: "suresh@okaxis", emergencyName: "Geetha", emergencyPhone: "+91 97411 33445", emoji: "🧑‍💻" },
  { id: "EMP-004", name: "Deepa Rao", position: "Manager", department: "Operations", phone: "+91 90080 33219", email: "deepa@srisai.in", address: "23, 1st Stage, Indiranagar, Bengaluru", dob: "1988-07-19", joinedOn: "2020-11-03", employment: "Full-time", salary: 45000, status: "active", pan: "DMNPR3456H", aadhaar: "1122 3344 5566", bankName: "Axis Bank", accountName: "Deepa Rao", accountNumber: "918010098765", ifsc: "UTIB0000123", upi: "deepa@okicici", emergencyName: "Vikram Rao", emergencyPhone: "+91 90080 99887", emoji: "👩‍💼" },
  { id: "EMP-005", name: "Imran Pasha", position: "Delivery Executive", department: "Logistics", phone: "+91 96320 71145", email: "", address: "Shivajinagar, Bengaluru", dob: "1998-04-02", joinedOn: "2023-05-20", employment: "Part-time", salary: 16000, status: "active", pan: "", bankName: "Kotak Mahindra Bank", accountName: "Imran Pasha", accountNumber: "1234509876", ifsc: "KKBK0000456", upi: "imran@okhdfcbank", emergencyName: "Rahim", emergencyPhone: "+91 96320 11220", emoji: "🛵" },
];

export const blankEmployee = (): Omit<Employee, "id"> => ({
  name: "", position: EMPLOYEE_POSITIONS[2], phone: "", email: "", address: "",
  joinedOn: "", employment: "Full-time", salary: 0, status: "active", emoji: "👤", documents: [],
});

// tenure in whole years/months from joining date to `now`
export const employeeTenure = (joinedOn: string, now: number): string => {
  if (!joinedOn) return "—";
  const j = new Date(joinedOn).getTime();
  if (isNaN(j)) return "—";
  const months = Math.max(0, Math.round((now - j) / (30 * 86400000)));
  const y = Math.floor(months / 12), m = months % 12;
  return y > 0 ? `${y}y ${m}m` : `${m}m`;
};
export const monthlyPayroll = (emps: Employee[]) => emps.filter((e) => e.status === "active").reduce((a, e) => a + e.salary, 0);

// ════════════════════════════════════════════════════════════════
// Customer credit (khata / udhaar) — bills taken on credit are debits,
// repayments are credits; outstanding = debits − repayments per customer.
// ════════════════════════════════════════════════════════════════
export const custKeyOf = (c: { name: string; phone?: string }) => (c.phone || c.name || "").trim();

export type CreditPayment = {
  id: string;            // "CR-1001"
  custKey: string;       // phone || name (matches a customer)
  custName: string;
  custPhone: string;
  amount: number;        // ₹ repaid
  mode: PayMode;         // how the repayment was collected (cash/upi/card)
  at: number;
  note?: string;
};

// credit bills for a customer (unpaid sales taken on khata)
export const creditSalesOf = (custKey: string, sales: Sale[]) =>
  sales.filter((s) => s.status !== "cancelled" && s.payMode === "credit" && custKeyOf(s.customer) === custKey);

// a customer's running credit position
export const customerCredit = (custKey: string, sales: Sale[], payments: CreditPayment[]) => {
  const given = creditSalesOf(custKey, sales).reduce((a, s) => a + computeInvoice(s.items, s.discount).payable, 0);
  const repaid = payments.filter((p) => p.custKey === custKey).reduce((a, p) => a + p.amount, 0);
  return { given, repaid, outstanding: Math.max(0, given - repaid) };
};

// total credit outstanding across all customers
export const totalCreditOutstanding = (sales: Sale[], payments: CreditPayment[]) => {
  const given = sales.filter((s) => s.status !== "cancelled" && s.payMode === "credit").reduce((a, s) => a + computeInvoice(s.items, s.discount).payable, 0);
  const repaid = payments.reduce((a, p) => a + p.amount, 0);
  return Math.max(0, given - repaid);
};

// a unified, time-sorted ledger (debits + repayments) for one customer
export type LedgerRow = { at: number; kind: "debit" | "credit"; label: string; amount: number; ref: string };
export const customerLedger = (custKey: string, sales: Sale[], payments: CreditPayment[]): LedgerRow[] => {
  const rows: LedgerRow[] = [];
  for (const s of creditSalesOf(custKey, sales)) rows.push({ at: s.createdAt, kind: "debit", label: `Credit bill · ${s.items.length} item${s.items.length !== 1 ? "s" : ""}`, amount: computeInvoice(s.items, s.discount).payable, ref: s.id });
  for (const p of payments.filter((x) => x.custKey === custKey)) rows.push({ at: p.at, kind: "credit", label: `Repayment · ${PAY_LABEL[p.mode]}${p.note ? " · " + p.note : ""}`, amount: p.amount, ref: p.id });
  return rows.sort((a, b) => b.at - a.at);
};

// WhatsApp / SMS compose links (open the messaging app prefilled — user sends)
const phoneDigits = (phone: string) => phone.replace(/[^0-9]/g, "").replace(/^0+/, "");
export const waLink = (phone: string, text: string) => {
  const d = phoneDigits(phone);
  return `https://wa.me/${d.length === 10 ? "91" + d : d}?text=${encodeURIComponent(text)}`;
};
export const smsLink = (phone: string, text: string) => `sms:${phone.replace(/\s/g, "")}?&body=${encodeURIComponent(text)}`;

// ── credit (khata) customers — everyone with a credit bill or repayment ──
export type CreditCustomer = { key: string; name: string; phone: string; given: number; repaid: number; outstanding: number; lastAt: number; bills: number };
export function creditCustomers(sales: Sale[], payments: CreditPayment[]): CreditCustomer[] {
  const keys = new Set<string>();
  for (const s of sales) if (s.status !== "cancelled" && s.payMode === "credit") keys.add(custKeyOf(s.customer));
  for (const p of payments) keys.add(p.custKey);
  const rows: CreditCustomer[] = [];
  for (const key of keys) {
    if (!key) continue;
    const cs = creditSalesOf(key, sales);
    const pays = payments.filter((p) => p.custKey === key);
    const name = cs[0]?.customer.name || pays[0]?.custName || key;
    const phone = cs.find((s) => s.customer.phone)?.customer.phone || pays.find((p) => p.custPhone)?.custPhone || "";
    const c = customerCredit(key, sales, payments);
    const lastAt = Math.max(0, ...cs.map((s) => s.createdAt), ...pays.map((p) => p.at));
    rows.push({ key, name, phone, given: c.given, repaid: c.repaid, outstanding: c.outstanding, lastAt, bills: cs.length });
  }
  return rows.sort((a, b) => b.outstanding - a.outstanding || b.lastAt - a.lastAt);
}

// ── credit aging (FIFO: repayments clear the oldest bills first) ──
export type UnpaidBill = { id: string; at: number; amount: number; remaining: number; items: number };
export type CreditAging = { oldestUnpaidAt: number; ageDays: number; overdue: boolean; unpaidBills: UnpaidBill[] };
export const creditAging = (custKey: string, sales: Sale[], payments: CreditPayment[], now: number): CreditAging => {
  const bills = creditSalesOf(custKey, sales)
    .map((s) => ({ id: s.id, at: s.createdAt, amount: computeInvoice(s.items, s.discount).payable, items: s.items.length }))
    .sort((a, b) => a.at - b.at);
  let pool = payments.filter((p) => p.custKey === custKey).reduce((a, p) => a + p.amount, 0);
  const unpaidBills: UnpaidBill[] = [];
  let oldestUnpaidAt = 0;
  for (const b of bills) {
    const remaining = Math.max(0, b.amount - pool);
    pool = Math.max(0, pool - b.amount);
    if (remaining > 0) { if (!oldestUnpaidAt) oldestUnpaidAt = b.at; unpaidBills.push({ id: b.id, at: b.at, amount: b.amount, remaining, items: b.items }); }
  }
  const ageDays = oldestUnpaidAt ? Math.floor((now - oldestUnpaidAt) / 86400000) : 0;
  return { oldestUnpaidAt, ageDays, overdue: ageDays > 30, unpaidBills };
};
// portfolio aging: bucket each customer's outstanding by the age of their oldest unpaid bill
export type CreditBucket = { key: string; label: string; min: number; max: number; amount: number; count: number };
export const creditAgingBuckets = (rows: CreditCustomer[], sales: Sale[], payments: CreditPayment[], now: number): CreditBucket[] => {
  const out: CreditBucket[] = [
    { key: "cur", label: "0–30 days", min: 0, max: 30, amount: 0, count: 0 },
    { key: "d60", label: "31–60 days", min: 31, max: 60, amount: 0, count: 0 },
    { key: "d60p", label: "60+ days", min: 61, max: Infinity, amount: 0, count: 0 },
  ];
  for (const r of rows) {
    if (r.outstanding <= 0) continue;
    const d = creditAging(r.key, sales, payments, now).ageDays;
    const b = out.find((x) => d >= x.min && d <= x.max) ?? out[out.length - 1];
    b.amount += r.outstanding; b.count++;
  }
  return out;
};

// a payment-collection WhatsApp message body (used by the Khata screens)
export const collectMsg = (name: string, pharmacy: string, outstanding: number, payTo?: string) =>
  `Hi ${name}, this is ${pharmacy}. 🧾 Your pending medicine credit (khata) balance is ${inr(outstanding)}.`
  + ` Kindly clear it at your convenience${payTo ? ` — you can pay via UPI to ${payTo}` : ""}. Thank you! 🙏`;
