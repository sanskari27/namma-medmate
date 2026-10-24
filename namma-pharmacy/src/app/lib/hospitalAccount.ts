// ════════════════════════════════════════════════════════════════
// Institutional "bill-to-hospital" model for the Hospital Pharmacy.
//
// Single billing rule: ANY medicine that moves from the pharmacy toward
// a ward (floor top-up, patient consumption, or a patient-driven refill)
// is priced at the HOSPITAL CREDIT PRICE (≠ retail MRP) and posted to the
// Hospital's running credit account. There is exactly ONE bill-to party —
// the Hospital — which settles with the pharmacy. The pharmacy never bills
// the patient. The `reason` tag (+ optional patient ref on refills) is
// informational only, so the hospital's finance team can recover refills
// from the patient on its own, outside this system.
// ════════════════════════════════════════════════════════════════
import { InvProduct, PayMode, mrpOf } from "../data";

const round2 = (n: number) => Math.round(n * 100) / 100;

// ── the single institutional customer ───────────────────────────
export type CreditTerms = "On demand" | "NET 15" | "NET 30" | "NET 45";
export const CREDIT_TERMS: CreditTerms[] = ["On demand", "NET 15", "NET 30", "NET 45"];
export type HospitalAccount = {
  name: string;          // institutional customer (the hospital central stores)
  gstin: string;
  contact: string;
  phone?: string;        // billing contact number (for statement / reminder)
  email?: string;        // billing email (for statement / reminder)
  creditTerms: CreditTerms;
  creditLimit: number;   // approved credit ceiling (0 = no limit set)
  discountPct: number;   // default institutional discount off MRP → credit price
  flagRefills: boolean;  // surface patient ref on the statement (recoverable lines)
};
export const DEFAULT_HOSPITAL_ACCOUNT: HospitalAccount = {
  name: "City Care Hospital — Central Stores",
  gstin: "29AABCC1234H1Z5",
  contact: "Stores Dept · +91 98861 00000",
  phone: "+91 98861 00000",
  email: "stores@citycarehospital.in",
  creditTerms: "NET 30",
  creditLimit: 25000,
  discountPct: 12,
  flagRefills: true,
};

// per-product discount override — either a % off MRP or a flat ₹ off MRP
export type PriceMode = "percent" | "flat";
export type PriceRule = { mode: PriceMode; value: number };
export const ADMIN_PRICING_OTP = "123456"; // demo admin OTP to authorise pricing changes

// hospital credit price for a product: per-product rule if set, else the uniform institutional discount
export const creditPriceOf = (p: InvProduct, account: HospitalAccount, rules: Record<string, PriceRule>): number => {
  const mrp = mrpOf(p);
  const r = rules[p.id];
  const price = r ? (r.mode === "percent" ? mrp * (1 - r.value / 100) : mrp - r.value) : mrp * (1 - account.discountPct / 100);
  return Math.max(0, round2(price));
};
// effective discount % a product ends up with (uniform or its rule)
export const effectiveDiscountPct = (p: InvProduct, account: HospitalAccount, rules: Record<string, PriceRule>): number => {
  const mrp = mrpOf(p); if (mrp <= 0) return 0;
  return Math.round((1 - creditPriceOf(p, account, rules) / mrp) * 100);
};

// ── ward supply transactions (stock moving pharmacy → ward) ──────
export type WardSupplyReason = "floor" | "consumption" | "refill";
export const SUPPLY_REASONS: { key: WardSupplyReason; label: string; tag: string; emoji: string }[] = [
  { key: "floor", label: "Ward floor stock", tag: "FLOOR_STOCK", emoji: "📦" },
  { key: "consumption", label: "Patient consumption", tag: "CONSUMPTION", emoji: "💉" },
  { key: "refill", label: "Patient refill", tag: "PATIENT_REFILL", emoji: "🔄" },
];
export const reasonMeta = (r: WardSupplyReason) => SUPPLY_REASONS.find((x) => x.key === r)!;

