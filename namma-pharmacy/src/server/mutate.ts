import {
  ALL_PERM_KEYS, ROLE_DEFAULT_PERMS, Advisor, BankAccount, Batch, BillingCycle, DosageForm, Employee, Expense,
  InvProduct, Offer, OfferType, PAY_LABEL, POItem, PayMode, Plan, PurchaseItem, Rider, Sale, SaleItem, Schedule,
  StaffUser, billUnit, computeInvoice, directOfferId, earliestBatch, findScan, isValidGstin, isValidIfsc, looseSellable, normalizeRack, packComplete,
  routeLocked, seatCeiling, todayISO, unitNoun, unitsPerPack, userPerms,
} from "../app/data";
import { PatientMeta } from "../app/lib/crm";
import { Admission, ClaimStatus, Department, DoctorProfile, IndentStatus, Ward } from "../app/lib/hospital";
import { Referral } from "../app/lib/referrals";
import { HospitalAccount, PriceRule, WardSupply, WardSupplyItem, creditPriceOf } from "../app/lib/hospitalAccount";
import { fail } from "./errors";
import { PharmacyState, Ticket, bump } from "./state";

export type PosLine = { productId: string; qty: number; loose?: boolean; batchNo?: string };

function clone<T>(v: T): T { return structuredClone(v); }

function mustProduct(state: PharmacyState, id: string): InvProduct {
  const p = state.inventory.find((x) => x.id === id);
  if (!p) fail(404, "NOT_FOUND", "Product not found");
  return p;
}

function mapProduct(state: PharmacyState, id: string, fn: (p: InvProduct) => InvProduct) {
  if (!state.inventory.some((p) => p.id === id)) fail(404, "NOT_FOUND", "Product not found");
  state.inventory = state.inventory.map((p) => (p.id === id ? fn(p) : p));
}

export function requirePerm(state: PharmacyState, userId: string, key: string) {
  const user = state.users.find((u) => u.id === userId);
  if (!user) fail(403, "FORBIDDEN", "You do not have permission for this action");
  if (user.role === "Owner") return;
  if (!userPerms(user).includes(key)) fail(403, "FORBIDDEN", "You do not have permission for this action");
}

function accessOf(state: PharmacyState) {
  return { grants: state.grants, businessType: state.businessType };
}
export function requirePlan(state: PharmacyState, route: string) {
  if (routeLocked(route, state.subscription, accessOf(state))) fail(403, "PLAN_LOCKED", "This action needs a paid plan");
}
export function requireAnyPlan(state: PharmacyState, routes: string[]) {
  if (routes.some((route) => !routeLocked(route, state.subscription, accessOf(state)))) return;
  fail(403, "PLAN_LOCKED", "This action needs a paid plan");
}

export function requireHospital(state: PharmacyState) {
  if (state.businessType !== "hospital") fail(403, "FORBIDDEN", "Hospital pharmacy only");
}

function checkGstin(value: unknown, field = "gstin") {
  if (typeof value === "string" && value.trim() && !isValidGstin(value)) fail(400, "VALIDATION", "Enter a valid GSTIN", field);
}
function checkPhone(value: unknown, field = "phone") {
  if (typeof value === "string" && value.trim() && value.replace(/\D/g, "").length < 10) fail(400, "VALIDATION", "Enter a valid mobile number", field);
}
function checkIfsc(value: unknown, field = "ifsc") {
  if (typeof value === "string" && value.trim() && !isValidIfsc(value)) fail(400, "VALIDATION", "Enter a valid IFSC", field);
}
function rememberRack(state: PharmacyState, code: string) {
  if (code && !state.racks.includes(code)) state.racks = [...state.racks, code];
}

function earliestIdx(batches: Batch[]): number {
  let bi = -1;
  batches.forEach((b, i) => { if (b.qty > 0 && (bi < 0 || b.expiry < batches[bi].expiry)) bi = i; });
  return bi;
}

function takePacks(batches: Batch[], qty: number, batchNo?: string): number {
  let need = qty;
  if (batchNo) {
    const bi = batches.findIndex((b) => b.batchNo === batchNo);
    if (bi >= 0) { const take = Math.min(batches[bi].qty, need); batches[bi].qty -= take; need -= take; }
  }
  while (need > 0) {
    const fi = earliestIdx(batches);
    if (fi < 0) break;
    const take = Math.min(batches[fi].qty, need); batches[fi].qty -= take; need -= take;
  }
  return need;
}

function nextInventory(state: PharmacyState, lines: PosLine[]): InvProduct[] {
  for (const l of lines) {
    if (l.qty <= 0) continue;
    const p = state.inventory.find((x) => x.id === l.productId);
    if (!p) fail(404, "NOT_FOUND", "Product not found");
    if (l.loose && !looseSellable(p)) fail(400, "VALIDATION", `${p.name} cannot be sold loose`);
  }
  return state.inventory.map((p) => {
    const mine = lines.filter((l) => l.productId === p.id && l.qty > 0);
    if (!mine.length) return p;
    const batches = p.batches.map((b) => ({ ...b }));
    const unmet = (left: number) => { if (left > 0) fail(400, "VALIDATION", `${p.name} does not have enough stock`, "qty"); };
    for (const l of mine.filter((x) => !x.loose && x.batchNo)) unmet(takePacks(batches, l.qty, l.batchNo));
    unmet(takePacks(batches, mine.filter((l) => !l.loose && !l.batchNo).reduce((a, l) => a + l.qty, 0)));
    let loose = p.looseUnits ?? 0;
    const upp = unitsPerPack(p);
    for (const l of mine.filter((x) => x.loose)) {
      let need = l.qty;
      const fromPool = Math.min(loose, need); loose -= fromPool; need -= fromPool;
      while (need > 0) {
        let bi = l.batchNo ? batches.findIndex((b) => b.batchNo === l.batchNo && b.qty > 0) : -1;
        if (bi < 0) bi = earliestIdx(batches);
        if (bi < 0) break;
        batches[bi].qty -= 1; loose += upp;
        const t = Math.min(loose, need); loose -= t; need -= t;
      }
      unmet(need);
    }
    return { ...p, batches, looseUnits: loose };
  });
}

export function deductLines(state: PharmacyState, lines: PosLine[]) {
  state.inventory = nextInventory(state, lines);
}

function addBack(state: PharmacyState, productId: string, batchNo: string | undefined, qty: number) {
  state.inventory = state.inventory.map((p) => {
    if (p.id !== productId) return p;
    const batches = p.batches.map((b) => ({ ...b }));
    let bi = batchNo ? batches.findIndex((b) => b.batchNo === batchNo) : 0;
    if (bi < 0) bi = 0;
    if (batches[bi]) batches[bi] = { ...batches[bi], qty: batches[bi].qty + qty };
    return { ...p, batches };
  });
}

