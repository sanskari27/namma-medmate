"use client";
import { useState, useMemo } from "react";
import { usePharma } from "../pharmaState";
import {
  inr, fmtDateTime, computeInvoice, Sale, PayMode, PAY_LABEL,
  SaleSource, SALE_SOURCES, SALE_SOURCE_LABEL, saleSourceOf,
} from "../data";
import { IconSearch, IconReports, IconPrint } from "../components/Icon";
import { useDateRange } from "../components/DateRangeField";
import { buildReportPdf } from "../lib/pdf";

const SRC_TONE: Record<SaleSource, string> = { opd: "pill-blue", counter: "pill-gray", ward: "pill-gold", emergency: "pill-rose", online: "pill-teal" };
const saleTotal = (s: Sale) => computeInvoice(s.items, s.discount).payable;
const download = (blob: Blob, name: string) => { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 6000); };

export default function SalesRegisterScreen() {
  const { sales, profile, now } = usePharma();
  const period = useDateRange(now, "last-365");
  const [src, setSrc] = useState<"all" | SaleSource>("all");
  const [pay, setPay] = useState<"all" | PayMode>("all");
  const [paid, setPaid] = useState<"all" | "paid" | "unpaid">("all");
  const [insurer, setInsurer] = useState("all");
  const [ward, setWard] = useState("all");
  const [q, setQ] = useState("");

  // only completed offline-style sales belong to the hospital register (exclude cancelled)
  const base = useMemo(() => sales.filter((s) => s.status !== "cancelled" && period.inWindow(s.createdAt)), [sales, period]);
  const insurers = useMemo(() => Array.from(new Set(base.filter((s) => s.insurer).map((s) => s.insurer!))).sort(), [base]);
  const wardsList = useMemo(() => Array.from(new Set(base.filter((s) => s.ward).map((s) => s.ward!))).sort(), [base]);

  const rows = useMemo(() => base
    .filter((s) => src === "all" || saleSourceOf(s) === src)
    .filter((s) => pay === "all" || s.payMode === pay)
    .filter((s) => paid === "all" || (paid === "paid" ? s.paid !== false : s.paid === false))
    .filter((s) => insurer === "all" || s.insurer === insurer)
    .filter((s) => ward === "all" || s.ward === ward)
    .filter((s) => !q.trim() || `${s.id} ${s.customer.name} ${s.customer.phone ?? ""} ${s.insurer ?? ""} ${s.ward ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt - a.createdAt), [base, src, pay, paid, insurer, ward, q]);

  const revenue = rows.reduce((a, s) => a + saleTotal(s), 0);
  const paidAmt = rows.filter((s) => s.paid !== false).reduce((a, s) => a + saleTotal(s), 0);
  const unpaidAmt = rows.filter((s) => s.paid === false).reduce((a, s) => a + saleTotal(s), 0);
  const insAmt = rows.filter((s) => s.payMode === "insurance").reduce((a, s) => a + saleTotal(s), 0);

  // per-source breakdown (over the date-window, before the source filter)
  const bySource = SALE_SOURCES.map((s) => {
    const list = base.filter((x) => saleSourceOf(x) === s.key);
    return { ...s, count: list.length, amount: list.reduce((a, x) => a + saleTotal(x), 0) };
  });

  const exportCsv = () => {
    const head = ["Invoice", "Date", "Source", "Patient/Customer", "Ward", "Payment", "Insurer", "Paid", "Amount"];
    const lines = rows.map((s) => [s.id, fmtDateTime(s.createdAt), SALE_SOURCE_LABEL[saleSourceOf(s)], s.customer.name, s.ward ?? "", PAY_LABEL[s.payMode], s.insurer ?? "", s.paid === false ? "Unpaid" : "Paid", Math.round(saleTotal(s))]);
    const csv = [head, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), "hospital-sales-register.csv");
  };
  const exportPdf = () => {
    const headerLine = "Invoice    Date              Source     Patient            Payment      Paid    Amount";
    const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n));
    const rowLines = rows.map((s) => `${pad(s.id, 10)} ${pad(fmtDateTime(s.createdAt), 17)} ${pad(SALE_SOURCES.find((x) => x.key === saleSourceOf(s))!.short, 10)} ${pad(s.customer.name, 18)} ${pad(PAY_LABEL[s.payMode], 12)} ${pad(s.paid === false ? "Unpaid" : "Paid", 7)} ${("Rs " + Math.round(saleTotal(s))).padStart(9)}`);
    const blob = buildReportPdf({ title: "Hospital Sales Register", subtitle: `${period.label} · ${rows.length} sales · ${src === "all" ? "all sources" : SALE_SOURCE_LABEL[src as SaleSource]}`, generatedAt: fmtDateTime(now), profile, headerLine, rowLines, totalsLine: `Total: Rs ${Math.round(revenue)}   ·   Paid: Rs ${Math.round(paidAmt)}   ·   Unpaid: Rs ${Math.round(unpaidAmt)}` });
    download(blob, "hospital-sales-register.pdf");
  };

  return (
    <div className="pd-canvas-wide">
      {/* source breakdown */}
      <div className="pd-grid-cards" style={{ marginBottom: 16, gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {bySource.map((s) => (
          <button key={s.key} className={`pd-card pd-card-pad pd-srccard${src === s.key ? " on" : ""}`} onClick={() => setSrc(src === s.key ? "all" : s.key)} style={{ textAlign: "left", cursor: "pointer" }}>
            <div className="pd-flex" style={{ justifyContent: "space-between" }}>
              <span style={{ fontSize: 20 }}>{s.emoji}</span>
              <span className="pd-muted" style={{ fontSize: 12, fontWeight: 700 }}>{s.count}</span>
            </div>
            <div style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 18, marginTop: 6 }}>{inr(s.amount)}</div>
            <div className="pd-muted" style={{ fontSize: 12 }}>{s.label}</div>
          </button>
        ))}
      </div>

      <div className="pd-toolbar">
        {period.node}
        <div className="pd-flex pd-gap6">
          <button className={`pd-chip${src === "all" ? " on" : ""}`} onClick={() => setSrc("all")}>All sources</button>
          {SALE_SOURCES.map((s) => <button key={s.key} className={`pd-chip${src === s.key ? " on" : ""}`} onClick={() => setSrc(s.key)}>{s.short}</button>)}
        </div>
        <div className="pd-spacer" />
        <button className="pd-btn pd-btn-ghost" onClick={exportCsv}><IconReports size={15} /> Excel</button>
        <button className="pd-btn pd-btn-ghost" onClick={exportPdf}><IconPrint size={15} /> PDF</button>
      </div>

      <div className="pd-toolbar" style={{ marginTop: 10 }}>
        <select className="pd-select" value={pay} onChange={(e) => setPay(e.target.value as PayMode | "all")}>
          <option value="all">All payment modes</option>
          {(["cash", "upi", "card", "cod", "credit", "insurance"] as PayMode[]).map((m) => <option key={m} value={m}>{PAY_LABEL[m]}</option>)}
        </select>
        <select className="pd-select" value={paid} onChange={(e) => setPaid(e.target.value as "all" | "paid" | "unpaid")}>
          <option value="all">Paid & Unpaid</option>
          <option value="paid">Paid only</option>
          <option value="unpaid">Unpaid only</option>
        </select>
        <select className="pd-select" value={insurer} onChange={(e) => setInsurer(e.target.value)}>
          <option value="all">All insurers / TPA</option>
          {insurers.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select className="pd-select" value={ward} onChange={(e) => setWard(e.target.value)}>
          <option value="all">All wards</option>
          {wardsList.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
        <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Invoice, patient, phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      <div className="pd-summary-chips" style={{ margin: "16px 0" }}>
        <div className="pd-schip">Sales<b>{rows.length}</b></div>
        <div className="pd-schip">Revenue<b>{inr(revenue)}</b></div>
        <div className="pd-schip">Paid<b>{inr(paidAmt)}</b></div>
        <div className="pd-schip">Unpaid / pending<b>{inr(unpaidAmt)}</b></div>
        <div className="pd-schip">Insurance / TPA<b>{inr(insAmt)}</b></div>
      </div>

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>Invoice</th><th>Date</th><th>Source</th><th>Patient / Customer</th><th>Ward</th><th>Payment</th><th>Status</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {rows.map((s) => {
                const so = saleSourceOf(s);
                return (
                  <tr key={s.id}>
                    <td className="pd-mono" style={{ fontWeight: 700 }}>{s.id}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(s.createdAt)}</td>
                    <td><span className={`pd-pill ${SRC_TONE[so]}`}>{SALE_SOURCES.find((x) => x.key === so)!.short}</span></td>
                    <td>{s.customer.name}{s.customer.doctor ? <div className="pd-muted" style={{ fontSize: 11 }}>Dr. {s.customer.doctor.replace(/^Dr\.?\s*/i, "")}</div> : null}</td>
                    <td>{s.ward ?? "—"}</td>
                    <td>{PAY_LABEL[s.payMode]}{s.insurer ? <div className="pd-muted" style={{ fontSize: 11 }}>{s.insurer}</div> : null}</td>
                    <td><span className={`pd-pill ${s.paid === false ? "pill-rose" : "pill-green"}`}>{s.paid === false ? "Unpaid" : "Paid"}</span></td>
                    <td className="num" style={{ fontWeight: 800 }}>{inr(saleTotal(s))}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={8}><div className="pd-empty">No sales match these filters.</div></td></tr>}
            </tbody>
            {rows.length > 0 && <tfoot><tr><td colSpan={7} style={{ textAlign: "right", fontWeight: 700 }}>Total</td><td className="num" style={{ fontWeight: 800 }}>{inr(revenue)}</td></tr></tfoot>}
          </table>
        </div>
      </div>
    </div>
  );
}
