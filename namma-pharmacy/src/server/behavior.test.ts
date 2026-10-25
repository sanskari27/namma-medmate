import assert from "node:assert/strict";
import test from "node:test";
import { fromPaise, toPaise } from "../app/lib/paise";
import { findLogin, getPool, insertPharmacy, loadState } from "./db";
import { cancelOrder, checkoutPos, issueWardSupply, receivePurchase, requireHospital, requirePlan, returnWardSupply, setBatchQty } from "./mutate";
import { handle, keepOwner } from "./router";
import { demoState, emptyState, type PharmacyState } from "./state";

test("money crosses the API as integer paise and flat offers stay distinct from percents", () => {
  const stored = toPaise({
    mrp: 12.5,
    gst: 12,
    qty: 2,
    offers: [{ type: "flat", value: 50 }, { type: "pct", value: 10 }],
  });
  assert.equal(stored.mrp, 1250);
  assert.equal(stored.gst, 12);
  assert.equal(stored.qty, 2);
  assert.equal(stored.offers[0].value, 5000);
  assert.equal(stored.offers[1].value, 10);
  const money = toPaise({ fee: 250, paid: 80, salePaid: true });
  assert.equal(money.fee, 25000);
  assert.equal(money.paid, 8000);
  assert.equal(toPaise({ paid: true }).paid, true);
  assert.deepEqual(fromPaise(stored), { mrp: 12.5, gst: 12, qty: 2, offers: [{ type: "flat", value: 50 }, { type: "pct", value: 10 }] });
});

test("checkout deducts stock once and an idempotent replay does not deduct again", () => {
  const state = emptyState({ phone: "+919000000000", businessType: "pharmacy" });
  state.inventory = [{
    id: "p1", name: "Dolo", composition: "", manufacturer: "", form: "Tablet", pack: "Strip of 10",
    category: "fever", hsn: "3004", gst: 12, schedule: "OTC", rack: "A1", reorderLevel: 5,
    online: true, emoji: "💊", batches: [{ batchNo: "B1", expiry: "2027-01", qty: 5, mrp: 30, ptr: 20 }],
  }];
  const input = { lines: [{ productId: "p1", qty: 1 }], payMode: "cash" as const, customer: { name: "Walk-in" } };
  const seen = new Map<string, unknown>();
  const once = (key: string) => {
    if (seen.has(key)) return seen.get(key);
    const result = checkoutPos(state, input);
    seen.set(key, result);
    return result;
  };
  once("bill-1");
  once("bill-1");
  assert.equal(state.inventory[0].batches[0].qty, 4);
  assert.equal(state.sales.length, 1);
});

test("cancelling an order restocks only the quantity already packed", () => {
  const state = emptyState({ phone: "+919000000000", businessType: "pharmacy" });
  state.inventory = [{
    id: "p1", name: "Dolo", composition: "", manufacturer: "", form: "Tablet", pack: "10",
    category: "fever", hsn: "3004", gst: 5, schedule: "OTC", rack: "A1", reorderLevel: 1,
    online: false, emoji: "💊", batches: [{ batchNo: "B1", expiry: "2027-01", qty: 3, mrp: 10, ptr: 8 }],
  }];
  state.sales = [{
    id: "INV-1", channel: "online", status: "accepted", customer: { name: "Asha" },
    items: [{ productId: "p1", name: "Dolo", batchNo: "B1", expiry: "2027-01", hsn: "3004", qty: 2, mrp: 10, price: 10, gst: 5 }],
    discount: 0, payMode: "cod", rx: false, createdAt: Date.now(),
    fulfillment: { lines: [{ productId: "p1", name: "Dolo", qty: 2, scanned: 1, batchNo: "B1" }] },
  }];
  cancelOrder(state, "INV-1");
  assert.equal(state.inventory[0].batches[0].qty, 4);
  assert.equal(state.sales[0].status, "cancelled");
});

test("goods receipt increases stock once for the same idempotency key", () => {
  const state = emptyState({ phone: "+919000000000", businessType: "pharmacy" });
  state.inventory = [{
    id: "p1", name: "Dolo", composition: "", manufacturer: "", form: "Tablet", pack: "10",
    category: "fever", hsn: "3004", gst: 5, schedule: "OTC", rack: "A1", reorderLevel: 1,
    online: false, emoji: "💊", batches: [{ batchNo: "B1", expiry: "2027-01", qty: 1, mrp: 10, ptr: 8 }],
  }];
  const draft = { supplierId: "s1", supplierName: "Dist", invoiceNo: "1", invoiceDate: "2026-10-01", items: [{ productId: "p1", name: "Dolo", batchNo: "B1", expiry: "2027-01", qty: 4, freeQty: 0, ptr: 8, mrp: 10, gst: 5, hsn: "3004" }] };
  const seen = new Map<string, unknown>();
  const once = (key: string) => {
    if (seen.has(key)) return seen.get(key);
    const result = receivePurchase(state, draft);
    seen.set(key, result);
    return result;
  };
  once("grn-1");
  once("grn-1");
  assert.equal(state.inventory[0].batches[0].qty, 5);
});