function moveInventory(state: PharmacyState, items: WardSupplyItem[], dir: 1 | -1) {
  state.inventory = state.inventory.map((p) => {
    const lines = items.filter((it) => it.productId === p.id);
    if (!lines.length) return p;
    const batches = p.batches.map((b) => ({ ...b }));
    for (const it of lines) {
      if (dir === 1) {
        let need = it.qty;
        const bi = it.batchNo ? batches.findIndex((b) => b.batchNo === it.batchNo) : -1;
        if (bi >= 0) { const take = Math.min(batches[bi].qty, need); batches[bi].qty -= take; need -= take; }
        while (need > 0) { const fi = earliestIdx(batches); if (fi < 0) break; const take = Math.min(batches[fi].qty, need); batches[fi].qty -= take; need -= take; }
      } else {
        const bi = it.batchNo ? batches.findIndex((b) => b.batchNo === it.batchNo) : -1;
        if (bi >= 0) batches[bi].qty += it.qty;
        else batches.push({ batchNo: it.batchNo || "RET", expiry: it.expiry || "—", qty: it.qty, mrp: it.mrp ?? it.price, ptr: it.price });
      }
    }
    return { ...p, batches };
  });
}

export function patchProfile(state: PharmacyState, patch: Partial<PharmacyState["profile"]>) {
  checkGstin(patch.gstin);
  checkPhone(patch.phone);
  state.profile = { ...state.profile, ...patch };
  return state.profile;
}
export function toggleStore(state: PharmacyState) {
  state.profile = { ...state.profile, storeOpen: !state.profile.storeOpen };
  return state.profile;
}
export function patchInvoice(state: PharmacyState, patch: Partial<PharmacyState["invoiceSettings"]>) {
  state.invoiceSettings = { ...state.invoiceSettings, ...patch };
  return state.invoiceSettings;
}
export function patchKiosk(state: PharmacyState, patch: Partial<PharmacyState["kiosk"]>) {
  state.kiosk = { ...state.kiosk, ...patch };
  return state.kiosk;
}
export function completeSetup(state: PharmacyState, complete = true) {
  state.setupComplete = complete;
  return { setupComplete: state.setupComplete };
}
export function wipeData(state: PharmacyState) {
  state.inventory = []; state.sales = []; state.prescriptions = []; state.purchases = [];
  state.purchaseOrders = []; state.offers = []; state.caShares = []; state.supplyList = [];
  return { ok: true };
}

export function addProduct(state: PharmacyState, p: InvProduct) {
  const row = { ...p, id: p.id || ("p" + bump(state, "prod")) };
  state.inventory = [row, ...state.inventory];
  return row;
}
export function updateProduct(state: PharmacyState, id: string, patch: Partial<InvProduct>) {
  mapProduct(state, id, (p) => ({ ...p, ...patch, id: p.id }));
  return mustProduct(state, id);
}
export function addBatch(state: PharmacyState, id: string, batch: Batch) {
  mapProduct(state, id, (p) => ({ ...p, batches: [...p.batches, batch] }));
  return mustProduct(state, id);
}
export function setBatchQty(state: PharmacyState, id: string, batchNo: string, qty: number) {
  mapProduct(state, id, (p) => ({ ...p, batches: p.batches.map((b) => (b.batchNo === batchNo ? { ...b, qty: Math.max(0, qty) } : b)) }));
  return mustProduct(state, id);
}
export function toggleOnline(state: PharmacyState, id: string) {
  mapProduct(state, id, (p) => ({ ...p, online: !p.online }));
  return mustProduct(state, id);
}
export function toggleLoose(state: PharmacyState, id: string) {
  mapProduct(state, id, (p) => ({ ...p, looseAllowed: !(p.looseAllowed ?? true) }));
  return mustProduct(state, id);
}
export function setLooseDefault(state: PharmacyState, allowed: boolean) {
  state.inventory = state.inventory.map((p) => (p.form === "Tablet" || p.form === "Capsule" ? { ...p, looseAllowed: allowed } : p));
  return { inventory: state.inventory };
}
export function setOnlinePrice(state: PharmacyState, id: string, price: number | undefined) {
  mapProduct(state, id, (p) => ({ ...p, onlinePrice: price }));
  return mustProduct(state, id);
}
export function setProductOffer(state: PharmacyState, id: string, offerId: string | undefined) {
  mapProduct(state, id, (p) => ({ ...p, offerId }));
  return mustProduct(state, id);
}
export function setProductSupplier(state: PharmacyState, id: string, supplierId: string) {
  mapProduct(state, id, (p) => ({ ...p, supplierId }));
  return mustProduct(state, id);
}
export function setProductLocation(state: PharmacyState, id: string, rack: string, rackAlt?: string) {
  const code = normalizeRack(rack);
  mapProduct(state, id, (p) => ({ ...p, rack: code, rackAlt: normalizeRack(rackAlt ?? p.rackAlt ?? "") || undefined }));
  rememberRack(state, code);
  return mustProduct(state, id);
}
export function bulkAssignLocation(state: PharmacyState, ids: string[], rack: string) {
  const code = normalizeRack(rack);
  state.inventory = state.inventory.map((p) => (ids.includes(p.id) ? { ...p, rack: code } : p));
  rememberRack(state, code);
  return { inventory: state.inventory, racks: state.racks };
}
export function createRack(state: PharmacyState, rack: string) {
  const code = normalizeRack(rack);
  if (!code) fail(400, "VALIDATION", "Rack code is required", "rack");
  if (!state.racks.includes(code)) state.racks = [...state.racks, code];
  return { racks: state.racks, created: code };
}
export function removeRack(state: PharmacyState, rack: string) {
  state.racks = state.racks.filter((x) => x !== normalizeRack(rack));
  return { racks: state.racks };
}

export function receivePurchase(state: PharmacyState, draft: { supplierId: string; supplierName: string; invoiceNo: string; invoiceDate: string; items: PurchaseItem[] }) {
  const valid = draft.items.filter((it) => (it.qty + (it.freeQty || 0)) > 0 && it.batchNo.trim());
  if (!valid.length) fail(400, "VALIDATION", "Add at least one received line");
  let inventory = clone(state.inventory);
  for (const it of valid) {
    const received = it.qty + (it.freeQty || 0);
    if (it.productId) {
      inventory = inventory.map((p) => {
        if (p.id !== it.productId) return p;
        const hasBatch = p.batches.some((b) => b.batchNo === it.batchNo);
        const batches: Batch[] = hasBatch
          ? p.batches.map((b) => (b.batchNo === it.batchNo ? { ...b, qty: b.qty + received, mrp: it.mrp || b.mrp, ptr: it.ptr || b.ptr } : b))
          : [...p.batches, { batchNo: it.batchNo, expiry: it.expiry, qty: received, mrp: it.mrp, ptr: it.ptr }];
        return { ...p, batches };
      });
    } else {
      inventory = [{
        id: "p" + bump(state, "prod"), name: it.name || "New product", composition: it.composition || "",
        manufacturer: it.manufacturer || "", form: (it.form as DosageForm) || "Tablet", pack: it.pack || "",
        category: it.category || "fever", hsn: it.hsn || "3004", gst: it.gst, schedule: (it.schedule as Schedule) || "OTC",
        rack: "—", reorderLevel: it.reorderLevel ?? 20, online: false, emoji: it.emoji || "💊",
        batches: [{ batchNo: it.batchNo, expiry: it.expiry, qty: received, mrp: it.mrp, ptr: it.ptr }],
      }, ...inventory];
    }
  }
  state.inventory = inventory;
  const purchase = { id: "GRN-" + bump(state, "grn"), supplierId: draft.supplierId, supplierName: draft.supplierName, invoiceNo: draft.invoiceNo, invoiceDate: draft.invoiceDate, items: valid, createdAt: Date.now() };
  state.purchases = [purchase, ...state.purchases];
  return { purchase, inventory: state.inventory };
}

