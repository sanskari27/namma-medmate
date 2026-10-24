import {
  Sale, PharmacyProfile, DateRange, Bucket, GstSlabRow, PayoutLine, PayoutSummary,
  PayMode, saleTotals, salePayable, channelLabel, PAY_LABEL, STATUS_LABEL,
  PLATFORM_COMMISSION, PLATFORM_TCS, GST_RATE,
} from "../data";
import { ReportResult, RCol, RangeLite } from "./reportCatalog";
import { buildReportPdf } from "./pdf";

// ── small helpers ───────────────────────────────────────────────
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
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const dt = (ts: number) => new Date(ts).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const dOnly = (ts: number) => new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
const toCsv = (rows: (string | number)[][]) =>
  rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

// ════════════════════════════════════════════════════════════════
// 1 · Sales register (every bill in the period)
// ════════════════════════════════════════════════════════════════
export function exportSalesRegisterCsv(sales: Sale[], r: RangeLite, now: number) {
  const head = ["Invoice", "Date & time", "Channel", "Customer", "Phone", "Items", "Qty", "Gross", "Discount", "Taxable", "CGST", "SGST", "Total GST", "Payable", "Payment", "Rx", "Status"];
  const rows = sales.map((s) => {
    const t = saleTotals(s);
    return [
      s.id, dt(s.createdAt), channelLabel(s.channel), s.customer.name, s.customer.phone ?? "",
      s.items.length, s.items.reduce((a, i) => a + i.qty, 0),
      Math.round(t.gross), Math.round(t.discount), Math.round(t.taxable),
      Math.round(t.cgst), Math.round(t.sgst), Math.round(t.totalTax), t.payable,
      PAY_LABEL[s.payMode], s.rx ? "Yes" : "No", STATUS_LABEL[s.status],
    ];
  });
  download(new Blob(["﻿" + toCsv([head, ...rows])], { type: "text/csv;charset=utf-8;" }), `sales-register-${slug(r.label)}-${stamp(now)}.csv`);
}
export function exportSalesRegisterPdf(sales: Sale[], profile: PharmacyProfile, r: RangeLite, now: number) {
  const header = pad("Invoice", 11) + pad("Date", 16) + pad("Chan", 8) + pad("Customer", 18) + padL("GST", 9) + padL("Payable", 11);
  const lines = sales.map((s) => {
    const t = saleTotals(s);
    return pad(s.id, 11) + pad(dt(s.createdAt), 16) + pad(channelLabel(s.channel), 8) + pad(s.customer.name, 18) + padL(rsP(t.totalTax), 9) + padL(rsP(t.payable), 11);
  });
  const total = sales.reduce((a, s) => a + salePayable(s), 0);
  const totals = pad(`TOTAL  ${sales.length} bills`, 53) + padL(rsP(total), 11);
  download(buildReportPdf({
    title: "Sales Register",
    subtitle: `${r.label} · ${dOnly(r.from)} to ${dOnly(r.to)} · ${sales.length} bills`,
    generatedAt: new Date(now).toLocaleString("en-IN"), profile,
    headerLine: header, rowLines: lines, totalsLine: totals,
  }), `sales-register-${slug(r.label)}-${stamp(now)}.pdf`);
}

// ════════════════════════════════════════════════════════════════
// 2 · GST report (slab-wise CGST/SGST)
// ════════════════════════════════════════════════════════════════
export function exportGstCsv(rows: GstSlabRow[], r: DateRange, now: number) {
  const head = ["GST slab", "Taxable value", "CGST", "SGST", "Total tax"];
  const body = rows.map((g) => [`${g.gst}%`, Math.round(g.taxable), Math.round(g.cgst), Math.round(g.sgst), Math.round(g.tax)]);
  const tot = ["TOTAL", Math.round(rows.reduce((a, g) => a + g.taxable, 0)), Math.round(rows.reduce((a, g) => a + g.cgst, 0)), Math.round(rows.reduce((a, g) => a + g.sgst, 0)), Math.round(rows.reduce((a, g) => a + g.tax, 0))];
  download(new Blob(["﻿" + toCsv([head, ...body, tot])], { type: "text/csv;charset=utf-8;" }), `gst-report-${slug(r.label)}-${stamp(now)}.csv`);
}
export function exportGstPdf(rows: GstSlabRow[], profile: PharmacyProfile, r: DateRange, now: number) {
  const header = pad("GST slab", 12) + padL("Taxable", 14) + padL("CGST", 12) + padL("SGST", 12) + padL("Total tax", 13);
  const lines = rows.map((g) => pad(g.gst + "%", 12) + padL(rsP(g.taxable), 14) + padL(rsP(g.cgst), 12) + padL(rsP(g.sgst), 12) + padL(rsP(g.tax), 13));
  const totals = pad("TOTAL", 12) + padL(rsP(rows.reduce((a, g) => a + g.taxable, 0)), 14)
    + padL(rsP(rows.reduce((a, g) => a + g.cgst, 0)), 12) + padL(rsP(rows.reduce((a, g) => a + g.sgst, 0)), 12)
    + padL(rsP(rows.reduce((a, g) => a + g.tax, 0)), 13);
  download(buildReportPdf({
    title: "GST Summary (CGST + SGST)",
    subtitle: `${r.label} · ${dOnly(r.from)} to ${dOnly(r.to)} · output tax`,
    generatedAt: new Date(now).toLocaleString("en-IN"), profile,
    headerLine: header, rowLines: lines, totalsLine: totals,
  }), `gst-report-${slug(r.label)}-${stamp(now)}.pdf`);
}

