"use client";
import { useState, useRef, useEffect } from "react";
import { usePharma } from "../pharmaState";
import {
  CATEGORIES, catLabel, inr, inr2, stockOf, isLowStock, isExpiringSoon, isExpired,
  earliestBatch, monthsToExpiry, mrpOf, sellPrice, stockLabel, InvProduct, Schedule, DosageForm,
  SCHEDULE_META, stockValue, isLooseEligible, perUnitPrice, unitNoun, looseUnitsOf,
  hasLocation, matchesLocation, locationCodes, Sale, fmtDateTime, timeAgo,
} from "../data";
import { ScheduleTag, StockPill, Thumb } from "../components/bits";
import { IconSearch, IconEdit, IconX, IconInventory, IconUpload, IconTruck, IconCash, IconTrendDown, IconCalendar, IconMap, IconBox, IconUnlock, IconLock, IconArrowRight, IconRupee, IconTag, IconAlert, IconClock, IconReceipt, IconPin, IconRefresh, IconDownload, IconPrint } from "../components/Icon";
import { exportStockCsv, exportStockPdf } from "../lib/stockExport";

const FILTER_LABEL: Record<Filter, string> = { all: "all", alerts: "alerts", low: "low-stock", expiring: "expiring", rx: "rx-only", out: "out-of-stock", noloc: "unallocated" };

const DAY = 86400000;
const mrpValueOf = (p: InvProduct) => p.batches.reduce((a, b) => a + b.qty * b.mrp, 0);
// units of a product sold since a timestamp (excludes cancelled)
const soldSince = (p: InvProduct, sales: Sale[], since: number) =>
  sales.filter((s) => s.status !== "cancelled" && s.createdAt >= since).reduce((a, s) => a + s.items.filter((i) => i.productId === p.id).reduce((x, i) => x + i.qty, 0), 0);
const lastSoldAt = (p: InvProduct, sales: Sale[]) =>
  Math.max(0, ...sales.filter((s) => s.status !== "cancelled" && s.items.some((i) => i.productId === p.id)).map((s) => s.createdAt));

type Filter = "all" | "alerts" | "low" | "expiring" | "rx" | "out" | "noloc";
// high-priority for purchase (running out) or expiring soon
const needsAttention = (p: InvProduct, now: number) => isLowStock(p) || stockOf(p) === 0 || isExpiringSoon(p, now);
const FORMS: DosageForm[] = ["Tablet", "Capsule", "Syrup", "Drops", "Injection", "Cream", "Device", "Other"];
const SCHEDS: Schedule[] = ["OTC", "H", "H1", "X"];
const GSTS = [0, 5, 12, 18];