export function addSupplier(state: PharmacyState, row: Omit<import("../app/data").Supplier, "id">) {
  checkGstin(row.gstin);
  const supplier = { ...row, id: "s" + bump(state, "supplier") };
  state.suppliers = [...state.suppliers, supplier];
  return supplier;
}
export function updateSupplier(state: PharmacyState, id: string, patch: Partial<import("../app/data").Supplier>) {
  if (!state.suppliers.some((s) => s.id === id)) fail(404, "NOT_FOUND", "Supplier not found");
  checkGstin(patch.gstin);
  state.suppliers = state.suppliers.map((s) => (s.id === id ? { ...s, ...patch, id } : s));
  return state.suppliers.find((s) => s.id === id)!;
}
export function removeSupplier(state: PharmacyState, id: string) {
  state.suppliers = state.suppliers.filter((s) => s.id !== id);
  state.supplyList = state.supplyList.filter((e) => e.supplierId !== id);
  return { suppliers: state.suppliers, supplyList: state.supplyList };
}
export function addSupply(state: PharmacyState, row: Omit<import("../app/data").SupplyEntry, "id">) {
  const entry = { ...row, id: "sl" + bump(state, "supply") };
  state.supplyList = [...state.supplyList, entry];
  return entry;
}
export function updateSupply(state: PharmacyState, id: string, patch: Partial<import("../app/data").SupplyEntry>) {
  if (!state.supplyList.some((s) => s.id === id)) fail(404, "NOT_FOUND", "Supply row not found");
  state.supplyList = state.supplyList.map((s) => (s.id === id ? { ...s, ...patch, id } : s));
  return state.supplyList.find((s) => s.id === id)!;
}
export function removeSupply(state: PharmacyState, id: string) {
  state.supplyList = state.supplyList.filter((s) => s.id !== id);
  return { supplyList: state.supplyList };
}
export function setPreferredSupply(state: PharmacyState, id: string) {
  const target = state.supplyList.find((s) => s.id === id);
  if (!target) fail(404, "NOT_FOUND", "Supply row not found");
  state.supplyList = state.supplyList.map((s) => (s.productId === target.productId ? { ...s, preferred: s.id === id } : s));
  return { supplyList: state.supplyList };
}
export function sendPurchaseOrder(state: PharmacyState, supplierId: string, supplierName: string, items: POItem[], note?: string) {
  if (!items.length) fail(400, "VALIDATION", "Purchase order needs items");
  const po = { id: "PO-" + bump(state, "po"), supplierId, supplierName, items, status: "sent" as const, note, createdAt: Date.now() };
  state.purchaseOrders = [po, ...state.purchaseOrders];
  return po;
}
export function markPOReceived(state: PharmacyState, id: string) {
  if (!state.purchaseOrders.some((p) => p.id === id)) fail(404, "NOT_FOUND", "Purchase order not found");
  state.purchaseOrders = state.purchaseOrders.map((p) => (p.id === id ? { ...p, status: "received" as const } : p));
  return state.purchaseOrders.find((p) => p.id === id)!;
}

type CheckoutInput = {
  lines: PosLine[];
  customer?: { name?: string; phone?: string; email?: string; rxSource?: "doctor" | "self"; doctor?: string };
  discount?: number;
  discountMode?: "flat" | "percent";
  payMode: PayMode;
  source?: Sale["source"];
  ward?: string;
  insurer?: string;
  patientId?: string;
  rxImage?: string | null;
  paid?: boolean;
};

export function checkoutPos(state: PharmacyState, input: CheckoutInput) {
  const customer = input.customer ?? {};
  const resolved = input.lines.map((line) => ({ p: mustProduct(state, line.productId), qty: line.qty, loose: !!line.loose, batchNo: line.batchNo })).filter((x) => x.qty > 0);
  if (!resolved.length) fail(400, "VALIDATION", "Nothing to bill", "qty");
  const inventory = nextInventory(state, input.lines);
  const items: SaleItem[] = resolved.map(({ p, qty, loose, batchNo }) => {
    const b = (batchNo && p.batches.find((x) => x.batchNo === batchNo)) || earliestBatch(p);
    const unit = billUnit(p, { loose, batchNo: b?.batchNo });
    return {
      productId: p.id, name: loose ? `${p.name} — loose ${unitNoun(p)}s` : p.name,
      batchNo: b?.batchNo ?? "—", expiry: b?.expiry ?? "—", hsn: p.hsn, qty,
      mrp: unit.mrp, price: unit.price, gst: p.gst, loose,
    };
  });
  const raw = input.discount || 0;
  const gross = items.reduce((a, it) => a + it.price * it.qty, 0);
  const eff = input.discountMode === "percent" ? Math.round((gross * raw) / 100) : raw;
  const discount = computeInvoice(items, eff).discount;
  const hasRx = resolved.some(({ p }) => p.schedule !== "OTC");
  const name = (customer.name || "").trim() || "Walk-in";
  let prescription: PharmacyState["prescriptions"][number] | undefined;
  if (input.rxImage) {
    prescription = {
      id: "RX-" + bump(state, "rx"), patient: name, phone: customer.phone || "—", doctor: customer.doctor || "Counter prescription",
      uploadedAt: Date.now(), channel: "offline", status: "dispensed", items: resolved.map(({ p }) => p.id),
      kind: "uploaded", fileType: "image", image: input.rxImage, note: "Uploaded at billing counter",
    };
  }
  const isCredit = input.payMode === "credit";
  const paid = isCredit ? false : input.paid !== false;
  const hospital = state.businessType === "hospital";
  const sale: Sale = {
    id: state.invoiceSettings.prefix + bump(state, "inv"), channel: "offline", status: "completed",
    customer: { name, phone: customer.phone || undefined, email: customer.email || undefined, rxSource: hasRx ? customer.rxSource : undefined, doctor: hasRx && customer.rxSource === "doctor" ? (customer.doctor || undefined) : undefined },
    items, discount, payMode: input.payMode, rx: hasRx || !!prescription, rxId: prescription?.id, createdAt: Date.now(),
    history: [{ status: "completed", at: Date.now(), note: isCredit ? "On credit (khata) · " + name : paid ? undefined : "Sent to reception · payment pending" }],
    paid, reception: !paid && !isCredit, ward: input.source === "ward" ? input.ward : undefined,
    source: hospital ? input.source : undefined, insurer: input.payMode === "insurance" ? (input.insurer || undefined) : undefined,
    patientId: hospital && (input.source === "ward" || input.source === "emergency") ? (input.patientId?.trim() || undefined) : undefined,
  };
  state.inventory = inventory;
  if (prescription) state.prescriptions = [prescription, ...state.prescriptions];
  state.sales = [sale, ...state.sales];
  return { sale, prescription: prescription ?? null, inventory: state.inventory };
}