// ════════════════════════════════════════════════════════════════
// 3 · Namma MedMate payout / settlement statement (online sales)
// ════════════════════════════════════════════════════════════════
export function exportPayoutCsv(lines: PayoutLine[], r: DateRange, now: number) {
  const head = ["Invoice", "Date", "Customer", "Order value", `Commission ${Math.round(PLATFORM_COMMISSION * 100)}%`, "GST on commission", `TCS ${PLATFORM_TCS * 100}%`, "Net receivable", "Status", "Settles on"];
  const rows = lines.map((l) => [
    l.sale.id, dOnly(l.sale.createdAt), l.sale.customer.name,
    Math.round(l.gross), Math.round(l.commission), Math.round(l.commissionGst), Math.round(l.tcs), Math.round(l.net),
    l.settled ? "Settled" : "Pending", dOnly(l.settleOn),
  ]);
  const tot = ["TOTAL", "", "", Math.round(lines.reduce((a, l) => a + l.gross, 0)), Math.round(lines.reduce((a, l) => a + l.commission, 0)), Math.round(lines.reduce((a, l) => a + l.commissionGst, 0)), Math.round(lines.reduce((a, l) => a + l.tcs, 0)), Math.round(lines.reduce((a, l) => a + l.net, 0)), "", ""];
  download(new Blob(["﻿" + toCsv([head, ...rows, tot])], { type: "text/csv;charset=utf-8;" }), `namma-payout-${slug(r.label)}-${stamp(now)}.csv`);
}
export function exportPayoutPdf(lines: PayoutLine[], sum: PayoutSummary, profile: PharmacyProfile, r: DateRange, now: number) {
  const header = pad("Invoice", 11) + pad("Date", 11) + pad("Customer", 16) + padL("Order", 10) + padL("Fee+GST", 10) + padL("Net", 10) + pad("  Status", 9);
  const lineRows = lines.map((l) => pad(l.sale.id, 11) + pad(dOnly(l.sale.createdAt), 11) + pad(l.sale.customer.name, 16)
    + padL(rsP(l.gross), 10) + padL(rsP(l.commission + l.commissionGst), 10) + padL(rsP(l.net), 10) + pad("  " + (l.settled ? "Settled" : "Pending"), 9));
  const totals = pad("NET RECEIVABLE", 48) + padL(rsP(sum.net), 10) + "  (settled " + rsP(sum.settled) + " / pending " + rsP(sum.pending) + ")";
  download(buildReportPdf({
    title: "Namma MedMate Settlement Statement",
    subtitle: `${r.label} · online orders · commission ${Math.round(PLATFORM_COMMISSION * 100)}% + ${GST_RATE * 100}% GST + ${PLATFORM_TCS * 100}% TCS`,
    generatedAt: new Date(now).toLocaleString("en-IN"), profile,
    headerLine: header, rowLines: lineRows, totalsLine: totals,
  }), `namma-payout-${slug(r.label)}-${stamp(now)}.pdf`);
}

// ════════════════════════════════════════════════════════════════
// 4 · Sales trend (bucketed online/offline) — for the chart
// ════════════════════════════════════════════════════════════════
export function exportTrendCsv(buckets: Bucket[], grainLabel: string, r: DateRange, now: number) {
  const head = [grainLabel, "Online", "Counter", "Total", "Bills"];
  const rows = buckets.map((b) => [b.label, Math.round(b.online), Math.round(b.offline), Math.round(b.total), b.bills]);
  const tot = ["TOTAL", Math.round(buckets.reduce((a, b) => a + b.online, 0)), Math.round(buckets.reduce((a, b) => a + b.offline, 0)), Math.round(buckets.reduce((a, b) => a + b.total, 0)), buckets.reduce((a, b) => a + b.bills, 0)];
  download(new Blob(["﻿" + toCsv([head, ...rows, tot])], { type: "text/csv;charset=utf-8;" }), `sales-trend-${slug(r.label)}-${stamp(now)}.csv`);
}

