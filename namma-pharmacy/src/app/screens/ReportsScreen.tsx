"use client";
import { useState, useMemo, useEffect, ReactNode } from "react";
import { usePharma } from "../pharmaState";
import {
  inr, inr2, computeInvoice, Sale, PAY_LABEL, PayMode, Channel, OrderStatus,
  STATUS_LABEL, channelLabel, catLabel, CATEGORIES, purchaseTotals,
  earliestBatch, stockOf, fmtDateTime,
} from "../data";
import { IconPrint, IconRupee, IconSearch, IconSparkle, IconReceipt, IconDoc, IconBox, IconUsers, IconDownload, IconChart, IconTrendUp } from "../components/Icon";
import { usePeriod } from "../components/PeriodFilter";
import {
  REPORT_CATALOG, CAT_LABEL, ReportCat, ReportMeta, runReport, ReportResult, reportById,
} from "../lib/reportCatalog";
import { exportCatalogCsv, exportCatalogPdf } from "../lib/reportExport";

type Tab = "overview" | "sales" | "products" | "accounts";

// ════════════════════════ REPORTS (hub → detail / analytics) ════════════════════════
const CAT_ICON: Record<ReportCat, ReactNode> = { favourite: <IconSparkle size={15} />, gst: <IconReceipt size={15} />, transaction: <IconDoc size={15} />, item: <IconBox size={15} />, party: <IconUsers size={15} /> };
const FILTER_PRED: Record<string, (m: ReportMeta) => boolean> = {
  Party: (m) => m.cat === "party",
  Category: (m) => /categor/i.test(m.name) || m.cat === "item",
  "Payment Collection": (m) => ["cash-bank", "receivable-ageing", "party-outstanding", "party-ledger", "tcs-receivable", "tds-payable", "tds-receivable"].includes(m.id),
  Item: (m) => m.cat === "item",
  "Invoice Details": (m) => ["audit-trail", "bill-wise-profit", "gstr1", "gst-sales-hsn", "sales-summary", "purchase-summary"].includes(m.id),
  Summary: (m) => /summary/i.test(m.name) || m.fav === true,
};
const FILTERS = Object.keys(FILTER_PRED);