export function placeKioskOrder(state: PharmacyState, lines: PosLine[], pay: PayMode) {
  const built = checkoutPos(state, { lines, customer: { name: "Kiosk (self-order)" }, payMode: pay, paid: true, discount: 0 });
  built.sale.customer = { name: "Kiosk (self-order)" };
  built.sale.history = [{ status: "completed", at: built.sale.createdAt }];
  state.sales = state.sales.map((s) => (s.id === built.sale.id ? built.sale : s));
  return { sale: built.sale, inventory: state.inventory };
}

export function markPaid(state: PharmacyState, id: string, payMode: PayMode) {
  if (!state.sales.some((s) => s.id === id)) fail(404, "NOT_FOUND", "Sale not found");
  state.sales = state.sales.map((s) => (s.id === id ? { ...s, paid: true, reception: false, payMode, history: [...(s.history ?? []), { status: s.status, at: Date.now(), note: "Payment received at reception · " + PAY_LABEL[payMode] }] } : s));
  return state.sales.find((s) => s.id === id)!;
}
export function advanceOrder(state: PharmacyState, id: string) {
  const flow: Sale["status"][] = ["new", "accepted", "packed", "out", "delivered"];
  let found = false;
  state.sales = state.sales.map((s) => {
    if (s.id !== id || s.channel !== "online") return s;
    found = true;
    const i = flow.indexOf(s.status);
    if (i < 0 || i >= flow.length - 1 || s.status === "accepted" || s.status === "packed") return s;
    const next = flow[i + 1];
    const fulfillment = s.status === "new" && !s.fulfillment?.lines ? { ...(s.fulfillment ?? {}), lines: s.items.map((it) => ({ productId: it.productId, name: it.name, qty: it.qty, scanned: 0 })) } : s.fulfillment;
    return { ...s, status: next, fulfillment, history: [...(s.history ?? []), { status: next, at: Date.now() }] };
  });
  if (!found) fail(404, "NOT_FOUND", "Sale not found");
  return state.sales.find((s) => s.id === id)!;
}
export function cancelOrder(state: PharmacyState, id: string) {
  const sale = state.sales.find((s) => s.id === id);
  if (!sale) fail(404, "NOT_FOUND", "Sale not found");
  for (const ln of sale.fulfillment?.lines ?? []) if (ln.scanned > 0) addBack(state, ln.productId, ln.batchNo, ln.scanned);
  state.sales = state.sales.map((s) => (s.id === id ? { ...s, status: "cancelled" as const, history: [...(s.history ?? []), { status: "cancelled" as const, at: Date.now() }] } : s));
  return { sale: state.sales.find((s) => s.id === id)!, inventory: state.inventory };
}
export function startPacking(state: PharmacyState, id: string) {
  if (!state.sales.some((s) => s.id === id)) fail(404, "NOT_FOUND", "Sale not found");
  state.sales = state.sales.map((s) => {
    if (s.id !== id || s.channel !== "online" || s.fulfillment?.lines) return s;
    return { ...s, fulfillment: { ...(s.fulfillment ?? {}), lines: s.items.map((it) => ({ productId: it.productId, name: it.name, qty: it.qty, scanned: 0 })) } };
  });
  return state.sales.find((s) => s.id === id)!;
}
export function scanPackLine(state: PharmacyState, id: string, raw: string) {
  const code = (raw || "").trim();
  if (!code) fail(400, "VALIDATION", "Scan a code");
  const sale = state.sales.find((s) => s.id === id);
  if (!sale) fail(404, "NOT_FOUND", "Sale not found");
  const hit = findScan(state.inventory, code);
  if (!hit) fail(404, "NOT_FOUND", `No match for "${code}"`);
  const line = (sale.fulfillment?.lines ?? []).find((l) => l.productId === hit.product.id);
  if (!line) fail(400, "VALIDATION", `${hit.product.name} is not in this order`);
  if (line.scanned >= line.qty) fail(409, "CONFLICT", `${hit.product.name} already packed`);
  const prod = mustProduct(state, hit.product.id);
  const batch = hit.batch && hit.batch.qty > 0 ? hit.batch : prod.batches.filter((b) => b.qty > 0).sort((a, b) => a.expiry.localeCompare(b.expiry))[0];
  if (!batch) fail(409, "CONFLICT", `${hit.product.name} is out of stock`);
  deductLines(state, [{ productId: prod.id, qty: 1, batchNo: batch.batchNo }]);
  state.sales = state.sales.map((s) => (s.id === id ? { ...s, fulfillment: { ...s.fulfillment, lines: (s.fulfillment!.lines ?? []).map((x) => (x.productId === line.productId ? { ...x, scanned: x.scanned + 1, batchNo: batch.batchNo } : x)) } } : s));
  return { name: prod.name, batchNo: batch.batchNo, scanned: line.scanned + 1, qty: line.qty, inventory: state.inventory, sale: state.sales.find((s) => s.id === id) };
}
export function pickPackLine(state: PharmacyState, id: string, productId: string, delta: number) {
  const sale = state.sales.find((s) => s.id === id);
  if (!sale) fail(404, "NOT_FOUND", "Sale not found");
  const line = sale.fulfillment?.lines?.find((l) => l.productId === productId);
  if (!line) fail(404, "NOT_FOUND", "Pack line not found");
  const prod = mustProduct(state, productId);
  if (delta > 0) {
    if (line.scanned >= line.qty) return { sale, inventory: state.inventory };
    const batch = prod.batches.filter((b) => b.qty > 0).sort((a, b) => a.expiry.localeCompare(b.expiry))[0];
    if (!batch) fail(409, "CONFLICT", `${prod.name} is out of stock`);
    deductLines(state, [{ productId, qty: 1, batchNo: batch.batchNo }]);
    state.sales = state.sales.map((s) => (s.id === id ? { ...s, fulfillment: { ...s.fulfillment, lines: (s.fulfillment!.lines ?? []).map((x) => (x.productId === productId ? { ...x, scanned: x.scanned + 1, batchNo: batch.batchNo } : x)) } } : s));
  } else if (line.scanned > 0) {
    addBack(state, productId, line.batchNo, 1);
    state.sales = state.sales.map((s) => (s.id === id ? { ...s, fulfillment: { ...s.fulfillment, lines: (s.fulfillment!.lines ?? []).map((x) => (x.productId === productId ? { ...x, scanned: x.scanned - 1 } : x)) } } : s));
  }
  return { sale: state.sales.find((s) => s.id === id), inventory: state.inventory };
}
export function sealPacket(state: PharmacyState, id: string) {
  const cur = state.sales.find((s) => s.id === id);
  if (!cur || !packComplete(cur)) fail(409, "CONFLICT", "Pack every line before sealing");
  state.sales = state.sales.map((s) => {
    if (s.id !== id) return s;
    const items = s.items.map((it) => {
      const ln = s.fulfillment!.lines!.find((x) => x.productId === it.productId);
      if (!ln?.batchNo) return it;
      const b = state.inventory.find((p) => p.id === it.productId)?.batches.find((x) => x.batchNo === ln.batchNo);
      return { ...it, batchNo: ln.batchNo, expiry: b?.expiry ?? it.expiry };
    });
    return { ...s, items, status: "packed" as const, fulfillment: { ...s.fulfillment, sealed: true, sealedAt: Date.now() }, history: [...(s.history ?? []), { status: "packed" as const, at: Date.now(), note: "Scanned, invoiced & sealed in a Namma MedMate packet" }] };
  });
  return state.sales.find((s) => s.id === id)!;
}
export function handToRider(state: PharmacyState, id: string, rider?: Rider) {
  const cur = state.sales.find((s) => s.id === id);
  if (!cur || cur.status !== "packed") fail(409, "CONFLICT", "Seal the packet first");
  state.sales = state.sales.map((s) => {
    if (s.id !== id) return s;
    const r = rider ?? s.fulfillment?.rider;
    return { ...s, status: "out" as const, fulfillment: { ...(s.fulfillment ?? {}), rider: r, handedAt: Date.now() }, history: [...(s.history ?? []), { status: "out" as const, at: Date.now(), note: r?.name ? `Handed to delivery partner ${r.name}${r.phone ? ` · ${r.phone}` : ""}` : "Handed to delivery partner" }] };
  });
  return state.sales.find((s) => s.id === id)!;
}
export function settleBills(state: PharmacyState, ids: string[], payMode: PayMode) {
  const set = new Set(ids);
  state.sales = state.sales.map((s) => (set.has(s.id) ? { ...s, paid: true, reception: false, payMode, history: [...(s.history ?? []), { status: s.status, at: Date.now(), note: "Settled · " + PAY_LABEL[payMode] }] } : s));
  return { sales: state.sales };
}