export type WardSupplyItem = { productId: string; name: string; batchNo: string; expiry: string; hsn: string; gst: number; qty: number; price: number; amount: number; mrp?: number };
// retail MRP for an item — stored at issue time, else recovered from the credit price + institutional discount
export const itemMrp = (it: WardSupplyItem, discountPct: number) => it.mrp != null ? it.mrp : Math.round((it.price / (1 - discountPct / 100)) * 100) / 100;
export type WardSupply = {
  id: string;            // WS-#### (issue) or WR-#### (return)
  kind: "issue" | "return";
  wardId: string;
  wardName: string;
  reason: WardSupplyReason;
  patientId?: string;    // hospital MRN — ONLY on refill lines, for traceability
  patientName?: string;
  items: WardSupplyItem[];
  total: number;         // sum of line amounts (always positive; `kind` carries the sign)
  refDoc?: string;       // indent / requisition reference
  indentId?: string;     // linked ward indent (so the indent reflects the billing)
  at: number;
};

export type HospitalPayment = { id: string; amount: number; mode: PayMode; ref?: string; note?: string; at: number };

// signed ledger effect: issues add to the receivable, returns reduce it
const signed = (s: WardSupply) => (s.kind === "return" ? -s.total : s.total);

// outstanding the hospital owes the pharmacy
export const hospitalOutstanding = (supplies: WardSupply[], payments: HospitalPayment[]): number =>
  round2(supplies.reduce((a, s) => a + signed(s), 0) - payments.reduce((a, p) => a + p.amount, 0));

export const suppliedTotal = (supplies: WardSupply[]) => round2(supplies.filter((s) => s.kind === "issue").reduce((a, s) => a + s.total, 0));
export const returnedTotal = (supplies: WardSupply[]) => round2(supplies.filter((s) => s.kind === "return").reduce((a, s) => a + s.total, 0));
export const paidTotal = (payments: HospitalPayment[]) => round2(payments.reduce((a, p) => a + p.amount, 0));

// ── ward stock on hand (qty issued − returned, per ward per product) ──
export type WardStockRow = { wardId: string; wardName: string; productId: string; name: string; qty: number; price: number; value: number };
export function wardOnHand(supplies: WardSupply[], creditPrice: (productId: string) => number, wardId?: string): WardStockRow[] {
  const map = new Map<string, WardStockRow>();
  for (const s of supplies) {
    if (wardId && s.wardId !== wardId) continue;
    const sign = s.kind === "return" ? -1 : 1;
    for (const it of s.items) {
      const key = s.wardId + "|" + it.productId;
      const cur = map.get(key) ?? { wardId: s.wardId, wardName: s.wardName, productId: it.productId, name: it.name, qty: 0, price: 0, value: 0 };
      cur.qty += sign * it.qty;
      cur.wardName = s.wardName;
      map.set(key, cur);
    }
  }
  return Array.from(map.values())
    .filter((r) => r.qty !== 0)
    .map((r) => { const price = creditPrice(r.productId); return { ...r, price, value: round2(price * r.qty) }; })
    .sort((a, b) => a.wardName.localeCompare(b.wardName) || a.name.localeCompare(b.name));
}

// ── hospital credit statement (running balance) ─────────────────
export type StatementLine = {
  at: number; ref: string; type: "issue" | "return" | "payment";
  label: string; reason?: WardSupplyReason; patientId?: string; patientName?: string; wardName?: string;
  debit: number; credit: number; balance: number;
};
export function buildStatement(supplies: WardSupply[], payments: HospitalPayment[]): StatementLine[] {
  type Ev = Omit<StatementLine, "balance">;
  const evs: Ev[] = [];
  for (const s of supplies) {
    if (s.kind === "issue") evs.push({ at: s.at, ref: s.id, type: "issue", label: `${reasonMeta(s.reason).label} · ${s.wardName}`, reason: s.reason, patientId: s.patientId, patientName: s.patientName, wardName: s.wardName, debit: s.total, credit: 0 });
    else evs.push({ at: s.at, ref: s.id, type: "return", label: `Return · ${s.wardName}`, wardName: s.wardName, debit: 0, credit: s.total });
  }
  for (const p of payments) evs.push({ at: p.at, ref: p.id, type: "payment", label: `Payment received${p.ref ? " · " + p.ref : ""}`, debit: 0, credit: p.amount });
  evs.sort((a, b) => a.at - b.at);
  let bal = 0;
  return evs.map((e) => { bal = round2(bal + e.debit - e.credit); return { ...e, balance: bal }; });
}

