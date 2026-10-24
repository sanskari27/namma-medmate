// ════════════════════════════════════════════════════════════════
// CRM engine — patient profiles, auto-segments, RFM, churn, refills,
// loyalty tiers, campaigns & feedback. All derived from sales + Rx.
// ════════════════════════════════════════════════════════════════
import { Sale, Prescription, InvProduct, computeInvoice, custKeyOf } from "../data";

export type Tier = "New" | "Silver" | "Gold" | "Platinum";
export const TIERS: { tier: Tier; min: number; color: string }[] = [
  { tier: "Platinum", min: 120, color: "var(--mid)" },
  { tier: "Gold", min: 50, color: "var(--gold-d)" },
  { tier: "Silver", min: 12, color: "var(--muted)" },
  { tier: "New", min: 0, color: "var(--faint)" },
];
export const tierOf = (points: number): Tier => TIERS.find((t) => points >= t.min)!.tier;

export type Segment = "chronic" | "high-value" | "lapsed" | "new" | "credit" | "regular";
export const SEGMENTS: { key: Segment; label: string; emoji: string }[] = [
  { key: "chronic", label: "Chronic care", emoji: "🫀" },
  { key: "high-value", label: "High value", emoji: "💎" },
  { key: "lapsed", label: "Lapsed / at-risk", emoji: "⚠️" },
  { key: "new", label: "New", emoji: "✨" },
  { key: "credit", label: "On credit", emoji: "📒" },
  { key: "regular", label: "Regular", emoji: "🧑" },
];
export const segLabel = (s: Segment) => SEGMENTS.find((x) => x.key === s)?.label ?? s;

export type PatientMeta = { conditions?: string[]; allergies?: string[]; consent?: boolean; note?: string; age?: number; gender?: string; bloodGroup?: string; address?: string; dob?: string };

// a medicine the patient has bought (aggregated across orders)
export type PatientMed = { productId: string; name: string; category: string; qty: number; orders: number; lastAt: number };

export type Patient = {
  key: string; name: string; phone: string; email?: string;
  orders: number; spent: number; units: number; firstAt: number; lastAt: number;
  online: boolean; onlineOrders: number; rx: boolean; categories: string[]; chronic: boolean;
  points: number; tier: Tier; avgOrder: number;
  medicines: PatientMed[]; payModes: { mode: string; n: number }[];
  rfm: { r: number; f: number; m: number; score: number };
  segments: Segment[]; churnRisk: boolean; daysSince: number;
  refill?: { med: string; productId: string; dueAt: number; daysLeft: number };
  meta?: PatientMeta;
};

const DAY = 86400000;
const CHRONIC_CATS = new Set(["diabetes", "heart"]);

export function buildPatients(sales: Sale[], inventory: InvProduct[], creditKeys: Set<string>, now: number, meta?: Record<string, PatientMeta>): Patient[] {
  const valid = sales.filter((s) => s.status !== "cancelled" && s.customer.name && s.customer.name !== "Walk-in" && s.customer.name !== "Kiosk (self-order)");
  type Cat = { qty: number; lastAt: number; productId: string; name: string };
  const m = new Map<string, Patient & { _cats: Map<string, Cat>; _meds: Map<string, PatientMed>; _pay: Map<string, number> }>();
  for (const s of valid) {
    const key = custKeyOf(s.customer); if (!key) continue;
    const t = computeInvoice(s.items, s.discount);
    let p = m.get(key);
    if (!p) { p = { key, name: s.customer.name, phone: s.customer.phone ?? "", email: s.customer.email, orders: 0, spent: 0, units: 0, firstAt: s.createdAt, lastAt: 0, online: false, onlineOrders: 0, rx: false, categories: [], chronic: false, points: 0, tier: "New", avgOrder: 0, medicines: [], payModes: [], rfm: { r: 0, f: 0, m: 0, score: 0 }, segments: [], churnRisk: false, daysSince: 0, _cats: new Map(), _meds: new Map(), _pay: new Map() }; m.set(key, p); }
    p.orders++; p.spent += t.payable; p.units += s.items.reduce((a, i) => a + i.qty, 0);
    p.firstAt = Math.min(p.firstAt, s.createdAt); p.lastAt = Math.max(p.lastAt, s.createdAt);
    if (s.channel === "online") { p.online = true; p.onlineOrders++; }
    if (s.rx) p.rx = true;
    if (s.customer.phone) p.phone = s.customer.phone;
    if (s.customer.email) p.email = s.customer.email;
    p._pay.set(s.payMode, (p._pay.get(s.payMode) ?? 0) + 1);
    for (const it of s.items) {
      const cat = inventory.find((x) => x.id === it.productId)?.category ?? "other";
      const c = p._cats.get(cat) ?? { qty: 0, lastAt: 0, productId: it.productId, name: it.name };
      c.qty += it.qty; if (s.createdAt > c.lastAt) { c.lastAt = s.createdAt; c.productId = it.productId; c.name = it.name; }
      p._cats.set(cat, c);
      const md = p._meds.get(it.productId) ?? { productId: it.productId, name: it.name, category: cat, qty: 0, orders: 0, lastAt: 0 };
      md.qty += it.qty; md.orders++; md.lastAt = Math.max(md.lastAt, s.createdAt);
      p._meds.set(it.productId, md);
    }
  }
  const all = [...m.values()];
  const maxSpent = Math.max(1, ...all.map((p) => p.spent));
  for (const p of all) {
    p.categories = [...p._cats.keys()];
    p.chronic = p.categories.some((c) => CHRONIC_CATS.has(c));
    p.points = Math.floor(p.spent / 100);
    p.tier = tierOf(p.points);
    p.avgOrder = p.orders ? Math.round(p.spent / p.orders) : 0;
    p.medicines = [...p._meds.values()].sort((a, b) => b.qty - a.qty || b.lastAt - a.lastAt);
    p.payModes = [...p._pay.entries()].map(([mode, n]) => ({ mode, n })).sort((a, b) => b.n - a.n);
    p.daysSince = Math.floor((now - p.lastAt) / DAY);
    const r = p.daysSince <= 15 ? 5 : p.daysSince <= 30 ? 4 : p.daysSince <= 60 ? 3 : p.daysSince <= 90 ? 2 : 1;
    const f = p.orders >= 8 ? 5 : p.orders >= 5 ? 4 : p.orders >= 3 ? 3 : p.orders >= 2 ? 2 : 1;
    const mo = p.spent >= maxSpent * 0.6 ? 5 : p.spent >= maxSpent * 0.35 ? 4 : p.spent >= maxSpent * 0.18 ? 3 : p.spent >= maxSpent * 0.08 ? 2 : 1;
    p.rfm = { r, f, m: mo, score: r + f + mo };
    p.churnRisk = p.daysSince > 60 && p.orders >= 2;
    const segs: Segment[] = [];
    if (p.chronic) segs.push("chronic");
    if (mo >= 4) segs.push("high-value");
    if (p.churnRisk) segs.push("lapsed");
    if (creditKeys.has(p.key)) segs.push("credit");
    if (p.orders === 1 && p.daysSince <= 30) segs.push("new");
    if (segs.length === 0) segs.push("regular");
    p.segments = segs;
    let best: Cat | null = null;
    for (const [cat, c] of p._cats) if (CHRONIC_CATS.has(cat)) if (!best || c.lastAt > best.lastAt) best = c;
    if (best) { const dueAt = best.lastAt + 30 * DAY; p.refill = { med: best.name, productId: best.productId, dueAt, daysLeft: Math.ceil((dueAt - now) / DAY) }; }
    p.meta = meta?.[p.key];
    delete (p as Partial<typeof p>)._cats; delete (p as Partial<typeof p>)._meds; delete (p as Partial<typeof p>)._pay;
  }
  return all.sort((a, b) => b.spent - a.spent);
}