const reviewer = (state: PharmacyState) => (state.profile.pharmacist || "").split(",")[0].trim();
export function approveRx(state: PharmacyState, id: string) {
  if (!state.prescriptions.some((r) => r.id === id)) fail(404, "NOT_FOUND", "Prescription not found");
  state.prescriptions = state.prescriptions.map((r) => (r.id === id ? { ...r, status: "approved" as const, approvedAt: Date.now(), reviewedBy: reviewer(state) } : r));
  return state.prescriptions.find((r) => r.id === id)!;
}
export function rejectRx(state: PharmacyState, id: string, reason?: string) {
  if (!state.prescriptions.some((r) => r.id === id)) fail(404, "NOT_FOUND", "Prescription not found");
  state.prescriptions = state.prescriptions.map((r) => (r.id === id ? { ...r, status: "rejected" as const, rejectedAt: Date.now(), rejectReason: reason || r.rejectReason, reviewedBy: reviewer(state) } : r));
  return state.prescriptions.find((r) => r.id === id)!;
}
export function dispenseRx(state: PharmacyState, id: string) {
  const rx = state.prescriptions.find((r) => r.id === id);
  if (!rx) fail(404, "NOT_FOUND", "Prescription not found");
  state.prescriptions = state.prescriptions.map((r) => (r.id === id ? { ...r, status: "dispensed" as const, dispensedAt: Date.now(), approvedAt: r.approvedAt ?? Date.now(), reviewedBy: reviewer(state) } : r));
  return { prescription: state.prescriptions.find((r) => r.id === id)!, lines: rx.items.map((productId) => ({ productId, qty: 1 })) };
}

export function addOffer(state: PharmacyState, o: Offer) {
  const row = { ...o, id: o.id || ("of" + bump(state, "crm")) };
  state.offers = [row, ...state.offers];
  return row;
}
export function toggleOffer(state: PharmacyState, id: string) {
  if (!state.offers.some((o) => o.id === id)) fail(404, "NOT_FOUND", "Offer not found");
  state.offers = state.offers.map((o) => (o.id === id ? { ...o, active: !o.active } : o));
  return state.offers.find((o) => o.id === id)!;
}
export function removeOffer(state: PharmacyState, id: string) {
  state.offers = state.offers.filter((o) => o.id !== id);
  return { offers: state.offers };
}
export function setDirectOffer(state: PharmacyState, productId: string, type: OfferType, value: number) {
  mustProduct(state, productId);
  const id = directOfferId(productId);
  if (!value || value <= 0) {
    state.offers = state.offers.filter((o) => o.id !== id);
    state.inventory = state.inventory.map((p) => (p.id === productId && p.offerId === id ? { ...p, offerId: undefined } : p));
    return { offers: state.offers, inventory: state.inventory };
  }
  const offer: Offer = { id, title: "Direct offer", code: "DIRECT", type, value, scope: "product", target: productId, online: true, active: true };
  state.offers = state.offers.some((o) => o.id === id) ? state.offers.map((o) => (o.id === id ? offer : o)) : [offer, ...state.offers];
  state.inventory = state.inventory.map((p) => (p.id === productId ? { ...p, offerId: id } : p));
  return { offer, inventory: state.inventory };
}

