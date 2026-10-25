import { ALL_PERM_KEYS, userPerms } from "../app/data";
import { aggregateCustomers } from "../app/lib/customerExport";
import { buildPatients } from "../app/lib/crm";
import { custKeyOf, creditCustomers, findScan } from "../app/data";
import { buildPatientLedger } from "../app/lib/hospital";
import { REPORT_CATALOG, runReport } from "../app/lib/reportCatalog";
import { catalogCsvText } from "../app/lib/reportExport";
import { buildInvoicePdf } from "../app/lib/pdf";
import { fromPaise, reportToPaise, toPaise } from "../app/lib/paise";
import { REFERRALS } from "../app/lib/referrals";
import { cognitoConfigured, sendCognitoOtp, verifyCognitoOtp } from "./auth";
import {
  createSession, destroySession, e164, findLogin, insertPharmacy, loadState, readSession,
  replaceState, requestHash, saveChallenge, setUnlocked, takeChallenge, withIdempotent, withState, type SessionRow,
} from "./db";
import { ApiError } from "./errors";
import { expandFiles, readFile } from "./files";
import * as m from "./mutate";
import { DEPARTMENTS, demoState, emptyState, type PharmacyState } from "./state";
import type { BusinessType } from "./types";

const COOKIE = "namma_session";

type Ctx = {
  req: Request;
  url: URL;
  path: string;
  body: Record<string, unknown>;
  params: Record<string, string>;
  session: SessionRow;
  state: PharmacyState;
};