// next statement / due date from credit terms
export const termDays = (t: CreditTerms) => (t === "NET 15" ? 15 : t === "NET 30" ? 30 : t === "NET 45" ? 45 : 0);

// ── credit aging (FIFO: credits clear the oldest issues first) ───
export type AgingBucket = { key: string; label: string; amount: number };
export type HospitalAging = {
  buckets: AgingBucket[];       // 0-30 / 31-60 / 61-90 / 90+
  current: number;              // within credit terms
  overdue: number;              // unpaid issues past their due date
  oldestUnpaidAt: number | null;
  dueDate: number | null;       // due date of the oldest unpaid issue
  overdueDays: number;          // how overdue the oldest issue is (0 if none)
};
const DAY = 86400000;
export function hospitalAging(supplies: WardSupply[], payments: HospitalPayment[], now: number, terms: CreditTerms): HospitalAging {
  const days = termDays(terms);
  const issues = supplies.filter((s) => s.kind === "issue").sort((a, b) => a.at - b.at).map((s) => ({ at: s.at, remaining: s.total }));
  let credit = returnedTotal(supplies) + paidTotal(payments);   // returns + payments reduce the oldest issues first
  for (const iss of issues) { if (credit <= 0) break; const take = Math.min(iss.remaining, credit); iss.remaining -= take; credit -= take; }
  const unpaid = issues.filter((i) => i.remaining > 0.005);
  const age = (at: number) => (now - at) / DAY;
  const sumIn = (lo: number, hi: number) => round2(unpaid.filter((i) => { const a = age(i.at); return a >= lo && a < hi; }).reduce((s, i) => s + i.remaining, 0));
  const buckets: AgingBucket[] = [
    { key: "0-30", label: "0–30 days", amount: sumIn(0, 31) },
    { key: "31-60", label: "31–60 days", amount: sumIn(31, 61) },
    { key: "61-90", label: "61–90 days", amount: sumIn(61, 91) },
    { key: "90+", label: "90+ days", amount: round2(unpaid.filter((i) => age(i.at) >= 91).reduce((s, i) => s + i.remaining, 0)) },
  ];
  const dueAt = (at: number) => at + days * DAY;
  const overdue = days > 0 ? round2(unpaid.filter((i) => now > dueAt(i.at)).reduce((s, i) => s + i.remaining, 0)) : 0;
  const total = round2(unpaid.reduce((s, i) => s + i.remaining, 0));
  const oldest = unpaid[0] ?? null;
  return { buckets, current: round2(total - overdue), overdue, oldestUnpaidAt: oldest?.at ?? null, dueDate: oldest ? dueAt(oldest.at) : null, overdueDays: oldest && days > 0 && now > dueAt(oldest.at) ? Math.floor((now - dueAt(oldest.at)) / DAY) : 0 };
}

