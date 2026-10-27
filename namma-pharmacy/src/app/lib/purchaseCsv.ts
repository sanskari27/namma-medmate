// ════════════════════════════════════════════════════════════════
// Bulk purchase entry via CSV — parse a distributor bill / stock list
// into purchase line items (matching existing products by name, or
// creating new ones), so a whole GRN can be entered at once.
// ════════════════════════════════════════════════════════════════
import { InvProduct, PurchaseItem, DosageForm, Schedule, CATEGORIES, CategoryKey } from "../data";

const download = (blob: Blob, name: string) => {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = u; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 6000);
};

// canonical columns + the header aliases we accept (case/space/symbol-insensitive)
const COLS = {
  name: ["product", "productname", "name", "medicine", "item", "description"],
  composition: ["composition", "salt", "molecule", "generic"],
  manufacturer: ["manufacturer", "mfr", "company", "brand"],
  category: ["category", "cat"],
  schedule: ["schedule", "sch", "scheduletype"],
  form: ["form", "dosageform", "type"],
  pack: ["pack", "packing", "packsize"],
  hsn: ["hsn", "hsncode"],
  gst: ["gst", "gstpercent", "gstrate", "tax"],
  batch: ["batch", "batchno", "batchnumber", "lot"],
  expiry: ["expiry", "exp", "expirydate", "expdate"],
  qty: ["qty", "quantity", "billedqty", "units"],
  free: ["free", "freeqty", "freegoods", "scheme", "bonus"],
  ptr: ["ptr", "rate", "purchaserate", "cost", "price", "buyprice"],
  mrp: ["mrp", "maxretailprice"],
  reorder: ["reorder", "reorderlevel", "minstock"],
  rack: ["rack", "location", "bin"],
} as const;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const num = (s: string | undefined) => { const n = Number(String(s ?? "").replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; };
const catKey = (s: string | undefined): CategoryKey | undefined => {
  if (!s) return undefined; const v = norm(s);
  return CATEGORIES.find((c) => norm(c.key) === v || norm(c.label) === v)?.key;
};
const sched = (s: string | undefined): Schedule | undefined => {
  const v = norm(s ?? ""); if (!v) return undefined;
  if (v.includes("otc")) return "OTC"; if (v === "h1" || v.includes("h1")) return "H1"; if (v === "x") return "X"; if (v.startsWith("h")) return "H"; return undefined;
};
const form = (s: string | undefined): DosageForm | undefined => {
  const map: Record<string, DosageForm> = { tablet: "Tablet", tab: "Tablet", capsule: "Capsule", cap: "Capsule", syrup: "Syrup", drops: "Drops", injection: "Injection", inj: "Injection", cream: "Cream", gel: "Cream", ointment: "Cream", device: "Device", other: "Other" };
  return s ? map[norm(s)] : undefined;
};

// minimal RFC-4180 CSV parser (handles quotes, commas, newlines)
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

export type CsvParseResult = { items: PurchaseItem[]; matched: number; created: number; skipped: number; errors: string[] };

export function parsePurchaseCsv(text: string, inventory: InvProduct[]): CsvParseResult {
  const rows = parseCsvText(text);
  if (rows.length < 2) return { items: [], matched: 0, created: 0, skipped: 0, errors: ["CSV is empty or has no data rows."] };
  const header = rows[0].map(norm);
  const idx = (k: keyof typeof COLS) => header.findIndex((h) => (COLS[k] as readonly string[]).some((a) => a === h));
  const ix = Object.fromEntries(Object.keys(COLS).map((k) => [k, idx(k as keyof typeof COLS)])) as Record<keyof typeof COLS, number>;
  if (ix.name < 0) return { items: [], matched: 0, created: 0, skipped: 0, errors: ["No 'Product' column found. Download the template for the expected format."] };

  const items: PurchaseItem[] = []; const errors: string[] = []; let matched = 0, created = 0, skipped = 0;
  const get = (r: string[], k: keyof typeof COLS) => (ix[k] >= 0 ? (r[ix[k]] ?? "").trim() : "");

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = get(r, "name");
    if (!name) { skipped++; continue; }
    const prod = inventory.find((p) => norm(p.name) === norm(name));
    const qty = num(get(r, "qty")), free = num(get(r, "free"));
    if (qty <= 0 && free <= 0) errors.push(`Row ${i + 1} (${name}): quantity is 0.`);
    if (prod) matched++; else created++;
    items.push({
      productId: prod?.id ?? null,
      name: prod?.name ?? name,
      batchNo: get(r, "batch"),
      expiry: get(r, "expiry") || "2027-06",
      qty, freeQty: free,
      ptr: num(get(r, "ptr")) || prod?.batches[0]?.ptr || 0,
      mrp: num(get(r, "mrp")) || prod?.batches[0]?.mrp || 0,
      gst: num(get(r, "gst")) || prod?.gst || 12,
      hsn: get(r, "hsn") || prod?.hsn || "3004",
      composition: get(r, "composition") || undefined,
      manufacturer: get(r, "manufacturer") || undefined,
      form: form(get(r, "form")) || "Tablet",
      pack: get(r, "pack") || undefined,
      category: catKey(get(r, "category")) || "fever",
      schedule: sched(get(r, "schedule")) || "OTC",
      reorderLevel: num(get(r, "reorder")) || 20,
      emoji: "💊",
    });
  }
  return { items, matched, created, skipped, errors };
}

