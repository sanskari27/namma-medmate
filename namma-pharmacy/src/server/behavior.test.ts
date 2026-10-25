import assert from "node:assert/strict";
import test from "node:test";
import { fieldFrom } from "../app/lib/formFault";
import { fromPaise, toPaise } from "../app/lib/paise";
import { createSession, e164, findLogin, getPool, insertPharmacy, loadState, migrate, withState, type SessionRow } from "./db";
import { addDepartment, addReferral, cancelOrder, checkoutPos, issueWardSupply, receivePurchase, removeDepartment, removeReferral, requireHospital, requirePlan, returnWardSupply, saveBankAccount, setBatchQty, setDirectOffer, updateDepartment, updateReferral } from "./mutate";
import { handle, keepOwner, sessionView } from "./router";
import { demoState, emptyState, stripDemo, type PharmacyState } from "./state";

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

test("production drops an untouched demo store and keeps the owner phone", () => {
  const demo = demoState(Date.now(), "pharmacy");
  demo.users[0].phone = "+919000077701";
  assert.equal(stripDemo(demo, "production"), true);
  assert.equal(demo.inventory.length, 0);
  assert.equal(demo.sales.length, 0);
  assert.equal(demo.profile.gstin, "");
  assert.equal(demo.profile.name === "Sri Sai Medicals", false);
  assert.equal(demo.users.some((u) => u.password), false);
  assert.equal(demo.users[0].phone, "+919000077701");

  const real = emptyState({ phone: "+919000077701", businessType: "pharmacy" });
  real.inventory = [{ id: "p9", name: "Metformin 500mg", composition: "", manufacturer: "", form: "Tablet", pack: "", category: "diabetes", hsn: "3004", gst: 5, schedule: "H", rack: "A1", reorderLevel: 1, online: false, emoji: "", batches: [] }];
  assert.equal(stripDemo(real, "production"), false);
  assert.equal(real.inventory.length, 1);
  assert.equal(stripDemo(demoState(Date.now(), "pharmacy"), "development"), false);
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

test("departments and referrals stay on the pharmacy after create, edit, and delete", () => {
  const state = emptyState({ phone: "+919000000000", businessType: "hospital" });
  state.doctors = [{ id: "DR-001", name: "Dr. A", department: "ICU" } as PharmacyState["doctors"][number]];
  const dep = addDepartment(state, { name: "ICU", head: "Dr. A", type: "IPD", emoji: "🏥" });
  assert.equal(dep.id, "DEP-1");
  assert.equal(state.departments[0].name, "ICU");
  updateDepartment(state, dep.id, { name: "Critical care" });
  assert.equal(state.departments[0].name, "Critical care");
  assert.equal(state.doctors[0].department, "Critical care");
  const ref = addReferral(state, { name: "City Medicals", area: "Jayanagar" });
  assert.equal(ref.status, "Invited");
  assert.equal(ref.reward, 0);
  updateReferral(state, ref.id, { status: "Earned", reward: 500 });
  assert.equal(state.referrals[0].reward, 500);
  removeReferral(state, ref.id);
  removeDepartment(state, dep.id);
  assert.equal(state.referrals.length, 0);
  assert.equal(state.departments.length, 0);
});

test("validation messages name the form field", () => {
  assert.equal(fieldFrom("Enter a valid GSTIN"), "gstin");
  assert.equal(fieldFrom("Enter a valid mobile number"), "phone");
  assert.equal(fieldFrom("Enter a valid IFSC"), "ifsc");
  assert.equal(fieldFrom("Enter the 6-digit code"), "otp");
  assert.equal(fieldFrom("Enter the 8-digit code"), "otp");
  assert.equal(fieldFrom("Paracetamol does not have enough stock"), "qty");
  assert.equal(fieldFrom("Amount must be positive"), "amount");
  assert.equal(fieldFrom("This action needs a paid plan"), undefined);
});

test("one session snapshot carries the pharmacy and hides locked hospital wards", () => {
  const state = emptyState({ phone: "+919000000000", businessType: "hospital" });
  state.profile.name = "City Pharmacy";
  state.wards = [{ id: "W1", name: "ICU", code: "ICU", floor: "1", type: "ICU", beds: 1, occupied: 0, sister: "A" }];
  const session = { userId: "u1", phone: "+919000000000" } as SessionRow;
  const locked = sessionView(state, session);
  assert.equal(locked.profile.name, "City Pharmacy");
  assert.deepEqual(locked.wards, []);
  state.subscription = { ...state.subscription, plan: "Pro", status: "active", renewsOn: "2099-01-01" };
  assert.equal(sessionView(state, session).wards[0].id, "W1");
});

test("a direct offer stays on that product and a bank account needs a real IFSC", () => {
  const state = emptyState({ phone: "+919000000000", businessType: "pharmacy" });
  state.inventory = [stocked([])];
  setDirectOffer(state, "p1", "pct", 10);
  assert.equal(state.inventory[0].offerId, "od-p1");
  assert.equal(state.offers[0].value, 10);
  setDirectOffer(state, "p1", "pct", 0);
  assert.equal(state.inventory[0].offerId, undefined);
  assert.equal(state.offers.length, 0);
  assert.throws(() => saveBankAccount(state, { holderName: "A", accountNumber: "1", ifsc: "BAD", bankName: "Bank", accountType: "Current" }), (err: { code?: string }) => err.code === "VALIDATION");
  saveBankAccount(state, { holderName: "A", accountNumber: "1", ifsc: "hdfc0001234", bankName: "Bank", accountType: "Current" });
  assert.equal(state.bankAccount?.ifsc, "HDFC0001234");
  assert.equal(state.bankAccount?.verified, false);
});

test("a short OTP returns JSON 400", async () => {
  const res = await handle(new Request("http://localhost/api/v1/auth/otp/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "9000000001", code: "12345" }),
  }));
  assert.equal(res.status, 400);
  const body = await res.json() as { error: { message: string; field?: string } };
  assert.equal(body.error.message, "Enter the 6-digit code");
  assert.equal(body.error.field, "otp");
});

test("cognito sign-in rejects a 6-digit code", async () => {
  const pool = process.env.COGNITO_USER_POOL_ID;
  const client = process.env.COGNITO_CLIENT_ID;
  process.env.COGNITO_USER_POOL_ID = "pool";
  process.env.COGNITO_CLIENT_ID = "client";
  try {
    const res = await handle(new Request("http://localhost/api/v1/auth/otp/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "9000000001", code: "123456" }),
    }));
    assert.equal(res.status, 400);
    const body = await res.json() as { error: { message: string } };
    assert.equal(body.error.message, "Enter the 8-digit code");
  } finally {
    if (pool === undefined) delete process.env.COGNITO_USER_POOL_ID;
    else process.env.COGNITO_USER_POOL_ID = pool;
    if (client === undefined) delete process.env.COGNITO_CLIENT_ID;
    else process.env.COGNITO_CLIENT_ID = client;
  }
});

