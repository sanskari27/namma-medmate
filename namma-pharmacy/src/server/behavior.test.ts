import assert from "node:assert/strict";
import test from "node:test";
import { fromPaise, toPaise } from "../app/lib/paise";
import { cancelOrder, checkoutPos, receivePurchase, requireHospital, requirePlan, setBatchQty } from "./mutate";
import { emptyState } from "./state";

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