// ════════════════════════════════════════════════════════════════
// 5 · Products report (units / revenue / COGS / profit / margin)
// ════════════════════════════════════════════════════════════════
export type ProductReportRow = { name: string; category: string; units: number; revenue: number; cogs: number; profit: number; margin: number; stock: number };
export function exportProductsCsv(rows: ProductReportRow[], r: DateRange, now: number) {
  const head = ["Product", "Category", "Units sold", "Revenue (ex-GST)", "COGS", "Gross profit", "Margin %", "In stock"];
  const body = rows.map((p) => [p.name, p.category, p.units, Math.round(p.revenue), Math.round(p.cogs), Math.round(p.profit), p.margin.toFixed(1), p.stock]);
  const tot = ["TOTAL", "", rows.reduce((a, p) => a + p.units, 0), Math.round(rows.reduce((a, p) => a + p.revenue, 0)), Math.round(rows.reduce((a, p) => a + p.cogs, 0)), Math.round(rows.reduce((a, p) => a + p.profit, 0)), "", ""];
  download(new Blob(["﻿" + toCsv([head, ...body, tot])], { type: "text/csv;charset=utf-8;" }), `products-report-${slug(r.label)}-${stamp(now)}.csv`);
}
export function exportProductsPdf(rows: ProductReportRow[], profile: PharmacyProfile, r: DateRange, now: number) {
  const header = pad("Product", 22) + pad("Category", 12) + padL("Units", 7) + padL("Revenue", 11) + padL("Profit", 11) + padL("Margin", 8);
  const lines = rows.map((p) => pad(p.name, 22) + pad(p.category, 12) + padL(p.units, 7) + padL(rsP(p.revenue), 11) + padL(rsP(p.profit), 11) + padL(p.margin.toFixed(0) + "%", 8));
  const tUnits = rows.reduce((a, p) => a + p.units, 0), tRev = rows.reduce((a, p) => a + p.revenue, 0), tProfit = rows.reduce((a, p) => a + p.profit, 0);
  const totals = pad(`TOTAL  ${rows.length} products`, 34) + padL(tUnits, 7) + padL(rsP(tRev), 11) + padL(rsP(tProfit), 11);
  download(buildReportPdf({
    title: "Product Sales Report",
    subtitle: `${r.label} · ${dOnly(r.from)} to ${dOnly(r.to)} · revenue ex-GST`,
    generatedAt: new Date(now).toLocaleString("en-IN"), profile,
    headerLine: header, rowLines: lines, totalsLine: totals,
  }), `products-report-${slug(r.label)}-${stamp(now)}.pdf`);
}

