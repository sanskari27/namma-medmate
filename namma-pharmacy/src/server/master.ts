import { randomBytes } from "crypto";
import type { PoolClient } from "pg";
import {
  PREMIUM_ROUTES, Plan, BillingCycle, ScreenGrant, includedSeats, seatCeiling, SEAT_CAP, subscriptionLapsed, todayISO,
} from "../app/data";
import { REFERRAL_REWARD } from "../app/lib/referrals";
import { createSession, destroySession, e164, getPool, loadState, migrate, readSession, withState } from "./db";
import { fail } from "./errors";
import { touchAccess, type PharmacyState } from "./state";

const MASTER_COOKIE = "namma_master";
const PHARMACY_COOKIE = "namma_session";

export type MasterSession = { phone: string };

function cookieValue(req: Request, name: string) {
  const hit = (req.headers.get("cookie") || "").split(";").map((s) => s.trim()).find((s) => s.startsWith(name + "="));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined;
}

export function masterToken(req: Request) {
  return cookieValue(req, MASTER_COOKIE);
}

export function masterCookie(token: string | null) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  if (!token) return `${MASTER_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
  return `${MASTER_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 86400}${secure}`;
}

export async function isMasterPhone(phone: string) {
  await migrate();
  const { rows } = await getPool().query("SELECT 1 FROM master_phones WHERE phone = $1", [e164(phone)]);
  return Boolean(rows[0]);
}

export async function createMasterSession(phone: string) {
  await migrate();
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 86400000);
  await getPool().query("INSERT INTO master_sessions (token, phone, expires_at) VALUES ($1,$2,$3)", [token, e164(phone), expires]);
  return token;
}

export async function destroyMasterSession(token: string | undefined) {
  if (!token) return;
  await getPool().query("DELETE FROM master_sessions WHERE token = $1", [token]);
}

// Allowlist is checked on every request. A removed phone fails before the session expires.
export async function masterFrom(req: Request): Promise<MasterSession> {
  await migrate();
  const token = cookieValue(req, MASTER_COOKIE);
  const pharmacy = await readSession(cookieValue(req, PHARMACY_COOKIE));
  if (!token) {
    if (pharmacy) fail(403, "FORBIDDEN", "Master sign-in required");
    fail(401, "UNAUTHENTICATED", "Sign in required");
  }
  const { rows } = await getPool().query("SELECT phone, expires_at FROM master_sessions WHERE token = $1", [token]);
  const row = rows[0] as { phone: string; expires_at: Date } | undefined;
  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    if (pharmacy) fail(403, "FORBIDDEN", "Master sign-in required");
    fail(401, "UNAUTHENTICATED", "Sign in required");
  }
  if (!(await isMasterPhone(row.phone))) fail(403, "FORBIDDEN", "This phone is no longer a master login");
  return { phone: row.phone };
}

type Change = { before: unknown; after: unknown } | null;

async function writePharmacy(phone: string, pharmacyId: string, action: string, reason: string, mutate: (state: PharmacyState) => Change) {
  return withState(pharmacyId, async (state, client) => {
    const change = mutate(state);
    if (!change) return null;
    try {
      await insertAudit(client, phone, pharmacyId, action, change.before, change.after, reason);
    } catch (err) {
      if ((err as { code?: string }).code === "P0001") fail(500, "VALIDATION", "The audit record could not be saved");
      throw err;
    }
    return change?.after ?? null;
  });
}

export async function recordAudit(phone: string, pharmacyId: string, action: string, before: unknown, after: unknown, reason: string) {
  await getPool().query(
    `INSERT INTO master_audit (phone, pharmacy_id, action, "before", "after", reason) VALUES ($1,$2,$3,$4,$5,$6)`,
    [phone, pharmacyId, action, JSON.stringify(before), JSON.stringify(after), reason || ""],
  );
}

async function insertAudit(client: PoolClient, phone: string, pharmacyId: string, action: string, before: unknown, after: unknown, reason: string) {
  await client.query(
    `INSERT INTO master_audit (phone, pharmacy_id, action, "before", "after", reason) VALUES ($1,$2,$3,$4,$5,$6)`,
    [phone, pharmacyId, action, JSON.stringify(before), JSON.stringify(after), reason || ""],
  );
}

function planOf(value: unknown): Plan {
  if (value === "Free" || value === "Starter" || value === "Growth" || value === "Pro") return value;
  fail(400, "VALIDATION", "Choose a plan");
}
function cycleOf(value: unknown): BillingCycle {
  if (value === "monthly" || value === "annual") return value;
  fail(400, "VALIDATION", "Choose a billing cycle");
}
function dateOf(value: unknown) {
  const date = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(400, "VALIDATION", "Enter a renewal date");
  return date;
}

function seatsOf(state: PharmacyState) {
  const included = includedSeats(state.subscription.plan);
  const extra = state.extraSeats || 0;
  const inUse = state.users.filter((user) => user.active !== false).length;
  return { included, extra, inUse, limit: seatCeiling(state.subscription.plan, extra) };
}

function assertExtra(plan: Plan, extra: number) {
  if (!Number.isInteger(extra) || extra < 0) fail(400, "VALIDATION", "Extra seats must be a whole number");
  const included = includedSeats(plan);
  if (included == null) {
    if (extra > SEAT_CAP) fail(400, "VALIDATION", "Extra seats cannot exceed 50");
    return;
  }
  if (included + extra > SEAT_CAP) fail(400, "VALIDATION", "Total seats cannot exceed 50");
}

export function profileOf(id: string, phone: string, state: PharmacyState) {
  touchAccess(state);
  return {
    id,
    phone,
    name: state.profile.name,
    city: state.profile.city,
    plan: state.subscription.plan,
    cycle: state.subscription.cycle,
    status: state.subscription.status,
    renewsOn: state.subscription.renewsOn,
    seats: seatsOf(state),
    businessType: state.businessType,
    kyc: {
      gstin: state.profile.gstin,
      pan: state.profile.pan,
      dlNo: state.profile.dlNo,
      fssai: state.profile.fssai,
      pharmacist: state.profile.pharmacist,
      bank: state.bankAccount ? { bankName: state.bankAccount.bankName, accountNumber: state.bankAccount.accountNumber, ifsc: state.bankAccount.ifsc } : null,
    },
    tickets: state.tickets.filter((ticket) => ticket.status === "Open"),
    referrals: state.referrals || [],
    grants: state.grants || [],
    requests: state.subscriptionRequests || [],
  };
}

export async function listPharmacies(query: URLSearchParams) {
  await migrate();
  const { rows } = await getPool().query(
    `SELECT id, phone, business_type,
            COALESCE(state#>>'{profile,name}', '') AS name,
            COALESCE(state#>>'{profile,city}', '') AS city,
            COALESCE(state#>>'{subscription,plan}', 'Free') AS plan,
            COALESCE(state#>>'{subscription,cycle}', 'monthly') AS cycle,
            COALESCE(state#>>'{subscription,status}', 'active') AS status,
            COALESCE(state#>>'{subscription,renewsOn}', '') AS renews_on,
            COALESCE(state#>>'{profile,gstin}', '') AS gstin,
            COALESCE(state#>>'{profile,pan}', '') AS pan,
            COALESCE(state#>>'{profile,dlNo}', '') AS dl_no,
            COALESCE(state#>>'{profile,fssai}', '') AS fssai,
            COALESCE((NULLIF(state->>'extraSeats', ''))::int, 0) AS extra_seats,
            (SELECT count(*)::int FROM jsonb_array_elements(COALESCE(state->'users', '[]'::jsonb)) u
              WHERE COALESCE(u->>'active', 'true') <> 'false') AS in_use
     FROM pharmacies`,
  );
  const q = (query.get("q") || "").trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  const plan = query.get("plan") || "";
  const businessType = query.get("businessType") || "";
  const window = query.get("window") || "";
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((row) => {
    const sub = { plan: row.plan, cycle: row.cycle, status: row.status, renewsOn: row.renews_on, since: "", autoRenew: false };
    if (q) {
      const phone = String(row.phone || "");
      const hit = String(row.name).toLowerCase().includes(q) || String(row.city).toLowerCase().includes(q) || (qDigits.length >= 4 && phone.replace(/\D/g, "").includes(qDigits));
      if (!hit) return false;
    }
    if (plan && row.plan !== plan) return false;
    if (businessType && row.business_type !== businessType) return false;
    if (window === "expired") return subscriptionLapsed(sub, today);
    if (window === "7" || window === "15" || window === "30") {
      if (subscriptionLapsed(sub, today) || !/^\d{4}-\d{2}-\d{2}$/.test(sub.renewsOn)) return false;
      const end = new Date(today + "T00:00:00Z");
      end.setUTCDate(end.getUTCDate() + Number(window));
      return sub.renewsOn >= today && sub.renewsOn <= end.toISOString().slice(0, 10);
    }
    return true;
  }).map((row) => ({
    id: row.id as string,
    phone: row.phone as string,
    name: row.name as string,
    city: row.city as string,
    plan: row.plan as string,
    cycle: row.cycle as string,
    status: row.status as string,
    renewsOn: row.renews_on as string,
    businessType: row.business_type as string,
    seats: {
      included: includedSeats(row.plan as Plan),
      extra: Number(row.extra_seats) || 0,
      inUse: Number(row.in_use) || 0,
      limit: seatCeiling(row.plan as Plan, Number(row.extra_seats) || 0),
    },
    kyc: { gstin: row.gstin as string, pan: row.pan as string, dlNo: row.dl_no as string, fssai: row.fssai as string },
  }));
}

export async function listWork() {
  await migrate();
  const { rows } = await getPool().query(
    `SELECT id, phone, COALESCE(state#>>'{profile,name}', '') AS name,
            state->'tickets' AS tickets, state->'referrals' AS referrals
     FROM pharmacies`,
  );
  const tickets: Record<string, unknown>[] = [];
  const referrals: Record<string, unknown>[] = [];
  for (const row of rows) {
    for (const ticket of Array.isArray(row.tickets) ? row.tickets : []) {
      if (ticket.status === "Open") tickets.push({ ...ticket, pharmacyId: row.id, pharmacyName: row.name, phone: row.phone });
    }
    for (const referral of Array.isArray(row.referrals) ? row.referrals : []) {
      referrals.push({ ...referral, pharmacyId: row.id, pharmacyName: row.name, phone: row.phone });
    }
  }
  tickets.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  referrals.sort((a, b) => Number(a.status === "Paid") - Number(b.status === "Paid"));
  return { tickets, referrals };
}

export async function listAudit() {
  await migrate();
  const { rows } = await getPool().query(
    `SELECT a.phone, a.pharmacy_id, a.action, a."before", a."after", a.reason, a.at,
            COALESCE(p.state#>>'{profile,name}', '') AS pharmacy_name
     FROM master_audit a
     LEFT JOIN pharmacies p ON p.id = a.pharmacy_id
     ORDER BY a.at DESC
     LIMIT 100`,
  );
  return rows.map((row) => ({
    phone: row.phone as string,
    pharmacyId: row.pharmacy_id as string,
    pharmacyName: row.pharmacy_name as string,
    action: row.action as string,
    before: row.before,
    after: row.after,
    reason: row.reason as string,
    at: new Date(row.at as string).toISOString(),
  }));
}

export async function pharmacyProfile(id: string) {
  const state = await loadState(id);
  const { rows } = await getPool().query("SELECT phone FROM pharmacies WHERE id = $1", [id]);
  if (!rows[0]) fail(404, "NOT_FOUND", "Pharmacy not found");
  return profileOf(id, rows[0].phone as string, state);
}

export async function listRequests() {
  await migrate();
  const { rows } = await getPool().query(
    `SELECT id, phone, COALESCE(state#>>'{profile,name}', '') AS name, state->'subscriptionRequests' AS requests FROM pharmacies`,
  );
  const list: Record<string, unknown>[] = [];
  for (const row of rows) {
    const requests = Array.isArray(row.requests) ? row.requests : [];
    for (const request of requests) {
      list.push({ ...request, pharmacyId: row.id, pharmacyName: row.name, phone: row.phone });
    }
  }
  list.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  return list;
}

function markRequests(state: PharmacyState) {
  state.subscriptionRequests = (state.subscriptionRequests || []).map((request) => request.status === "open" ? { ...request, status: "handled" as const } : request);
}

export function assignPlan(master: MasterSession, id: string, body: Record<string, unknown>) {
  const plan = planOf(body.plan);
  const cycle = cycleOf(body.cycle);
  const renewsOn = plan === "Free" && (body.renewsOn === "—" || body.renewsOn == null || body.renewsOn === "") ? "—" : dateOf(body.renewsOn);
  return writePharmacy(master.phone, id, "plan", String(body.reason || ""), (state) => {
    const before = { plan: state.subscription.plan, cycle: state.subscription.cycle, renewsOn: state.subscription.renewsOn };
    const lapsed = plan !== "Free" && renewsOn !== "—" && renewsOn < todayISO();
    const next = { ...state.subscription, plan, cycle, renewsOn, status: lapsed ? "expired" as const : "active" as const };
    state.subscription = next;
    markRequests(state);
    const after = { plan, cycle, renewsOn, status: next.status };
    return { before, after };
  });
}

export function assignGrants(master: MasterSession, id: string, body: Record<string, unknown>) {
  const raw = Array.isArray(body.grants) ? body.grants : null;
  if (!raw) fail(400, "VALIDATION", "Send the grant list");
  const grants: ScreenGrant[] = raw.map((item) => {
    const route = String((item as { route?: string }).route || "");
    if (!PREMIUM_ROUTES.includes(route)) fail(400, "VALIDATION", "Unknown screen");
    const until = (item as { until?: string }).until;
    if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) fail(400, "VALIDATION", "Enter a grant expiry date");
    return until ? { route, until } : { route };
  });
  return writePharmacy(master.phone, id, "grants", String(body.reason || ""), (state) => {
    const before = state.grants || [];
    state.grants = grants;
    return { before, after: grants };
  });
}

export function assignSeats(master: MasterSession, id: string, body: Record<string, unknown>) {
  const extra = Number(body.extraSeats);
  return writePharmacy(master.phone, id, "seats", String(body.reason || ""), (state) => {
    assertExtra(state.subscription.plan, extra);
    const before = state.extraSeats || 0;
    if (before === extra) return null;
    state.extraSeats = extra;
    return { before, after: extra };
  });
}

export function assignBusinessType(master: MasterSession, id: string, body: Record<string, unknown>) {
  const businessType = body.businessType === "hospital" ? "hospital" : body.businessType === "pharmacy" ? "pharmacy" : null;
  if (!businessType) fail(400, "VALIDATION", "Choose a business type");
  return writePharmacy(master.phone, id, "business-type", String(body.reason || ""), (state) => {
    const before = state.businessType;
    if (before === businessType) return null;
    state.businessType = businessType;
    return { before, after: businessType };
  });
}

export function assignTicket(master: MasterSession, id: string, ticketId: string, body: Record<string, unknown>) {
  const status = body.status === "Open" || body.status === "Resolved" ? body.status : null;
  if (!status) fail(400, "VALIDATION", "Choose a ticket status");
  return writePharmacy(master.phone, id, "ticket", String(body.reason || ""), (state) => {
    const prev = state.tickets.find((ticket) => ticket.id === ticketId);
    if (!prev) fail(404, "NOT_FOUND", "Ticket not found");
    const before = prev.status;
    if (before === status) return null;
    state.tickets = state.tickets.map((ticket) => ticket.id === ticketId ? { ...ticket, status } : ticket);
    return { before: { id: ticketId, status: before }, after: { id: ticketId, status } };
  });
}

function referralAt(state: PharmacyState, id: string) {
  const prev = (state.referrals || []).find((row) => row.id === id);
  if (!prev) fail(404, "NOT_FOUND", "Referral not found");
  return prev;
}

export function earnReferral(master: MasterSession, id: string, referralId: string, body: Record<string, unknown>) {
  return writePharmacy(master.phone, id, "referral-earned", String(body.reason || ""), (state) => {
    const prev = referralAt(state, referralId);
    if (prev.status === "Paid") fail(403, "FORBIDDEN", "A paid referral cannot be changed");
    if (prev.status === "Earned" && prev.reward === REFERRAL_REWARD) return null;
    const before = { id: prev.id, status: prev.status, reward: prev.reward };
    const next = { ...prev, status: "Earned" as const, reward: REFERRAL_REWARD };
    state.referrals = state.referrals.map((row) => row.id === referralId ? next : row);
    return { before, after: { id: next.id, status: next.status, reward: next.reward } };
  });
}

export function payReferral(master: MasterSession, id: string, referralId: string, body: Record<string, unknown>) {
  return writePharmacy(master.phone, id, "referral-paid", String(body.reason || ""), (state) => {
    const prev = referralAt(state, referralId);
    if (prev.status === "Paid") return null;
    if (prev.status !== "Earned") fail(400, "VALIDATION", "Earn the reward before paying it");
    const before = { id: prev.id, status: prev.status, reward: prev.reward, paidAt: prev.paidAt, paidBy: prev.paidBy };
    const next = { ...prev, status: "Paid" as const, reward: REFERRAL_REWARD, paidAt: Date.now(), paidBy: master.phone };
    state.referrals = state.referrals.map((row) => row.id === referralId ? next : row);
    return { before, after: { id: next.id, status: next.status, reward: next.reward, paidAt: next.paidAt, paidBy: next.paidBy } };
  });
}

export async function startImpersonation(master: MasterSession, id: string) {
  const state = await loadState(id);
  const owner = state.users.find((user) => user.role === "Owner" && user.active !== false) || state.users.find((user) => user.active !== false);
  if (!owner) fail(404, "NOT_FOUND", "This pharmacy has no active user");
  const token = await createSession(id, owner.id, owner.phone || state.profile.phone, master.phone);
  try {
    await recordAudit(master.phone, id, "impersonate", {}, { userId: owner.id }, "");
  } catch (err) {
    await destroySession(token);
    throw err;
  }
  return token;
}

export async function bookConsultation(body: Record<string, unknown>) {
  if (String(body.companyWebsite || "").trim()) return { ok: true };
  const name = String(body.name || "").trim().slice(0, 80);
  const phone = String(body.phone || "").replace(/\D/g, "");
  const area = String(body.area || "").trim().slice(0, 80);
  const note = String(body.note || "").trim().slice(0, 400);
  if (name.length < 2) fail(400, "VALIDATION", "Enter your name");
  if (!/^[6-9]\d{9}$/.test(phone)) fail(400, "VALIDATION", "Enter a 10-digit mobile number");
  await migrate();
  await getPool().query("INSERT INTO consultations (name, phone, area, note) VALUES ($1,$2,$3,$4)", [name, e164(phone), area, note]);
  return { ok: true };
}

export async function listConsultations() {
  await migrate();
  const { rows } = await getPool().query("SELECT id, name, phone, area, note, status, at FROM consultations ORDER BY at DESC LIMIT 200");
  return rows.map((row) => ({
    id: Number(row.id), name: row.name as string, phone: row.phone as string, area: row.area as string,
    note: row.note as string, status: row.status as string, at: new Date(row.at as string).toISOString(),
  }));
}

export async function markConsultation(id: string, body: Record<string, unknown>) {
  const status = body.status === "handled" || body.status === "open" ? body.status : null;
  if (!status) fail(400, "VALIDATION", "Choose a status");
  const updated = await getPool().query("UPDATE consultations SET status = $2 WHERE id = $1", [Number(id), status]);
  if (!updated.rowCount) fail(404, "NOT_FOUND", "Booking not found");
  return { ok: true };
}
