"use client";
import { useState, useMemo } from "react";
import { usePharma } from "../pharmaState";
import {
  inr, computeInvoice, fmtDateTime, timeAgo, channelLabel, PAY_LABEL, PayMode,
  STATUS_LABEL, OrderStatus, Channel, Sale,
} from "../data";
import { StatusPill, ChannelPill } from "../components/bits";
import { useDateRange } from "../components/DateRangeField";
import { OrderDetail, matchRx } from "./OrdersScreen";
import ShareSheet from "../components/ShareSheet";
import { IconSearch, IconClock, IconShare, IconPrint, IconCash, IconDownload, IconReceipt } from "../components/Icon";
import { buildReportPdf } from "../lib/pdf";

type SSort = "date" | "total" | "items" | "customer";
const pad = (s: unknown, n: number) => { const x = String(s); return (x.length > n ? x.slice(0, n) : x).padEnd(n); };
const padL = (s: unknown, n: number) => { const x = String(s); return (x.length > n ? x.slice(0, n) : x).padStart(n); };
const rsP = (n: number) => "Rs " + Math.round(n).toLocaleString("en-IN");
const download = (blob: Blob, name: string) => { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 6000); };

export default function SalesScreen() {
  const { sales, prescriptions, profile, advanceOrder, cancelOrder, markPaid, now, go } = usePharma();
  const period = useDateRange(now, "last-365"); // simple date-range dropdown
  const [q, setQ] = useState("");
  const [chan, setChan] = useState<"all" | Channel>("all");
  const [pay, setPay] = useState<"all" | PayMode>("all");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [sort, setSort] = useState<SSort>("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<Sale | null>(null);
  const [viewTab, setViewTab] = useState<"history" | "invoice">("history");
  const [shareSale, setShareSale] = useState<Sale | null>(null);
  const toggle = (k: SSort) => { if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc")); else { setSort(k); setDir("desc"); } };
  const ar = (k: SSort) => (sort === k ? (dir === "asc" ? "▲" : "▼") : "");

  const rows = useMemo(() => {
    let r = sales.filter((s) => s.status !== "cancelled" && period.inWindow(s.createdAt)).map((s) => ({ s, t: computeInvoice(s.items, s.discount) }));
    r = r.filter(({ s }) => {
      if (chan !== "all" && s.channel !== chan) return false;
      if (pay !== "all" && s.payMode !== pay) return false;
      if (status !== "all" && s.status !== status) return false;
      if (paidFilter === "paid" && s.paid === false) return false;
      if (paidFilter === "unpaid" && s.paid !== false) return false;
      if (q && !(`${s.id} ${s.customer.name} ${s.customer.phone ?? ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
      return true;
    });
    r.sort((a, b) => {
      const m = dir === "asc" ? 1 : -1;
      if (sort === "total") return (a.t.payable - b.t.payable) * m;
      if (sort === "items") return (a.s.items.reduce((x, i) => x + i.qty, 0) - b.s.items.reduce((x, i) => x + i.qty, 0)) * m;
      if (sort === "customer") return a.s.customer.name.localeCompare(b.s.customer.name) * m;
      return (a.s.createdAt - b.s.createdAt) * m;
    });
    return r;
  }, [sales, period.from, period.to, chan, pay, status, paidFilter, q, sort, dir]); // eslint-disable-line

  const tGross = rows.reduce((a, r) => a + r.t.gross, 0);
  const tTax = rows.reduce((a, r) => a + r.t.totalTax, 0);
  const tNet = rows.reduce((a, r) => a + r.t.payable, 0);
  const tUnits = rows.reduce((a, r) => a + r.s.items.reduce((x, i) => x + i.qty, 0), 0);

  const exportCsv = () => {
    const head = ["Date", "Invoice", "Customer", "Phone", "Channel", "Units", "Payment", "Status", "Paid", "Discount", "Taxable", "GST", "Total"];
    const lines = rows.map(({ s, t }) => [
      fmtDateTime(s.createdAt), s.id, s.customer.name, s.customer.phone ?? "", channelLabel(s.channel),
      s.items.reduce((x, i) => x + i.qty, 0), s.paid === false ? "" : PAY_LABEL[s.payMode], STATUS_LABEL[s.status],
      s.paid === false ? "Unpaid" : "Paid", t.discount, t.taxable.toFixed(2), t.totalTax.toFixed(2), t.payable,
    ]);
    const csv = [head, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), `sales-${period.label.replace(/[^A-Za-z0-9]+/g, "-")}.csv`);
  };

  const exportPdf = () => {
    const headerLine = pad("Date", 16) + pad("Invoice", 10) + pad("Customer", 20) + pad("Chnl", 8) + pad("Status", 11) + padL("GST", 9) + padL("Total", 12);
    const rowLines = rows.map(({ s, t }) =>
      pad(new Date(s.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }), 16) +
      pad(s.id, 10) + pad(s.customer.name, 20) + pad(channelLabel(s.channel), 8) +
      pad(s.paid === false ? "UNPAID" : STATUS_LABEL[s.status], 11) + padL(rsP(t.totalTax), 9) + padL(rsP(t.payable), 12));
    const totalsLine = pad(`TOTAL  ${rows.length} sales  ${tUnits} units`, 54) + padL(rsP(tTax), 9) + padL(rsP(tNet), 12);
    const blob = buildReportPdf({
      title: "Sales Report", subtitle: `Period: ${period.label}`, generatedAt: new Date().toLocaleString("en-IN"),
      profile, headerLine, rowLines, totalsLine,
    });
    download(blob, `sales-report-${period.label.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`);
  };

  return (
    <div className="pd-canvas-wide">
      {/* period + export bar */}
      <div className="pd-toolbar">
        <div><h2 style={{ fontSize: 16 }}>All sales</h2><span className="pd-muted" style={{ fontSize: 12.5 }}>Every sale from day one to date — counter & online</span></div>
        <div className="pd-spacer" />
        {period.node}
        <button className="pd-btn pd-btn-ghost" onClick={exportCsv}><IconDownload size={14} /> Excel</button>
        <button className="pd-btn pd-btn-ghost" onClick={exportPdf}><IconPrint size={15} /> PDF</button>
      </div>

      {/* summary */}
      <div className="pd-summary-chips">
        <div className="pd-schip">Showing<b style={{ fontSize: 13 }}>{period.label}</b></div>
        <div className="pd-schip">Bills<b>{rows.length}</b></div>
        <div className="pd-schip">Units<b>{tUnits}</b></div>
        <div className="pd-schip">Gross<b>{inr(tGross)}</b></div>
        <div className="pd-schip">GST<b>{inr(tTax)}</b></div>
        <div className="pd-schip">Net collected<b>{inr(tNet)}</b></div>
      </div>

      {/* filters */}
      <div className="pd-toolbar">
        <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Invoice, customer, phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="pd-select" style={{ width: 130 }} value={chan} onChange={(e) => setChan(e.target.value as "all" | Channel)}><option value="all">All channels</option><option value="online">Online</option><option value="offline">Counter</option></select>
        <select className="pd-select" style={{ width: 120 }} value={pay} onChange={(e) => setPay(e.target.value as "all" | PayMode)}><option value="all">All payments</option>{(["cash", "upi", "card", "cod"] as PayMode[]).map((m) => <option key={m} value={m}>{PAY_LABEL[m]}</option>)}</select>
        <select className="pd-select" style={{ width: 130 }} value={status} onChange={(e) => setStatus(e.target.value as "all" | OrderStatus)}><option value="all">All statuses</option>{(["new", "accepted", "packed", "out", "delivered", "completed"] as OrderStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
        <select className="pd-select" style={{ width: 120 }} value={paidFilter} onChange={(e) => setPaidFilter(e.target.value as "all" | "paid" | "unpaid")}><option value="all">Paid + unpaid</option><option value="paid">Paid only</option><option value="unpaid">Unpaid only</option></select>
      </div>

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead>
              <tr>
                <th>Invoice</th>
                <th className={`sort${sort === "date" ? " on" : ""}`} onClick={() => toggle("date")}>Date / time<span className="ar">{ar("date")}</span></th>
                <th className={`sort${sort === "customer" ? " on" : ""}`} onClick={() => toggle("customer")}>Customer<span className="ar">{ar("customer")}</span></th>
                <th>Channel</th>
                <th className={`sort num${sort === "items" ? " on" : ""}`} onClick={() => toggle("items")}>Units<span className="ar">{ar("items")}</span></th>
                <th>Payment</th><th>Status</th><th className="num">GST</th>
                <th className={`sort num${sort === "total" ? " on" : ""}`} onClick={() => toggle("total")}>Total<span className="ar">{ar("total")}</span></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, t }) => (
                <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => { setViewTab("history"); setView(s); }}>
                  <td className="pd-mono" style={{ fontWeight: 700 }}>{s.id}{s.rx && <span className="pd-tag rx" style={{ marginLeft: 5 }}>Rx</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(s.createdAt)}<div style={{ fontSize: 11, color: "var(--muted)" }}>{timeAgo(s.createdAt, now)}</div></td>
                  <td>{s.customer.name}{s.customer.phone ? <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{s.customer.phone}</div> : null}</td>
                  <td><ChannelPill channel={s.channel} /></td>
                  <td className="num">{s.items.reduce((x, i) => x + i.qty, 0)}</td>
                  <td>{s.paid === false ? <span className="pd-pill pill-rose"><i className="d" />Unpaid</span> : PAY_LABEL[s.payMode]}</td>
                  <td><StatusPill status={s.status} /></td>
                  <td className="num">{inr(t.totalTax)}</td>
                  <td className="num" style={{ fontWeight: 800 }}>{inr(t.payable)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="pd-flex pd-gap6" style={{ justifyContent: "flex-end" }}>
                      {s.paid === false && <button className="pd-btn pd-btn-sm pd-btn-gold" onClick={() => markPaid(s.id, s.payMode)}><IconCash size={13} /> Paid</button>}
                      <button className="pd-iconbtn" title="History" onClick={() => { setViewTab("history"); setView(s); }}><IconClock size={15} /></button>
                      <button className="pd-iconbtn" title="Share" onClick={() => setShareSale(s)}><IconShare size={15} /></button>
                      <button className="pd-iconbtn" title="Invoice" onClick={() => { setViewTab("invoice"); setView(s); }}><IconPrint size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={10}><div className="pd-empty"><div className="em"><IconReceipt size={30} /></div><p>No sales in this period / filter.</p></div></td></tr>}
            </tbody>
            {rows.length > 0 && <tfoot><tr><td colSpan={7}>Total · {rows.length} bills · {tUnits} units</td><td className="num">{inr(tTax)}</td><td className="num">{inr(tNet)}</td><td></td></tr></tfoot>}
          </table>
        </div>
      </div>

      {view && (
        <OrderDetail
          key={view.id + viewTab}
          initialTab={viewTab}
          sale={sales.find((x) => x.id === view.id) ?? view}
          rx={prescriptions.find((r) => r.id === (sales.find((x) => x.id === view.id) ?? view).rxId) ?? matchRx(prescriptions, view)}
          profile={profile}
          onClose={() => setView(null)}
          onAdvance={() => advanceOrder(view.id)}
          onCancel={() => cancelOrder(view.id)}
          onMarkPaid={(m) => markPaid(view.id, m)}
          onShare={() => setShareSale(view)}
          onOpenRx={() => { setView(null); go("prescriptions"); }}
          now={now}
        />
      )}
      {shareSale && <ShareSheet sale={sales.find((x) => x.id === shareSale.id) ?? shareSale} profile={profile} onClose={() => setShareSale(null)} />}
    </div>
  );
}