// ════════════════════════════════════════════════════════════════
// 6 · Accounts — Profit & Loss + GST liability statement
// ════════════════════════════════════════════════════════════════
export type AccountsReport = {
  revenue: number; discounts: number; outputGst: number; taxable: number;
  cogs: number; grossProfit: number; margin: number;
  inputGst: number; netGst: number; purchaseTotal: number; purchaseCount: number;
  pay: { mode: PayMode; amount: number }[]; receivables: number;
  slabs: GstSlabRow[]; days: { day: string; sales: number; purch: number }[];
};
export function exportAccountsPdf(a: AccountsReport, profile: PharmacyProfile, r: DateRange, now: number) {
  const W = 40;
  const row = (lb: string, vl: string) => pad(lb, W) + padL(vl, 16);
  const rule = "-".repeat(W + 16);
  const lines: string[] = [];
  lines.push("PROFIT & LOSS");
  lines.push(row("Gross sales (incl. GST)", rsP(a.revenue + a.discounts)));
  lines.push(row("  less: discounts given", "- " + rsP(a.discounts)));
  lines.push(row("  less: output GST", "- " + rsP(a.outputGst)));
  lines.push(row("Net sales (taxable)", rsP(a.taxable)));
  lines.push(row("  less: COGS (at cost)", "- " + rsP(a.cogs)));
  lines.push(row(`Gross profit (${a.margin.toFixed(1)}% margin)`, rsP(a.grossProfit)));
  lines.push(rule);
  lines.push("GST LIABILITY");
  for (const g of a.slabs) lines.push(row(`  Output GST ${g.gst}% (CGST+SGST)`, rsP(g.tax)));
  lines.push(row("Total output GST", rsP(a.outputGst)));
  lines.push(row("  less: input GST credit", "- " + rsP(a.inputGst)));
  lines.push(row(a.netGst >= 0 ? "Net GST payable" : "Net GST credit (c/f)", rsP(Math.abs(a.netGst))));
  lines.push(rule);
  lines.push("COLLECTIONS");
  for (const p of a.pay) lines.push(row("  " + PAY_LABEL[p.mode], rsP(p.amount)));
  lines.push(row("COD receivable (in transit)", rsP(a.receivables)));
  lines.push(rule);
  lines.push("PURCHASES (INWARD)");
  lines.push(row("Goods purchased (incl. GST)", rsP(a.purchaseTotal)));
  lines.push(row("Input GST credit", rsP(a.inputGst)));
  lines.push(row("GRNs entered", String(a.purchaseCount)));
  download(buildReportPdf({
    title: "Accounts — P&L and GST",
    subtitle: `${r.label} · ${dOnly(r.from)} to ${dOnly(r.to)} · ${profile.gstin}`,
    generatedAt: new Date(now).toLocaleString("en-IN"), profile,
    headerLine: pad("Statement", W) + padL("Amount", 16), rowLines: lines,
    totalsLine: row(a.netGst >= 0 ? "NET GST PAYABLE" : "NET GST CREDIT", rsP(Math.abs(a.netGst))),
  }), `accounts-pl-gst-${slug(r.label)}-${stamp(now)}.pdf`);
}
export function exportDaybookCsv(days: { day: string; sales: number; purch: number }[], r: DateRange, now: number) {
  const head = ["Day", "Net sales", "Purchases", "Net cash flow"];
  const body = days.map((d) => [d.day, Math.round(d.sales), Math.round(d.purch), Math.round(d.sales - d.purch)]);
  const tot = ["TOTAL", Math.round(days.reduce((a, d) => a + d.sales, 0)), Math.round(days.reduce((a, d) => a + d.purch, 0)), Math.round(days.reduce((a, d) => a + d.sales - d.purch, 0))];
  download(new Blob(["﻿" + toCsv([head, ...body, tot])], { type: "text/csv;charset=utf-8;" }), `day-book-${slug(r.label)}-${stamp(now)}.csv`);
}

// ════════════════════════════════════════════════════════════════
// 7 · Generic catalog report (any report from reportCatalog)
// ════════════════════════════════════════════════════════════════
const cell = (c: string | number | undefined, col: RCol) =>
  typeof c === "number" && col.money ? "Rs " + Math.round(c).toLocaleString("en-IN") : String(c ?? "");
export function exportCatalogCsv(title: string, res: ReportResult, r: RangeLite, now: number) {
  const head = res.columns.map((c) => c.label);
  const body = res.rows.map((row) => row.map((c) => (typeof c === "number" ? Math.round(c) : c)));
  const all = res.totals ? [head, ...body, res.totals.map((c) => (typeof c === "number" ? Math.round(c) : c))] : [head, ...body];
  download(new Blob(["﻿" + toCsv(all as (string | number)[][])], { type: "text/csv;charset=utf-8;" }), `${slug(title)}-${slug(r.label)}-${stamp(now)}.csv`);
}
export function exportCatalogPdf(title: string, res: ReportResult, profile: PharmacyProfile, r: RangeLite, now: number) {
  // size each column to its content, then clamp very wide tables to fit the page
  const cols = res.columns;
  const raw = cols.map((c, i) => {
    const w = Math.max(c.label.length, ...res.rows.map((row) => cell(row[i], c).length), res.totals ? cell(res.totals[i], c).length : 0);
    return Math.min(Math.max(w + 1, 5), 26);
  });
  const fit = (vals: (string | number | undefined)[]) => cols.map((c, i) => {
    const s = typeof vals[i] === "number" || c.money || c.num ? cell(vals[i], c) : cell(vals[i], c);
    return (c.money || c.num) ? (s.length > raw[i] ? s.slice(0, raw[i]) : s).padStart(raw[i]) + " " : (s.length > raw[i] ? s.slice(0, raw[i]) : s).padEnd(raw[i]) + " ";
  }).join("");
  const headerLine = fit(cols.map((c) => c.label));
  const rowLines = res.rows.map((row) => fit(row));
  const totalsLine = res.totals ? fit(res.totals) : undefined;
  download(buildReportPdf({
    title,
    subtitle: `${r.label} · ${dOnly(r.from)} to ${dOnly(r.to)}${res.note ? " · " + res.note : ""}`,
    generatedAt: new Date(now).toLocaleString("en-IN"), profile,
    headerLine, rowLines, totalsLine,
  }), `${slug(title)}-${slug(r.label)}-${stamp(now)}.pdf`);
}