export default function ReportsScreen() {
  const { reportTarget, setReportTarget, registerBack } = usePharma();
  const initial = reportTarget && reportById(reportTarget);
  const [view, setView] = useState<{ kind: "hub" } | { kind: "detail"; id: string } | { kind: "analytics"; tab: Tab }>(
    initial ? (initial.analytics ? { kind: "analytics", tab: initial.analytics } : { kind: "detail", id: initial.id }) : { kind: "hub" }
  );
  useEffect(() => { if (reportTarget) setReportTarget(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // let the global Back button close a report sub-view before it pops the route
  useEffect(() => {
    registerBack(view.kind === "hub" ? null : () => { setView({ kind: "hub" }); return true; });
    return () => registerBack(null);
  }, [view.kind, registerBack]);
  if (view.kind === "analytics") return <AnalyticsDashboard initialTab={view.tab} onBack={() => setView({ kind: "hub" })} />;
  if (view.kind === "detail") return <ReportDetail id={view.id} onBack={() => setView({ kind: "hub" })} />;
  return <ReportHub onOpen={(m) => setView(m.analytics ? { kind: "analytics", tab: m.analytics } : { kind: "detail", id: m.id })} />;
}

function ReportHub({ onOpen }: { onOpen: (m: ReportMeta) => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const match = (m: ReportMeta) =>
    (!q.trim() || m.name.toLowerCase().includes(q.toLowerCase()) || m.desc.toLowerCase().includes(q.toLowerCase())) &&
    (!active || FILTER_PRED[active](m));
  const favourites = REPORT_CATALOG.filter((m) => m.fav && match(m));
  const groups: { cat: ReportCat; items: ReportMeta[] }[] = (["gst", "transaction", "item", "party"] as ReportCat[])
    .map((cat) => ({ cat, items: REPORT_CATALOG.filter((m) => m.cat === cat && !m.fav && match(m)) }));

  const Card = ({ m }: { m: ReportMeta }) => (
    <button className="pd-report-row" onClick={() => onOpen(m)}>
      <span className="nm">{m.name}</span>
      {m.fav && <span className="star">★</span>}
    </button>
  );

  return (
    <div className="pd-canvas-wide">
      <div className="pd-toolbar">
        <div className="pd-flex pd-gap6" style={{ flexWrap: "wrap", alignItems: "center" }}>
          <span className="pd-muted" style={{ fontWeight: 700, fontSize: 13 }}>Filter By</span>
          {FILTERS.map((f) => (
            <button key={f} className={`pd-chip${active === f ? " on" : ""}`} onClick={() => setActive((a) => (a === f ? null : f))}>{f}</button>
          ))}
        </div>
        <div className="pd-spacer" />
        <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Find report…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      <div className="pd-report-grid">
        <div className="pd-report-col">
          <div className="pd-report-head">{CAT_ICON.favourite} Favourite</div>
          {favourites.map((m) => <Card key={m.id} m={m} />)}
          {favourites.length === 0 && <div className="pd-muted" style={{ padding: "8px 2px", fontSize: 12.5 }}>No matches</div>}
        </div>
        {groups.map((g) => (
          <div className="pd-report-col" key={g.cat}>
            <div className="pd-report-head">{CAT_ICON[g.cat]} {CAT_LABEL[g.cat]}</div>
            {g.items.map((m) => <Card key={m.id} m={m} />)}
            {g.items.length === 0 && <div className="pd-muted" style={{ padding: "8px 2px", fontSize: 12.5 }}>No matches</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { sales, purchases, inventory, expenses, now, profile } = usePharma();
  const meta = reportById(id);
  const period = usePeriod(now, "month");
  const res: ReportResult = useMemo(
    () => runReport(id, { sales, purchases, inventory, expenses, profile, now, range: { from: period.start, to: period.end, label: period.label } }),
    [id, sales, purchases, inventory, expenses, profile, now, period.start, period.end, period.label]
  );
  const range = { from: period.start, to: period.end, label: period.label };
  const fmt = (v: string | number | undefined, money?: boolean) => (typeof v === "number" ? (money ? inr(v) : v.toLocaleString("en-IN")) : (v ?? ""));

  return (
    <div className="pd-canvas-wide pd-print-area">
      <div className="pd-toolbar pd-no-print">
        <button className="pd-btn pd-btn-ghost" onClick={onBack}>← All reports</button>
        <div className="pd-spacer" />
        {period.node}
        <button className="pd-btn pd-btn-ghost" disabled={!res.rows.length} onClick={() => exportCatalogCsv(meta?.name ?? id, res, range, now)}><IconDownload size={14} /> Excel</button>
        <button className="pd-btn pd-btn-ghost" disabled={!res.rows.length} onClick={() => exportCatalogPdf(meta?.name ?? id, res, profile, range, now)}><IconPrint size={16} /> PDF</button>
      </div>

      <div className="pd-flex" style={{ alignItems: "baseline", gap: 10, marginBottom: 6 }}>
        <h2 style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 20 }}>{meta?.name ?? id}</h2>
        <span className="pd-pill pill-green"><i className="d" />{period.label}</span>
      </div>
      {meta?.desc && <p className="pd-muted" style={{ fontSize: 13, marginBottom: 14 }}>{meta.desc} · {res.rows.length} rows</p>}

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr>{res.columns.map((c) => <th key={c.key} className={c.money || c.num ? "num" : ""}>{c.label}</th>)}</tr></thead>
            <tbody>
              {res.rows.map((row, ri) => (
                <tr key={ri}>{row.map((cellv, ci) => {
                  const c = res.columns[ci];
                  const isSection = typeof cellv === "string" && row[ci + 1] === "" && ci === 0;
                  return <td key={ci} className={c.money || c.num ? "num" : ""} style={isSection ? { fontWeight: 800, color: "var(--dark)" } : undefined}>{fmt(cellv, c.money)}</td>;
                })}</tr>
              ))}
              {res.rows.length === 0 && <tr><td colSpan={res.columns.length}><div className="pd-empty"><div className="em"><IconChart size={30} /></div><p>{res.note ?? "No data for this period."}</p></div></td></tr>}
            </tbody>
            {res.totals && res.rows.length > 0 && <tfoot><tr>{res.totals.map((t, ti) => <td key={ti} className={res.columns[ti]?.money || res.columns[ti]?.num ? "num" : ""}>{fmt(t, res.columns[ti]?.money)}</td>)}</tr></tfoot>}
          </table>
        </div>
      </div>
      {res.note && res.rows.length > 0 && <p className="pd-muted" style={{ fontSize: 12, marginTop: 10 }}>ⓘ {res.note}</p>}
    </div>
  );
}

function AnalyticsDashboard({ initialTab, onBack }: { initialTab: Tab; onBack: () => void }) {
  const { sales, purchases, inventory, now, profile } = usePharma();
  const [tab, setTab] = useState<Tab>(initialTab);

  // ── shared date period (Day / Month / Year / FY / Custom / All) ──
  const period = usePeriod(now, "month");
  const inWindow = period.inWindow;
  const windowLabel = period.label;
  const winStart = period.start, winEnd = period.end;

  // ── cost lookup (approx: current PTR) for margin / COGS ──
  const costOf = (productId: string) => {
    const p = inventory.find((x) => x.id === productId);
    return p ? (earliestBatch(p)?.ptr ?? p.batches[0]?.ptr ?? 0) : 0;
  };

  // ── enriched sales in window (excl. cancelled) ──
  const enriched = useMemo(() => sales
    .filter((s) => s.status !== "cancelled" && inWindow(s.createdAt))
    .map((s) => {
      const t = computeInvoice(s.items, s.discount);
      const cogs = s.items.reduce((a, i) => a + costOf(i.productId) * i.qty, 0);
      return { s, t, cogs };
    }), [sales, inventory, winStart, winEnd]); // eslint-disable-line

  const winPurchases = useMemo(() => purchases.filter((p) => inWindow(p.createdAt)), [purchases, winStart, winEnd]); // eslint-disable-line

  // ── aggregates ──
  const revenue = enriched.reduce((a, r) => a + r.t.payable, 0);
  const taxable = enriched.reduce((a, r) => a + r.t.taxable, 0);
  const outputGst = enriched.reduce((a, r) => a + r.t.totalTax, 0);
  const discounts = enriched.reduce((a, r) => a + r.t.discount, 0);
  const cogs = enriched.reduce((a, r) => a + r.cogs, 0);
  const grossProfit = taxable - cogs;
  const margin = taxable > 0 ? (grossProfit / taxable) * 100 : 0;
  const units = enriched.reduce((a, r) => a + r.s.items.reduce((x, i) => x + i.qty, 0), 0);
  const avg = enriched.length ? revenue / enriched.length : 0;

  const purchaseTotal = winPurchases.reduce((a, p) => a + purchaseTotals(p.items).total, 0);
  const inputGst = winPurchases.reduce((a, p) => a + purchaseTotals(p.items).gst, 0);
  const netGst = outputGst - inputGst;

  const online = enriched.filter((r) => r.s.channel === "online");
  const offline = enriched.filter((r) => r.s.channel === "offline");
  const onlineRev = online.reduce((a, r) => a + r.t.payable, 0);
  const offlineRev = offline.reduce((a, r) => a + r.t.payable, 0);
  const onlinePct = revenue ? Math.round((onlineRev / revenue) * 100) : 0;

  const payMap = new Map<PayMode, number>();
  enriched.forEach((r) => payMap.set(r.s.payMode, (payMap.get(r.s.payMode) ?? 0) + r.t.payable));

  // receivables: online COD not yet delivered/cancelled
  const receivables = sales.filter((s) => s.channel === "online" && s.payMode === "cod" && !["delivered", "cancelled"].includes(s.status))
    .reduce((a, s) => a + computeInvoice(s.items, s.discount).payable, 0);

  return (
    <div className="pd-canvas-wide pd-print-area">
      {/* ── filter bar ── */}
      <div className="pd-toolbar pd-no-print">
        <button className="pd-btn pd-btn-ghost" onClick={onBack}>← All reports</button>
        <div className="pd-seg">
          {(["overview", "sales", "products", "accounts"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>
              {t === "overview" ? "Overview" : t === "sales" ? "Sales register" : t === "products" ? "Products" : "Accounts & GST"}
            </button>
          ))}
        </div>
        <div className="pd-spacer" />
        {period.node}
        <button className="pd-btn pd-btn-ghost" onClick={() => window.print()}><IconPrint size={16} /> Export</button>
      </div>

      <div className="pd-flex pd-no-print" style={{ marginBottom: 16, gap: 8 }}>
        <span className="pd-pill pill-green"><i className="d" />Showing: {windowLabel}</span>
        <span className="pd-muted" style={{ fontSize: 12.5 }}>{enriched.length} sales · {winPurchases.length} purchases</span>
      </div>

      {tab === "overview" && <Overview {...{ revenue, grossProfit, margin, taxable, outputGst, netGst, units, avg, enriched, onlineRev, offlineRev, onlinePct, payMap, online, offline }} />}
      {tab === "sales" && <SalesRegister enriched={enriched} now={now} />}
      {tab === "products" && <ProductsReport enriched={enriched} inventory={inventory} costOf={costOf} />}
      {tab === "accounts" && <Accounts {...{ revenue, taxable, cogs, grossProfit, margin, discounts, outputGst, inputGst, netGst, purchaseTotal, payMap, receivables, enriched, winPurchases, profile, now }} />}
    </div>
  );
}

// ════════════════════ OVERVIEW ════════════════════
function Overview(p: any) {
  const { revenue, grossProfit, margin, outputGst, netGst, units, avg, enriched, onlineRev, offlineRev, onlinePct, payMap, online, offline } = p;
  // top items by GST-exclusive value
  const catRev = new Map<string, number>();
  enriched.forEach((r: any) => r.s.items.forEach((i: any) => {
    const ex = (i.price * i.qty) / (1 + i.gst / 100);
    // category isn't on SaleItem; group by GST slab band as a proxy label
    catRev.set(i.name, (catRev.get(i.name) ?? 0) + ex);
  }));
  const topItems = [...catRev.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topMax = Math.max(1, ...topItems.map((x) => x[1]));

  return (
    <>
      <div className="pd-stats">
        <div className="pd-stat"><div className="ic ic-green"><IconRupee size={19} /></div><div className="lbl">Net revenue</div><div className="val">{inr(revenue)}</div><div className="split">{enriched.length} sales · avg {inr(avg)}</div></div>
        <div className="pd-stat"><div className="ic ic-blue"><IconTrendUp size={18} /></div><div className="lbl">Gross profit</div><div className="val">{inr(grossProfit)}</div><div className="split">{margin.toFixed(1)}% margin</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconBox size={18} /></div><div className="lbl">Units sold</div><div className="val">{units}</div><div className="split">across {enriched.length} bills</div></div>
        <div className="pd-stat"><div className="ic ic-rose"><IconReceipt size={18} /></div><div className="lbl">{netGst >= 0 ? "Net GST payable" : "Net GST credit (c/f)"}</div><div className="val">{inr(Math.abs(netGst))}</div><div className="split">output {inr(outputGst)}</div></div>
      </div>

      <div className="pd-grid-2">
        <div className="pd-card">
          <div className="pd-card-head"><h3>Top items by value</h3><span className="sub">GST-exclusive</span></div>
          <div className="pd-card-pad">
            {topItems.length === 0 ? <div className="pd-empty" style={{ padding: 20 }}><p>No sales in this period.</p></div> :
              topItems.map(([name, val]) => (
                <div key={name} style={{ marginBottom: 12 }}>
                  <div className="pd-flex" style={{ justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span style={{ fontWeight: 700 }}>{name}</span><b>{inr(val)}</b></div>
                  <div className="pd-prog"><i style={{ width: `${(val / topMax) * 100}%` }} /></div>
                </div>
              ))}
          </div>
        </div>

        <div className="pd-card">
          <div className="pd-card-head"><h3>Channel & payment mix</h3></div>
          <div className="pd-card-pad">
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>Online vs Counter</div>
            <div style={{ display: "flex", height: 16, borderRadius: 8, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ width: `${onlinePct}%`, background: "var(--mid)" }} />
              <div style={{ width: `${100 - onlinePct}%`, background: "var(--gold)" }} />
            </div>
            <div className="pd-flex" style={{ justifyContent: "space-between", fontSize: 12, marginBottom: 18 }}>
              <span><b style={{ color: "var(--mid)" }}>● Online</b> {inr(onlineRev)} · {online.length}</span>
              <span><b style={{ color: "var(--gold-d)" }}>● Counter</b> {inr(offlineRev)} · {offline.length}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 10 }}>By payment method</div>
            {(["cash", "upi", "card", "cod"] as PayMode[]).map((m) => {
              const v = payMap.get(m) ?? 0; const pct = revenue ? (v / revenue) * 100 : 0;
              return (
                <div key={m} style={{ marginBottom: 9 }}>
                  <div className="pd-flex" style={{ justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}><span>{PAY_LABEL[m]}</span><b>{inr(v)}</b></div>
                  <div className="pd-prog"><i style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// ════════════════════ SALES REGISTER ════════════════════
type SSort = "date" | "total" | "items" | "customer";
function SalesRegister({ enriched, now }: { enriched: any[]; now: number }) {
  const [q, setQ] = useState("");
  const [chan, setChan] = useState<"all" | Channel>("all");
  const [pay, setPay] = useState<"all" | PayMode>("all");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [rxOnly, setRxOnly] = useState(false);
  const [sort, setSort] = useState<SSort>("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const toggle = (k: SSort) => { if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc")); else { setSort(k); setDir("desc"); } };

  let rows = enriched.filter(({ s }) => {
    if (chan !== "all" && s.channel !== chan) return false;
    if (pay !== "all" && s.payMode !== pay) return false;
    if (status !== "all" && s.status !== status) return false;
    if (rxOnly && !s.rx) return false;
    if (q && !(`${s.id} ${s.customer.name} ${s.customer.phone ?? ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  rows = [...rows].sort((a, b) => {
    const m = dir === "asc" ? 1 : -1;
    if (sort === "total") return (a.t.payable - b.t.payable) * m;
    if (sort === "items") return (a.s.items.reduce((x: number, i: any) => x + i.qty, 0) - b.s.items.reduce((x: number, i: any) => x + i.qty, 0)) * m;
    if (sort === "customer") return a.s.customer.name.localeCompare(b.s.customer.name) * m;
    return (a.s.createdAt - b.s.createdAt) * m;
  });

  const tGross = rows.reduce((a, r) => a + r.t.gross, 0);
  const tDisc = rows.reduce((a, r) => a + r.t.discount, 0);
  const tTax = rows.reduce((a, r) => a + r.t.totalTax, 0);
  const tNet = rows.reduce((a, r) => a + r.t.payable, 0);
  const ar = (k: SSort) => (sort === k ? (dir === "asc" ? "▲" : "▼") : "");

  return (
    <>
      <div className="pd-summary-chips">
        <div className="pd-schip">Bills<b>{rows.length}</b></div>
        <div className="pd-schip">Gross<b>{inr(tGross)}</b></div>
        <div className="pd-schip">Discounts<b>{inr(tDisc)}</b></div>
        <div className="pd-schip">GST<b>{inr(tTax)}</b></div>
        <div className="pd-schip">Net collected<b>{inr(tNet)}</b></div>
      </div>

      <div className="pd-toolbar pd-no-print">
        <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Invoice, customer, phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="pd-select" style={{ width: 130 }} value={chan} onChange={(e) => setChan(e.target.value as any)}><option value="all">All channels</option><option value="online">Online</option><option value="offline">Counter</option></select>
        <select className="pd-select" style={{ width: 120 }} value={pay} onChange={(e) => setPay(e.target.value as any)}><option value="all">All payments</option>{(["cash", "upi", "card", "cod"] as PayMode[]).map((m) => <option key={m} value={m}>{PAY_LABEL[m]}</option>)}</select>
        <select className="pd-select" style={{ width: 130 }} value={status} onChange={(e) => setStatus(e.target.value as any)}><option value="all">All statuses</option>{(["new", "accepted", "packed", "out", "delivered", "completed"] as OrderStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
        <button className={`pd-chip${rxOnly ? " on" : ""}`} onClick={() => setRxOnly((v) => !v)}>℞ Rx only</button>
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
                <th>Payment</th><th>Status</th>
                <th className="num">Disc.</th><th className="num">Taxable</th><th className="num">GST</th>
                <th className={`sort num${sort === "total" ? " on" : ""}`} onClick={() => toggle("total")}>Total<span className="ar">{ar("total")}</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, t }) => (
                <tr key={s.id}>
                  <td className="pd-mono" style={{ fontWeight: 700 }}>{s.id}{s.rx && <span className="pd-tag rx" style={{ marginLeft: 5 }}>Rx</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(s.createdAt)}</td>
                  <td>{s.customer.name}</td>
                  <td>{s.channel === "online" ? <span className="pd-pill pill-blue">Online</span> : <span className="pd-pill pill-gray">Counter</span>}</td>
                  <td className="num">{s.items.reduce((x: number, i: any) => x + i.qty, 0)}</td>
                  <td>{PAY_LABEL[s.payMode as PayMode]}</td>
                  <td>{STATUS_LABEL[s.status as OrderStatus]}</td>
                  <td className="num">{t.discount > 0 ? inr(t.discount) : "—"}</td>
                  <td className="num">{inr(t.taxable)}</td>
                  <td className="num">{inr(t.totalTax)}</td>
                  <td className="num" style={{ fontWeight: 800 }}>{inr(t.payable)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={11}><div className="pd-empty"><div className="em"><IconSearch size={30} /></div><p>No sales match these filters.</p></div></td></tr>}
            </tbody>
            {rows.length > 0 && <tfoot><tr><td colSpan={7}>Total · {rows.length} bills</td><td className="num">{inr(tDisc)}</td><td className="num">{inr(rows.reduce((a, r) => a + r.t.taxable, 0))}</td><td className="num">{inr(tTax)}</td><td className="num">{inr(tNet)}</td></tr></tfoot>}
          </table>
        </div>
      </div>
    </>
  );
}

// ════════════════════ PRODUCTS ════════════════════
type PSort = "units" | "revenue" | "profit" | "margin" | "stock";
function ProductsReport({ enriched, inventory, costOf }: { enriched: any[]; inventory: any[]; costOf: (id: string) => number }) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<PSort>("revenue");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const toggle = (k: PSort) => { if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc")); else { setSort(k); setDir("desc"); } };

  // aggregate per product
  const agg = new Map<string, { id: string; name: string; units: number; revenue: number; cogs: number }>();
  enriched.forEach((r: any) => r.s.items.forEach((i: any) => {
    const ex = (i.price * i.qty) / (1 + i.gst / 100);
    const cur = agg.get(i.productId) ?? { id: i.productId, name: i.name, units: 0, revenue: 0, cogs: 0 };
    cur.units += i.qty; cur.revenue += ex; cur.cogs += costOf(i.productId) * i.qty;
    agg.set(i.productId, cur);
  }));

  let rows = [...agg.values()].map((a) => {
    const p = inventory.find((x) => x.id === a.id);
    const profit = a.revenue - a.cogs;
    const margin = a.revenue > 0 ? (profit / a.revenue) * 100 : 0;
    const stock = p ? stockOf(p) : 0;
    return { ...a, profit, margin, stock, category: p?.category ?? "—", emoji: p?.emoji ?? "💊" };
  });
  rows = rows.filter((r) => (cat === "all" || r.category === cat) && (!q || r.name.toLowerCase().includes(q.toLowerCase())));
  rows.sort((a, b) => {
    const m = dir === "asc" ? 1 : -1;
    if (sort === "units") return (a.units - b.units) * m;
    if (sort === "profit") return (a.profit - b.profit) * m;
    if (sort === "margin") return (a.margin - b.margin) * m;
    if (sort === "stock") return (a.stock - b.stock) * m;
    return (a.revenue - b.revenue) * m;
  });
  const ar = (k: PSort) => (sort === k ? (dir === "asc" ? "▲" : "▼") : "");

  // not-sold (dead stock) in this window
  const soldIds = new Set(agg.keys());
  const notSold = inventory.filter((p) => !soldIds.has(p.id)).length;

  return (
    <>
      <div className="pd-summary-chips">
        <div className="pd-schip">Products sold<b>{agg.size}</b></div>
        <div className="pd-schip">Units<b>{rows.reduce((a, r) => a + r.units, 0)}</b></div>
        <div className="pd-schip">Revenue (ex-GST)<b>{inr(rows.reduce((a, r) => a + r.revenue, 0))}</b></div>
        <div className="pd-schip">Gross profit<b>{inr(rows.reduce((a, r) => a + r.profit, 0))}</b></div>
        <div className="pd-schip">No sales (window)<b>{notSold}</b></div>
      </div>

      <div className="pd-toolbar pd-no-print">
        <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Search product…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="pd-select" style={{ width: 160 }} value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All categories</option>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
      </div>

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead>
              <tr>
                <th>Product</th><th>Category</th>
                <th className={`sort num${sort === "units" ? " on" : ""}`} onClick={() => toggle("units")}>Units<span className="ar">{ar("units")}</span></th>
                <th className={`sort num${sort === "revenue" ? " on" : ""}`} onClick={() => toggle("revenue")}>Revenue<span className="ar">{ar("revenue")}</span></th>
                <th className="num">COGS</th>
                <th className={`sort num${sort === "profit" ? " on" : ""}`} onClick={() => toggle("profit")}>Profit<span className="ar">{ar("profit")}</span></th>
                <th className={`sort num${sort === "margin" ? " on" : ""}`} onClick={() => toggle("margin")}>Margin<span className="ar">{ar("margin")}</span></th>
                <th className={`sort num${sort === "stock" ? " on" : ""}`} onClick={() => toggle("stock")}>In stock<span className="ar">{ar("stock")}</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><div className="prod"><span className="em">{r.emoji}</span><span className="nm">{r.name}</span></div></td>
                  <td>{catLabel(r.category)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{r.units}</td>
                  <td className="num">{inr(r.revenue)}</td>
                  <td className="num pd-muted">{inr(r.cogs)}</td>
                  <td className="num" style={{ fontWeight: 700, color: r.profit >= 0 ? "var(--green)" : "var(--rose)" }}>{inr(r.profit)}</td>
                  <td className="num"><span className={`pd-pill ${r.margin >= 30 ? "pill-green" : r.margin >= 15 ? "pill-gold" : "pill-rose"}`}>{r.margin.toFixed(0)}%</span></td>
                  <td className="num">{r.stock}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8}><div className="pd-empty"><div className="em"><IconBox size={30} /></div><p>No products sold in this period / filter.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ════════════════════ ACCOUNTS & GST ════════════════════
function Accounts(p: any) {
  const { revenue, taxable, cogs, grossProfit, margin, discounts, outputGst, inputGst, netGst, purchaseTotal, payMap, receivables, enriched, winPurchases, profile, now } = p;

  // GST slab breakup (output)
  const slabMap = new Map<number, { taxable: number; tax: number }>();
  enriched.forEach((r: any) => r.t.lines.forEach((l: any) => {
    const cur = slabMap.get(l.gst) ?? { taxable: 0, tax: 0 };
    slabMap.set(l.gst, { taxable: cur.taxable + l.taxable, tax: cur.tax + l.cgst + l.sgst });
  }));
  const slabs = [...slabMap.entries()].sort((a, b) => a[0] - b[0]);

  // day book — net sales & purchases per day
  const dayMap = new Map<string, { sales: number; purch: number }>();
  enriched.forEach((r: any) => { const k = new Date(r.s.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); const c = dayMap.get(k) ?? { sales: 0, purch: 0 }; c.sales += r.t.payable; dayMap.set(k, c); });
  winPurchases.forEach((pu: any) => { const k = new Date(pu.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); const c = dayMap.get(k) ?? { sales: 0, purch: 0 }; c.purch += purchaseTotals(pu.items).total; dayMap.set(k, c); });
  const days = [...dayMap.entries()];

  return (
    <>
      <div className="pd-grid-2b" style={{ marginBottom: 16 }}>
        {/* P&L */}
        <div className="pd-card">
          <div className="pd-card-head"><h3>Profit & Loss</h3><span className="sub">{profile.name}</span></div>
          <div className="pd-card-pad pd-pl">
            <div className="pd-pl-head">Income</div>
            <div className="r"><span className="lb">Gross sales (incl. GST)</span><span className="vl">{inr(revenue + discounts)}</span></div>
            <div className="r sub"><span className="lb">less: discounts given</span><span className="vl neg">− {inr(discounts)}</span></div>
            <div className="r sub"><span className="lb">less: output GST</span><span className="vl neg">− {inr(outputGst)}</span></div>
            <div className="r"><span className="lb">Net sales (taxable)</span><span className="vl">{inr(taxable)}</span></div>
            <div className="pd-pl-head">Cost of goods</div>
            <div className="r"><span className="lb">COGS (at purchase cost)</span><span className="vl neg">− {inr(cogs)}</span></div>
            <div className="r tot"><span className="lb">Gross profit</span><span className="vl pos">{inr(grossProfit)} <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>· {margin.toFixed(1)}%</span></span></div>
          </div>
        </div>

        {/* GST liability */}
        <div className="pd-card">
          <div className="pd-card-head"><h3>GST liability</h3><span className="sub">{profile.gstin}</span></div>
          <div className="pd-card-pad pd-pl">
            <div className="pd-pl-head">Output tax (on sales)</div>
            {slabs.length === 0 && <div className="r"><span className="lb pd-muted">No taxable sales</span><span className="vl">—</span></div>}
            {slabs.map(([gst, v]) => (
              <div className="r sub" key={gst}><span className="lb">GST {gst}% · CGST {gst / 2} + SGST {gst / 2}</span><span className="vl">{inr2(v.tax)}</span></div>
            ))}
            <div className="r"><span className="lb">Total output GST</span><span className="vl">{inr(outputGst)}</span></div>
            <div className="pd-pl-head">Input tax credit (on purchases)</div>
            <div className="r"><span className="lb">Input GST (GSTR-2)</span><span className="vl neg">− {inr(inputGst)}</span></div>
            <div className="r tot"><span className="lb">{netGst >= 0 ? "Net GST payable" : "Net GST credit (carried fwd)"}</span><span className={`vl ${netGst >= 0 ? "neg" : "pos"}`}>{inr(Math.abs(netGst))}</span></div>
          </div>
        </div>
      </div>

      <div className="pd-grid-2" style={{ marginBottom: 16 }}>
        {/* collections + receivables */}
        <div className="pd-card">
          <div className="pd-card-head"><h3>Cash & collections</h3></div>
          <div className="pd-card-pad">
            {(["cash", "upi", "card", "cod"] as PayMode[]).map((m) => {
              const v = payMap.get(m) ?? 0; const pct = revenue ? (v / revenue) * 100 : 0;
              return (
                <div className="pd-bd" key={m}>
                  <span className="nm">{PAY_LABEL[m]}</span>
                  <span className="track"><i style={{ width: `${pct}%` }} /></span>
                  <b style={{ minWidth: 80, textAlign: "right" }}>{inr(v)}</b>
                </div>
              );
            })}
            <div className="pd-flex" style={{ justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--line-2)" }}>
              <span className="pd-muted" style={{ fontSize: 13 }}>COD receivable (in transit)</span>
              <b style={{ fontFamily: "Manrope", fontSize: 16, color: "var(--amber)" }}>{inr(receivables)}</b>
            </div>
          </div>
        </div>

        {/* purchases summary */}
        <div className="pd-card">
          <div className="pd-card-head"><h3>Purchases (inward)</h3></div>
          <div className="pd-card-pad pd-pl">
            <div className="r"><span className="lb">Goods purchased (incl. GST)</span><span className="vl">{inr(purchaseTotal)}</span></div>
            <div className="r"><span className="lb">Input GST credit</span><span className="vl">{inr(inputGst)}</span></div>
            <div className="r"><span className="lb">GRNs entered</span><span className="vl">{winPurchases.length}</span></div>
            <div className="r tot"><span className="lb">Net stock investment</span><span className="vl">{inr(purchaseTotal - inputGst)}</span></div>
          </div>
        </div>
      </div>

      {/* day book */}
      <div className="pd-card">
        <div className="pd-card-head"><h3>Day book</h3><span className="sub">net sales vs purchases</span></div>
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>Day</th><th className="num">Net sales</th><th className="num">Purchases</th><th className="num">Net cash flow</th></tr></thead>
            <tbody>
              {days.length === 0 && <tr><td colSpan={4}><div className="pd-empty" style={{ padding: 20 }}><p>No activity in this period.</p></div></td></tr>}
              {days.map(([k, v]) => (
                <tr key={k}><td style={{ fontWeight: 600 }}>{k}</td><td className="num">{inr(v.sales)}</td><td className="num pd-muted">{v.purch ? inr(v.purch) : "—"}</td><td className="num" style={{ fontWeight: 700, color: v.sales - v.purch >= 0 ? "var(--green)" : "var(--rose)" }}>{inr(v.sales - v.purch)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