function utcShift(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function call(method: string, path: string, cookie?: string, body?: unknown, headers: Record<string, string> = {}) {
  const head: Record<string, string> = { ...headers };
  if (cookie) head.cookie = cookie;
  if (body !== undefined) head["content-type"] = "application/json";
  return handle(new Request("http://localhost/api/v1" + path, { method, headers: head, body: body !== undefined ? JSON.stringify(body) : undefined }));
}

function cookieOf(res: Response, name: string) {
  const rows = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [res.headers.get("set-cookie") || ""];
  const hit = rows.find((row) => row.startsWith(name + "="));
  assert.ok(hit, name);
  return hit.split(";")[0];
}

test("master portal access, grants, seats, audit, and concurrent writes", async () => {
  await migrate();
  const stamp = String(Date.now()).slice(-8);
  const ownerDigits = "98" + stamp;
  const bookDigits = "96" + stamp;
  const strangerDigits = "97" + stamp;
  const owner = e164(ownerDigits);
  const stranger = e164(strangerDigits);
  const ids: string[] = [];
  const pool = getPool();
  try {
    const denied = await call("POST", "/auth/otp/verify", undefined, { phone: strangerDigits, code: "123456", portal: "master" });
    assert.equal(denied.status, 403);
    assert.equal((await pool.query("SELECT 1 FROM pharmacies WHERE phone = $1", [stranger])).rowCount, 0);
    assert.equal((await call("GET", "/master/pharmacies")).status, 401);

    const signed = await call("POST", "/auth/otp/verify", undefined, { phone: ownerDigits, code: "123456", businessType: "pharmacy", name: "Lake Medicals" });
    assert.equal(signed.status, 200);
    const pharmacyCookie = cookieOf(signed, "namma_session");
    assert.equal(pharmacyCookie.includes("namma_master"), false);
    const login = await findLogin(owner);
    assert.ok(login);
    const id = login.pharmacy_id;
    ids.push(id);
    assert.equal((await call("GET", "/master/pharmacies", pharmacyCookie)).status, 403);
    assert.equal((await call("PATCH", "/subscription", pharmacyCookie, { plan: "Pro", cycle: "annual" })).status, 403);
    assert.equal((await call("PUT", `/master/pharmacies/${id}/grants`, pharmacyCookie, { grants: [{ route: "customers" }] })).status, 403);

    await pool.query("INSERT INTO master_phones (phone) VALUES ($1) ON CONFLICT DO NOTHING", [owner]);
    const mastered = await call("POST", "/auth/otp/verify", undefined, { phone: ownerDigits, code: "123456", portal: "master" });
    assert.equal(mastered.status, 200);
    const masterCookie = cookieOf(mastered, "namma_master");
    assert.equal((await call("GET", "/session", pharmacyCookie)).status, 200);
    assert.equal((await call("GET", "/master/session", masterCookie)).status, 200);
    assert.equal((await call("GET", "/session", masterCookie)).status, 401);
    assert.equal((await call("GET", "/master/pharmacies", pharmacyCookie)).status, 403);

    await withState(id, (state) => {
      state.profile.city = "Mysuru";
      state.inventory = [stocked([{ batchNo: "B1", expiry: "2027-01", qty: 5, mrp: 30, ptr: 20 }])];
      state.tickets = [{ id: "TKT-1", subject: "Printer", category: "Help", status: "Open", createdAt: Date.now() }];
    });
    await call("POST", "/referrals", pharmacyCookie, { name: "Hill Pharmacy", area: "Mysuru" });
    await call("POST", "/subscription/requests", pharmacyCookie, { plan: "Starter", cycle: "monthly", kind: "plan" });
    await call("POST", "/subscription/requests", pharmacyCookie, { plan: "Growth", cycle: "annual", kind: "plan" });

    const byName = await call("GET", "/master/pharmacies?q=Lake", masterCookie);
    assert.equal(byName.status, 200);
    assert.ok(((await byName.json()) as { id: string }[]).some((row) => row.id === id));
    const byCity = await call("GET", "/master/pharmacies?q=mysuru", masterCookie);
    assert.ok(((await byCity.json()) as { id: string }[]).some((row) => row.id === id));
    const byPhone = await call("GET", "/master/pharmacies?q=" + stamp, masterCookie);
    assert.ok(((await byPhone.json()) as { id: string }[]).some((row) => row.id === id));

    const inbox = await (await call("GET", "/master/requests", masterCookie)).json() as { pharmacyId: string; plan: string; status: string; createdAt: number }[];
    const mine = inbox.filter((row) => row.pharmacyId === id);
    assert.equal(mine.length, 2);
    assert.ok(mine.every((row) => row.status === "open"));
    assert.equal(new Set(mine.map((row) => row.plan)).size, 2);

    assert.equal((await call("GET", "/customers", pharmacyCookie)).status, 403);
    assert.equal((await call("GET", "/inventory", pharmacyCookie)).status, 200);
    assert.equal((await call("GET", "/purchases", pharmacyCookie)).status, 200);
    assert.equal((await call("GET", "/subscription", pharmacyCookie)).status, 200);
    assert.equal((await call("GET", "/support/tickets", pharmacyCookie)).status, 200);
    assert.equal((await call("GET", "/referrals", pharmacyCookie)).status, 200);
    assert.equal((await call("POST", "/pos/checkout", pharmacyCookie, { lines: [{ productId: "p1", qty: 1 }], payMode: "cash", customer: { name: "Asha" } }, { "idempotency-key": "free-bill-" + stamp })).status, 200);

    const granted = await call("PUT", `/master/pharmacies/${id}/grants`, masterCookie, { grants: [{ route: "customers", until: utcShift(10) }, { route: "wards" }], reason: "trial reports" });
    assert.equal(granted.status, 200, await granted.text());
    assert.equal((await call("GET", "/customers", pharmacyCookie)).status, 200);
    assert.equal((await call("GET", "/prescriptions", pharmacyCookie)).status, 403);
    assert.equal((await call("GET", "/hospital/wards", pharmacyCookie)).status, 403);

    const paid = await call("PATCH", `/master/pharmacies/${id}/plan`, masterCookie, { plan: "Starter", cycle: "annual", renewsOn: utcShift(40), reason: "first year" });
    assert.equal(paid.status, 200, await paid.clone().text());
    const afterPay = await loadState(id);
    assert.equal(afterPay.subscription.plan, "Starter");
    assert.equal(afterPay.subscription.cycle, "annual");
    assert.equal(afterPay.grants.length, 2);
    assert.ok(afterPay.subscriptionRequests.every((row) => row.status === "handled"));
    assert.equal((await call("GET", "/prescriptions", pharmacyCookie)).status, 200);
    assert.equal((await call("GET", "/reports/catalog", pharmacyCookie)).status, 200);
    assert.equal((await call("GET", "/customers", pharmacyCookie)).status, 200);
    assert.equal((await call("GET", "/master/pharmacies?plan=Starter&window=30", masterCookie)).status, 200);
    const in30 = await (await call("GET", "/master/pharmacies?plan=Starter&window=30", masterCookie)).json() as { id: string }[];
    assert.equal(in30.some((row) => row.id === id), false);

    await call("PATCH", `/master/pharmacies/${id}/plan`, masterCookie, { plan: "Growth", cycle: "monthly", renewsOn: utcShift(5), reason: "inside seven days" });
    const in7 = await (await call("GET", "/master/pharmacies?window=7", masterCookie)).json() as { id: string }[];
    assert.ok(in7.some((row) => row.id === id));
    assert.equal((await call("GET", "/hospital/wards", pharmacyCookie)).status, 403);

    await call("PATCH", `/master/pharmacies/${id}/business-type`, masterCookie, { businessType: "hospital", reason: "ward counter" });
    assert.equal((await call("GET", "/hospital/wards", pharmacyCookie)).status, 200);
    await call("PATCH", `/master/pharmacies/${id}/plan`, masterCookie, { plan: "Free", cycle: "monthly", renewsOn: "—", reason: "back to free" });
    assert.equal((await call("GET", "/hospital/wards", pharmacyCookie)).status, 200);
    assert.equal((await call("GET", "/hospital/doctors", pharmacyCookie)).status, 403);
    await call("PATCH", `/master/pharmacies/${id}/business-type`, masterCookie, { businessType: "pharmacy", reason: "retail again" });
    assert.equal((await call("GET", "/hospital/wards", pharmacyCookie)).status, 403);
    const kept = await loadState(id);
    assert.ok(kept.grants.some((grant) => grant.route === "wards"));
    assert.equal(kept.sales.length, 1);
    await call("PATCH", `/master/pharmacies/${id}/business-type`, masterCookie, { businessType: "hospital", reason: "restore hospital" });
    assert.equal((await call("GET", "/hospital/wards", pharmacyCookie)).status, 200);

    await call("PATCH", `/master/pharmacies/${id}/plan`, masterCookie, { plan: "Pro", cycle: "monthly", renewsOn: utcShift(20), reason: "pro trial" });
    assert.equal((await call("GET", "/offers", pharmacyCookie)).status, 200);
    await call("PUT", `/master/pharmacies/${id}/grants`, masterCookie, { grants: [{ route: "customers", until: utcShift(-1) }], reason: "grant already expired" });
    assert.equal((await call("GET", "/customers", pharmacyCookie)).status, 200);
    await call("PATCH", `/master/pharmacies/${id}/plan`, masterCookie, { plan: "Pro", cycle: "monthly", renewsOn: utcShift(-1), reason: "lapsed" });
    assert.equal((await call("GET", "/customers", pharmacyCookie)).status, 403);
    assert.equal((await call("GET", "/offers", pharmacyCookie)).status, 403);
    assert.equal((await call("GET", "/inventory", pharmacyCookie)).status, 200);
    assert.equal((await loadState(id)).sales.length, 1);
    await call("PUT", `/master/pharmacies/${id}/grants`, masterCookie, { grants: [{ route: "customers" }], reason: "grant returns after lapse" });
    assert.equal((await call("GET", "/customers", pharmacyCookie)).status, 200);

    await withState(id, (state) => {
      state.users.push({ id: "cash", name: "Cash", role: "Cashier", phone: "+910000000000", email: "", active: true, lastActiveMins: 0, pin: "", permissions: ["pos", "orders", "credit"] });
    });
    await call("PATCH", `/master/pharmacies/${id}/plan`, masterCookie, { plan: "Starter", cycle: "monthly", renewsOn: utcShift(15), reason: "cashier check" });
    const cashier = "namma_session=" + await createSession(id, "cash", "+910000000000");
    assert.equal((await call("GET", "/reports/catalog", cashier)).status, 403);
    assert.equal((await call("GET", "/reports/catalog", pharmacyCookie)).status, 200);

    assert.equal((await call("PATCH", `/master/pharmacies/${id}/seats`, masterCookie, { extraSeats: 49, reason: "too many" })).status, 400);
    assert.equal((await call("PATCH", `/master/pharmacies/${id}/seats`, masterCookie, { extraSeats: 48, reason: "fill the cap" })).status, 200);
    const capped = await loadState(id);
    assert.equal(capped.extraSeats, 48);
    assert.equal((await (await call("GET", `/master/pharmacies/${id}`, masterCookie)).json() as { seats: { included: number; extra: number; inUse: number }; sales?: unknown; inventory?: unknown }).seats.included, 2);
    const viewed = await (await call("GET", `/master/pharmacies/${id}`, masterCookie)).json() as { seats: { included: number | null; extra: number; inUse: number }; sales?: unknown; inventory?: unknown; kyc: { gstin: string }; tickets: unknown[]; referrals: unknown[] };
    assert.equal(viewed.sales, undefined);
    assert.equal(viewed.inventory, undefined);
    assert.equal(viewed.seats.extra, 48);
    assert.ok(viewed.seats.inUse >= 1);
    assert.ok(viewed.tickets.length >= 1);
    assert.ok(viewed.referrals.length >= 1);
    await call("PATCH", `/master/pharmacies/${id}/plan`, masterCookie, { plan: "Free", cycle: "monthly", renewsOn: "—", reason: "seat drop" });
    await call("PATCH", `/master/pharmacies/${id}/seats`, masterCookie, { extraSeats: 0, reason: "no extras" });
    const crowded = await loadState(id);
    const beforeUsers = crowded.users.length;
    const blocked = await call("POST", "/users", pharmacyCookie, { name: "Extra", role: "Cashier", phone: "9000000099", email: "", active: true, pin: "1111" });
    assert.equal(blocked.status, 403);
    assert.equal((await loadState(id)).users.length, beforeUsers);

    await call("PATCH", `/master/pharmacies/${id}/plan`, masterCookie, { plan: "Pro", cycle: "annual", renewsOn: utcShift(30), reason: "unlimited seats" });
    assert.equal((await call("PATCH", `/master/pharmacies/${id}/seats`, masterCookie, { extraSeats: 51, reason: "over cap" })).status, 400);
    const added = await call("POST", "/users", pharmacyCookie, { name: "Sixth", role: "Cashier", phone: "9000000088", email: "", active: true, pin: "2222" });
    assert.equal(added.status, 200, await added.text());

    const referralId = (await loadState(id)).referrals[0].id;
    assert.equal((await call("POST", `/master/pharmacies/${id}/referrals/${referralId}/pay`, masterCookie, { reason: "too soon" })).status, 400);
    assert.equal((await call("POST", `/master/pharmacies/${id}/referrals/${referralId}/earn`, masterCookie, { reason: "month one" })).status, 200);
    const firstPay = await call("POST", `/master/pharmacies/${id}/referrals/${referralId}/pay`, masterCookie, { reason: "transfer" });
    assert.equal(firstPay.status, 200);
    const paidOnce = (await loadState(id)).referrals.find((row) => row.id === referralId)!;
    assert.equal(paidOnce.status, "Paid");
    assert.equal(paidOnce.reward, 500);
    assert.equal(paidOnce.paidBy, owner);
    const secondPay = await call("POST", `/master/pharmacies/${id}/referrals/${referralId}/pay`, masterCookie, { reason: "again" });
    assert.equal(secondPay.status, 200);
    const paidTwice = (await loadState(id)).referrals.find((row) => row.id === referralId)!;
    assert.equal(paidTwice.paidAt, paidOnce.paidAt);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM master_audit WHERE pharmacy_id = $1 AND action = 'referral-paid'", [id])).rows[0].n, 1);
    assert.equal((await call("PATCH", `/referrals/${referralId}`, pharmacyCookie, { status: "Earned" })).status, 403);

    const work = await call("GET", "/master/work", masterCookie);
    assert.equal(work.status, 200);
    const workBody = await work.json() as { tickets: { id: string }[]; referrals: { id: string }[] };
    assert.ok(workBody.tickets.some((row) => row.id === "TKT-1"));
    assert.ok(workBody.referrals.some((row) => row.id === referralId));
    assert.equal((await call("GET", "/master/audit", masterCookie)).status, 200);
    assert.equal((await call("GET", "/master/work")).status, 401);
    const listed = await (await call("GET", "/master/pharmacies?q=" + ownerDigits, masterCookie)).json() as { kyc: { gstin: string } }[];
    assert.ok(listed[0]?.kyc);

    assert.equal((await call("PATCH", `/master/pharmacies/${id}/tickets/TKT-1`, masterCookie, { status: "Resolved", reason: "replaced the roll" })).status, 200);
    const tickets = await (await call("GET", "/support/tickets", pharmacyCookie)).json() as { id: string; status: string }[];
    assert.equal(tickets.find((ticket) => ticket.id === "TKT-1")?.status, "Resolved");

    const audit = await pool.query("SELECT phone, action, before, after, reason FROM master_audit WHERE pharmacy_id = $1 AND action = 'plan' ORDER BY id DESC LIMIT 1", [id]);
    assert.equal(audit.rows[0].phone, owner);
    assert.equal(audit.rows[0].reason, "unlimited seats");
    assert.ok(audit.rows[0].before);
    assert.ok(audit.rows[0].after);
    const badPlan = await call("PATCH", `/master/pharmacies/${id}/plan`, masterCookie, { plan: "Mega", cycle: "monthly", renewsOn: utcShift(3), reason: "nope" });
    assert.equal(badPlan.status, 400);
    const auditCount = Number((await pool.query("SELECT count(*)::int AS n FROM master_audit WHERE pharmacy_id = $1", [id])).rows[0].n);
    await assert.rejects(() => pool.query("UPDATE master_audit SET reason = 'edited' WHERE pharmacy_id = $1", [id]));
    await assert.rejects(() => pool.query("DELETE FROM master_audit WHERE pharmacy_id = $1", [id]));
    assert.equal(Number((await pool.query("SELECT count(*)::int AS n FROM master_audit WHERE pharmacy_id = $1", [id])).rows[0].n), auditCount);

    await pool.query(`CREATE OR REPLACE FUNCTION master_audit_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.reason = '__fail__' THEN RAISE EXCEPTION 'audit down'; END IF; RETURN NEW; END $$`);
    await pool.query("DROP TRIGGER IF EXISTS master_audit_test_fail ON master_audit");
    await pool.query("CREATE TRIGGER master_audit_test_fail BEFORE INSERT ON master_audit FOR EACH ROW EXECUTE FUNCTION master_audit_test_fail()");
    const seatsBefore = (await loadState(id)).extraSeats;
    const failedAudit = await call("PATCH", `/master/pharmacies/${id}/seats`, masterCookie, { extraSeats: 3, reason: "__fail__" });
    assert.notEqual(failedAudit.status, 200);
    assert.equal((await loadState(id)).extraSeats, seatsBefore);
    await pool.query("DROP TRIGGER IF EXISTS master_audit_test_fail ON master_audit");

    const [billed, planned] = await Promise.all([
      call("POST", "/pos/checkout", pharmacyCookie, { lines: [{ productId: "p1", qty: 1 }], payMode: "cash", customer: { name: "Bina" } }, { "idempotency-key": "live-bill-" + stamp }),
      call("PATCH", `/master/pharmacies/${id}/plan`, masterCookie, { plan: "Growth", cycle: "annual", renewsOn: utcShift(12), reason: "while billing" }),
    ]);
    assert.equal(billed.status, 200, await billed.text());
    assert.equal(planned.status, 200, await planned.text());
    const duringSale = await loadState(id);
    assert.equal(duringSale.sales.length, 2);
    assert.equal(duringSale.subscription.plan, "Growth");
    assert.equal(duringSale.subscription.cycle, "annual");

    const [profileWrite, seatWrite] = await Promise.all([
      call("PATCH", "/pharmacy/profile", pharmacyCookie, { city: "Hubballi" }),
      call("PATCH", `/master/pharmacies/${id}/seats`, masterCookie, { extraSeats: 1, reason: "while settings save" }),
    ]);
    assert.equal(profileWrite.status, 200);
    assert.equal(seatWrite.status, 200);
    const both = await loadState(id);
    assert.equal(both.profile.city, "Hubballi");
    assert.equal(both.extraSeats, 1);

    const [planWrite, seatAgain] = await Promise.all([
      call("PATCH", `/master/pharmacies/${id}/plan`, masterCookie, { plan: "Starter", cycle: "monthly", renewsOn: utcShift(9), reason: "two masters" }),
      call("PATCH", `/master/pharmacies/${id}/business-type`, masterCookie, { businessType: "pharmacy", reason: "two masters type" }),
    ]);
    assert.equal(planWrite.status, 200);
    assert.equal(seatAgain.status, 200);
    const raced = await loadState(id);
    assert.equal(raced.subscription.plan, "Starter");
    assert.equal(raced.subscription.cycle, "monthly");
    assert.equal(raced.businessType, "pharmacy");
    assert.equal(raced.extraSeats, 1);

    assert.equal((await call("PATCH", `/master/pharmacies/${id}/plan`, masterCookie, { plan: "Starter", cycle: "monthly", renewsOn: utcShift(-2), reason: "lapsed billing" })).status, 200);
    assert.equal((await call("GET", "/offers", pharmacyCookie)).status, 403);
    assert.equal((await call("GET", "/inventory", pharmacyCookie)).status, 200);
    assert.equal((await call("POST", "/subscription/requests", pharmacyCookie, { plan: "Growth", cycle: "monthly", kind: "renewal" })).status, 200);
    assert.equal((await call("POST", "/pos/checkout", pharmacyCookie, { lines: [{ productId: "p1", qty: 1 }], payMode: "cash", customer: { name: "Chaya" } }, { "idempotency-key": "expired-bill-" + stamp })).status, 200);
    const booked = await call("POST", "/consultations", undefined, { name: "Asha Rao", phone: bookDigits, area: "HSR", note: "evening" }, { origin: "http://localhost:3200" });
    assert.equal(booked.status, 200);
    assert.equal(booked.headers.get("access-control-allow-origin"), "http://localhost:3200");
    assert.equal((await call("POST", "/consultations", undefined, { name: "Asha", phone: "111" })).status, 400);
    assert.equal((await call("POST", "/consultations", undefined, { name: "Bot Person", phone: bookDigits, companyWebsite: "http://spam" })).status, 200);
    const opt = await call("OPTIONS", "/consultations", undefined, undefined, { origin: "https://medmatepharmacy.com" });
    assert.equal(opt.status, 204);
    assert.equal(opt.headers.get("access-control-allow-origin"), "https://medmatepharmacy.com");
    const consults = await call("GET", "/master/consultations", masterCookie);
    assert.equal(consults.status, 200);
    const consultBody = await consults.json() as { id: number; name: string; phone: string }[];
    const asha = consultBody.find((row) => row.name === "Asha Rao");
    assert.ok(asha);
    assert.equal(asha.phone, e164(bookDigits));
    assert.equal(consultBody.some((row) => row.name === "Bot Person"), false);
    assert.equal((await call("GET", "/master/consultations")).status, 401);
    assert.equal((await call("PATCH", `/master/consultations/${asha.id}`, masterCookie, { status: "handled" })).status, 200);

    const opened = await call("POST", `/master/pharmacies/${id}/impersonate`, masterCookie, {});
    assert.equal(opened.status, 200);
    const supportCookie = cookieOf(opened, "namma_session");
    const support = await (await call("GET", "/session", supportCookie)).json() as { impersonator?: string; user?: { role: string } };
    assert.equal(support.impersonator, owner);
    assert.equal(support.user?.role, "Owner");
    assert.equal((await call("POST", `/master/pharmacies/${id}/impersonate`, pharmacyCookie, {})).status, 403);
    assert.equal((await call("POST", "/auth/sign-out", supportCookie)).status, 200);
    assert.equal((await call("GET", "/session", supportCookie)).status, 401);
    assert.equal((await call("GET", "/master/session", masterCookie)).status, 200);
    const trail = await pool.query("SELECT action FROM master_audit WHERE pharmacy_id = $1 AND action IN ('impersonate', 'impersonate-end')", [id]);
    assert.deepEqual(trail.rows.map((row) => row.action).sort(), ["impersonate", "impersonate-end"]);

    await pool.query("DELETE FROM master_phones WHERE phone = $1", [owner]);
    assert.equal((await call("GET", "/master/pharmacies", masterCookie)).status, 403);
    assert.equal((await call("GET", "/session", pharmacyCookie)).status, 200);
  } finally {
    await pool.query("DROP TRIGGER IF EXISTS master_audit_test_fail ON master_audit").catch(() => undefined);
    if (ids.length) {
      await pool.query("ALTER TABLE master_audit DISABLE TRIGGER master_audit_freeze");
      await pool.query("DELETE FROM master_audit WHERE pharmacy_id = ANY($1::uuid[])", [ids]);
      await pool.query("ALTER TABLE master_audit ENABLE TRIGGER master_audit_freeze");
      await pool.query("DELETE FROM pharmacies WHERE id = ANY($1::uuid[])", [ids]);
    }
    await pool.query("DELETE FROM master_sessions WHERE phone = ANY($1::text[])", [[owner, stranger]]);
    await pool.query("DELETE FROM master_phones WHERE phone = ANY($1::text[])", [[owner, stranger]]);
    await pool.query("DELETE FROM consultations WHERE phone = $1", [e164(bookDigits)]);
  }
});
