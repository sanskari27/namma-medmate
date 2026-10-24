import {
  InvProduct, PharmacyProfile, stockOf, mrpOf, earliestBatch, looseUnitsOf,
  stockValue, isLowStock, isExpiringSoon, isExpired, monthsToExpiry, catLabel, packNoun, plural,
  normalizeRack,
} from "../data";
import { buildReportPdf } from "./pdf";

const download = (blob: Blob, name: string) => {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 6000);
};
const pad = (s: unknown, n: number) => { const x = String(s); return (x.length > n ? x.slice(0, n) : x).padEnd(n); };
const padL = (s: unknown, n: number) => { const x = String(s); return (x.length > n ? x.slice(0, n) : x).padStart(n); };
const rsP = (n: number) => "Rs " + Math.round(n).toLocaleString("en-IN");
const stamp = (now: number) => new Date(now).toISOString().slice(0, 10);
const statusOf = (p: InvProduct, now: number) => {
  const tags: string[] = [];
  if (stockOf(p) <= 0 && looseUnitsOf(p) <= 0) tags.push("Out of stock");
  else if (isLowStock(p)) tags.push("Low");
  const b = earliestBatch(p);
  if (b && isExpired(b.expiry, now)) tags.push("Expired");
  else if (isExpiringSoon(p, now)) tags.push("Expiring");
  return tags.join(", ") || "OK";
};

// ── Excel (CSV with UTF-8 BOM) ───────────────────────────────────
export function exportStockCsv(rows: InvProduct[], filterLabel: string, now: number) {
  const head = ["Product", "Composition", "Manufacturer", "Category", "Schedule", "Rack", "Batches", "Earliest expiry", "In stock", "Loose units", "MRP", "Cost/PTR", "GST %", "Stock value (Rs)", "Online", "Status"];
  const lines = rows.map((p) => {
    const b = earliestBatch(p);
    return [
      p.name, p.composition, p.manufacturer, catLabel(p.category), p.schedule, p.rack,
      p.batches.length, b?.expiry ?? "—", `${stockOf(p)} ${plural(packNoun(p), stockOf(p))}`, looseUnitsOf(p),
      mrpOf(p), p.batches[0]?.ptr ?? 0, p.gst, Math.round(stockValue(p)), p.online ? "Yes" : "No", statusOf(p, now),
    ];
  });
  const csv = [head, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), `stock-${filterLabel}-${stamp(now)}.csv`);
}

// ── Rack & storage AUDIT Excel (CSV, one row per batch) ──────────
// Detailed lot-level report grouped by rack: stock, batch, expiry, MRP, purchase
// price (PTR), and both MRP value & purchase value per lot — for physical audits.
export function exportRackAuditCsv(rows: InvProduct[], now: number) {
  const head = [
    "Rack", "2nd slot", "Medicine", "Composition", "Manufacturer", "Pack", "Category", "Schedule",
    "HSN", "GST %", "Batch no.", "Expiry", "Months to expiry", "Status",
    "Qty (strips/units)", "Loose units", "MRP (Rs)", "Purchase price / PTR (Rs)",
    "MRP value (Rs)", "Purchase value (Rs)",
  ];
  // sort by rack (natural), then medicine, then expiry
  const sorted = [...rows].sort((a, b) =>
    normalizeRack(a.rack).localeCompare(normalizeRack(b.rack), undefined, { numeric: true, sensitivity: "base" })
    || a.name.localeCompare(b.name));

  const lines: (string | number)[][] = [];
  let totQty = 0, totMrpVal = 0, totBuyVal = 0;
  for (const p of sorted) {
    const rack = normalizeRack(p.rack) || "UNASSIGNED";
    const alt = normalizeRack(p.rackAlt || "");
    const batches = p.batches.length ? p.batches : [{ batchNo: "—", expiry: "—", qty: 0, mrp: mrpOf(p), ptr: p.batches[0]?.ptr ?? 0 }];
    batches.forEach((b, i) => {
      const mo = b.expiry !== "—" ? monthsToExpiry(b.expiry, now) : 99;
      const status = b.expiry !== "—" && isExpired(b.expiry, now) ? "Expired" : mo <= 4 ? `Expiring (${mo}mo)` : "OK";
      const mrpVal = b.qty * b.mrp;
      const buyVal = b.qty * b.ptr;
      totQty += b.qty; totMrpVal += mrpVal; totBuyVal += buyVal;
      lines.push([
        rack, alt || "", p.name, p.composition, p.manufacturer, p.pack, catLabel(p.category), p.schedule,
        p.hsn, p.gst, b.batchNo || "—", b.expiry, b.expiry !== "—" ? mo : "", status,
        `${b.qty} ${plural(packNoun(p), b.qty)}`, i === 0 ? looseUnitsOf(p) : 0,
        Math.round(b.mrp), Math.round(b.ptr), Math.round(mrpVal), Math.round(buyVal),
      ]);
    });
  }
  const totalsRow = ["TOTAL", "", `${rows.length} medicines`, "", "", "", "", "", "", "", "", "", "", "", `${totQty} units`, "", "", "", Math.round(totMrpVal), Math.round(totBuyVal)];

  const csv = [head, ...lines, totalsRow]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), `rack-storage-audit-${stamp(now)}.csv`);
}

// ── PDF (paginated, monospace) ───────────────────────────────────
export function exportStockPdf(rows: InvProduct[], profile: PharmacyProfile, filterLabel: string, now: number) {
  const headerLine = pad("Product", 24) + pad("Category", 13) + pad("Sch", 4) + padL("Stock", 9) + padL("MRP", 8) + padL("Expiry", 9) + padL("Value", 12);
  const rowLines = rows.map((p) => {
    const b = earliestBatch(p);
    const mo = b ? monthsToExpiry(b.expiry, now) : 99;
    const exp = b ? (isExpired(b.expiry, now) ? "EXPD" : mo <= 4 ? `${mo}mo` : b.expiry.slice(2)) : "-";
    return pad(p.name, 24) + pad(catLabel(p.category), 13) + pad(p.schedule, 4)
      + padL(`${stockOf(p)}${looseUnitsOf(p) ? "+" + looseUnitsOf(p) : ""}`, 9)
      + padL(rsP(mrpOf(p)), 8) + padL(exp, 9) + padL(rsP(stockValue(p)), 12);
  });
  const totVal = rows.reduce((a, p) => a + stockValue(p), 0);
  const totalsLine = pad(`TOTAL  ${rows.length} SKUs`, 53) + padL(rsP(totVal), 12);
  const blob = buildReportPdf({
    title: "Stock Report",
    subtitle: `Filter: ${filterLabel} · ${rows.length} products · value ${rsP(totVal)}`,
    generatedAt: new Date(now).toLocaleString("en-IN"),
    profile, headerLine, rowLines, totalsLine,
  });
  download(blob, `stock-${filterLabel}-${stamp(now)}.pdf`);
}