export function recordCreditPayment(state: PharmacyState, p: { custKey: string; custName: string; custPhone: string; amount: number; mode: PayMode; note?: string }) {
  if (p.amount <= 0) fail(400, "VALIDATION", "Amount must be positive", "amount");
  const row = { ...p, id: "CR-" + bump(state, "credit"), at: Date.now() };
  state.creditPayments = [row, ...state.creditPayments];
  return row;
}
export function setPatientMeta(state: PharmacyState, key: string, patch: PatientMeta) {
  state.crm = { ...state.crm, meta: { ...state.crm.meta, [key]: { ...state.crm.meta[key], ...patch } } };
  return state.crm;
}
export function addCampaign(state: PharmacyState, c: { name: string; segment: PharmacyState["crm"]["campaigns"][number]["segment"]; channel: "whatsapp" | "sms"; message: string; offerLabel?: string; reach: number }) {
  const row = { ...c, id: "CMP-" + bump(state, "crm"), sentAt: Date.now() };
  state.crm = { ...state.crm, campaigns: [row, ...state.crm.campaigns] };
  return row;
}
export function addFeedback(state: PharmacyState, f: { custKey: string; custName: string; rating: number; nps?: number; comment?: string }) {
  const row = { ...f, id: "FB-" + bump(state, "crm"), at: Date.now() };
  state.crm = { ...state.crm, feedbacks: [row, ...state.crm.feedbacks] };
  return row;
}
export function logReminder(state: PharmacyState, r: { custKey: string; custName: string; kind: "refill" | "adherence" | "followup" | "winback"; channel: "whatsapp" | "sms" }) {
  const row = { ...r, id: "RM-" + bump(state, "crm"), at: Date.now() };
  state.crm = { ...state.crm, reminders: [row, ...state.crm.reminders] };
  return row;
}
export function redeemPoints(state: PharmacyState, custKey: string, custName: string, points: number) {
  if (points <= 0) fail(400, "VALIDATION", "Points must be positive");
  const row = { id: "RD-" + bump(state, "crm"), custKey, custName, points, value: points, at: Date.now() };
  state.crm = { ...state.crm, redemptions: [row, ...state.crm.redemptions] };
  return row;
}

function addMonths(iso: string, n: number) {
  const base = iso && iso !== "—" ? iso : todayISO();
  const d = new Date(base + "T00:00:00");
  if (Number.isNaN(d.getTime())) return todayISO();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}
export function addSubscriptionRequest(state: PharmacyState, plan: Plan, cycle: BillingCycle, kind?: string) {
  if (plan !== "Free" && plan !== "Starter" && plan !== "Growth" && plan !== "Pro") fail(400, "VALIDATION", "Choose a plan");
  if (cycle !== "monthly" && cycle !== "annual") fail(400, "VALIDATION", "Choose a billing cycle");
  const row = {
    id: "REQ-" + bump(state, "request"),
    plan, cycle,
    kind: kind === "renewal" ? "renewal" as const : "plan" as const,
    createdAt: Date.now(),
    status: "open" as const,
  };
  state.subscriptionRequests = [row, ...(state.subscriptionRequests || [])];
  return row;
}
export function renewSubscription(state: PharmacyState) {
  const base = state.subscription.renewsOn > todayISO() ? state.subscription.renewsOn : todayISO();
  state.subscription = { ...state.subscription, status: "active", renewsOn: addMonths(base, state.subscription.cycle === "annual" ? 12 : 1) };
  return state.subscription;
}
export function changePlan(state: PharmacyState, plan: Plan, cycle: BillingCycle) {
  state.subscription = { ...state.subscription, plan, cycle, status: "active", renewsOn: addMonths(todayISO(), cycle === "annual" ? 12 : 1) };
  return state.subscription;
}
export function toggleAutoRenew(state: PharmacyState) {
  state.subscription = { ...state.subscription, autoRenew: !state.subscription.autoRenew };
  return state.subscription;
}
export function saveBankAccount(state: PharmacyState, b: Omit<BankAccount, "verified" | "addedOn">) {
  if (!isValidIfsc(b.ifsc)) fail(400, "VALIDATION", "Enter a valid IFSC", "ifsc");
  state.bankAccount = { ...b, ifsc: b.ifsc.trim().toUpperCase(), verified: false, addedOn: todayISO() };
  return state.bankAccount;
}
export function verifyBankAccount(state: PharmacyState) {
  if (!state.bankAccount) fail(404, "NOT_FOUND", "No bank account");
  state.bankAccount = { ...state.bankAccount, verified: true };
  return state.bankAccount;
}
export function removeBankAccount(state: PharmacyState) {
  state.bankAccount = null;
  return { bankAccount: null };
}
export function addAdvisor(state: PharmacyState, a: Omit<Advisor, "id">) {
  const row = { ...a, id: "adv" + bump(state, "adv") };
  state.advisors = [...state.advisors, row];
  return row;
}
export function updateAdvisor(state: PharmacyState, id: string, patch: Partial<Advisor>) {
  if (!state.advisors.some((a) => a.id === id)) fail(404, "NOT_FOUND", "Advisor not found");
  state.advisors = state.advisors.map((a) => (a.id === id ? { ...a, ...patch, id } : a));
  return state.advisors.find((a) => a.id === id)!;
}
export function removeAdvisor(state: PharmacyState, id: string) {
  state.advisors = state.advisors.filter((a) => a.id !== id);
  return { advisors: state.advisors };
}
export function shareWithCA(state: PharmacyState, period: string, reports: string[], advisorId: string) {
  const adv = state.advisors.find((a) => a.id === advisorId) ?? state.advisors[0];
  if (!adv) fail(400, "VALIDATION", "Add an advisor first");
  const row = { id: "CA-" + bump(state, "ca"), period, reports, sentTo: adv.email, recipient: adv.name, createdAt: Date.now() };
  state.caShares = [row, ...state.caShares];
  return row;
}
export function addExpense(state: PharmacyState, e: Omit<Expense, "id" | "number">) {
  const id = "EXP-" + bump(state, "exp");
  const row = { ...e, id, number: id };
  state.expenses = [row, ...state.expenses];
  if (e.category && !state.expenseCategories.includes(e.category)) state.expenseCategories = [...state.expenseCategories, e.category];
  return { expense: row, categories: state.expenseCategories };
}
export function updateExpense(state: PharmacyState, id: string, patch: Partial<Expense>) {
  if (!state.expenses.some((e) => e.id === id)) fail(404, "NOT_FOUND", "Expense not found");
  state.expenses = state.expenses.map((e) => (e.id === id ? { ...e, ...patch, id } : e));
  return state.expenses.find((e) => e.id === id)!;
}
export function removeExpense(state: PharmacyState, id: string) {
  state.expenses = state.expenses.filter((e) => e.id !== id);
  return { expenses: state.expenses };
}
export function addExpenseCategory(state: PharmacyState, name: string) {
  const n = name.trim();
  if (n && !state.expenseCategories.includes(n)) state.expenseCategories = [...state.expenseCategories, n];
  return { categories: state.expenseCategories };
}
export function addEmployee(state: PharmacyState, e: Omit<Employee, "id">) {
  checkIfsc(e.ifsc);
  const row = { ...e, id: "EMP-" + String(bump(state, "emp")).padStart(3, "0") };
  state.employees = [...state.employees, row];
  return row;
}
export function updateEmployee(state: PharmacyState, id: string, patch: Partial<Employee>) {
  if (!state.employees.some((e) => e.id === id)) fail(404, "NOT_FOUND", "Employee not found");
  checkIfsc(patch.ifsc);
  state.employees = state.employees.map((e) => (e.id === id ? { ...e, ...patch, id } : e));
  return state.employees.find((e) => e.id === id)!;
}
export function removeEmployee(state: PharmacyState, id: string) {
  state.employees = state.employees.filter((e) => e.id !== id);
  return { employees: state.employees };
}
export function addUser(state: PharmacyState, u: Omit<StaffUser, "id" | "lastActiveMins">) {
  const cap = seatCeiling(state.subscription.plan, state.extraSeats || 0);
  const active = state.users.filter((user) => user.active !== false).length;
  if (cap != null && active >= cap) fail(403, "FORBIDDEN", "Seat limit reached");
  const row: StaffUser = { ...u, id: "u" + bump(state, "user"), lastActiveMins: 0, permissions: u.permissions ?? ROLE_DEFAULT_PERMS[u.role] ?? [...ALL_PERM_KEYS] };
  state.users = [...state.users, row];
  return row;
}
export function updateUser(state: PharmacyState, id: string, patch: Partial<StaffUser>) {
  const i = state.users.findIndex((u) => u.id === id);
  if (i < 0) fail(404, "NOT_FOUND", "User not found");
  const users = state.users.slice();
  users[i] = { ...users[i], ...patch, id };
  state.users = users;
  return users[i];
}
export function removeUser(state: PharmacyState, id: string) {
  const i = state.users.findIndex((u) => u.id === id);
  if (i >= 0) state.users = state.users.filter((_, n) => n !== i);
  return { users: state.users };
}