export default function InventoryScreen() {
  const { inventory, sales, profile, now, toggleOnline, toggleLoose, updateProduct, go, invFilter, setInvFilter } = usePharma();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<InvProduct | null>(null);
  const [detail, setDetail] = useState<InvProduct | null>(null);

  // honour a filter requested by another screen (e.g. dashboard "Stock alerts" card)
  useEffect(() => {
    if (invFilter && ["all", "alerts", "low", "expiring", "rx", "out", "noloc"].includes(invFilter)) {
      setFilter(invFilter as Filter);
      setInvFilter(null);
    }
  }, [invFilter, setInvFilter]);

  // priority rank for the alerts view: out of stock → low → expiring; ties broken by soonest expiry
  const alertRank = (p: InvProduct) => (stockOf(p) === 0 ? 0 : isLowStock(p) ? 1 : 2);

  const list = inventory.filter((p) => {
    if (filter === "alerts" && !needsAttention(p, now)) return false;
    if (filter === "low" && !isLowStock(p)) return false;
    if (filter === "expiring" && !isExpiringSoon(p, now)) return false;
    if (filter === "rx" && p.schedule === "OTC") return false;
    if (filter === "out" && stockOf(p) > 0) return false;
    if (filter === "noloc" && hasLocation(p)) return false;
    // two-way search: by name/salt/brand OR by rack location code (e.g. "A3-12")
    if (q && !(`${p.name} ${p.composition} ${p.manufacturer}`.toLowerCase().includes(q.toLowerCase()) || matchesLocation(p, q))) return false;
    return true;
  });
  if (filter === "alerts") list.sort((a, b) => alertRank(a) - alertRank(b) || (earliestBatch(a)?.expiry ?? "9999").localeCompare(earliestBatch(b)?.expiry ?? "9999"));

  const totalSkus = inventory.length;
  const totalValue = inventory.reduce((a, p) => a + stockValue(p), 0);
  const retailValue = inventory.reduce((a, p) => a + mrpValueOf(p), 0);
  const potentialMargin = retailValue > 0 ? Math.round(((retailValue - totalValue) / retailValue) * 100) : 0;
  const lowCount = inventory.filter(isLowStock).length;
  const expCount = inventory.filter((p) => isExpiringSoon(p, now)).length;
  const expValue = inventory.filter((p) => isExpiringSoon(p, now)).reduce((a, p) => a + stockValue(p), 0);
  const outCount = inventory.filter((p) => stockOf(p) === 0).length;
  const alertCount = inventory.filter((p) => needsAttention(p, now)).length;
  const noLocCount = inventory.filter((p) => !hasLocation(p)).length;
  // dead / non-moving: in stock but no sale in 90 days
  const deadStock = inventory.filter((p) => stockOf(p) > 0 && lastSoldAt(p, sales) < now - 90 * DAY);
  const deadValue = deadStock.reduce((a, p) => a + stockValue(p), 0);

  const kpiKey = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } };
  const goFilter = (f: Filter) => setFilter(f);

  return (
    <div className="pd-canvas-wide">
      <div className="pd-stats" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        <div className="pd-stat link" role="button" tabIndex={0} onClick={() => goFilter("all")} onKeyDown={kpiKey(() => goFilter("all"))} title="All products">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="ic ic-green"><IconInventory size={18} /></div><div className="lbl">Total SKUs</div><div className="val">{totalSkus}</div>
          <div className="split">{inventory.reduce((a, p) => a + stockOf(p), 0).toLocaleString("en-IN")} units in stock</div>
        </div>
        <div className="pd-stat"><div className="ic ic-blue"><IconCash size={18} /></div><div className="lbl">Stock value (cost)</div><div className="val">{inr(totalValue)}</div><div className="split">≈ {potentialMargin}% margin</div></div>
        <div className="pd-stat"><div className="ic ic-green"><IconTag size={18} /></div><div className="lbl">Retail value (MRP)</div><div className="val">{inr(retailValue)}</div><div className="split">potential revenue</div></div>
        <div className="pd-stat link" role="button" tabIndex={0} onClick={() => goFilter("low")} onKeyDown={kpiKey(() => goFilter("low"))} title="Low & out of stock">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="ic ic-gold"><IconTrendDown size={18} /></div><div className="lbl">Low on stock</div><div className="val">{lowCount}</div>
          <div className="split">{outCount} out of stock</div>
        </div>
        <div className="pd-stat link" role="button" tabIndex={0} onClick={() => goFilter("expiring")} onKeyDown={kpiKey(() => goFilter("expiring"))} title="Expiring soon">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="ic ic-rose"><IconCalendar size={18} /></div><div className="lbl">Expiring ≤ 4 mo</div><div className="val">{expCount}</div>
          <div className="split">{inr(expValue)} at risk</div>
        </div>
        <div className="pd-stat"><div className="ic ic-gold"><IconClock size={18} /></div><div className="lbl">Dead stock (90d)</div><div className="val">{deadStock.length}</div><div className="split">{inr(deadValue)} tied up</div></div>
      </div>

      <div className="pd-toolbar">
        <div className="pd-seg">
          {([["all", "All"], ["alerts", `Alerts${alertCount ? " · " + alertCount : ""}`], ["low", "Low stock"], ["expiring", "Expiring"], ["rx", "Rx-only"], ["out", "Out of stock"], ["noloc", `Unallocated${noLocCount ? " · " + noLocCount : ""}`]] as [Filter, string][]).map(([f, l]) => (
            <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{l}</button>
          ))}
        </div>
        <div className="pd-spacer" />
        <div className="pd-search-inline">
          <span className="ic"><IconSearch size={17} /></span>
          <input placeholder="Search by name, salt, brand…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="pd-btn pd-btn-ghost" disabled={!list.length} title="Download this view as Excel (CSV)" onClick={() => exportStockCsv(list, FILTER_LABEL[filter], now)}><IconDownload size={15} /> Excel</button>
        <button className="pd-btn pd-btn-ghost" disabled={!list.length} title="Download this view as PDF" onClick={() => exportStockPdf(list, profile, FILTER_LABEL[filter], now)}><IconPrint size={15} /> PDF</button>
        <button className="pd-btn pd-btn-ghost" onClick={() => go("rackmap")} title="Arrange where each medicine is stored on the shelves"><IconMap size={16} /> Rack & Locations</button>
        <button className="pd-btn pd-btn-primary" onClick={() => go("purchases")} title="Products are added by entering a distributor purchase bill"><IconTruck size={16} /> Add stock via purchase</button>
      </div>

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead>
              <tr><th>Product</th><th>Category</th><th>Schedule</th><th>Rack</th><th>Batches · Expiry</th><th>Stock</th><th className="num">MRP</th><th className="num">Value</th><th>Loose</th><th>Online</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const b = earliestBatch(p);
                const mo = b ? monthsToExpiry(b.expiry, now) : 99;
                const exp = b ? isExpired(b.expiry, now) : false;
                return (
                  <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setDetail(p)}>
                    <td>
                      <div className="prod">
                        <span className="em"><Thumb p={p} /></span>
                        <span><span className="nm">{p.name}</span><div className="sub">{p.composition} · {p.manufacturer}</div></span>
                      </div>
                    </td>
                    <td>{catLabel(p.category)}</td>
                    <td><ScheduleTag schedule={p.schedule} /></td>
                    <td onClick={(e) => e.stopPropagation()}>{hasLocation(p)
                      ? <span className="pd-rackchip" style={{ marginLeft: 0 }}><IconPin size={11} /> {locationCodes(p).join(" · ")}</span>
                      : <button className="pd-pill pill-gold" style={{ cursor: "pointer", border: 0 }} title="Not assigned to a rack — click to allocate" onClick={() => go("rackmap")}><IconAlert size={11} /> Unallocated</button>}</td>
                    <td>
                      <span style={{ fontWeight: 700 }}>{p.batches.length} batch{p.batches.length !== 1 ? "es" : ""}</span>
                      {b && <div className={`pd-pill ${exp ? "pill-rose" : mo <= 4 ? "pill-gold" : "pill-gray"}`} style={{ marginTop: 4 }}>{exp ? "Expired" : b.expiry}</div>}
                    </td>
                    <td><StockPill p={p} now={now} /></td>
                    <td className="num" style={{ fontWeight: 700 }}>{inr(mrpOf(p))}</td>
                    <td className="num">{inr(stockValue(p))}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {isLooseEligible(p) ? (
                        <div className="pd-flex pd-gap6">
                          <button className={`pd-switch${(p.looseAllowed ?? true) ? " on" : ""}`} onClick={() => toggleLoose(p.id)} aria-label="Toggle loose selling" />
                          {(p.looseAllowed ?? true) && <span className="pd-muted" style={{ fontSize: 11 }}>{inr2(perUnitPrice(p))}/{unitNoun(p)}</span>}
                        </div>
                      ) : <span className="pd-muted" style={{ fontSize: 12 }}>—</span>}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}><button className={`pd-switch${p.online ? " on" : ""}`} onClick={() => toggleOnline(p.id)} aria-label="Toggle online" /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="pd-flex pd-gap6" style={{ justifyContent: "flex-end" }}>
                        <button className="pd-iconbtn" title="Edit" onClick={() => setEdit(p)}><IconEdit size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={11}><div className="pd-empty"><div className="em"><IconBox size={28} /></div><p>{inventory.length === 0 ? "No products yet — add stock by entering a distributor purchase bill." : "No products match this filter."}</p>{inventory.length === 0 && <button className="pd-btn pd-btn-primary pd-btn-sm" style={{ marginTop: 10 }} onClick={() => go("purchases")}><IconTruck size={14} /> New purchase entry</button>}</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {edit && <ProductModal product={edit} onClose={() => setEdit(null)} onSave={async (p) => { const err = await updateProduct(p.id, p); if (!err) setEdit(null); }} />}
      {detail && <ProductDetailModal product={inventory.find((x) => x.id === detail.id) ?? detail} sales={sales} now={now} onClose={() => setDetail(null)} onEdit={() => { setEdit(detail); setDetail(null); }} toggleOnline={toggleOnline} toggleLoose={toggleLoose} go={go} />}
    </div>
  );
}