test("a free plan cannot open a paid mutation and a pharmacy session is not a hospital", () => {
  const state = emptyState({ phone: "+919000000000", businessType: "pharmacy" });
  assert.throws(() => requirePlan(state, "orders"), (err: { code?: string }) => err.code === "PLAN_LOCKED");
  assert.throws(() => requireHospital(state), (err: { code?: string }) => err.code === "FORBIDDEN");
  assert.doesNotThrow(() => requirePlan(state, "pos"));
});

test("setting a batch quantity is the value sent, not an extra increment", () => {
  const state = emptyState({ phone: "+919000000000", businessType: "pharmacy" });
  state.inventory = [{
    id: "p1", name: "Dolo", composition: "", manufacturer: "", form: "Tablet", pack: "10",
    category: "fever", hsn: "3004", gst: 5, schedule: "OTC", rack: "A1", reorderLevel: 1,
    online: false, emoji: "💊", batches: [{ batchNo: "B1", expiry: "2027-01", qty: 9, mrp: 10, ptr: 8 }],
  }];
  setBatchQty(state, "p1", "B1", 4);
  assert.equal(state.inventory[0].batches[0].qty, 4);
});

function stocked(batches: { batchNo: string; expiry: string; qty: number; mrp: number; ptr: number }[], extra: { form?: PharmacyState["inventory"][number]["form"]; pack?: string; looseAllowed?: boolean } = {}): PharmacyState["inventory"][number] {
  return {
    id: "p1", name: "Dolo", composition: "", manufacturer: "", form: extra.form ?? "Tablet", pack: extra.pack ?? "Strip of 10",
    category: "fever", hsn: "3004", gst: 12, schedule: "OTC" as const, rack: "A1", reorderLevel: 5,
    online: true, emoji: "💊", looseAllowed: extra.looseAllowed, batches,
  };
}

test("a line bills the earliest batch when later batches have a higher MRP", () => {
  const state = emptyState({ phone: "+919000000000", businessType: "pharmacy" });
  state.inventory = [stocked([
    { batchNo: "NEW100", expiry: "2028-01", qty: 8, mrp: 100, ptr: 70 },
    { batchNo: "OLD40", expiry: "2026-06", qty: 5, mrp: 40, ptr: 25 },
  ])];
  const { sale } = checkoutPos(state, { lines: [{ productId: "p1", qty: 1 }], payMode: "cash", customer: { name: "Walk-in" } });
  assert.equal(sale.items[0].batchNo, "OLD40");
  assert.equal(sale.items[0].price, 40);
  assert.equal(sale.discount, 0);
  assert.equal(state.inventory[0].batches.find((b) => b.batchNo === "NEW100")?.qty, 8);
  assert.equal(state.inventory[0].batches.find((b) => b.batchNo === "OLD40")?.qty, 4);
});

test("an oversell and an illegal loose sale leave stock and sales unchanged", () => {
  const short = emptyState({ phone: "+919000000000", businessType: "pharmacy" });
  short.inventory = [stocked([{ batchNo: "B1", expiry: "2027-01", qty: 2, mrp: 30, ptr: 20 }])];
  assert.throws(() => checkoutPos(short, { lines: [{ productId: "p1", qty: 9 }], payMode: "cash" }), (err: { status?: number }) => err.status === 400);
  assert.equal(short.inventory[0].batches[0].qty, 2);
  assert.equal(short.sales.length, 0);

  const syrup = emptyState({ phone: "+919000000000", businessType: "pharmacy" });
  syrup.inventory = [stocked([{ batchNo: "B1", expiry: "2027-01", qty: 4, mrp: 80, ptr: 50 }], { form: "Syrup", pack: "150 ml" })];
  assert.throws(() => checkoutPos(syrup, { lines: [{ productId: "p1", qty: 1, loose: true }], payMode: "cash" }), (err: { status?: number }) => err.status === 400);
  assert.equal(syrup.inventory[0].batches[0].qty, 4);
  assert.equal(syrup.sales.length, 0);

  const sealed = emptyState({ phone: "+919000000000", businessType: "pharmacy" });
  sealed.inventory = [stocked([{ batchNo: "B1", expiry: "2027-01", qty: 4, mrp: 30, ptr: 20 }], { looseAllowed: false })];
  assert.throws(() => checkoutPos(sealed, { lines: [{ productId: "p1", qty: 1, loose: true }], payMode: "cash" }), (err: { status?: number }) => err.status === 400);
  assert.equal(sealed.inventory[0].batches[0].qty, 4);
  assert.equal(sealed.sales.length, 0);
});