export function addWard(state: PharmacyState, w: Omit<Ward, "id">) {
  const row = { ...w, id: "W-" + bump(state, "ward") };
  state.wards = [...state.wards, row];
  return row;
}
export function updateWard(state: PharmacyState, id: string, patch: Partial<Ward>) {
  if (!state.wards.some((w) => w.id === id)) fail(404, "NOT_FOUND", "Ward not found");
  state.wards = state.wards.map((w) => (w.id === id ? { ...w, ...patch, id } : w));
  return state.wards.find((w) => w.id === id)!;
}
export function removeWard(state: PharmacyState, id: string) {
  if (state.admissions.some((a) => a.wardId === id && a.status === "admitted")) fail(409, "CONFLICT", "Discharge patients before removing this ward");
  state.wards = state.wards.filter((w) => w.id !== id);
  return { wards: state.wards };
}
export function admitPatient(state: PharmacyState, a: Omit<Admission, "id" | "admittedAt" | "status">) {
  const adm: Admission = { ...a, id: "ADM-" + bump(state, "adm"), admittedAt: Date.now(), status: "admitted" };
  state.admissions = [adm, ...state.admissions];
  return adm;
}
export function updateAdmission(state: PharmacyState, id: string, patch: Partial<Admission>) {
  if (!state.admissions.some((a) => a.id === id)) fail(404, "NOT_FOUND", "Admission not found");
  state.admissions = state.admissions.map((a) => (a.id === id ? { ...a, ...patch, id } : a));
  return state.admissions.find((a) => a.id === id)!;
}
export function dischargePatient(state: PharmacyState, id: string) {
  return updateAdmission(state, id, { status: "discharged", dischargedAt: Date.now() });
}
export function setIndentStatus(state: PharmacyState, id: string, status: IndentStatus) {
  if (!state.wardIndents.some((x) => x.id === id)) fail(404, "NOT_FOUND", "Indent not found");
  state.wardIndents = state.wardIndents.map((x) => (x.id === id ? { ...x, status, items: status === "issued" ? x.items.map((it) => ({ ...it, issued: it.qty })) : x.items } : x));
  return state.wardIndents.find((x) => x.id === id)!;
}
export function setClaimStatus(state: PharmacyState, id: string, status: ClaimStatus, approvedAmount?: number) {
  if (!state.tpaClaims.some((c) => c.id === id)) fail(404, "NOT_FOUND", "Claim not found");
  state.tpaClaims = state.tpaClaims.map((c) => (c.id === id ? { ...c, status, approvedAmount: approvedAmount ?? c.approvedAmount } : c));
  return state.tpaClaims.find((c) => c.id === id)!;
}
export function addDepartment(state: PharmacyState, d: Omit<Department, "id" | "doctors"> & { doctors?: Department["doctors"] }) {
  const name = String(d.name || "").trim();
  if (!name) fail(400, "VALIDATION", "Enter a department name");
  const row: Department = {
    id: "DEP-" + bump(state, "dept"),
    name,
    head: String(d.head || "").trim(),
    type: d.type === "IPD" || d.type === "Diagnostic" || d.type === "Support" ? d.type : "OPD",
    emoji: String(d.emoji || "🏥").trim() || "🏥",
    doctors: [],
  };
  state.departments = [row, ...(state.departments || [])];
  return row;
}
export function updateDepartment(state: PharmacyState, id: string, patch: Partial<Department>) {
  const prev = (state.departments || []).find((d) => d.id === id);
  if (!prev) fail(404, "NOT_FOUND", "Department not found");
  const name = patch.name != null ? String(patch.name).trim() : prev.name;
  if (!name) fail(400, "VALIDATION", "Enter a department name");
  if (name !== prev.name) state.doctors = (state.doctors || []).map((doc) => (doc.department === prev.name ? { ...doc, department: name } : doc));
  const type = patch.type === "IPD" || patch.type === "Diagnostic" || patch.type === "Support" || patch.type === "OPD" ? patch.type : prev.type;
  state.departments = state.departments.map((d) => (d.id === id ? { ...prev, ...patch, id, name, type, doctors: [] } : d));
  return state.departments.find((d) => d.id === id)!;
}
export function removeDepartment(state: PharmacyState, id: string) {
  state.departments = (state.departments || []).filter((d) => d.id !== id);
  return { departments: state.departments };
}
export function addReferral(state: PharmacyState, input: { name?: string; area?: string }) {
  const name = String(input.name || "").trim();
  if (!name) fail(400, "VALIDATION", "Enter a pharmacy name");
  const row: Referral = { id: "REF-" + bump(state, "referral"), name, area: String(input.area || "").trim(), status: "Invited", reward: 0 };
  state.referrals = [row, ...(state.referrals || [])];
  return row;
}
export function updateReferral(state: PharmacyState, id: string, patch: Partial<Referral>) {
  const prev = (state.referrals || []).find((r) => r.id === id);
  if (!prev) fail(404, "NOT_FOUND", "Referral not found");
  if (prev.status === "Paid") fail(403, "FORBIDDEN", "A paid referral cannot be changed");
  if (patch.status === "Paid") fail(403, "FORBIDDEN", "Only Namma MedMate can mark a referral paid");
  const status = patch.status === "Signed up" || patch.status === "Earned" || patch.status === "Invited" ? patch.status : prev.status;
  const reward = patch.reward != null && Number.isFinite(Number(patch.reward)) ? Math.max(0, Number(patch.reward)) : prev.reward;
  state.referrals = state.referrals.map((r) => (r.id === id ? { ...prev, name: patch.name != null ? String(patch.name).trim() || prev.name : prev.name, area: patch.area != null ? String(patch.area).trim() : prev.area, status, reward, id } : r));
  return state.referrals.find((r) => r.id === id)!;
}
export function removeReferral(state: PharmacyState, id: string) {
  const prev = (state.referrals || []).find((r) => r.id === id);
  if (prev?.status === "Paid") fail(403, "FORBIDDEN", "A paid referral cannot be changed");
  state.referrals = (state.referrals || []).filter((r) => r.id !== id);
  return { referrals: state.referrals };
}
export function addDoctor(state: PharmacyState, d: Omit<DoctorProfile, "id">) {
  const row = { ...d, id: "DR-" + String(bump(state, "doc")).padStart(3, "0") };
  state.doctors = [row, ...state.doctors];
  return row;
}
export function updateDoctor(state: PharmacyState, id: string, patch: Partial<DoctorProfile>) {
  if (!state.doctors.some((d) => d.id === id)) fail(404, "NOT_FOUND", "Doctor not found");
  state.doctors = state.doctors.map((d) => (d.id === id ? { ...d, ...patch, id } : d));
  return state.doctors.find((d) => d.id === id)!;
}
export function removeDoctor(state: PharmacyState, id: string) {
  state.doctors = state.doctors.filter((d) => d.id !== id);
  return { doctors: state.doctors };
}
export function updateHospitalAccount(state: PharmacyState, patch: Partial<HospitalAccount>) {
  checkGstin(patch.gstin);
  state.hospitalAccount = { ...state.hospitalAccount, ...patch };
  return state.hospitalAccount;
}
export function pricingOk(unlocked: boolean) {
  if (!unlocked) fail(403, "FORBIDDEN", "Unlock pricing with the admin OTP first");
}
export function setUniformDiscount(state: PharmacyState, pct: number, unlocked: boolean) {
  pricingOk(unlocked);
  state.hospitalAccount = { ...state.hospitalAccount, discountPct: Math.max(0, Math.min(95, Math.round(pct))) };
  return state.hospitalAccount;
}
export function setHospitalPriceRule(state: PharmacyState, productId: string, rule: PriceRule | null, unlocked: boolean) {
  pricingOk(unlocked);
  const next = { ...state.hospitalPriceRules };
  if (!rule || Number.isNaN(rule.value) || rule.value < 0) delete next[productId];
  else next[productId] = { mode: rule.mode, value: Math.round(rule.value * 100) / 100 };
  state.hospitalPriceRules = next;
  return state.hospitalPriceRules;
}
function assertWardStock(state: PharmacyState, items: WardSupplyItem[], dir: 1 | -1) {
  if (dir < 0) {
    for (const it of items) if (!state.inventory.some((p) => p.id === it.productId)) fail(400, "VALIDATION", "Product not found");
    return;
  }
  const held = new Map<string, Batch[]>();
  for (const it of items) {
    const p = state.inventory.find((x) => x.id === it.productId);
    if (!p) fail(400, "VALIDATION", "Product not found");
    const batches = held.get(p.id) ?? p.batches.map((b) => ({ ...b }));
    const prefer = it.batchNo && it.batchNo !== "—" ? it.batchNo : undefined;
    if (takePacks(batches, it.qty, prefer) > 0) fail(400, "VALIDATION", `${p.name} does not have enough stock`, "qty");
    held.set(p.id, batches);
  }
}
function supplyTotal(items: WardSupplyItem[]) { return Math.round(items.reduce((a, it) => a + it.amount, 0) * 100) / 100; }
export function issueWardSupply(state: PharmacyState, draft: Omit<WardSupply, "id" | "kind" | "at" | "total">) {
  if (!draft.items.length) fail(400, "VALIDATION", "Nothing to issue", "qty");
  assertWardStock(state, draft.items, 1);
  const supply: WardSupply = { ...draft, id: "WS-" + bump(state, "ws"), kind: "issue", total: supplyTotal(draft.items), at: Date.now() };
  moveInventory(state, draft.items, 1);
  state.wardSupplies = [supply, ...state.wardSupplies];
  if (draft.indentId) state.wardIndents = state.wardIndents.map((x) => (x.id === draft.indentId ? { ...x, status: "issued", items: x.items.map((it) => ({ ...it, issued: it.qty })) } : x));
  return { supply, inventory: state.inventory, wardIndents: state.wardIndents };
}
export function returnWardSupply(state: PharmacyState, draft: Omit<WardSupply, "id" | "kind" | "at" | "total">) {
  if (!draft.items.length) fail(400, "VALIDATION", "Nothing to return", "qty");
  assertWardStock(state, draft.items, -1);
  const supply: WardSupply = { ...draft, id: "WR-" + bump(state, "wr"), kind: "return", total: supplyTotal(draft.items), at: Date.now() };
  moveInventory(state, draft.items, -1);
  state.wardSupplies = [supply, ...state.wardSupplies];
  return { supply, inventory: state.inventory };
}
export function issueIndent(state: PharmacyState, indentId: string) {
  const ind = state.wardIndents.find((x) => x.id === indentId);
  if (!ind || !ind.items.length) return { ok: false as const };
  const nm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const matched = ind.items.map((it) => {
    const p = state.inventory.find((pp) => { const a = nm(pp.name); const b = nm(it.name); return a === b || b.includes(a) || a.includes(b); });
    return p ? { p, qty: it.qty } : null;
  });
  if (matched.some((m) => !m)) return { ok: false as const };
  const items: WardSupplyItem[] = (matched as { p: InvProduct; qty: number }[]).map(({ p, qty }) => {
    const b = earliestBatch(p);
    const price = creditPriceOf(p, state.hospitalAccount, state.hospitalPriceRules);
    return { productId: p.id, name: p.name, batchNo: b?.batchNo ?? "—", expiry: b?.expiry ?? "—", hsn: p.hsn, gst: p.gst, qty, price, amount: Math.round(qty * price * 100) / 100 };
  });
  return { ok: true as const, ...issueWardSupply(state, { wardId: ind.wardId, wardName: ind.wardName, reason: "floor", items, refDoc: ind.id, indentId: ind.id }) };
}
export function recordHospitalPayment(state: PharmacyState, p: { amount: number; mode: PayMode; note?: string }) {
  if (p.amount <= 0) fail(400, "VALIDATION", "Amount must be positive", "amount");
  const row = { ...p, id: "HP-" + bump(state, "hp"), at: Date.now() };
  state.hospitalPayments = [row, ...state.hospitalPayments];
  return row;
}
export function addTicket(state: PharmacyState, subject: string, category: string): Ticket {
  const row: Ticket = { id: "TKT-" + bump(state, "ticket"), subject, category, status: "Open", createdAt: Date.now() };
  state.tickets = [row, ...state.tickets];
  return row;
}
export function checkPricingOtp(pin: string, code: string, dev: boolean) {
  const digits = (code || "").replace(/\D/g, "");
  if (dev && digits === "123456") return true;
  return digits.length === 6 && digits === pin;
}