export function downloadPurchaseTemplate() {
  const head = ["Product", "Composition", "Manufacturer", "Category", "Schedule", "Form", "Pack", "HSN", "GST%", "Batch", "Expiry", "Qty", "Free", "PTR", "MRP", "ReorderLevel"];
  const sample = [
    ["Dolo 650", "Paracetamol 650mg", "Micro Labs", "fever", "OTC", "Tablet", "Strip of 15", "3004", "12", "DL26A55", "2027-06", "100", "10", "24.5", "34", "40"],
    ["Azithromycin 500", "Azithromycin 500mg", "Cipla", "fever", "H", "Tablet", "Strip of 5", "3004", "12", "AZ5521", "2027-09", "50", "5", "62", "98", "20"],
  ];
  const csv = [head, ...sample].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), "purchase-entry-template.csv");
}

const sheet = (name: string, rows: string[][]) => {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), name);
};

export function downloadMedicineTemplate() {
  sheet("medicines-template.csv", [
    ["Product", "Composition", "Manufacturer", "Category", "Schedule", "Form", "Pack", "HSN", "GST%", "Rack", "ReorderLevel", "Batch", "Expiry", "Qty", "PTR", "MRP"],
    ["Dolo 650", "Paracetamol 650mg", "Micro Labs", "fever", "OTC", "Tablet", "Strip of 15", "3004", "12", "A1", "40", "DL26A55", "2027-06", "100", "24.5", "34"],
    ["Azithromycin 500", "Azithromycin 500mg", "Cipla", "fever", "H", "Tablet", "Strip of 5", "3004", "12", "A2", "20", "AZ5521", "2027-09", "50", "62", "98"],
  ]);
}

export function parseMedicineCsv(text: string): { products: InvProduct[]; errors: string[] } {
  const rows = parseCsvText(text);
  if (rows.length < 2) return { products: [], errors: ["Sheet is empty or has no data rows."] };
  const header = rows[0].map(norm);
  const ix = Object.fromEntries(Object.keys(COLS).map((k) => [k, header.findIndex((h) => (COLS[k as keyof typeof COLS] as readonly string[]).some((a) => a === h))])) as Record<keyof typeof COLS, number>;
  if (ix.name < 0) return { products: [], errors: ["No Product column found. Download the sample sheet."] };
  const get = (r: string[], k: keyof typeof COLS) => (ix[k] >= 0 ? (r[ix[k]] ?? "").trim() : "");
  const products: InvProduct[] = [];
  const errors: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const name = get(rows[i], "name");
    if (!name) { errors.push(`Row ${i + 1} has no product name.`); continue; }
    const qty = num(get(rows[i], "qty"));
    const batch = get(rows[i], "batch");
    const gstRaw = get(rows[i], "gst");
    products.push({
      id: "", name, composition: get(rows[i], "composition"), manufacturer: get(rows[i], "manufacturer"),
      form: form(get(rows[i], "form")) || "Tablet", pack: get(rows[i], "pack"), category: catKey(get(rows[i], "category")) || "fever",
      hsn: get(rows[i], "hsn") || "3004", gst: gstRaw === "" ? 12 : num(gstRaw), schedule: sched(get(rows[i], "schedule")) || "OTC",
      rack: get(rows[i], "rack") || "—", reorderLevel: num(get(rows[i], "reorder")) || 20, online: false, emoji: "💊",
      batches: batch || qty > 0 ? [{ batchNo: batch || "OPENING", expiry: get(rows[i], "expiry") || "2027-12", qty, ptr: num(get(rows[i], "ptr")), mrp: num(get(rows[i], "mrp")) }] : [],
    });
  }
  return { products, errors };
}

export function downloadPoTemplate() {
  sheet("purchase-orders-template.csv", [
    ["Distributor", "Product", "Qty", "Note"],
    ["Bengaluru Pharma Distributors", "Dolo 650", "20", "June refill"],
    ["Bengaluru Pharma Distributors", "Crocin Advance", "10", ""],
  ]);
}

export function parsePoCsv(text: string): { rows: { supplierName: string; productName: string; qty: number; note?: string }[]; errors: string[] } {
  const table = parseCsvText(text);
  if (table.length < 2) return { rows: [], errors: ["Sheet is empty or has no data rows."] };
  const header = table[0].map(norm);
  const at = (aliases: string[]) => header.findIndex((h) => aliases.some((a) => a === h));
  const supplier = at(["distributor", "supplier", "suppliername", "vendor"]);
  const name = at(["product", "productname", "name", "medicine", "item"]);
  const qty = at(["qty", "quantity", "units"]);
  const note = at(["note", "notes", "remark"]);
  if (supplier < 0 || name < 0 || qty < 0) return { rows: [], errors: ["Need Distributor, Product, and Qty columns. Download the sample sheet."] };
  const rows: { supplierName: string; productName: string; qty: number; note?: string }[] = [];
  const errors: string[] = [];
  for (let i = 1; i < table.length; i++) {
    const supplierName = (table[i][supplier] ?? "").trim();
    const productName = (table[i][name] ?? "").trim();
    const count = num(table[i][qty]);
    if (!supplierName || !productName || count <= 0) { errors.push(`Row ${i + 1} needs a distributor, medicine, and quantity.`); continue; }
    rows.push({ supplierName, productName, qty: count, note: note >= 0 ? (table[i][note] ?? "").trim() : undefined });
  }
  return { rows, errors };
}
