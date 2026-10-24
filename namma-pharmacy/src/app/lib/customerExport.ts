import { Sale, PharmacyProfile, computeInvoice, fmtDateTime } from "../data";
import { buildReportPdf } from "./pdf";

// ── canonical customer record (named customers only) ──────────────
export type CustomerRow = {
  name: string;
  phone: string;
  orders: number;
  units: number;
  online: number;   // # online orders
  offline: number;  // # counter orders
  spent: number;
  last: number;     // ms timestamp of last visit
  rx: boolean;
};

// aggregate the sales ledger into one row per named customer (excludes walk-in / kiosk)
export function aggregateCustomers(sales: Sale[]): CustomerRow[] {
  const m = new Map<string, CustomerRow>();
  sales
    .filter((s) => s.status !== "cancelled" && s.customer.name && s.customer.name !== "Walk-in" && s.customer.name !== "Kiosk (self-order)")
    .forEach((s) => {
      const key = (s.customer.phone || s.customer.name).trim();
      if (!key) return;
      const cur = m.get(key) ?? { name: s.customer.name, phone: s.customer.phone || "—", orders: 0, units: 0, online: 0, offline: 0, spent: 0, last: 0, rx: false };
      const t = computeInvoice(s.items, s.discount);
      cur.orders += 1;
      cur.spent += t.payable;
      cur.units += s.items.reduce((a, i) => a + i.qty, 0);
      if (s.channel === "online") cur.online++; else cur.offline++;
      cur.last = Math.max(cur.last, s.createdAt);
      cur.rx = cur.rx || s.rx;
      if (s.customer.phone) cur.phone = s.customer.phone;
      m.set(key, cur);
    });
  return [...m.values()].sort((a, b) => b.spent - a.spent);
}

// ── tiny shared helpers ──────────────────────────────────────────
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

// ── Excel (CSV with UTF-8 BOM so ₹ & names open cleanly in Excel) ──
export function exportCustomersCsv(rows: CustomerRow[], now: number) {
  const head = ["Name", "Phone", "Orders", "Units", "Online orders", "Counter orders", "On chronic Rx", "Last visit", "Loyalty points", "Lifetime value (Rs)"];
  const lines = rows.map((c) => [
    c.name, c.phone, c.orders, c.units, c.online, c.offline, c.rx ? "Yes" : "No",
    c.last ? fmtDateTime(c.last) : "—", Math.floor(c.spent / 100), Math.round(c.spent),
  ]);
  const csv = [head, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), `customers-${stamp(now)}.csv`);
}

// ── PDF (paginated, monospace) ────────────────────────────────────
export function exportCustomersPdf(rows: CustomerRow[], profile: PharmacyProfile, now: number) {
  const headerLine = pad("Customer", 22) + pad("Phone", 16) + padL("Orders", 7) + padL("Units", 7) + padL("Loyalty", 9) + padL("Lifetime", 12);
  const rowLines = rows.map((c) =>
    pad(c.name, 22) + pad(c.phone, 16) + padL(c.orders, 7) + padL(c.units, 7) + padL(Math.floor(c.spent / 100), 9) + padL(rsP(c.spent), 12));
  const totSpent = rows.reduce((a, c) => a + c.spent, 0);
  const totalsLine = pad(`TOTAL  ${rows.length} customers`, 61) + padL(rsP(totSpent), 12);
  const blob = buildReportPdf({
    title: "Customer Database",
    subtitle: `${rows.length} customers · lifetime value ${rsP(totSpent)}`,
    generatedAt: new Date(now).toLocaleString("en-IN"),
    profile, headerLine, rowLines, totalsLine,
  });
  download(blob, `customers-${stamp(now)}.pdf`);
}