test("a ward issue of a missing or short product writes nothing", () => {
  const state = emptyState({ phone: "+919000000000", businessType: "pharmacy" });
  state.inventory = [stocked([{ batchNo: "B1", expiry: "2027-01", qty: 2, mrp: 30, ptr: 20 }])];
  const line = { productId: "missing", name: "Missing", batchNo: "B1", expiry: "2027-01", hsn: "3004", gst: 12, qty: 1, price: 30, amount: 30 };
  const ws = state.seq.ws;
  assert.throws(() => issueWardSupply(state, { wardId: "w1", wardName: "ICU", reason: "floor", items: [line] }), (err: { status?: number }) => err.status === 400);
  assert.equal(state.wardSupplies.length, 0);
  assert.equal(state.seq.ws, ws);

  const short = { ...line, productId: "p1", name: "Dolo", qty: 9, amount: 270 };
  assert.throws(() => issueWardSupply(state, { wardId: "w1", wardName: "ICU", reason: "floor", items: [short] }), (err: { status?: number }) => err.status === 400);
  assert.equal(state.inventory[0].batches[0].qty, 2);
  assert.equal(state.wardSupplies.length, 0);

  assert.throws(() => returnWardSupply(state, { wardId: "w1", wardName: "ICU", reason: "floor", items: [line] }), (err: { status?: number }) => err.status === 400);
  assert.equal(state.wardSupplies.length, 0);
  returnWardSupply(state, { wardId: "w1", wardName: "ICU", reason: "floor", items: [{ ...short, qty: 3, amount: 90 }] });
  assert.equal(state.inventory[0].batches[0].qty, 5);
  assert.equal(state.wardSupplies.length, 1);
});

test("a second reset keeps unique user ids", () => {
  const sample = demoState(Date.now(), "pharmacy");
  const owner = { ...sample.users[0], name: "Signed-in owner", phone: "+919000077701" };
  const next = keepOwner(structuredClone(sample), owner, owner.phone);
  const ids = next.users.map((u) => u.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(next.users.find((u) => u.phone === "+919000077701")?.id, "u1");
  assert.notEqual(next.users.find((u) => u.name === "Rajesh Kumar")?.id, "u1");
});

test("a taken sample mobile stays with the pharmacy that already owns it", async (t) => {
  try {
    await getPool().query("SELECT 1");
  } catch {
    t.skip("postgres is not running");
    return;
  }
  const n = String(Date.now()).slice(-8);
  const taken = "+9191" + n;
  const phoneA = "+9192" + n;
  const phoneB = "+9193" + n;
  const ids: string[] = [];
  try {
    const first = emptyState({ phone: phoneA, businessType: "pharmacy" });
    first.users = [{ id: "u1", name: "First owner", role: "Owner", phone: taken, email: "", active: true, lastActiveMins: 0, pin: "" }];
    const createdA = await insertPharmacy(phoneA, "pharmacy", first);
    ids.push(createdA.id);
    const sample = demoState(Date.now(), "pharmacy");
    sample.users = sample.users.map((u) => (u.id === "u2" ? { ...u, phone: taken } : u));
    const owner = { ...sample.users[0], name: "Second owner", phone: phoneB };
    const next = keepOwner(sample, owner, phoneB);
    const createdB = await insertPharmacy(phoneB, "pharmacy", next);
    ids.push(createdB.id);
    const login = await findLogin(taken);
    assert.equal(login?.pharmacy_id, createdA.id);
    const loaded = await loadState(createdB.id);
    assert.equal(loaded.users.some((u) => u.phone === taken), true);
    assert.equal(new Set(loaded.users.map((u) => u.id)).size, loaded.users.length);
  } finally {
    if (ids.length) await getPool().query("DELETE FROM pharmacies WHERE id = ANY($1::uuid[])", [ids]);
  }
});

test("a past renewal date locks a paid route and still allows POS", () => {
  const state = emptyState({ phone: "+919000000000", businessType: "pharmacy" });
  state.subscription = { plan: "Growth", cycle: "monthly", status: "active", renewsOn: "2020-01-01", since: "2020-01-01", autoRenew: true };
  assert.throws(() => requirePlan(state, "orders"), (err: { code?: string }) => err.code === "PLAN_LOCKED");
  assert.doesNotThrow(() => requirePlan(state, "pos"));
});

test("a short OTP returns JSON 400", async () => {
  const res = await handle(new Request("http://localhost/api/v1/auth/otp/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "9000000001", code: "12345" }),
  }));
  assert.equal(res.status, 400);
  const body = await res.json() as { error: { message: string } };
  assert.equal(body.error.message, "Enter the 6-digit code");
});