export const inSegment = (p: Patient, seg: Segment | "all") => seg === "all" || p.segments.includes(seg);
export const refillsDue = (patients: Patient[], withinDays = 7) => patients.filter((p) => p.refill && p.refill.daysLeft <= withinDays).sort((a, b) => (a.refill!.daysLeft - b.refill!.daysLeft));
export const atRisk = (patients: Patient[]) => patients.filter((p) => p.churnRisk).sort((a, b) => b.daysSince - a.daysSince);

// ── persisted CRM records ───────────────────────────────────────
export type Campaign = { id: string; name: string; segment: Segment | "all"; channel: "whatsapp" | "sms"; message: string; offerLabel?: string; sentAt: number; reach: number };
export type Feedback = { id: string; custKey: string; custName: string; rating: number; nps?: number; comment?: string; at: number };
export type ReminderLog = { id: string; custKey: string; custName: string; kind: "refill" | "adherence" | "followup" | "winback"; channel: "whatsapp" | "sms"; at: number };
export type Redemption = { id: string; custKey: string; custName: string; points: number; value: number; at: number };
export type CrmData = { meta: Record<string, PatientMeta>; campaigns: Campaign[]; feedbacks: Feedback[]; reminders: ReminderLog[]; redemptions: Redemption[] };
export const EMPTY_CRM: CrmData = { meta: {}, campaigns: [], feedbacks: [], reminders: [], redemptions: [] };

// sales by segment members after a timestamp → simple campaign attribution
export function attributedSales(c: Campaign, patients: Patient[], sales: Sale[]): number {
  const keys = new Set(patients.filter((p) => inSegment(p, c.segment)).map((p) => p.key));
  return sales.filter((s) => s.status !== "cancelled" && s.createdAt >= c.sentAt && keys.has(custKeyOf(s.customer)))
    .reduce((a, s) => a + computeInvoice(s.items, s.discount).payable, 0);
}

// message templates per intent
export const crmMsg = {
  refill: (n: string, ph: string, med: string) => `Hi ${n}, this is ${ph}. ⏰ Your ${med} is due for a refill. Reply to reserve it or visit us — we'll keep it ready. Stay healthy! 🙏`,
  adherence: (n: string, ph: string) => `Hi ${n}, this is ${ph}. 💊 Just a gentle reminder to take your medicines on time today. Reply if you need a refill. 🙏`,
  followup: (n: string, ph: string) => `Hi ${n}, this is ${ph}. 🩺 It's time for your routine check-up / lab review. Please consult your doctor. We're here for your medicines. 🙏`,
  winback: (n: string, ph: string) => `Hi ${n}, this is ${ph}. We've missed you! 🤍 Here's 10% off your next medicine order. Visit us or reply to order. 🙏`,
  feedback: (n: string, ph: string) => `Hi ${n}, thank you for choosing ${ph}! 🌟 How was your experience? Reply 1-5 (5 = excellent). Your feedback helps us serve you better. 🙏`,
  birthday: (n: string, ph: string) => `Happy Birthday ${n}! 🎂 From all of us at ${ph} — wishing you great health. Enjoy a special discount on us this week! 🎁`,
};
