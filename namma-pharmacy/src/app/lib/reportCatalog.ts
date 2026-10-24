// ════════════════════════════════════════════════════════════════
// Report catalog — a myBillBook-style hub of named reports, each one
// built purely from the data the app already holds (sales, purchases,
// inventory, prescriptions). Shared by the desktop dashboard and the
// phone partner app; both render the metadata grid + a generic table.
// ════════════════════════════════════════════════════════════════
import {
  Sale, Purchase, InvProduct, PharmacyProfile, Expense, validSales,
  saleTotals, purchaseTotals, payoutSummary, PAY_LABEL, PayMode, STATUS_LABEL,
  catLabel, stockOf, stockValue, looseUnitsOf, mrpOf, sellPrice,
  isLowStock, isExpired, monthsToExpiry, earliestBatch, fmtDateTime, OrderStatus,
  expenseTaxable, expenseTax,
} from "../data";

// reports only need the window bounds + a label (not the full DateRange.kind)
export type RangeLite = { from: number; to: number; label: string };
const inRange = (ts: number, r: RangeLite) => ts >= r.from && ts <= r.to;

export type ReportCat = "favourite" | "gst" | "transaction" | "item" | "party";
export type ReportMeta = { id: string; name: string; cat: ReportCat; fav?: boolean; analytics?: "overview" | "accounts"; desc: string };

// the columns/rows a report produces. `money` → render as ₹ and right-align.
export type RCol = { key: string; label: string; money?: boolean; num?: boolean };
export type ReportResult = { columns: RCol[]; rows: (string | number)[][]; totals?: (string | number)[]; note?: string };

export type ReportCtx = { sales: Sale[]; purchases: Purchase[]; inventory: InvProduct[]; expenses?: Expense[]; profile: PharmacyProfile; now: number; range: RangeLite };

// ── the catalog (order + grouping mirrors the reference screen) ──
export const REPORT_CATALOG: ReportMeta[] = [
  // favourites
  { id: "balance-sheet", name: "Balance Sheet", cat: "favourite", fav: true, desc: "Assets vs liabilities snapshot" },
  { id: "gstr1", name: "GSTR-1 (Sales)", cat: "favourite", fav: true, desc: "Outward supplies, slab-wise" },
  { id: "pnl", name: "Profit And Loss Report", cat: "favourite", fav: true, analytics: "accounts", desc: "Income, COGS & gross profit" },
  { id: "sales-summary", name: "Sales Summary", cat: "favourite", fav: true, analytics: "overview", desc: "Sales dashboard & trends" },
  // GST
  { id: "gstr2", name: "GSTR-2 (Purchase)", cat: "gst", desc: "Inward supplies, slab-wise" },
  { id: "gstr3b", name: "GSTR-3b", cat: "gst", desc: "Output vs input — net GST" },
  { id: "gst-purchase-hsn", name: "GST Purchase (With HSN)", cat: "gst", desc: "Purchases grouped by HSN" },
  { id: "gst-sales-hsn", name: "GST Sales (With HSN)", cat: "gst", desc: "Sales grouped by HSN" },
  { id: "hsn-sales-summary", name: "HSN Wise Sales Summary", cat: "gst", desc: "Qty & value by HSN code" },
  { id: "tds-payable", name: "TDS Payable", cat: "gst", desc: "Tax deducted, payable" },
  { id: "tds-receivable", name: "TDS Receivable", cat: "gst", desc: "Tax deducted by others" },
  { id: "tcs-payable", name: "TCS Payable", cat: "gst", desc: "Tax collected at source, payable" },
  { id: "tcs-receivable", name: "TCS Receivable", cat: "gst", desc: "TCS withheld by Namma MedMate (u/s 52)" },
  // transaction
  { id: "audit-trail", name: "Audit Trail", cat: "transaction", desc: "Every document, time-stamped" },
  { id: "bill-wise-profit", name: "Bill Wise Profit", cat: "transaction", desc: "Profit & margin per invoice" },
  { id: "cash-bank", name: "Cash and Bank Report (All Payments)", cat: "transaction", desc: "Collections by mode" },
  { id: "daybook", name: "Daybook", cat: "transaction", desc: "Net sales vs purchases per day" },
  { id: "expense-category", name: "Expense Category Report", cat: "transaction", desc: "Expenses grouped by head" },
  { id: "expense-transaction", name: "Expense Transaction Report", cat: "transaction", desc: "Every expense entry" },
  { id: "purchase-summary", name: "Purchase Summary", cat: "transaction", desc: "GRN-wise inward purchases" },
  // item
  { id: "item-by-party", name: "Item Report By Party", cat: "item", desc: "Who bought each item" },
  { id: "item-sales-purchase", name: "Item Sales and Purchase Summary", cat: "item", desc: "Sold vs purchased per item" },
  { id: "low-stock", name: "Low Stock Summary", cat: "item", desc: "Items at/under reorder level" },
  { id: "rate-list", name: "Rate List", cat: "item", desc: "MRP & sale price per item" },
  { id: "stock-detail", name: "Stock Detail Report", cat: "item", desc: "Batch-wise stock & expiry" },
  { id: "stock-summary", name: "Stock Summary", cat: "item", desc: "Stock & value per item" },
  // party
  { id: "receivable-ageing", name: "Receivable Ageing Report", cat: "party", desc: "Outstanding by age bucket" },
  { id: "party-by-item", name: "Party Report By Item", cat: "party", desc: "What each party bought" },
  { id: "party-ledger", name: "Party Statement (Ledger)", cat: "party", desc: "Billed, paid & outstanding" },
  { id: "party-outstanding", name: "Party Wise Outstanding", cat: "party", desc: "Dues per party" },
  { id: "sales-category-wise", name: "Sales Summary - Category Wise", cat: "party", desc: "Sales grouped by category" },
];