// ── product 360° detail: stock, batches, valuation, velocity, movement ──
function ProductDetailModal({ product: p, sales, now, onClose, onEdit, toggleOnline, toggleLoose, go }: {
  product: InvProduct; sales: Sale[]; now: number; onClose: () => void; onEdit: () => void;
  toggleOnline: (id: string) => void; toggleLoose: (id: string) => void; go: (r: any) => void;
}) {
  const stock = stockOf(p);
  const costVal = stockValue(p);
  const mrpVal = mrpValueOf(p);
  const margin = mrpVal > 0 ? Math.round(((mrpVal - costVal) / mrpVal) * 100) : 0;
  const sold30 = soldSince(p, sales, now - 30 * DAY);
  const sold90 = soldSince(p, sales, now - 90 * DAY);
  const lastAt = lastSoldAt(p, sales);
  const velocity = sold30 / 30;                       // units/day
  const cover = velocity > 0 ? Math.round(stock / velocity) : null;   // days of stock left
  const movement = sales
    .filter((s) => s.status !== "cancelled" && s.items.some((i) => i.productId === p.id))
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, 12)
    .map((s) => ({ id: s.id, at: s.createdAt, qty: s.items.filter((i) => i.productId === p.id).reduce((x, i) => x + i.qty, 0), channel: s.channel }));
  const facts: [string, React.ReactNode][] = [
    ["Manufacturer", p.manufacturer], ["Pack", p.pack], ["HSN / GST", `${p.hsn} · ${p.gst}%`],
    ["Rack location", hasLocation(p) ? <span className="pd-mono"><IconPin size={11} /> {locationCodes(p).join(" · ")}</span> : <button className="pd-pill pill-gold" style={{ cursor: "pointer", border: 0 }} onClick={() => { onClose(); go("rackmap"); }}><IconAlert size={11} /> Unallocated · assign</button>],
    ["Reorder level", `${p.reorderLevel} units`], ["Selling price", inr(sellPrice(p))],
  ];

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head">
          <div className="pd-flex" style={{ gap: 12, alignItems: "center", minWidth: 0 }}>
            <span className="em" style={{ width: 42, height: 42, borderRadius: 11, background: "var(--wash)", display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 }}><Thumb p={p} /></span>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>{p.name} <ScheduleTag schedule={p.schedule} /></h3>
              <div className="pd-muted" style={{ fontSize: 12.5, marginTop: 2 }}>{p.composition} · {p.manufacturer} · {catLabel(p.category)}</div>
            </div>
          </div>
          <button className="pd-x" onClick={onClose}><IconX size={18} /></button>
        </div>

        <div className="pd-modal-body">
          <div className="pd-flex" style={{ gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={onEdit}><IconEdit size={14} /> Edit product</button>
            <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => { onClose(); go("purchases"); }}><IconTruck size={14} /> Receive stock</button>
            {isLowStock(p) && <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => { onClose(); go("reorder"); }}><IconRefresh size={14} /> Reorder</button>}
            <button className={`pd-btn pd-btn-sm ${p.online ? "pd-btn-ghost" : "pd-btn-ghost"}`} onClick={() => toggleOnline(p.id)}>{p.online ? "● Online" : "○ Offline"}</button>
          </div>

          {/* KPI tiles */}
          <div className="pd-pt-kpis" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <div className="k"><span className="l">In stock</span><span className="v sm">{stockLabel(p)}</span></div>
            <div className="k"><span className="l">Stock value (cost)</span><span className="v">{inr(costVal)}</span></div>
            <div className="k"><span className="l">Retail value (MRP)</span><span className="v">{inr(mrpVal)}</span></div>
            <div className="k"><span className="l">Margin</span><span className="v">{margin}<small>%</small></span></div>
            <div className="k"><span className="l">Sold · 30 days</span><span className="v">{sold30}<small> u</small></span></div>
            <div className="k"><span className="l">Sold · 90 days</span><span className="v">{sold90}<small> u</small></span></div>
            <div className="k"><span className="l">Days of cover</span><span className="v" style={cover !== null && cover <= 14 ? { color: "var(--rose)" } : undefined}>{cover === null ? "—" : cover}<small>{cover !== null ? "d" : ""}</small></span></div>
            <div className="k"><span className="l">Last sold</span><span className="v sm">{lastAt ? timeAgo(lastAt, now) : "never"}</span></div>
          </div>

          {(isLowStock(p) || stock === 0) && <div className="pd-pill pill-rose" style={{ marginBottom: 12 }}><IconAlert size={13} /> {stock === 0 ? "Out of stock — reorder now" : `Low stock — ${stock} left, reorder level ${p.reorderLevel}`}</div>}

          {/* facts */}
          <div className="pd-rack-facts" style={{ marginBottom: 14 }}>
            {facts.map(([k, v]) => <div className="f" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>)}
          </div>

          <div className="pd-grid-2">
            {/* batches */}
            <div>
              <div className="pd-pl-head" style={{ marginTop: 0 }}>Batches · stock & expiry</div>
              <div className="pd-tbl-wrap"><table className="pd-tbl">
                <thead><tr><th>Batch</th><th>Expiry</th><th className="num">Qty</th><th className="num">MRP</th><th className="num">Value</th></tr></thead>
                <tbody>
                  {p.batches.length === 0 && <tr><td colSpan={5}><div className="pd-empty" style={{ padding: 14 }}><p>No stock.</p></div></td></tr>}
                  {p.batches.map((b) => {
                    const exp = isExpired(b.expiry, now); const mo = monthsToExpiry(b.expiry, now);
                    return (
                      <tr key={b.batchNo}>
                        <td className="pd-mono" style={{ fontWeight: 700 }}>{b.batchNo || "—"}</td>
                        <td><span className={`pd-pill ${exp ? "pill-rose" : mo <= 4 ? "pill-gold" : "pill-gray"}`}>{b.expiry}{exp ? " · exp" : mo <= 4 ? ` · ${mo}mo` : ""}</span></td>
                        <td className="num" style={{ fontWeight: 700 }}>{b.qty}</td>
                        <td className="num">{inr(b.mrp)}</td>
                        <td className="num">{inr(b.qty * b.ptr)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {p.batches.length > 0 && <tfoot><tr style={{ background: "var(--wash2)", fontWeight: 800 }}><td colSpan={2}>Total</td><td className="num">{stock}</td><td className="num"></td><td className="num">{inr(costVal)}</td></tr></tfoot>}
              </table></div>
              {looseUnitsOf(p) > 0 && <div className="pd-muted" style={{ fontSize: 11.5, marginTop: 6 }}><IconUnlock size={12} /> {looseUnitsOf(p)} loose {unitNoun(p)}{looseUnitsOf(p) !== 1 ? "s" : ""} from an opened strip.</div>}
            </div>

            {/* movement */}
            <div>
              <div className="pd-pl-head" style={{ marginTop: 0 }}>Recent sales <span className="pd-muted" style={{ fontWeight: 500, fontSize: 12 }}>· movement</span></div>
              <div className="pd-card" style={{ overflow: "hidden", maxHeight: 250, overflowY: "auto" }}>
                {movement.length === 0 ? <div className="pd-empty" style={{ padding: 16 }}><p>No sales recorded.</p></div> :
                  movement.map((mv) => (
                    <div className="pd-medrow" key={mv.id}>
                      <span className="em" style={{ color: "var(--rose)" }}>−</span>
                      <span className="gw"><div className="t pd-mono">{mv.id}</div><div className="s">{fmtDateTime(mv.at).split(",")[0]} · {mv.channel === "online" ? "Online" : "Counter"}</div></span>
                      <b style={{ fontSize: 13 }}>{mv.qty} u</b>
                    </div>
                  ))}
              </div>
              <p className="pd-muted" style={{ fontSize: 11, marginTop: 8 }}><IconLock size={11} /> Stock updates automatically from purchases & sales.</p>
            </div>
          </div>
        </div>
        <div className="pd-modal-foot"><button className="pd-btn pd-btn-ghost" onClick={onClose}>Close</button><button className="pd-btn pd-btn-primary" onClick={() => { onClose(); go("purchases"); }}><IconTruck size={15} /> Receive stock</button></div>
      </div>
    </div>
  );
}

// ── edit product details ────────────────────────────────────────
// New products are created through the Purchases (goods-inward) flow, not here.
function ProductModal({ product, onClose, onSave }: { product: InvProduct; onClose: () => void; onSave: (p: InvProduct) => void }) {
  const [f, setF] = useState<InvProduct>(product);
  const set = (patch: Partial<InvProduct>) => setF((p) => ({ ...p, ...patch }));
  const valid = !!f.name.trim();
  const photoRef = useRef<HTMLInputElement>(null);
  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader(); r.onload = () => set({ image: r.result as string }); r.readAsDataURL(file);
  };

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>Edit {f.name}</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-form-grid">
            <div className="pd-field pd-span2"><label>Medicine name</label><input className="pd-input" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Dolo 650" /></div>
            <div className="pd-field pd-span2"><label>Composition / salt</label><input className="pd-input" value={f.composition} onChange={(e) => set({ composition: e.target.value })} placeholder="e.g. Paracetamol 650mg" /></div>
            <div className="pd-field"><label>Manufacturer</label><input className="pd-input" value={f.manufacturer} onChange={(e) => set({ manufacturer: e.target.value })} /></div>
            <div className="pd-field"><label>Pack</label><input className="pd-input" value={f.pack} onChange={(e) => set({ pack: e.target.value })} placeholder="Strip of 15" /></div>
            <div className="pd-field"><label>Category</label><select className="pd-select" value={f.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
            <div className="pd-field"><label>Form</label><select className="pd-select" value={f.form} onChange={(e) => set({ form: e.target.value as DosageForm })}>{FORMS.map((x) => <option key={x}>{x}</option>)}</select></div>
            <div className="pd-field"><label>Drug schedule</label><select className="pd-select" value={f.schedule} onChange={(e) => set({ schedule: e.target.value as Schedule })}>{SCHEDS.map((x) => <option key={x} value={x}>{SCHEDULE_META[x].label} — {SCHEDULE_META[x].rx ? "Rx" : "OTC"}</option>)}</select></div>
            <div className="pd-field"><label>HSN code</label><input className="pd-input" value={f.hsn} onChange={(e) => set({ hsn: e.target.value })} /></div>
            <div className="pd-field"><label>GST %</label><select className="pd-select" value={f.gst} onChange={(e) => set({ gst: Number(e.target.value) })}>{GSTS.map((x) => <option key={x} value={x}>{x}%</option>)}</select></div>
            <div className="pd-field"><label>Rack location <span className="pd-muted" style={{ fontWeight: 400 }}>· Rack-Shelf-Bin</span></label><input className="pd-input pd-mono" value={f.rack} onChange={(e) => set({ rack: e.target.value.toUpperCase() })} placeholder="A3-12" /></div>
            <div className="pd-field"><label>2nd slot <span className="pd-muted" style={{ fontWeight: 400 }}>· overflow (optional)</span></label><input className="pd-input pd-mono" value={f.rackAlt ?? ""} onChange={(e) => set({ rackAlt: e.target.value.toUpperCase() || undefined })} placeholder="—" /></div>
            <div className="pd-field"><label>Reorder level (units)</label><input className="pd-input" type="number" value={f.reorderLevel} onChange={(e) => set({ reorderLevel: Number(e.target.value) || 0 })} /></div>
          </div>

          {/* product photo */}
          <div className="pd-field pd-span2" style={{ marginTop: 14 }}>
            <label>Product photo</label>
            <div className="pd-flex" style={{ gap: 14 }}>
              <div className="em" style={{ width: 64, height: 64, borderRadius: 12, background: "var(--wash)", display: "grid", placeItems: "center", fontSize: 30, overflow: "hidden", flexShrink: 0 }}>
                {f.image ? <img className="pd-thumb" src={f.image} alt="" /> : f.emoji}
              </div>
              <input ref={photoRef} type="file" accept="image/*" hidden onChange={onPhoto} />
              <div className="pd-flex" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                <div className="pd-flex pd-gap6">
                  <button type="button" className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => photoRef.current?.click()}><IconUpload size={14} /> {f.image ? "Change photo" : "Upload photo"}</button>
                  {f.image && <button type="button" className="pd-btn pd-btn-sm" style={{ color: "var(--rose)", background: "none" }} onClick={() => set({ image: undefined })}>Remove</button>}
                </div>
                <div className="pd-flex pd-gap6">
                  <span className="pd-muted" style={{ fontSize: 12 }}>or emoji:</span>
                  <input className="pd-input" style={{ width: 70, padding: "5px 8px", textAlign: "center" }} value={f.emoji} maxLength={2} onChange={(e) => set({ emoji: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          {(f.form === "Tablet" || f.form === "Capsule") && (
            <label className="pd-flex" style={{ justifyContent: "space-between", padding: "12px 0", marginTop: 8, borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
              <span>
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>Allow loose / per-tablet selling</span>
                <div className="pd-muted" style={{ fontSize: 12 }}>Let staff sell individual {f.form.toLowerCase()}s at the counter (auto-priced per unit)</div>
              </span>
              <button type="button" className={`pd-switch${(f.looseAllowed ?? true) ? " on" : ""}`} onClick={() => set({ looseAllowed: !(f.looseAllowed ?? true) })} />
            </label>
          )}
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-primary" disabled={!valid} onClick={() => onSave(f)}>Save changes</button>
        </div>
      </div>
    </div>
  );
}