function cookie(token: string | null) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  if (!token) return `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
  return `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 86400}${secure}`;
}

function tokenOf(req: Request) {
  const hit = (req.headers.get("cookie") || "").split(";").map((s) => s.trim()).find((s) => s.startsWith(COOKIE + "="));
  return hit ? decodeURIComponent(hit.slice(COOKIE.length + 1)) : undefined;
}

function devAuth() { return process.env.NODE_ENV !== "production"; }

function encode(body: unknown) {
  const expanded = expandFiles(body);
  if (expanded && typeof expanded === "object" && "columns" in expanded && "rows" in expanded) return reportToPaise(expanded as { columns: { money?: boolean }[]; rows: (string | number)[][]; totals?: (string | number)[] });
  return toPaise(expanded);
}

function send(body: unknown, status = 200, token?: string | null) {
  const headers = new Headers({ "content-type": "application/json" });
  if (token !== undefined) headers.set("set-cookie", cookie(token));
  return new Response(JSON.stringify(encode(body)), { status, headers });
}

function sessionView(state: PharmacyState, session: SessionRow) {
  const user = state.users.find((u) => u.id === session.userId);
  const permissions = user ? (user.role === "Owner" ? [...ALL_PERM_KEYS] : userPerms(user)) : [...ALL_PERM_KEYS];
  return {
    user: user
      ? { id: user.id, name: user.name, role: user.role, phone: user.phone, permissions }
      : { id: session.userId, phone: session.phone, role: "Owner", permissions },
    businessType: state.businessType,
    setupComplete: state.setupComplete,
    subscription: state.subscription,
    creditPayments: state.creditPayments,
    caShares: state.caShares,
    wardSupplies: state.wardSupplies,
    hospitalPayments: state.hospitalPayments,
    tpaClaims: state.tpaClaims,
    hospitalPriceRules: state.hospitalPriceRules,
  };
}

async function ownerState(phone: string, name: string | undefined, businessType: BusinessType) {
  const state = emptyState({ name, phone, businessType });
  state.users = [{ id: "u1", name: name?.trim() || "Owner", role: "Owner", phone, email: "", active: true, lastActiveMins: 0, pin: "", permissions: [...ALL_PERM_KEYS] }];
  const created = await insertPharmacy(phone, businessType, state);
  return created;
}

function guard(state: PharmacyState, session: SessionRow, route?: { plan?: string; perm?: string; hospital?: boolean }) {
  if (route?.hospital) m.requireHospital(state);
  if (route?.plan) m.requirePlan(state, route.plan);
  if (route?.perm) m.requirePerm(state, session.userId, route.perm);
}

type Spec = {
  method: string;
  path: string;
  write?: boolean;
  idem?: boolean;
  plan?: string;
  perm?: string;
  hospital?: boolean;
  run: (c: Ctx) => unknown;
};

const specs: Spec[] = [
  { method: "GET", path: "/session", run: (c) => sessionView(c.state, c.session) },
  { method: "GET", path: "/pharmacy/profile", run: (c) => c.state.profile },
  { method: "PATCH", path: "/pharmacy/profile", write: true, run: (c) => m.patchProfile(c.state, c.body) },
  { method: "POST", path: "/pharmacy/store-open", write: true, run: (c) => m.toggleStore(c.state) },
  { method: "GET", path: "/settings/invoice", run: (c) => c.state.invoiceSettings },
  { method: "PATCH", path: "/settings/invoice", write: true, run: (c) => m.patchInvoice(c.state, c.body) },
  { method: "GET", path: "/settings/kiosk", run: (c) => c.state.kiosk },
  { method: "PATCH", path: "/settings/kiosk", write: true, plan: "kiosk", run: (c) => m.patchKiosk(c.state, c.body) },
  { method: "POST", path: "/setup/complete", write: true, run: (c) => m.completeSetup(c.state, c.body.complete !== false) },
  { method: "POST", path: "/setup/wipe", write: true, run: (c) => m.wipeData(c.state) },
  { method: "GET", path: "/inventory", run: (c) => c.state.inventory },
  { method: "POST", path: "/inventory/products", write: true, run: (c) => m.addProduct(c.state, c.body as never) },
  { method: "PATCH", path: "/inventory/products/:id", write: true, run: (c) => m.updateProduct(c.state, c.params.id, c.body) },
  { method: "POST", path: "/inventory/products/:id/batches", write: true, run: (c) => m.addBatch(c.state, c.params.id, c.body as never) },
  { method: "PATCH", path: "/inventory/products/:id/batches/:batchNo", write: true, idem: true, run: (c) => m.setBatchQty(c.state, c.params.id, c.params.batchNo, Number(c.body.qty)) },
  { method: "POST", path: "/inventory/products/:id/online", write: true, run: (c) => m.toggleOnline(c.state, c.params.id) },
  { method: "POST", path: "/inventory/products/:id/loose", write: true, run: (c) => m.toggleLoose(c.state, c.params.id) },
  { method: "PATCH", path: "/inventory/products/:id/online-price", write: true, plan: "online", run: (c) => m.setOnlinePrice(c.state, c.params.id, c.body.price as number | undefined) },
  { method: "PATCH", path: "/inventory/products/:id/offer", write: true, plan: "offers", run: (c) => m.setProductOffer(c.state, c.params.id, c.body.offerId as string | undefined) },
  { method: "PATCH", path: "/inventory/products/:id/supplier", write: true, plan: "distributors", run: (c) => m.setProductSupplier(c.state, c.params.id, String(c.body.supplierId || "")) },
  { method: "PATCH", path: "/inventory/products/:id/location", write: true, plan: "rackmap", run: (c) => m.setProductLocation(c.state, c.params.id, String(c.body.rack || ""), c.body.rackAlt as string | undefined) },
  { method: "POST", path: "/inventory/location/bulk", write: true, plan: "rackmap", run: (c) => m.bulkAssignLocation(c.state, (c.body.ids as string[]) || [], String(c.body.rack || "")) },
  { method: "POST", path: "/inventory/loose-default", write: true, run: (c) => m.setLooseDefault(c.state, Boolean(c.body.allowed)) },
  { method: "GET", path: "/inventory/scan", run: (c) => { m.requirePlan(c.state, "pos"); return findScan(c.state.inventory, c.url.searchParams.get("q") || ""); } },
  { method: "GET", path: "/racks", run: (c) => c.state.racks },
  { method: "POST", path: "/racks", write: true, plan: "rackmap", run: (c) => m.createRack(c.state, String(c.body.rack || c.body.code || "")) },
  { method: "DELETE", path: "/racks/:code", write: true, plan: "rackmap", run: (c) => m.removeRack(c.state, c.params.code) },
  { method: "GET", path: "/purchases", run: (c) => c.state.purchases },
  { method: "POST", path: "/purchases/receive", write: true, idem: true, run: (c) => m.receivePurchase(c.state, c.body as never) },
  { method: "GET", path: "/suppliers", run: (c) => c.state.suppliers },
  { method: "POST", path: "/suppliers", write: true, plan: "distributors", run: (c) => m.addSupplier(c.state, c.body as never) },
  { method: "PATCH", path: "/suppliers/:id", write: true, plan: "distributors", run: (c) => m.updateSupplier(c.state, c.params.id, c.body) },
  { method: "DELETE", path: "/suppliers/:id", write: true, plan: "distributors", run: (c) => m.removeSupplier(c.state, c.params.id) },
  { method: "GET", path: "/supply-list", run: (c) => c.state.supplyList },
  { method: "POST", path: "/supply-list", write: true, plan: "distributors", run: (c) => m.addSupply(c.state, c.body as never) },
  { method: "PATCH", path: "/supply-list/:id", write: true, plan: "distributors", run: (c) => m.updateSupply(c.state, c.params.id, c.body) },
  { method: "DELETE", path: "/supply-list/:id", write: true, plan: "distributors", run: (c) => m.removeSupply(c.state, c.params.id) },
  { method: "POST", path: "/supply-list/:id/preferred", write: true, plan: "distributors", run: (c) => m.setPreferredSupply(c.state, c.params.id) },
  { method: "GET", path: "/purchase-orders", run: (c) => c.state.purchaseOrders },
  { method: "POST", path: "/purchase-orders", write: true, plan: "reorder", run: (c) => m.sendPurchaseOrder(c.state, String(c.body.supplierId), String(c.body.supplierName || ""), (c.body.items as never) || [], c.body.note as string | undefined) },
  { method: "POST", path: "/purchase-orders/:id/received", write: true, plan: "reorder", run: (c) => m.markPOReceived(c.state, c.params.id) },
  { method: "GET", path: "/sales", run: (c) => filterSales(c) },
  { method: "GET", path: "/sales/:id", run: (c) => c.state.sales.find((s) => s.id === c.params.id) || missing("Sale") },
  { method: "POST", path: "/pos/checkout", write: true, idem: true, run: (c) => m.checkoutPos(c.state, c.body as never) },
  { method: "POST", path: "/sales/:id/mark-paid", write: true, run: (c) => m.markPaid(c.state, c.params.id, c.body.payMode as never) },
  { method: "POST", path: "/sales/:id/advance", write: true, plan: "orders", run: (c) => m.advanceOrder(c.state, c.params.id) },
  { method: "POST", path: "/sales/:id/cancel", write: true, idem: true, plan: "orders", run: (c) => m.cancelOrder(c.state, c.params.id) },
  { method: "POST", path: "/sales/:id/packing/start", write: true, plan: "orders", run: (c) => m.startPacking(c.state, c.params.id) },
  { method: "POST", path: "/sales/:id/packing/scan", write: true, idem: true, plan: "orders", run: (c) => m.scanPackLine(c.state, c.params.id, String(c.body.code || c.body.q || "")) },
  { method: "POST", path: "/sales/:id/packing/pick", write: true, idem: true, plan: "orders", run: (c) => m.pickPackLine(c.state, c.params.id, String(c.body.productId), Number(c.body.delta)) },
  { method: "POST", path: "/sales/:id/packing/seal", write: true, plan: "orders", run: (c) => m.sealPacket(c.state, c.params.id) },
  { method: "POST", path: "/sales/:id/handover", write: true, plan: "orders", run: (c) => m.handToRider(c.state, c.params.id, c.body.rider as never) },
  { method: "POST", path: "/sales/settle", write: true, idem: true, hospital: true, plan: "ptbills", run: (c) => m.settleBills(c.state, (c.body.ids as string[]) || [], c.body.payMode as never) },
  { method: "POST", path: "/kiosk/orders", write: true, idem: true, plan: "kiosk", run: (c) => m.placeKioskOrder(c.state, (c.body.lines as never) || [], (c.body.payMode || c.body.pay) as never) },
  { method: "GET", path: "/prescriptions", run: (c) => c.state.prescriptions },
  { method: "POST", path: "/prescriptions/:id/approve", write: true, plan: "prescriptions", run: (c) => m.approveRx(c.state, c.params.id) },
  { method: "POST", path: "/prescriptions/:id/reject", write: true, plan: "prescriptions", run: (c) => m.rejectRx(c.state, c.params.id, c.body.reason as string | undefined) },
  { method: "POST", path: "/prescriptions/:id/dispense", write: true, plan: "prescriptions", run: (c) => m.dispenseRx(c.state, c.params.id) },
  { method: "GET", path: "/offers", run: (c) => c.state.offers },
  { method: "POST", path: "/offers", write: true, plan: "offers", run: (c) => m.addOffer(c.state, c.body as never) },
  { method: "POST", path: "/offers/:id/toggle", write: true, plan: "offers", run: (c) => m.toggleOffer(c.state, c.params.id) },
  { method: "DELETE", path: "/offers/:id", write: true, plan: "offers", run: (c) => m.removeOffer(c.state, c.params.id) },
  { method: "PUT", path: "/inventory/products/:id/direct-offer", write: true, plan: "online", run: (c) => m.setDirectOffer(c.state, c.params.id, c.body.type as never, Number(c.body.value || 0)) },
  { method: "GET", path: "/credit/ledger", run: (c) => creditCustomers(c.state.sales, c.state.creditPayments) },
  { method: "POST", path: "/credit/payments", write: true, plan: "khata", run: (c) => m.recordCreditPayment(c.state, c.body as never) },
  { method: "GET", path: "/customers", run: (c) => aggregateCustomers(c.state.sales) },
  { method: "GET", path: "/crm/patients", run: (c) => ({ patients: patientsOf(c.state), crm: c.state.crm }) },
  { method: "PATCH", path: "/crm/patients/:key", write: true, plan: "crm", run: (c) => m.setPatientMeta(c.state, c.params.key, c.body as never) },
  { method: "POST", path: "/crm/campaigns", write: true, plan: "crm", run: (c) => m.addCampaign(c.state, c.body as never) },
  { method: "POST", path: "/crm/feedback", write: true, plan: "crm", run: (c) => m.addFeedback(c.state, c.body as never) },
  { method: "POST", path: "/crm/reminders", write: true, plan: "crm", run: (c) => m.logReminder(c.state, c.body as never) },
  { method: "POST", path: "/crm/redemptions", write: true, plan: "crm", run: (c) => m.redeemPoints(c.state, String(c.body.custKey), String(c.body.custName || ""), Number(c.body.points)) },
  { method: "GET", path: "/expenses", run: (c) => ({ expenses: c.state.expenses, categories: c.state.expenseCategories }) },
  { method: "POST", path: "/expenses", write: true, perm: "reports", plan: "expenses", run: (c) => m.addExpense(c.state, c.body as never) },
  { method: "PATCH", path: "/expenses/:id", write: true, perm: "reports", plan: "expenses", run: (c) => m.updateExpense(c.state, c.params.id, c.body) },
  { method: "DELETE", path: "/expenses/:id", write: true, perm: "reports", plan: "expenses", run: (c) => m.removeExpense(c.state, c.params.id) },
  { method: "POST", path: "/expense-categories", write: true, perm: "reports", plan: "expenses", run: (c) => m.addExpenseCategory(c.state, String(c.body.name || "")) },
  { method: "GET", path: "/employees", run: (c) => c.state.employees },
  { method: "POST", path: "/employees", write: true, perm: "employees", plan: "employees", run: (c) => m.addEmployee(c.state, c.body as never) },
  { method: "PATCH", path: "/employees/:id", write: true, perm: "employees", plan: "employees", run: (c) => m.updateEmployee(c.state, c.params.id, c.body) },
  { method: "DELETE", path: "/employees/:id", write: true, perm: "employees", plan: "employees", run: (c) => m.removeEmployee(c.state, c.params.id) },
  { method: "GET", path: "/users", run: (c) => c.state.users },
  { method: "POST", path: "/users", write: true, perm: "users", plan: "users", run: (c) => m.addUser(c.state, c.body as never) },
  { method: "PATCH", path: "/users/:id", write: true, perm: "users", plan: "users", run: (c) => m.updateUser(c.state, c.params.id, c.body) },
  { method: "DELETE", path: "/users/:id", write: true, perm: "users", plan: "users", run: (c) => m.removeUser(c.state, c.params.id) },
  { method: "GET", path: "/subscription", run: (c) => c.state.subscription },
  { method: "PATCH", path: "/subscription", write: true, run: (c) => patchSub(c) },
  { method: "GET", path: "/bank-account", run: (c) => ({ bankAccount: c.state.bankAccount }) },
  { method: "PUT", path: "/bank-account", write: true, run: (c) => m.saveBankAccount(c.state, c.body as never) },
  { method: "DELETE", path: "/bank-account", write: true, run: (c) => m.removeBankAccount(c.state) },
  { method: "POST", path: "/bank-account/verify", write: true, run: (c) => m.verifyBankAccount(c.state) },
  { method: "GET", path: "/advisors", run: (c) => c.state.advisors },
  { method: "POST", path: "/advisors", write: true, plan: "ca", run: (c) => m.addAdvisor(c.state, c.body as never) },
  { method: "PATCH", path: "/advisors/:id", write: true, plan: "ca", run: (c) => m.updateAdvisor(c.state, c.params.id, c.body) },
  { method: "DELETE", path: "/advisors/:id", write: true, plan: "ca", run: (c) => m.removeAdvisor(c.state, c.params.id) },
  { method: "POST", path: "/ca/shares", write: true, plan: "ca", run: (c) => m.shareWithCA(c.state, String(c.body.period || ""), (c.body.reports as string[]) || [], String(c.body.advisorId || "")) },
  { method: "GET", path: "/reports/catalog", plan: "reports", run: () => REPORT_CATALOG },
  { method: "GET", path: "/reports/:id", plan: "reports", run: (c) => runReport(c.params.id, reportCtx(c)) },
  { method: "GET", path: "/hospital/wards", hospital: true, plan: "wards", run: (c) => c.state.wards },
  { method: "POST", path: "/hospital/wards", write: true, hospital: true, plan: "wards", run: (c) => m.addWard(c.state, c.body as never) },
  { method: "PATCH", path: "/hospital/wards/:id", write: true, hospital: true, plan: "wards", run: (c) => m.updateWard(c.state, c.params.id, c.body) },
  { method: "DELETE", path: "/hospital/wards/:id", write: true, hospital: true, plan: "wards", run: (c) => m.removeWard(c.state, c.params.id) },
  { method: "GET", path: "/hospital/admissions", hospital: true, plan: "wards", run: (c) => c.state.admissions },
  { method: "POST", path: "/hospital/admissions", write: true, hospital: true, plan: "wards", run: (c) => m.admitPatient(c.state, c.body as never) },
  { method: "PATCH", path: "/hospital/admissions/:id", write: true, hospital: true, plan: "wards", run: (c) => patchAdmission(c) },
  { method: "GET", path: "/hospital/indents", hospital: true, plan: "indents", run: (c) => c.state.wardIndents },
  { method: "PATCH", path: "/hospital/indents/:id", write: true, hospital: true, plan: "indents", run: (c) => m.setIndentStatus(c.state, c.params.id, c.body.status as never) },
  { method: "POST", path: "/hospital/indents/:id/issue", write: true, idem: true, hospital: true, plan: "indents", run: (c) => m.issueIndent(c.state, c.params.id) },
  { method: "GET", path: "/hospital/departments", hospital: true, plan: "departments", run: () => DEPARTMENTS },
  { method: "GET", path: "/hospital/doctors", hospital: true, plan: "doctors", run: (c) => c.state.doctors },
  { method: "POST", path: "/hospital/doctors", write: true, hospital: true, plan: "doctors", run: (c) => m.addDoctor(c.state, c.body as never) },
  { method: "PATCH", path: "/hospital/doctors/:id", write: true, hospital: true, plan: "doctors", run: (c) => m.updateDoctor(c.state, c.params.id, c.body) },
  { method: "DELETE", path: "/hospital/doctors/:id", write: true, hospital: true, plan: "doctors", run: (c) => m.removeDoctor(c.state, c.params.id) },
  { method: "GET", path: "/hospital/account", hospital: true, plan: "hospbill", run: (c) => c.state.hospitalAccount },
  { method: "PATCH", path: "/hospital/account", write: true, hospital: true, plan: "hospbill", run: (c) => m.updateHospitalAccount(c.state, c.body) },
  { method: "PATCH", path: "/hospital/pricing/rules", write: true, hospital: true, plan: "hospbill", run: (c) => patchPricing(c) },
  { method: "POST", path: "/hospital/ward-supplies/issue", write: true, idem: true, hospital: true, plan: "hospbill", run: (c) => m.issueWardSupply(c.state, c.body as never) },
  { method: "POST", path: "/hospital/ward-supplies/return", write: true, idem: true, hospital: true, plan: "hospbill", run: (c) => m.returnWardSupply(c.state, c.body as never) },
  { method: "POST", path: "/hospital/payments", write: true, idem: true, hospital: true, plan: "hospbill", run: (c) => m.recordHospitalPayment(c.state, c.body as never) },
  { method: "GET", path: "/hospital/patient-bills", hospital: true, plan: "ptbills", run: (c) => buildPatientLedger(c.state.sales) },
  { method: "GET", path: "/hospital/tpa-claims/:id", hospital: true, plan: "hospbill", run: (c) => c.state.tpaClaims.find((x) => x.id === c.params.id) || missing("Claim") },
  { method: "PATCH", path: "/hospital/tpa-claims/:id", write: true, hospital: true, plan: "hospbill", run: (c) => m.setClaimStatus(c.state, c.params.id, c.body.status as never, c.body.approvedAmount as number | undefined) },
  { method: "GET", path: "/support/tickets", run: (c) => c.state.tickets },
  { method: "POST", path: "/support/tickets", write: true, run: (c) => m.addTicket(c.state, String(c.body.subject || ""), String(c.body.category || "General")) },
  { method: "GET", path: "/referrals", run: () => REFERRALS },
];

function missing(name: string): never {
  throw new ApiError(404, "NOT_FOUND", name + " not found");
}
function filterSales(c: Ctx) {
  return c.state.sales.filter((s) => {
    const channel = c.url.searchParams.get("channel");
    const status = c.url.searchParams.get("status");
    return (!channel || s.channel === channel) && (!status || s.status === status);
  });
}
function patientsOf(state: PharmacyState) {
  const keys = new Set<string>();
  for (const s of state.sales) if (s.payMode === "credit") keys.add(custKeyOf(s.customer));
  for (const p of state.creditPayments) keys.add(p.custKey);
  return buildPatients(state.sales, state.inventory, keys, Date.now(), state.crm.meta);
}
function reportCtx(c: Ctx) {
  const from = Number(c.url.searchParams.get("from") || Date.now() - 365 * 86400000);
  const to = Number(c.url.searchParams.get("to") || Date.now());
  return { sales: c.state.sales, purchases: c.state.purchases, inventory: c.state.inventory, expenses: c.state.expenses, profile: c.state.profile, now: Date.now(), range: { from, to, label: "Selected range" } };
}
function patchSub(c: Ctx) {
  if (c.body.autoRenew === true || c.body.autoRenew === false) return c.body.action === "toggle" ? m.toggleAutoRenew(c.state) : (c.state.subscription = { ...c.state.subscription, autoRenew: Boolean(c.body.autoRenew) });
  if (c.body.action === "renew") return m.renewSubscription(c.state);
  if (c.body.plan) return m.changePlan(c.state, c.body.plan as never, (c.body.cycle as never) || c.state.subscription.cycle);
  return c.state.subscription;
}
function patchAdmission(c: Ctx) {
  if (c.body.status === "discharged") return m.dischargePatient(c.state, c.params.id);
  return m.updateAdmission(c.state, c.params.id, c.body);
}
function patchPricing(c: Ctx) {
  const unlocked = c.session.pricingUnlocked && c.req.headers.get("x-pricing-unlock") === "1";
  if ("discountPct" in c.body) return m.setUniformDiscount(c.state, Number(c.body.discountPct), unlocked);
  return m.setHospitalPriceRule(c.state, String(c.body.productId), (c.body.rule as never) ?? null, unlocked);
}
function matchSpec(method: string, path: string) {
  for (const spec of specs) {
    if (spec.method !== method) continue;
    const names: string[] = [];
    const re = new RegExp("^" + spec.path.replace(/:([A-Za-z]+)/g, (_m, name) => { names.push(name); return "([^/]+)"; }) + "$");
    const found = re.exec(path);
    if (!found) continue;
    const params: Record<string, string> = {};
    names.forEach((name, i) => { params[name] = decodeURIComponent(found[i + 1]); });
    return { spec, params };
  }
  return null;
}

export async function handle(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/v1/, "") || "/";
    const raw = req.method === "GET" || req.method === "DELETE" ? "" : await req.text();
    const body = raw ? fromPaise(JSON.parse(raw)) as Record<string, unknown> : {};
    if (req.method === "POST" && path === "/auth/otp/send") return await sendOtp(body);
    if (req.method === "POST" && path === "/auth/otp/verify") return await verifyOtp(body);
    if (req.method === "POST" && path === "/auth/sign-out") return await signOut(req);
    if (req.method === "POST" && path === "/demo/reset") return await demoReset(req);
    if (req.method === "POST" && path === "/hospital/pricing/unlock") return await unlockPricing(req, body);
    if (req.method === "GET" && path.startsWith("/sales/") && path.endsWith("/invoice.pdf")) return await invoicePdf(req, path.slice("/sales/".length, -"/invoice.pdf".length));
    if (req.method === "GET" && path.startsWith("/reports/") && path.endsWith("/export.csv")) return await reportCsv(req, path.slice("/reports/".length, -"/export.csv".length), url);
    if (req.method === "GET" && path.startsWith("/files/")) return await file(req, path.slice("/files/".length));
    const found = matchSpec(req.method, path);
    if (!found) throw new ApiError(404, "NOT_FOUND", "No such API");
    const session = await readSession(tokenOf(req));
    if (!session) throw new ApiError(401, "UNAUTHENTICATED", "Sign in required");
    if (found.spec.idem) {
      const key = req.headers.get("idempotency-key");
      if (!key) throw new ApiError(400, "VALIDATION", "Idempotency-Key is required");
      const hash = requestHash(req.method, path, raw);
      const saved = await withIdempotent(session.pharmacyId, key, hash, (state) => {
        guard(state, session, found.spec);
        return found.spec.run({ req, url, path, body, params: found.params, session, state });
      }, encode);
      return new Response(JSON.stringify(saved.body), { status: saved.status, headers: { "content-type": "application/json" } });
    }
    if (found.spec.write) {
      const result = await withState(session.pharmacyId, (state) => {
        guard(state, session, found.spec);
        return found.spec.run({ req, url, path, body, params: found.params, session, state });
      });
      return send(result);
    }
    const state = await loadState(session.pharmacyId);
    guard(state, session, found.spec);
    const result = await found.spec.run({ req, url, path, body, params: found.params, session, state });
    return send(result);
  } catch (err) {
    if (err instanceof ApiError) return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
    console.error(err);
    const message = process.env.NODE_ENV === "production" ? "Something went wrong" : (err as Error).message;
    return Response.json({ error: { code: "VALIDATION", message } }, { status: 500 });
  }
}

async function sendOtp(body: Record<string, unknown>) {
  const phone = e164(String(body.phone || ""));
  if (phone.replace(/\D/g, "").length < 12) throw new ApiError(400, "VALIDATION", "Enter a 10-digit mobile number");
  if (!cognitoConfigured()) {
    if (!devAuth()) throw new ApiError(503, "VALIDATION", "Sign-in is not configured");
    return send({ delivery: "dev" });
  }
  const challenge = await sendCognitoOtp(phone);
  await saveChallenge(phone, challenge);
  return send({ delivery: "sms" });
}

async function verifyOtp(body: Record<string, unknown>) {
  const phone = e164(String(body.phone || ""));
  const code = String(body.code || "").replace(/\D/g, "");
  if (code.length !== 6) throw new ApiError(400, "VALIDATION", "Enter the 6-digit code");
  const businessType: BusinessType = body.businessType === "hospital" ? "hospital" : "pharmacy";
  if (cognitoConfigured()) {
    const challenge = await takeChallenge(phone);
    if (!challenge?.cognito_session) throw new ApiError(401, "UNAUTHENTICATED", "Request a new code");
    await verifyCognitoOtp(phone, code, challenge.cognito_session);
  } else if (!devAuth()) {
    throw new ApiError(503, "VALIDATION", "Sign-in is not configured");
  }
  let login = await findLogin(phone);
  if (!login) {
    const created = await ownerState(phone, body.name as string | undefined, businessType);
    login = { pharmacy_id: created.id, user_id: "u1" };
  }
  const state = await loadState(login.pharmacy_id);
  const user = state.users.find((u) => u.id === login!.user_id);
  if (user && user.active === false) throw new ApiError(403, "FORBIDDEN", "This user is inactive");
  const token = await createSession(login.pharmacy_id, login.user_id, phone);
  const session = await readSession(token);
  if (!session) throw new ApiError(500, "VALIDATION", "Could not start a session");
  return send(sessionView(state, session), 200, token);
}

async function signOut(req: Request) {
  const token = tokenOf(req);
  if (token) await destroySession(token);
  return send({ ok: true }, 200, null);
}

async function demoReset(req: Request) {
  if (!devAuth()) throw new ApiError(404, "NOT_FOUND", "No such API");
  const session = await readSession(tokenOf(req));
  if (!session) throw new ApiError(401, "UNAUTHENTICATED", "Sign in required");
  const state = await loadState(session.pharmacyId);
  const next = keepOwner(demoState(Date.now(), state.businessType), state.users.find((u) => u.id === session.userId), session.phone);
  await replaceState(session.pharmacyId, next);
  return send({ ok: true });
}

export function keepOwner(next: PharmacyState, me: PharmacyState["users"][number] | undefined, phone: string): PharmacyState {
  if (!me) return next;
  const used = new Set(next.users.map((u) => u.id));
  let n = next.seq.user;
  next.users = next.users.map((u) => {
    if (u.id !== me.id) return u;
    let id = "";
    do { n += 1; id = "u" + n; } while (used.has(id));
    used.add(id);
    return { ...u, id };
  });
  next.seq.user = n;
  if (!next.users.some((u) => e164(u.phone) === e164(phone))) next.users = [{ ...me, phone }, ...next.users];
  return next;
}

async function unlockPricing(req: Request, body: Record<string, unknown>) {
  const session = await readSession(tokenOf(req));
  if (!session) throw new ApiError(401, "UNAUTHENTICATED", "Sign in required");
  const state = await loadState(session.pharmacyId);
  m.requireHospital(state);
  if (!m.checkPricingOtp(session.pricingPin, String(body.code || body.otp || ""), devAuth())) {
    throw new ApiError(401, "UNAUTHENTICATED", "Incorrect admin OTP");
  }
  await setUnlocked(session.token, true);
  return send({ ok: true });
}

async function invoicePdf(req: Request, id: string) {
  const session = await readSession(tokenOf(req));
  if (!session) throw new ApiError(401, "UNAUTHENTICATED", "Sign in required");
  const state = await loadState(session.pharmacyId);
  const sale = state.sales.find((s) => s.id === decodeURIComponent(id));
  if (!sale) throw new ApiError(404, "NOT_FOUND", "Sale not found");
  const blob = buildInvoicePdf(sale, state.profile);
  const bytes = Buffer.from(await blob.arrayBuffer());
  return new Response(new Uint8Array(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${sale.id}.pdf"` } });
}

async function reportCsv(req: Request, id: string, url: URL) {
  const session = await readSession(tokenOf(req));
  if (!session) throw new ApiError(401, "UNAUTHENTICATED", "Sign in required");
  const state = await loadState(session.pharmacyId);
  m.requirePlan(state, "reports");
  const from = Number(url.searchParams.get("from") || Date.now() - 365 * 86400000);
  const to = Number(url.searchParams.get("to") || Date.now());
  const report = runReport(decodeURIComponent(id), { sales: state.sales, purchases: state.purchases, inventory: state.inventory, expenses: state.expenses, profile: state.profile, now: Date.now(), range: { from, to, label: "Selected range" } });
  return new Response(catalogCsvText(report), { headers: { "content-type": "text/csv; charset=utf-8" } });
}

async function file(req: Request, id: string) {
  const session = await readSession(tokenOf(req));
  if (!session) throw new ApiError(401, "UNAUTHENTICATED", "Sign in required");
  const found = await readFile(decodeURIComponent(id), session.pharmacyId);
  if (!found) throw new ApiError(404, "NOT_FOUND", "File not found");
  return new Response(new Uint8Array(found.bytes), { headers: { "content-type": found.type } });
}