export const CAT_LABEL: Record<ReportCat, string> = { favourite: "Favourite", gst: "GST", transaction: "Transaction", item: "Item", party: "Party" };
export const reportById = (id: string) => REPORT_CATALOG.find((r) => r.id === id);

// ── small helpers ───────────────────────────────────────────────
const r0 = (n: number) => Math.round(n);
const exGst = (price: number, qty: number, gst: number) => (price * qty) / (1 + gst / 100);
const dOnly = (ts: number) => new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
const partyKey = (s: Sale) => s.customer.name + (s.customer.phone ? ` · ${s.customer.phone}` : "");
// online COD orders not yet delivered are "outstanding" (receivable from customer)
const isOutstanding = (s: Sale) => s.channel === "online" && s.payMode === "cod" && !["delivered", "cancelled"].includes(s.status);

// ════════════════════════════════════════════════════════════════
export function runReport(id: string, ctx: ReportCtx): ReportResult {
  const { sales, purchases, inventory, now, range } = ctx;
  const sIn = validSales(sales).filter((s) => inRange(s.createdAt, range));
  const pIn = purchases.filter((p) => inRange(p.createdAt, range));
  const eIn = (ctx.expenses ?? []).filter((e) => inRange(e.date, range));
  const costOf = (() => {
    const m = new Map<string, number>();
    for (const p of inventory) m.set(p.id, earliestBatch(p)?.ptr ?? p.batches[0]?.ptr ?? 0);
    return (pid: string) => m.get(pid) ?? 0;
  })();

  switch (id) {
    // ───────────────────────── GST family ─────────────────────────
    case "gstr1": case "gst-sales-hsn": {
      const byHsn = id === "gst-sales-hsn";
      const m = new Map<string, { taxable: number; tax: number; qty: number }>();
      for (const s of sIn) for (const i of s.items) {
        const k = byHsn ? (i.hsn || "—") : String(i.gst);
        const tx = exGst(i.price, i.qty, i.gst); const tax = i.price * i.qty - tx;
        const e = m.get(k) ?? { taxable: 0, tax: 0, qty: 0 };
        e.taxable += tx; e.tax += tax; e.qty += i.qty; m.set(k, e);
      }
      const rows = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, e]) => [
        byHsn ? k : `${k}%`, e.qty, r0(e.taxable), r0(e.tax / 2), r0(e.tax / 2), r0(e.tax), r0(e.taxable + e.tax),
      ]);
      const sum = (j: number) => rows.reduce((a, r) => a + (r[j] as number), 0);
      return {
        columns: [{ key: "k", label: byHsn ? "HSN" : "GST slab" }, { key: "qty", label: "Qty", num: true }, { key: "taxable", label: "Taxable", money: true }, { key: "cgst", label: "CGST", money: true }, { key: "sgst", label: "SGST", money: true }, { key: "tax", label: "Total tax", money: true }, { key: "total", label: "Total", money: true }],
        rows, totals: ["TOTAL", sum(1), sum(2), sum(3), sum(4), sum(5), sum(6)],
        note: rows.length ? undefined : "No outward (sales) supplies in this period.",
      };
    }
    case "gstr2": case "gst-purchase-hsn": {
      const byHsn = id === "gst-purchase-hsn";
      const m = new Map<string, { taxable: number; tax: number; qty: number }>();
      for (const p of pIn) for (const i of p.items) {
        const k = byHsn ? (i.hsn || "—") : String(i.gst);
        const tx = i.ptr * i.qty; const tax = (tx * i.gst) / 100;
        const e = m.get(k) ?? { taxable: 0, tax: 0, qty: 0 };
        e.taxable += tx; e.tax += tax; e.qty += i.qty; m.set(k, e);
      }
      const rows = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, e]) => [
        byHsn ? k : `${k}%`, e.qty, r0(e.taxable), r0(e.tax / 2), r0(e.tax / 2), r0(e.tax), r0(e.taxable + e.tax),
      ]);
      const sum = (j: number) => rows.reduce((a, r) => a + (r[j] as number), 0);
      return {
        columns: [{ key: "k", label: byHsn ? "HSN" : "GST slab" }, { key: "qty", label: "Qty", num: true }, { key: "taxable", label: "Taxable", money: true }, { key: "cgst", label: "CGST", money: true }, { key: "sgst", label: "SGST", money: true }, { key: "tax", label: "Total tax", money: true }, { key: "total", label: "Total", money: true }],
        rows, totals: ["TOTAL", sum(1), sum(2), sum(3), sum(4), sum(5), sum(6)],
        note: rows.length ? undefined : "No inward (purchase) supplies in this period.",
      };
    }
    case "hsn-sales-summary": {
      const m = new Map<string, { qty: number; taxable: number; tax: number; gst: number }>();
      for (const s of sIn) for (const i of s.items) {
        const k = i.hsn || "—"; const tx = exGst(i.price, i.qty, i.gst);
        const e = m.get(k) ?? { qty: 0, taxable: 0, tax: 0, gst: i.gst };
        e.qty += i.qty; e.taxable += tx; e.tax += i.price * i.qty - tx; m.set(k, e);
      }
      const rows = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, e]) => [k, `${e.gst}%`, e.qty, r0(e.taxable), r0(e.tax), r0(e.taxable + e.tax)]);
      const sum = (j: number) => rows.reduce((a, r) => a + (r[j] as number), 0);
      return {
        columns: [{ key: "hsn", label: "HSN" }, { key: "rate", label: "GST" }, { key: "qty", label: "Qty", num: true }, { key: "taxable", label: "Taxable", money: true }, { key: "tax", label: "Tax", money: true }, { key: "total", label: "Total", money: true }],
        rows, totals: ["TOTAL", "", sum(2), sum(3), sum(4), sum(5)],
        note: rows.length ? undefined : "No sales in this period.",
      };
    }
    case "gstr3b": {
      const gOut = sIn.reduce((a, s) => { const t = saleTotals(s); return { taxable: a.taxable + t.taxable, tax: a.tax + t.totalTax }; }, { taxable: 0, tax: 0 });
      const gIn = pIn.reduce((a, p) => { const t = purchaseTotals(p.items); return { taxable: a.taxable + t.taxable, tax: a.tax + t.gst }; }, { taxable: 0, tax: 0 });
      const net = gOut.tax - gIn.tax;
      return {
        columns: [{ key: "d", label: "Description" }, { key: "taxable", label: "Taxable value", money: true }, { key: "tax", label: "Tax", money: true }],
        rows: [
          ["3.1 Outward taxable supplies", r0(gOut.taxable), r0(gOut.tax)],
          ["4. Eligible ITC (inward)", r0(gIn.taxable), r0(gIn.tax)],
        ],
        totals: [net >= 0 ? "Net GST payable" : "Net GST credit (c/f)", "", r0(Math.abs(net))],
      };
    }
    case "tcs-receivable": {
      const lines = payoutSummary(sIn, now).lines;
      const rows = lines.map((l) => [l.sale.id, dOnly(l.sale.createdAt), l.sale.customer.name, r0(l.gross), r0(l.tcs), l.settled ? "Settled" : "Pending"]);
      return {
        columns: [{ key: "inv", label: "Invoice" }, { key: "date", label: "Date" }, { key: "party", label: "Party" }, { key: "order", label: "Order value", money: true }, { key: "tcs", label: "TCS 1%", money: true }, { key: "status", label: "Status" }],
        rows, totals: ["TOTAL", "", "", r0(lines.reduce((a, l) => a + l.gross, 0)), r0(lines.reduce((a, l) => a + l.tcs, 0)), ""],
        note: rows.length ? "TCS withheld by Namma MedMate u/s 52 — claimable against your GST liability." : "No online orders with TCS in this period.",
      };
    }
    case "tds-payable": case "tds-receivable": case "tcs-payable": {
      const labels: Record<string, [RCol[], string]> = {
        "tds-payable": [[{ key: "d", label: "Deductee" }, { key: "sec", label: "Section" }, { key: "base", label: "Amount", money: true }, { key: "tds", label: "TDS", money: true }], "No TDS deducted on payments in this period."],
        "tds-receivable": [[{ key: "d", label: "Deductor" }, { key: "sec", label: "Section" }, { key: "base", label: "Amount", money: true }, { key: "tds", label: "TDS", money: true }], "No TDS deducted by customers in this period."],
        "tcs-payable": [[{ key: "d", label: "Buyer" }, { key: "base", label: "Sale value", money: true }, { key: "tcs", label: "TCS", money: true }], "No TCS collected as a seller in this period."],
      };
      const [columns, note] = labels[id];
      return { columns, rows: [], note };
    }
    case "expense-category": {
      const m = new Map<string, { count: number; taxable: number; tax: number; amount: number }>();
      for (const e of eIn) { const c = m.get(e.category) ?? { count: 0, taxable: 0, tax: 0, amount: 0 }; c.count++; c.taxable += expenseTaxable(e); c.tax += expenseTax(e); c.amount += e.amount; m.set(e.category, c); }
      const rows = [...m.entries()].sort((a, b) => b[1].amount - a[1].amount).map(([k, c]) => [k, c.count, r0(c.taxable), r0(c.tax), r0(c.amount)]);
      const sum = (j: number) => rows.reduce((a, r) => a + (r[j] as number), 0);
      return {
        columns: [{ key: "cat", label: "Category" }, { key: "count", label: "Entries", num: true }, { key: "taxable", label: "Taxable", money: true }, { key: "tax", label: "GST", money: true }, { key: "amt", label: "Amount", money: true }],
        rows, totals: ["TOTAL", sum(1), sum(2), sum(3), sum(4)],
        note: rows.length ? undefined : "No expenses recorded in this period — add them under Expenses.",
      };
    }
    case "expense-transaction": {
      const rows = [...eIn].sort((a, b) => b.date - a.date).map((e) => [e.number, dOnly(e.date), e.party, e.category, PAY_LABEL[e.paymentMode], r0(e.amount)]);
      return {
        columns: [{ key: "no", label: "Expense no" }, { key: "date", label: "Date" }, { key: "party", label: "Paid to" }, { key: "cat", label: "Category" }, { key: "pay", label: "Mode" }, { key: "amt", label: "Amount", money: true }],
        rows, totals: ["TOTAL", "", "", "", "", rows.reduce((a, r) => a + (r[5] as number), 0)],
        note: rows.length ? undefined : "No expenses recorded in this period — add them under Expenses.",
      };
    }

    // ──────────────────────── Transaction ─────────────────────────
    case "audit-trail": {
      const ev: (string | number)[][] = [];
      for (const s of sIn) {
        const hist = s.history && s.history.length ? s.history : [{ status: s.status, at: s.createdAt }];
        for (const h of hist) ev.push([h.at, fmtDateTime(h.at), s.id, "Sale", s.customer.name, r0(saleTotals(s).payable), STATUS_LABEL[h.status as OrderStatus] ?? h.status]);
      }
      for (const p of pIn) ev.push([p.createdAt, fmtDateTime(p.createdAt), p.id, "Purchase", p.supplierName, r0(purchaseTotals(p.items).total), "Recorded"]);
      ev.sort((a, b) => (b[0] as number) - (a[0] as number));
      return {
        columns: [{ key: "time", label: "Time" }, { key: "doc", label: "Document" }, { key: "type", label: "Type" }, { key: "party", label: "Party" }, { key: "amt", label: "Amount", money: true }, { key: "status", label: "Status" }],
        rows: ev.map((r) => r.slice(1)),
        note: ev.length ? undefined : "No documents in this period.",
      };
    }
    case "bill-wise-profit": {
      const rows = sIn.map((s) => {
        const t = saleTotals(s); const cogs = s.items.reduce((a, i) => a + costOf(i.productId) * i.qty, 0);
        const profit = t.taxable - cogs; const margin = t.taxable > 0 ? (profit / t.taxable) * 100 : 0;
        return [s.id, dOnly(s.createdAt), s.customer.name, r0(t.taxable), r0(cogs), r0(profit), `${margin.toFixed(0)}%`];
      });
      const sum = (j: number) => rows.reduce((a, r) => a + (r[j] as number), 0);
      return {
        columns: [{ key: "inv", label: "Invoice" }, { key: "date", label: "Date" }, { key: "party", label: "Party" }, { key: "rev", label: "Sale (ex-GST)", money: true }, { key: "cogs", label: "COGS", money: true }, { key: "profit", label: "Profit", money: true }, { key: "margin", label: "Margin", num: true }],
        rows, totals: ["TOTAL", "", "", sum(3), sum(4), sum(5), ""],
        note: rows.length ? undefined : "No sales in this period.",
      };
    }
    case "cash-bank": {
      const m = new Map<PayMode, { bills: number; amt: number }>();
      for (const s of sIn) { const e = m.get(s.payMode) ?? { bills: 0, amt: 0 }; e.bills++; e.amt += saleTotals(s).payable; m.set(s.payMode, e); }
      const rows = (["cash", "upi", "card", "cod"] as PayMode[]).map((mode) => { const e = m.get(mode) ?? { bills: 0, amt: 0 }; return [PAY_LABEL[mode], mode === "cash" ? "Cash" : "Bank", e.bills, r0(e.amt)]; });
      return {
        columns: [{ key: "mode", label: "Payment mode" }, { key: "acct", label: "Account" }, { key: "bills", label: "Bills", num: true }, { key: "amt", label: "Collected", money: true }],
        rows, totals: ["TOTAL", "", rows.reduce((a, r) => a + (r[2] as number), 0), rows.reduce((a, r) => a + (r[3] as number), 0)],
      };
    }
    case "daybook": {
      const m = new Map<string, { sales: number; purch: number }>();
      const key = (ts: number) => new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
      for (const s of sIn) { const k = key(s.createdAt); const e = m.get(k) ?? { sales: 0, purch: 0 }; e.sales += saleTotals(s).payable; m.set(k, e); }
      for (const p of pIn) { const k = key(p.createdAt); const e = m.get(k) ?? { sales: 0, purch: 0 }; e.purch += purchaseTotals(p.items).total; m.set(k, e); }
      const rows = [...m.entries()].map(([k, v]) => [k, r0(v.sales), r0(v.purch), r0(v.sales - v.purch)]);
      const sum = (j: number) => rows.reduce((a, r) => a + (r[j] as number), 0);
      return {
        columns: [{ key: "day", label: "Day" }, { key: "sales", label: "Net sales", money: true }, { key: "purch", label: "Purchases", money: true }, { key: "net", label: "Net cash flow", money: true }],
        rows, totals: ["TOTAL", sum(1), sum(2), sum(3)],
        note: rows.length ? undefined : "No activity in this period.",
      };
    }
    case "purchase-summary": {
      const rows = pIn.map((p) => { const t = purchaseTotals(p.items); return [p.id, dOnly(p.createdAt), p.supplierName, p.invoiceNo, t.lines, r0(t.taxable), r0(t.gst), r0(t.total)]; });
      const sum = (j: number) => rows.reduce((a, r) => a + (r[j] as number), 0);
      return {
        columns: [{ key: "grn", label: "GRN" }, { key: "date", label: "Date" }, { key: "supplier", label: "Supplier" }, { key: "inv", label: "Invoice no" }, { key: "items", label: "Items", num: true }, { key: "taxable", label: "Taxable", money: true }, { key: "gst", label: "GST", money: true }, { key: "total", label: "Total", money: true }],
        rows, totals: ["TOTAL", "", "", "", sum(4), sum(5), sum(6), sum(7)],
        note: rows.length ? undefined : "No purchases (GRNs) in this period.",
      };
    }

    // ─────────────────────────── Item ─────────────────────────────
    case "item-by-party": case "party-by-item": {
      const partyFirst = id === "party-by-item";
      const m = new Map<string, { a: string; b: string; qty: number; val: number }>();
      for (const s of sIn) for (const i of s.items) {
        const party = partyKey(s); const item = i.name;
        const k = partyFirst ? `${party}||${item}` : `${item}||${party}`;
        const e = m.get(k) ?? { a: partyFirst ? party : item, b: partyFirst ? item : party, qty: 0, val: 0 };
        e.qty += i.qty; e.val += exGst(i.price, i.qty, i.gst); m.set(k, e);
      }
      const rows = [...m.values()].sort((x, y) => y.val - x.val).map((e) => [e.a, e.b, e.qty, r0(e.val)]);
      const sum = (j: number) => rows.reduce((a, r) => a + (r[j] as number), 0);
      return {
        columns: [{ key: "a", label: partyFirst ? "Party" : "Item" }, { key: "b", label: partyFirst ? "Item" : "Party" }, { key: "qty", label: "Qty", num: true }, { key: "val", label: "Value (ex-GST)", money: true }],
        rows, totals: ["TOTAL", "", sum(2), sum(3)],
        note: rows.length ? undefined : "No sales in this period.",
      };
    }
    case "item-sales-purchase": {
      const sold = new Map<string, { qty: number; val: number }>();
      for (const s of sIn) for (const i of s.items) { const e = sold.get(i.productId) ?? { qty: 0, val: 0 }; e.qty += i.qty; e.val += exGst(i.price, i.qty, i.gst); sold.set(i.productId, e); }
      const bought = new Map<string, { qty: number; val: number }>();
      for (const p of pIn) for (const i of p.items) { if (!i.productId) continue; const e = bought.get(i.productId) ?? { qty: 0, val: 0 }; e.qty += i.qty; e.val += i.ptr * i.qty; bought.set(i.productId, e); }
      const ids = new Set([...sold.keys(), ...bought.keys()]);
      const rows = [...ids].map((pid) => {
        const p = inventory.find((x) => x.id === pid); const sv = sold.get(pid) ?? { qty: 0, val: 0 }; const bv = bought.get(pid) ?? { qty: 0, val: 0 };
        return [p?.name ?? pid, sv.qty, r0(sv.val), bv.qty, r0(bv.val), p ? stockOf(p) : 0];
      }).sort((a, b) => (b[2] as number) - (a[2] as number));
      const sum = (j: number) => rows.reduce((a, r) => a + (r[j] as number), 0);
      return {
        columns: [{ key: "item", label: "Item" }, { key: "sq", label: "Sold qty", num: true }, { key: "sv", label: "Sold value", money: true }, { key: "pq", label: "Purch qty", num: true }, { key: "pv", label: "Purch value", money: true }, { key: "stock", label: "In stock", num: true }],
        rows, totals: ["TOTAL", sum(1), sum(2), sum(3), sum(4), ""],
        note: rows.length ? undefined : "No item movement in this period.",
      };
    }
    case "low-stock": {
      const rows = inventory.filter(isLowStock).map((p) => [p.name, catLabel(p.category), stockOf(p), p.reorderLevel, p.rack, stockOf(p) <= 0 ? "Out of stock" : "Low"]);
      return {
        columns: [{ key: "item", label: "Item" }, { key: "cat", label: "Category" }, { key: "stock", label: "In stock", num: true }, { key: "reorder", label: "Reorder level", num: true }, { key: "rack", label: "Rack" }, { key: "status", label: "Status" }],
        rows, note: rows.length ? undefined : "No items at or below reorder level — stock is healthy.",
      };
    }
    case "rate-list": {
      const rows = inventory.map((p) => [p.name, p.pack, `${p.gst}%`, r0(mrpOf(p)), r0(sellPrice(p)), p.rack]);
      return {
        columns: [{ key: "item", label: "Item" }, { key: "pack", label: "Pack" }, { key: "gst", label: "GST" }, { key: "mrp", label: "MRP", money: true }, { key: "sale", label: "Sale price", money: true }, { key: "rack", label: "Rack" }],
        rows,
      };
    }
    case "stock-detail": {
      const rows: (string | number)[][] = [];
      for (const p of inventory) for (const b of p.batches) {
        const mo = monthsToExpiry(b.expiry, now);
        rows.push([p.name, b.batchNo, b.expiry, isExpired(b.expiry, now) ? "Expired" : `${mo}mo`, b.qty, r0(b.mrp), r0(b.ptr), r0(b.qty * b.ptr)]);
      }
      const tv = rows.reduce((a, r) => a + (r[7] as number), 0);
      return {
        columns: [{ key: "item", label: "Item" }, { key: "batch", label: "Batch" }, { key: "exp", label: "Expiry" }, { key: "left", label: "To expiry" }, { key: "qty", label: "Qty", num: true }, { key: "mrp", label: "MRP", money: true }, { key: "ptr", label: "PTR", money: true }, { key: "val", label: "Value", money: true }],
        rows, totals: ["TOTAL", "", "", "", rows.reduce((a, r) => a + (r[4] as number), 0), "", "", tv],
      };
    }
    case "stock-summary": {
      const rows = inventory.map((p) => {
        const status = stockOf(p) <= 0 && looseUnitsOf(p) <= 0 ? "Out" : isLowStock(p) ? "Low" : isExpired(earliestBatch(p)?.expiry ?? "2999-12", now) ? "Expired" : "OK";
        return [p.name, catLabel(p.category), stockOf(p), looseUnitsOf(p), r0(mrpOf(p)), r0(stockValue(p)), status];
      });
      const sum = (j: number) => rows.reduce((a, r) => a + (r[j] as number), 0);
      return {
        columns: [{ key: "item", label: "Item" }, { key: "cat", label: "Category" }, { key: "stock", label: "In stock", num: true }, { key: "loose", label: "Loose", num: true }, { key: "mrp", label: "MRP", money: true }, { key: "val", label: "Stock value", money: true }, { key: "status", label: "Status" }],
        rows, totals: ["TOTAL", "", sum(2), sum(3), "", sum(5), ""],
      };
    }

    // ─────────────────────────── Party ────────────────────────────
    case "receivable-ageing": {
      const rows = validSales(sales).filter(isOutstanding).map((s) => {
        const age = Math.max(0, Math.floor((now - s.createdAt) / 86400000));
        const bucket = age <= 30 ? "0–30" : age <= 60 ? "31–60" : age <= 90 ? "61–90" : "90+";
        return [s.customer.name, s.id, r0(saleTotals(s).payable), age, bucket];
      }).sort((a, b) => (b[3] as number) - (a[3] as number));
      return {
        columns: [{ key: "party", label: "Party" }, { key: "inv", label: "Invoice" }, { key: "amt", label: "Outstanding", money: true }, { key: "age", label: "Age (days)", num: true }, { key: "bucket", label: "Bucket" }],
        rows, totals: ["TOTAL", "", rows.reduce((a, r) => a + (r[2] as number), 0), "", ""],
        note: rows.length ? undefined : "No outstanding receivables — all dues cleared.",
      };
    }
    case "party-ledger": case "party-outstanding": {
      const m = new Map<string, { name: string; phone: string; bills: number; billed: number; out: number; oldest: number }>();
      for (const s of validSales(sales).filter((s) => inRange(s.createdAt, range) || isOutstanding(s))) {
        const k = partyKey(s); const e = m.get(k) ?? { name: s.customer.name, phone: s.customer.phone ?? "—", bills: 0, billed: 0, out: 0, oldest: 0 };
        const pay = saleTotals(s).payable;
        if (inRange(s.createdAt, range)) { e.bills++; e.billed += pay; }
        if (isOutstanding(s)) { e.out += pay; e.oldest = Math.max(e.oldest, Math.floor((now - s.createdAt) / 86400000)); }
        m.set(k, e);
      }
      let arr = [...m.values()];
      if (id === "party-outstanding") {
        arr = arr.filter((e) => e.out > 0).sort((a, b) => b.out - a.out);
        const rows = arr.map((e) => [e.name, e.phone, r0(e.out), e.oldest]);
        return {
          columns: [{ key: "party", label: "Party" }, { key: "phone", label: "Phone" }, { key: "out", label: "Outstanding", money: true }, { key: "oldest", label: "Oldest due (days)", num: true }],
          rows, totals: ["TOTAL", "", rows.reduce((a, r) => a + (r[2] as number), 0), ""],
          note: rows.length ? undefined : "No party has outstanding dues.",
        };
      }
      arr = arr.sort((a, b) => b.billed - a.billed);
      const rows = arr.map((e) => [e.name, e.phone, e.bills, r0(e.billed), r0(e.billed - e.out), r0(e.out)]);
      const sum = (j: number) => rows.reduce((a, r) => a + (r[j] as number), 0);
      return {
        columns: [{ key: "party", label: "Party" }, { key: "phone", label: "Phone" }, { key: "bills", label: "Bills", num: true }, { key: "billed", label: "Total billed", money: true }, { key: "paid", label: "Received", money: true }, { key: "out", label: "Outstanding", money: true }],
        rows, totals: ["TOTAL", "", sum(2), sum(3), sum(4), sum(5)],
        note: rows.length ? undefined : "No party activity in this period.",
      };
    }
    case "sales-category-wise": {
      const m = new Map<string, { qty: number; taxable: number; tax: number }>();
      const catOf = (pid: string) => inventory.find((p) => p.id === pid)?.category ?? "—";
      for (const s of sIn) for (const i of s.items) {
        const k = catLabel(catOf(i.productId)); const tx = exGst(i.price, i.qty, i.gst);
        const e = m.get(k) ?? { qty: 0, taxable: 0, tax: 0 }; e.qty += i.qty; e.taxable += tx; e.tax += i.price * i.qty - tx; m.set(k, e);
      }
      const rows = [...m.entries()].sort((a, b) => b[1].taxable - a[1].taxable).map(([k, e]) => [k, e.qty, r0(e.taxable), r0(e.tax), r0(e.taxable + e.tax)]);
      const sum = (j: number) => rows.reduce((a, r) => a + (r[j] as number), 0);
      return {
        columns: [{ key: "cat", label: "Category" }, { key: "qty", label: "Qty", num: true }, { key: "taxable", label: "Taxable", money: true }, { key: "tax", label: "GST", money: true }, { key: "total", label: "Total", money: true }],
        rows, totals: ["TOTAL", sum(1), sum(2), sum(3), sum(4)],
        note: rows.length ? undefined : "No sales in this period.",
      };
    }

    // ──────────────────────── Balance Sheet ───────────────────────
    case "balance-sheet": {
      const closingStock = inventory.reduce((a, p) => a + stockValue(p), 0);
      const expensesPaid = eIn.reduce((a, e) => a + e.amount, 0);
      const collected = sIn.reduce((a, s) => a + (isOutstanding(s) ? 0 : saleTotals(s).payable), 0) - expensesPaid;
      const receivables = validSales(sales).filter(isOutstanding).reduce((a, s) => a + saleTotals(s).payable, 0);
      const outputGst = sIn.reduce((a, s) => a + saleTotals(s).totalTax, 0);
      const inputGst = pIn.reduce((a, p) => a + purchaseTotals(p.items).gst, 0);
      const gstPayable = Math.max(0, outputGst - inputGst);
      const assets = closingStock + collected + receivables;
      const liabilities = gstPayable;
      const equity = assets - liabilities;
      return {
        columns: [{ key: "p", label: "Particulars" }, { key: "amt", label: "Amount", money: true }],
        rows: [
          ["ASSETS", ""],
          ["  Closing stock (at cost)", r0(closingStock)],
          ["  Cash & bank (collected)", r0(collected)],
          ["  Sundry debtors (receivable)", r0(receivables)],
          ["  Total assets", r0(assets)],
          ["LIABILITIES", ""],
          ["  GST payable (net)", r0(gstPayable)],
          ["  Total liabilities", r0(liabilities)],
        ],
        totals: ["Owner's equity (net worth)", r0(equity)],
        note: "Indicative balance sheet from in-app data (stock, collections, receivables & GST).",
      };
    }
  }
  return { columns: [{ key: "x", label: "—" }], rows: [], note: "This report is not available." };
}
