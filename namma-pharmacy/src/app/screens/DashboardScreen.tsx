"use client";
import { useMemo, useState } from "react";
import { usePharma } from "../pharmaState";
import {
  inr, computeInvoice, isLowStock, isExpiringSoon, earliestBatch, monthsToExpiry,
  stockOf, timeAgo, catLabel, Sale, PayMode, PAY_LABEL, SaleSource, saleSourceOf,
} from "../data";
import { StatusPill, ChannelPill, Thumb } from "../components/bits";
import { IconRupee, IconOrders, IconRx, IconAlert, IconArrowRight, IconCheck, IconGlobe, IconBox, IconCalendar, IconDonut, IconBars, IconTrendUp, IconTrendDown, IconPos, IconTruck, IconSend, IconStore, IconStar } from "../components/Icon";

const saleTotal = (s: Sale) => computeInvoice(s.items, s.discount).payable;
const DAY_MS = 86400000;

export default function DashboardScreen() {
  const { sales, inventory, prescriptions, now, go, setInvFilter, isHospital, profile } = usePharma();
  const openAlerts = () => { setInvFilter("alerts"); go("inventory"); };
  const kpiKey = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } };

  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const todays = sales.filter((s) => s.createdAt >= today.getTime() && s.status !== "cancelled");
  const online = todays.filter((s) => s.channel === "online");
  const offline = todays.filter((s) => s.channel === "offline");
  const sum = (arr: Sale[]) => arr.reduce((a, s) => a + saleTotal(s), 0);
  const onlineRev = sum(online), offlineRev = sum(offline), totalRev = onlineRev + offlineRev;

  const newOrders = sales.filter((s) => s.channel === "online" && s.status === "new");
  const pendingRx = prescriptions.filter((r) => r.status === "pending");
  const lowStock = inventory.filter(isLowStock);
  const expiring = inventory.filter((p) => isExpiringSoon(p, now)).sort((a, b) =>
    (earliestBatch(a)?.expiry ?? "").localeCompare(earliestBatch(b)?.expiry ?? ""));

  const recent = [...sales].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  // ── smart extras: greeting, 7-day sparkline, delta, at-a-glance, top sellers ──
  const hour = new Date(now).getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const who = (profile.pharmacist || profile.name || "there").trim() || "there";
  const dateStr = new Date(now).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const dayTotals = useMemo(() => {
    const out: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d0 = new Date(now); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - i);
      const a = d0.getTime(), b = a + DAY_MS;
      out.push(sales.filter((s) => s.status !== "cancelled" && s.createdAt >= a && s.createdAt < b).reduce((x, s) => x + saleTotal(s), 0));
    }
    return out;
  }, [sales, now]);
  const yday = dayTotals[5] ?? 0;
  const salesDelta = yday > 0 ? Math.round(((totalRev - yday) / yday) * 100) : (totalRev > 0 ? 100 : 0);
  const itemsToday = todays.reduce((a, s) => a + s.items.reduce((x, i) => x + i.qty, 0), 0);
  const avgBill = todays.length ? Math.round(totalRev / todays.length) : 0;
  const dueCount = sales.filter((s) => s.paid === false && s.status !== "cancelled").length;
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthRev = sales.filter((s) => s.status !== "cancelled" && s.createdAt >= monthStart.getTime()).reduce((a, s) => a + saleTotal(s), 0);

  const topSellers = useMemo(() => {
    const win = now - 7 * DAY_MS;
    const m: Record<string, { id: string; name: string; qty: number; rev: number }> = {};
    sales.filter((s) => s.status !== "cancelled" && s.createdAt >= win).forEach((s) => s.items.forEach((it) => {
      const e = m[it.productId] ?? { id: it.productId, name: it.name, qty: 0, rev: 0 };
      e.qty += it.qty; e.rev += it.price * it.qty; m[it.productId] = e;
    }));
    return Object.values(m).sort((a, b) => b.rev - a.rev).slice(0, 5);
  }, [sales, now]);
  const topMax = Math.max(...topSellers.map((t) => t.rev), 1);

  const QA = [
    { label: "New sale", sub: "Counter / POS", Icon: IconPos, tone: "green", go: () => go("pos") },
    { label: "New purchase", sub: "Goods inward", Icon: IconTruck, tone: "blue", go: () => go("purchases") },
    { label: "Prescriptions", sub: pendingRx.length ? `${pendingRx.length} pending` : "All clear", Icon: IconRx, tone: "gold", go: () => go("prescriptions") },
    { label: "Reorder", sub: lowStock.length ? `${lowStock.length} low` : "Stock healthy", Icon: IconSend, tone: "violet", go: () => go("reorder") },
  ];

  return (
    <div className="pd-canvas-wide">
      {/* ── hero greeting + quick actions ── */}
      <div className="pd-hero">
        <div className="pd-hero-l">
          <div className="pd-hero-greet">{greet}, {who}</div>
          <div className="pd-hero-sub">{dateStr} · <span className={`pd-dotpill ${profile.storeOpen ? "on" : "off"}`}><i />{profile.storeOpen ? "Store open" : "Store paused"}</span></div>
          <div className="pd-hero-mini">
            <span><small>This month</small><b>{inr(monthRev)}</b></span>
            <span><small>Avg bill today</small><b>{inr(avgBill)}</b></span>
            <span><small>Items sold today</small><b>{itemsToday}</b></span>
            {dueCount > 0 && <span className="warn" role="button" onClick={() => go("khata")}><small>Dues to collect</small><b>{dueCount}</b></span>}
          </div>
        </div>
        <div className="pd-qa">
          {QA.map((a) => (
            <button key={a.label} className={`pd-qa-tile ${a.tone}`} onClick={a.go}>
              <span className="ic"><a.Icon size={18} /></span>
              <span className="tx"><b>{a.label}</b><small>{a.sub}</small></span>
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI cards — each opens its section ── */}
      <div className="pd-stats">
        <div className="pd-stat link kpi accent-green" role="button" tabIndex={0} onClick={() => go("sales")} onKeyDown={kpiKey(() => go("sales"))} title="View all sales">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="kpi-top"><div className="ic ic-green"><IconRupee size={19} /></div>{salesDelta !== 0 && <span className={`pd-trend ${salesDelta >= 0 ? "up" : "down"}`}>{salesDelta >= 0 ? <IconTrendUp size={12} /> : <IconTrendDown size={12} />}{Math.abs(salesDelta)}%</span>}</div>
          <div className="lbl">Today’s sales</div>
          <div className="val">{inr(totalRev)}</div>
          <div className="split"><span className="dt"><IconGlobe size={11} /> {inr(onlineRev)}</span> <span className="dt"><IconStore size={11} /> {inr(offlineRev)}</span></div>
          <Spark data={dayTotals} />
        </div>
        <div className="pd-stat link kpi accent-blue" role="button" tabIndex={0} onClick={() => go("orders")} onKeyDown={kpiKey(() => go("orders"))} title="View orders">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="kpi-top"><div className="ic ic-blue"><IconOrders size={19} /></div>{newOrders.length > 0 && <span className="pd-trend gold">{newOrders.length} new</span>}</div>
          <div className="lbl">Orders today</div>
          <div className="val">{todays.length}</div>
          <div className="split">{newOrders.length > 0 ? <><b style={{ color: "var(--gold-d)" }}>{newOrders.length}</b> awaiting action</> : <><IconCheck size={12} /> all caught up</>}</div>
        </div>
        <div className="pd-stat link kpi accent-gold" role="button" tabIndex={0} onClick={() => go("prescriptions")} onKeyDown={kpiKey(() => go("prescriptions"))} title="Review prescriptions">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="kpi-top"><div className="ic ic-gold"><IconRx size={19} /></div>{pendingRx.length > 0 && <span className="pd-trend gold">to verify</span>}</div>
          <div className="lbl">Prescriptions</div>
          <div className="val">{pendingRx.length}</div>
          <div className="split">pending review</div>
        </div>
        <div className="pd-stat link kpi accent-rose" role="button" tabIndex={0} onClick={openAlerts} onKeyDown={kpiKey(openAlerts)} title="See medicines to reorder & expiring stock">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="kpi-top"><div className="ic ic-rose"><IconAlert size={19} /></div>{lowStock.length + expiring.length > 0 && <span className="pd-trend down">action</span>}</div>
          <div className="lbl">Stock alerts</div>
          <div className="val">{lowStock.length + expiring.length}</div>
          <div className="split"><b>{lowStock.length}</b> low · <b>{expiring.length}</b> expiring</div>
        </div>
      </div>

      {/* sales analytics (filterable) */}
      <SalesAnalytics sales={sales} inventory={inventory} now={now} onlineRev={onlineRev} offlineRev={offlineRev} isHospital={isHospital} />

      <div className="pd-grid-2" style={{ marginTop: 16 }}>
        {/* action queue */}
        <div className="pd-card">
          <div className="pd-card-head"><h3>Needs your attention</h3></div>
          <div className="pd-card-pad" style={{ paddingTop: 4, paddingBottom: 6 }}>
            {newOrders.length === 0 && pendingRx.length === 0 && lowStock.length === 0 ? (
              <div className="pd-empty" style={{ padding: "26px 10px" }}><div className="em"><IconCheck size={30} /></div><h3>All clear</h3><p>No pending orders, prescriptions or stock alerts.</p></div>
            ) : (
              <>
                {newOrders.slice(0, 2).map((o) => (
                  <div className="pd-row" key={o.id}>
                    <span className="em"><IconGlobe size={18} /></span>
                    <span className="gw"><div className="t">New order {o.id}</div><div className="s">{o.customer.name} · {o.items.length} items · {timeAgo(o.createdAt, now)}</div></span>
                    <button className="pd-btn pd-btn-sm pd-btn-primary" onClick={() => go("orders")}>Review</button>
                  </div>
                ))}
                {pendingRx.slice(0, 2).map((r) => (
                  <div className="pd-row" key={r.id}>
                    <span className="em"><IconRx size={18} /></span>
                    <span className="gw"><div className="t">Prescription {r.id}</div><div className="s">{r.patient} · Dr. uploaded {timeAgo(r.uploadedAt, now)}</div></span>
                    <button className="pd-btn pd-btn-sm pd-btn-ghost" onClick={() => go("prescriptions")}>Verify</button>
                  </div>
                ))}
                {lowStock.slice(0, 2).map((p) => (
                  <div className="pd-row" key={p.id}>
                    <span className="em"><IconBox size={18} /></span>
                    <span className="gw"><div className="t">{p.name} running low</div><div className="s">{stockOf(p)} left · reorder at {p.reorderLevel}</div></span>
                    <button className="pd-btn pd-btn-sm pd-btn-ghost" onClick={() => go("inventory")}>Restock</button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* expiring soon */}
        <div className="pd-card">
          <div className="pd-card-head">
            <h3>Expiring soon</h3>
            <button className="pd-btn pd-btn-sm pd-btn-ghost" onClick={() => go("inventory")}>Inventory <IconArrowRight size={14} /></button>
          </div>
          <div className="pd-card-pad" style={{ paddingTop: 4, paddingBottom: 6 }}>
            {expiring.length === 0 ? (
              <div className="pd-empty" style={{ padding: "26px 10px" }}><div className="em"><IconCalendar size={30} /></div><p>No medicines expiring in the next 4 months.</p></div>
            ) : expiring.slice(0, 5).map((p) => {
              const b = earliestBatch(p)!;
              const mo = monthsToExpiry(b.expiry, now);
              const expired = mo < 0;
              return (
                <div className="pd-row" key={p.id}>
                  <span className="em">{p.emoji}</span>
                  <span className="gw"><div className="t">{p.name}</div><div className="s">Batch {b.batchNo} · {catLabel(p.category)} · {b.qty} units</div></span>
                  <span className={`pd-pill ${expired ? "pill-rose" : "pill-gold"}`}>{expired ? "Expired" : `${mo} mo · ${b.expiry}`}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* top sellers + recent transactions */}
      <div className="pd-grid-2b" style={{ marginTop: 16 }}>
        <div className="pd-card">
          <div className="pd-card-head">
            <h3><IconStar size={15} /> Top sellers <span className="pd-muted" style={{ fontWeight: 600, fontSize: 12 }}>· last 7 days</span></h3>
            <button className="pd-btn pd-btn-sm pd-btn-ghost" onClick={() => go("reports")}>Reports <IconArrowRight size={14} /></button>
          </div>
          <div className="pd-card-pad" style={{ paddingTop: 8 }}>
            {topSellers.length === 0 ? (
              <div className="pd-empty" style={{ padding: "24px 10px" }}><div className="em"><IconStar size={28} /></div><p>No sales yet in the last 7 days.</p></div>
            ) : topSellers.map((t, i) => {
              const p = inventory.find((x) => x.id === t.id);
              return (
                <div className="pd-sell" key={t.id}>
                  <span className="rk">{i + 1}</span>
                  <span className="em">{p ? <Thumb p={p} /> : <IconBox size={16} />}</span>
                  <div className="gw">
                    <div className="t">{t.name}</div>
                    <div className="track"><i style={{ width: `${(t.rev / topMax) * 100}%` }} /></div>
                  </div>
                  <div className="amt">{inr(t.rev)}<small>{t.qty} sold</small></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pd-card">
          <div className="pd-card-head">
            <h3>Recent transactions</h3>
            <button className="pd-btn pd-btn-sm pd-btn-ghost" onClick={() => go("orders")}>View all <IconArrowRight size={14} /></button>
          </div>
          <div className="pd-tbl-wrap">
            <table className="pd-tbl">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Status</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => go("orders")}>
                    <td className="pd-mono" style={{ fontWeight: 700 }}>{s.id}</td>
                    <td>{s.customer.name}<div className="s" style={{ fontSize: 11.5, color: "var(--muted)" }}>{timeAgo(s.createdAt, now)}</div></td>
                    <td><StatusPill status={s.status} /></td>
                    <td className="num" style={{ fontWeight: 800 }}>{inr(saleTotal(s))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// small sparkline for the sales KPI
function Spark({ data, color = "var(--mid)" }: { data: number[]; color?: string }) {
  const w = 132, h = 30, max = Math.max(...data, 1), min = Math.min(...data, 0), rng = max - min || 1;
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * w, h - 2 - ((v - min) / rng) * (h - 5)] as const);
  const line = `M ${pts.map((p) => p.join(",")).join(" L ")}`;
  const area = `${line} L ${w},${h} L 0,${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg className="pd-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <path d={area} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {last && <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />}
    </svg>
  );
}

/* ───────────────── Sales analytics (filter-driven) ───────────────── */
type Range = "7D" | "30D" | "12M";
type Ch = "all" | "online" | "offline";
type Metric = "revenue" | "orders";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86400000;
const SRC_COLOR: Record<SaleSource, string> = { opd: "var(--blue)", counter: "var(--gold)", ward: "var(--rose)", emergency: "var(--amber)", online: "var(--mid)" };
// always show every source, in this order, each on its own line
const SRC_ORDER: SaleSource[] = ["online", "counter", "ward", "emergency", "opd"];
const SRC_LABEL: Record<SaleSource, string> = { online: "🌐 Online", counter: "🧾 Counter sale", ward: "🛏️ Ward sale", emergency: "🚑 Emergency sale", opd: "📋 OPD Rx" };

type ChartType = "donut" | "group" | "line";
const CHART_OPTS: { k: ChartType; label: string; Icon: (p: { size?: number }) => React.ReactNode }[] = [
  { k: "donut", label: "Donut", Icon: IconDonut },
  { k: "group", label: "Grouped bars", Icon: IconBars },
  { k: "line", label: "Line", Icon: IconTrendUp },
];
// compact ₹ for chart axes: 1250000 → ₹12.5L, 45000 → ₹45k
const inrK = (n: number) => n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : n >= 1000 ? `₹${Math.round(n / 1000)}k` : `₹${Math.round(n)}`;
type Series = { key: SaleSource; label: string; color: string; rev: number[]; ord: number[] };

function SalesAnalytics({ sales, inventory, now, onlineRev, offlineRev, isHospital }: {
  sales: Sale[]; inventory: ReturnType<typeof usePharma>["inventory"]; now: number; onlineRev: number; offlineRev: number; isHospital: boolean;
}) {
  const [range, setRange] = useState<Range>("7D");
  const [metric, setMetric] = useState<Metric>("revenue");
  const [chart, setChart] = useState<ChartType>("donut");
  const srcOrder = useMemo(() => (isHospital ? SRC_ORDER : (["online", "counter"] as SaleSource[])), [isHospital]);
  const [hidden, setHidden] = useState<Set<SaleSource>>(new Set());

  const windowStart = now - (range === "7D" ? 7 : range === "30D" ? 30 : 365) * DAY;
  const realSales = useMemo(() =>
    sales.filter((s) => s.status !== "cancelled" && s.createdAt >= windowStart),
    [sales, windowStart]);

  // real share of each source in the window (grounds the synthetic trend in actual mix)
  const srcRows = useMemo(() => {
    const m: Record<string, number> = {};
    realSales.forEach((s) => { const k = isHospital ? saleSourceOf(s) : (s.channel === "online" ? "online" : "counter"); m[k] = (m[k] || 0) + saleTotal(s); });
    return srcOrder.map((k) => ({ key: k, label: SRC_LABEL[k], amt: m[k] || 0 }));
  }, [realSales, isHospital, srcOrder]);
  const srcRealTotal = srcRows.reduce((a, r) => a + r.amt, 0);

  // ── per-source trend series (deterministic waves × real share, last 7D bucket anchored to today) ──
  const { labels, series } = useMemo(() => {
    const labels: string[] = [];
    if (range === "7D") for (let i = 6; i >= 0; i--) labels.push(WD[new Date(now - i * DAY).getDay()]);
    else if (range === "30D") for (let i = 4; i >= 0; i--) labels.push(i === 0 ? "This wk" : i + "w ago");
    else for (let i = 11; i >= 0; i--) { const d = new Date(now); d.setMonth(d.getMonth() - i); labels.push(MO[d.getMonth()]); }

    const totalBase = range === "7D" ? 11500 : range === "30D" ? 76000 : 330000;
    const share = (k: SaleSource, i: number) => srcRealTotal > 0 ? (srcRows[i].amt / srcRealTotal) : (1 / srcOrder.length);
    const wave = (k: number) => 0.55 + 0.45 * ((Math.sin(k * 0.9) + 1) / 2 * 0.6 + (Math.sin(k * 0.5 + 1.3) + 1) / 2 * 0.4);
    const TICKET = range === "7D" ? 430 : range === "30D" ? 445 : 455;

    const series: Series[] = srcOrder.map((k, si) => {
      const base = totalBase * share(k, si);
      const rev = labels.map((_, i) => Math.round(base * wave(i + si * 1.7)));
      if (range === "7D") { // anchor the latest bucket to today's real figures where we have them
        if (k === "online" && onlineRev > 0) rev[rev.length - 1] = onlineRev;
        if (k === "counter" && offlineRev > 0) rev[rev.length - 1] = offlineRev;
      }
      const ord = rev.map((v) => Math.max(v > 0 ? 1 : 0, Math.round(v / TICKET)));
      return { key: k, label: SRC_LABEL[k], color: SRC_COLOR[k], rev, ord };
    });
    return { labels, series };
  }, [range, now, srcRows, srcRealTotal, srcOrder, onlineRev, offlineRev]);

  const visible = series.filter((s) => !hidden.has(s.key));
  const val = (s: Series, i: number) => (metric === "revenue" ? s.rev[i] : s.ord[i]);
  const totals = labels.map((_, i) => visible.reduce((a, s) => a + val(s, i), 0));
  const sumTot = totals.reduce((a, b) => a + b, 0);
  const fmt = (n: number) => (metric === "revenue" ? inr(n) : `${n}`);
  const fmtAxis = (n: number) => (metric === "revenue" ? inrK(n) : `${Math.round(n)}`);

  // donut = composition over the window (per visible source), synthetic total to match the trend
  const donutRows = visible.map((s) => ({ key: s.key, label: s.label, color: s.color, amt: s.rev.reduce((a, b) => a + b, 0), amtOrd: s.ord.reduce((a, b) => a + b, 0) }));

  // ── real breakdowns (payment + categories) ──
  const payRows = useMemo(() => {
    const m: Record<string, number> = {};
    realSales.forEach((s) => { m[s.payMode] = (m[s.payMode] || 0) + saleTotal(s); });
    const tot = Object.values(m).reduce((a, b) => a + b, 0) || 1;
    return (Object.keys(m) as PayMode[]).sort((a, b) => m[b] - m[a]).map((k) => ({ key: k, label: PAY_LABEL[k], amt: m[k], pct: (m[k] / tot) * 100 }));
  }, [realSales]);

  const catRows = useMemo(() => {
    const m: Record<string, number> = {};
    realSales.forEach((s) => s.items.forEach((it) => {
      const cat = inventory.find((p) => p.id === it.productId)?.category ?? "other";
      m[cat] = (m[cat] || 0) + it.price * it.qty;
    }));
    const max = Math.max(...Object.values(m), 1);
    return Object.keys(m).sort((a, b) => m[b] - m[a]).slice(0, 5).map((k) => ({ key: k, label: catLabel(k), amt: m[k], pct: (m[k] / max) * 100 }));
  }, [realSales, inventory]);

  const srcRealShownTotal = srcRows.reduce((a, r) => a + r.amt, 0) || 1;
  const rangeLabel = range === "7D" ? "last 7 days" : range === "30D" ? "last 5 weeks" : "last 12 months";
  const toggle = (k: SaleSource) => setHidden((h) => { const n = new Set(h); n.has(k) ? n.delete(k) : n.add(k); if (n.size >= series.length) return h; return n; });

  return (
    <>
      <div className="pd-card" style={{ marginTop: 16 }}>
        <div className="pd-card-head" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3>Sales analytics {isHospital && <span className="pd-muted" style={{ fontWeight: 600, fontSize: 12 }}>· all sources</span>}</h3>
            <span className="pd-muted" style={{ fontSize: 12 }}>{metric === "revenue" ? inr(sumTot) : `${sumTot} orders`} · {rangeLabel}</span>
          </div>
          <div className="pd-flex" style={{ gap: 8, flexWrap: "wrap" }}>
            <div className="pd-seg">
              {(["revenue", "orders"] as Metric[]).map((m) => <button key={m} className={metric === m ? "on" : ""} style={{ textTransform: "capitalize" }} onClick={() => setMetric(m)}>{m}</button>)}
            </div>
            <div className="pd-seg">
              {(["7D", "30D", "12M"] as Range[]).map((r) => <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r}</button>)}
            </div>
          </div>
        </div>

        {/* chart-type picker */}
        <div className="pd-card-pad" style={{ paddingBottom: 0 }}>
          <div className="pd-flex" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div className="pd-seg">
              {CHART_OPTS.map((c) => <button key={c.k} className={chart === c.k ? "on" : ""} onClick={() => setChart(c.k)} title={c.label}><span style={{ marginRight: 5, display: "inline-flex", verticalAlign: "-2px" }}>{c.Icon({ size: 13 })}</span>{c.label}</button>)}
            </div>
            {/* clickable source legend (show / hide series) */}
            <div className="pd-srcleg">
              {series.map((s) => (
                <button key={s.key} className={`chip${hidden.has(s.key) ? " off" : ""}`} onClick={() => toggle(s.key)} title={hidden.has(s.key) ? "Show" : "Hide"}>
                  <i style={{ background: s.color }} />{s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pd-card-pad">
          {chart === "donut"
            ? <DonutChart rows={donutRows.map((r) => ({ ...r, amt: metric === "revenue" ? r.amt : r.amtOrd }))} fmt={fmt} />
            : <TrendChart labels={labels} series={visible} type={chart} valOf={val} fmtAxis={fmtAxis} fmt={fmt} />}
        </div>
      </div>

      {/* real breakdowns */}
      <div className="pd-grid-3" style={{ marginTop: 16 }}>
        <div className="pd-card">
          <div className="pd-card-head"><h3>{isHospital ? "Sales by source" : "Channel split"}</h3><span className="sub">actual · {rangeLabel}</span></div>
          <div className="pd-card-pad">
            <div style={{ display: "flex", height: 14, borderRadius: 8, overflow: "hidden", marginBottom: 14, background: "var(--wash)" }}>
              {srcRows.map((r) => r.amt > 0 && <div key={r.key} title={`${r.label} · ${inr(r.amt)}`} style={{ width: `${(r.amt / srcRealShownTotal) * 100}%`, background: SRC_COLOR[r.key as SaleSource] }} />)}
            </div>
            {srcRows.map((r) => <HBar key={r.key} label={r.label} right={`${inr(r.amt)} · ${Math.round((r.amt / srcRealShownTotal) * 100)}%`} pct={(r.amt / srcRealShownTotal) * 100} color={SRC_COLOR[r.key as SaleSource]} />)}
          </div>
        </div>

        <div className="pd-card">
          <div className="pd-card-head"><h3>Payment modes</h3><span className="sub">actual · {rangeLabel}</span></div>
          <div className="pd-card-pad">
            {payRows.length === 0 ? <div className="pd-empty" style={{ padding: "18px 8px" }}><p>No sales in this window.</p></div>
              : payRows.map((r) => <HBar key={r.key} label={r.label} right={`${inr(r.amt)} · ${Math.round(r.pct)}%`} pct={r.pct} color="var(--green)" />)}
          </div>
        </div>

        <div className="pd-card">
          <div className="pd-card-head"><h3>Top categories</h3><span className="sub">actual · {rangeLabel}</span></div>
          <div className="pd-card-pad">
            {catRows.length === 0 ? <div className="pd-empty" style={{ padding: "18px 8px" }}><p>No sales in this window.</p></div>
              : catRows.map((r) => <HBar key={r.key} label={r.label} right={inr(r.amt)} pct={r.pct} color="var(--teal)" />)}
          </div>
        </div>
      </div>
    </>
  );
}

// ── SVG time-series chart: grouped bars / line ──
function TrendChart({ labels, series, type, valOf, fmtAxis, fmt }: {
  labels: string[]; series: Series[]; type: "group" | "line";
  valOf: (s: Series, i: number) => number; fmtAxis: (n: number) => string; fmt: (n: number) => string;
}) {
  const W = 760, H = 260, padL = 52, padR = 14, padT = 12, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const n = labels.length;
  const rawMax = Math.max(1, ...series.flatMap((s) => labels.map((_, i) => valOf(s, i))));
  // round max up to a "nice" number
  const pow = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const max = Math.ceil(rawMax / pow) * pow || 1;
  const band = plotW / n;
  const cx = (i: number) => padL + band * (i + 0.5);
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const grid = [0, 0.25, 0.5, 0.75, 1];

  if (series.length === 0) return <div className="pd-empty" style={{ padding: 30 }}><p>Select at least one source above.</p></div>;

  return (
    <svg className="pd-chartsvg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img">
      {/* gridlines + y labels */}
      {grid.map((g) => (
        <g key={g}>
          <line x1={padL} x2={W - padR} y1={padT + plotH * (1 - g)} y2={padT + plotH * (1 - g)} stroke="var(--line)" strokeWidth={1} />
          <text x={padL - 8} y={padT + plotH * (1 - g) + 3.5} textAnchor="end" className="ax">{fmtAxis(max * g)}</text>
        </g>
      ))}
      {/* x labels */}
      {labels.map((d, i) => <text key={d + i} x={cx(i)} y={H - 9} textAnchor="middle" className="ax">{d}</text>)}

      {/* grouped bars */}
      {type === "group" && labels.map((_, i) => {
        const m = series.length; const gw = band * 0.72; const bw = gw / m;
        return series.map((s, si) => {
          const v = valOf(s, i); const x = cx(i) - gw / 2 + si * bw; const yTop = y(v);
          return <rect key={s.key + i} x={x + 1} y={yTop} width={Math.max(1, bw - 2)} height={Math.max(0, plotH + padT - yTop)} fill={s.color} rx={1.5}><title>{`${labels[i]} · ${s.label}: ${fmt(v)}`}</title></rect>;
        });
      })}

      {/* line */}
      {type === "line" && series.map((s) => {
        const pts = labels.map((_, i) => [cx(i), y(valOf(s, i))] as const);
        return (
          <g key={s.key}>
            <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={s.color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#fff" stroke={s.color} strokeWidth={2}><title>{`${labels[i]} · ${s.label}: ${fmt(valOf(s, i))}`}</title></circle>)}
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG donut: source composition ──
function DonutChart({ rows, fmt }: { rows: { key: string; label: string; color: string; amt: number }[]; fmt: (n: number) => string }) {
  const total = rows.reduce((a, r) => a + r.amt, 0);
  const R = 92, r = 56, cx = 110, cy = 110;
  const polar = (ang: number, rad: number) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
  let a0 = -Math.PI / 2;
  const arcs = rows.filter((x) => x.amt > 0).map((x) => {
    const frac = x.amt / (total || 1); const a1 = a0 + frac * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const [x0, y0] = polar(a0, R), [x1, y1] = polar(a1, R), [x2, y2] = polar(a1, r), [x3, y3] = polar(a0, r);
    const d = `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x2} ${y2} A ${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`;
    a0 = a1;
    return { ...x, d, frac };
  });
  return (
    <div className="pd-flex" style={{ gap: 24, flexWrap: "wrap", alignItems: "center", justifyContent: "center", padding: "6px 0" }}>
      {total <= 0 ? <div className="pd-empty" style={{ padding: 30 }}><p>No data for the selected sources.</p></div> : (
        <>
          <svg viewBox="0 0 220 220" style={{ width: 200, height: 200, flexShrink: 0 }} role="img">
            {arcs.map((s) => <path key={s.key} d={s.d} fill={s.color}><title>{`${s.label}: ${fmt(s.amt)} · ${Math.round(s.frac * 100)}%`}</title></path>)}
            <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 19, fill: "var(--dark)" }}>{fmt(total)}</text>
            <text x={cx} y={cy + 15} textAnchor="middle" className="ax">total</text>
          </svg>
          <div style={{ minWidth: 200, flex: "1 1 200px" }}>
            {arcs.map((s) => (
              <div className="pd-flex" key={s.key} style={{ justifyContent: "space-between", marginBottom: 9, fontSize: 12.5 }}>
                <span className="pd-flex" style={{ gap: 8, fontWeight: 600 }}><i style={{ width: 11, height: 11, borderRadius: 3, background: s.color, display: "inline-block" }} />{s.label}</span>
                <span className="pd-muted">{fmt(s.amt)} · {Math.round(s.frac * 100)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HBar({ label, right, pct, color }: { label: string; right: string; pct: number; color: string }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div className="pd-flex" style={{ justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span><span className="pd-muted">{right}</span>
      </div>
      <div style={{ height: 8, background: "var(--wash)", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max(2, pct)}%`, background: color, borderRadius: 6, transition: "width .25s" }} />
      </div>
    </div>
  );
}