// ── ward consumption leaderboard (net billed value per ward) ─────
export type WardConsumption = { wardId: string; wardName: string; supplied: number; returned: number; net: number; issues: number };
export function wardConsumption(supplies: WardSupply[]): WardConsumption[] {
  const map = new Map<string, WardConsumption>();
  for (const s of supplies) {
    const cur = map.get(s.wardId) ?? { wardId: s.wardId, wardName: s.wardName, supplied: 0, returned: 0, net: 0, issues: 0 };
    if (s.kind === "issue") { cur.supplied += s.total; cur.issues += 1; } else cur.returned += s.total;
    cur.net = round2(cur.supplied - cur.returned); cur.wardName = s.wardName;
    map.set(s.wardId, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.net - a.net);
}

// ── most-supplied medicines (by billed value) ────────────────────
export type SuppliedItem = { productId: string; name: string; qty: number; amount: number };
export function topSuppliedItems(supplies: WardSupply[], limit = 6): SuppliedItem[] {
  const map = new Map<string, SuppliedItem>();
  for (const s of supplies) {
    const sign = s.kind === "return" ? -1 : 1;
    for (const it of s.items) {
      const key = it.productId || it.name;
      const cur = map.get(key) ?? { productId: it.productId, name: it.name, qty: 0, amount: 0 };
      cur.qty += sign * it.qty; cur.amount = round2(cur.amount + sign * it.amount);
      map.set(key, cur);
    }
  }
  return Array.from(map.values()).filter((x) => x.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, limit);
}

// ── monthly supplied vs received (last N months, oldest→newest) ──
export type MonthFlow = { label: string; supplied: number; received: number };
export function monthlyHospitalFlow(supplies: WardSupply[], payments: HospitalPayment[], now: number, months = 6): MonthFlow[] {
  const out: MonthFlow[] = [];
  const base = new Date(now);
  for (let k = months - 1; k >= 0; k--) {
    const d = new Date(base.getFullYear(), base.getMonth() - k, 1);
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const supplied = round2(supplies.filter((s) => s.kind === "issue" && s.at >= start && s.at < end).reduce((a, s) => a + s.total, 0)
      - supplies.filter((s) => s.kind === "return" && s.at >= start && s.at < end).reduce((a, s) => a + s.total, 0));
    const received = round2(payments.filter((p) => p.at >= start && p.at < end).reduce((a, p) => a + p.amount, 0));
    out.push({ label: d.toLocaleDateString("en-IN", { month: "short" }), supplied, received });
  }
  return out;
}

// ── seeds ───────────────────────────────────────────────────────
type SeedSupply = Omit<WardSupply, "at"> & { minsAgo: number };
const SEED_SUPPLIES: SeedSupply[] = [
  { id: "WS-1007", kind: "issue", wardId: "W-ICU", wardName: "Intensive Care Unit", reason: "consumption", minsAgo: 120,
    items: [{ productId: "p9", name: "Pan-D", batchNo: "PAND26B17", expiry: "2027-10", hsn: "3004", gst: 12, qty: 6, price: 123.2, amount: 739.2 }, { productId: "p1", name: "Dolo 650", batchNo: "DL26A55", expiry: "2027-06", hsn: "3004", gst: 12, qty: 10, price: 29.92, amount: 299.2 }],
    total: 1038.4 },
  { id: "WS-1006", kind: "issue", wardId: "W-GEN", wardName: "General Ward A", reason: "floor", minsAgo: 240,
    items: [{ productId: "p13", name: "Atorvastatin 10mg", batchNo: "ATR8120", expiry: "2026-08", hsn: "3004", gst: 5, qty: 20, price: 98.56, amount: 1971.2 }],
    total: 1971.2 },
  { id: "WS-1005", kind: "issue", wardId: "W-MAT", wardName: "Maternity Ward", reason: "refill", patientId: "UHID-100312", patientName: "Priya N.", minsAgo: 360,
    items: [{ productId: "p15", name: "Metformin 500mg", batchNo: "MET26B15", expiry: "2028-02", hsn: "3004", gst: 5, qty: 4, price: 33.44, amount: 133.76 }],
    total: 133.76 },
  { id: "WS-1004", kind: "issue", wardId: "W-SUR", wardName: "Surgical Ward", reason: "consumption", minsAgo: 1500,
    items: [{ productId: "p5", name: "Combiflam", batchNo: "CMB8830", expiry: "2026-08", hsn: "3004", gst: 12, qty: 8, price: 45.76, amount: 366.08 }],
    total: 366.08 },
  // these two are raised against (and close) the issued ward indents IND-4006 / IND-4002 — keeps Ward Indents ↔ Hospital Billing matched
  { id: "WS-1003", kind: "issue", wardId: "W-MAT", wardName: "Maternity Ward", reason: "floor", refDoc: "IND-4006", indentId: "IND-4006", minsAgo: 220,
    items: [{ productId: "p35", name: "Shelcal 500", batchNo: "SHL26B18", expiry: "2028-04", hsn: "3004", gst: 12, qty: 30, price: 86.24, amount: 2587.2 }, { productId: "", name: "Folic Acid 5mg", batchNo: "FA26B02", expiry: "2027-12", hsn: "3004", gst: 5, qty: 30, price: 8.8, amount: 264 }, { productId: "", name: "Iron Sucrose Injection", batchNo: "IS26B04", expiry: "2027-09", hsn: "3004", gst: 12, qty: 3, price: 211.2, amount: 633.6 }],
    total: 3484.8 },
  { id: "WS-1002", kind: "issue", wardId: "W-PED", wardName: "Pediatric Ward", reason: "floor", refDoc: "IND-4002", indentId: "IND-4002", minsAgo: 320,
    items: [{ productId: "", name: "Paracetamol Syrup 60ml", batchNo: "PCS26B01", expiry: "2027-07", hsn: "3004", gst: 12, qty: 4, price: 30.8, amount: 123.2 }, { productId: "", name: "Amoxyclav Syrup", batchNo: "AMX26B03", expiry: "2027-05", hsn: "3004", gst: 12, qty: 2, price: 105.6, amount: 211.2 }],
    total: 334.4 },
  // ── aged issues (past NET-30 terms) — populate the aging buckets ──
  { id: "WS-0995", kind: "issue", wardId: "W-GEN", wardName: "General Ward A", reason: "floor", minsAgo: 40 * 1440,
    items: [{ productId: "p13", name: "Atorvastatin 10mg", batchNo: "ATR8120", expiry: "2026-08", hsn: "3004", gst: 5, qty: 24, price: 98.56, amount: 2365.44 }],
    total: 2365.44 },
  { id: "WS-0990", kind: "issue", wardId: "W-ICU", wardName: "Intensive Care Unit", reason: "consumption", minsAgo: 72 * 1440,
    items: [{ productId: "p9", name: "Pan-D", batchNo: "PAND26B17", expiry: "2027-10", hsn: "3004", gst: 12, qty: 13, price: 123.2, amount: 1601.6 }],
    total: 1601.6 },
  { id: "WS-0985", kind: "issue", wardId: "W-SUR", wardName: "Surgical Ward", reason: "consumption", minsAgo: 95 * 1440,
    items: [{ productId: "p5", name: "Combiflam", batchNo: "CMB8830", expiry: "2026-08", hsn: "3004", gst: 12, qty: 40, price: 45.76, amount: 1830.4 }, { productId: "p1", name: "Dolo 650", batchNo: "DL26A55", expiry: "2027-06", hsn: "3004", gst: 12, qty: 40, price: 29.92, amount: 1196.8 }],
    total: 3027.2 },
];
export function resolveSeedSupplies(now: number): WardSupply[] {
  return SEED_SUPPLIES.map(({ minsAgo, ...r }) => ({ ...r, at: now - minsAgo * 60000 }));
}

type SeedPayment = Omit<HospitalPayment, "at"> & { daysAgo: number };
const SEED_PAYMENTS: SeedPayment[] = [
  { id: "HP-501", amount: 1500, mode: "upi", ref: "NEFT/CITYCARE/0091", note: "On account", daysAgo: 8 },
  { id: "HP-500", amount: 3000, mode: "card", ref: "NEFT/CITYCARE/0088", note: "Part settlement", daysAgo: 34 },
];
export function resolveSeedHospitalPayments(now: number): HospitalPayment[] {
  return SEED_PAYMENTS.map(({ daysAgo, ...r }) => ({ ...r, at: now - daysAgo * 86400000 }));
}
