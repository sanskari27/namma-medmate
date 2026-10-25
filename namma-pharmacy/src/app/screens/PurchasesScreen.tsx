"use client";
import { useState, useRef } from "react";
import { usePharma } from "../pharmaState";
import {
  CATEGORIES, inr, inr2, fmtDateTime, purchaseTotals, blankPurchaseItem,
  PurchaseItem, Purchase, Schedule, DosageForm, SCHEDULE_META,
} from "../data";
import { IconPlus, IconX, IconTruck, IconCheck, IconTrash, IconRupee, IconPrint, IconReceipt, IconBulb, IconDoc, IconAlert } from "../components/Icon";
import { parsePurchaseCsv, downloadPurchaseTemplate, CsvParseResult } from "../lib/purchaseCsv";

const FORMS: DosageForm[] = ["Tablet", "Capsule", "Syrup", "Drops", "Injection", "Cream", "Device", "Other"];
const SCHEDS: Schedule[] = ["OTC", "H", "H1", "X"];
const GSTS = [0, 5, 12, 18];

export default function PurchasesScreen() {
  const { purchases, inventory, now } = usePharma();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Purchase | null>(null);

  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthly = purchases.filter((p) => p.createdAt >= monthStart.getTime());
  const monthValue = monthly.reduce((a, p) => a + purchaseTotals(p.items).total, 0);
  const monthGst = monthly.reduce((a, p) => a + purchaseTotals(p.items).gst, 0);

  return (
    <div className="pd-canvas-wide">
      <div className="pd-grn">
        <div className="pd-stat"><div className="ic ic-green"><IconRupee size={19} /></div><div className="lbl">Purchases this month</div><div className="val">{inr(monthValue)}</div><div className="split">{monthly.length} distributor bills</div></div>
        <div className="pd-stat"><div className="ic ic-blue"><IconReceipt size={19} /></div><div className="lbl">Input GST credit (month)</div><div className="val">{inr(monthGst)}</div><div className="split">claimable on GSTR-2</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconTruck size={19} /></div><div className="lbl">Total GRNs</div><div className="val">{purchases.length}</div><div className="split">goods-inward entries</div></div>
      </div>

      <div className="pd-toolbar">
        <h2 style={{ fontSize: 16 }}>Goods inward / purchase bills</h2>
        <div className="pd-spacer" />
        <button className="pd-btn pd-btn-primary" onClick={() => setOpen(true)}><IconPlus size={16} /> New purchase entry</button>
      </div>

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>GRN</th><th>Distributor</th><th>Invoice no.</th><th>Date</th><th>Items</th><th className="num">Taxable</th><th className="num">GST</th><th className="num">Bill total</th><th></th></tr></thead>
            <tbody>
              {purchases.map((p) => {
                const t = purchaseTotals(p.items);
                return (
                  <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setView(p)}>
                    <td className="pd-mono" style={{ fontWeight: 700 }}>{p.id}</td>
                    <td style={{ fontWeight: 600 }}>{p.supplierName}</td>
                    <td className="pd-mono">{p.invoiceNo}</td>
                    <td>{p.invoiceDate}</td>
                    <td>{p.items.length} lines · {t.units} units</td>
                    <td className="num">{inr(t.taxable)}</td>
                    <td className="num">{inr(t.gst)}</td>
                    <td className="num" style={{ fontWeight: 800 }}>{inr(t.total)}</td>
                    <td className="num"><span className="pd-pill pill-green"><i className="d" />Stocked</span></td>
                  </tr>
                );
              })}
              {purchases.length === 0 && <tr><td colSpan={9}><div className="pd-empty"><div className="em"><IconTruck size={28} /></div><h3>No purchases yet</h3><p>Enter a distributor bill to add stock automatically.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <p className="pd-muted" style={{ fontSize: 12.5, marginTop: 12 }}><IconBulb size={13} /> Entering a distributor’s purchase bill here <b>auto-updates inventory</b> — matching batches are topped up, new batches and brand-new products are created, and MRP/cost are refreshed. No manual stock edits needed.</p>

      {open && <PurchaseModal onClose={() => setOpen(false)} />}
      {view && <ViewPurchase purchase={view} onClose={() => setView(null)} />}
    </div>
  );
}

// ── new purchase entry ──────────────────────────────────────────
function PurchaseModal({ onClose }: { onClose: () => void }) {
  const { inventory, suppliers, receivePurchase, go } = usePharma();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("2026-06-19");
  const [lines, setLines] = useState<PurchaseItem[]>([blankPurchaseItem()]);
  const [csv, setCsv] = useState<CsvParseResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const res = parsePurchaseCsv(String(r.result), inventory);
      if (res.items.length) { setLines(res.items); setCsv(res); }
      else setCsv(res);
    };
    r.readAsText(f); e.target.value = "";
  };

  const update = (i: number, patch: Partial<PurchaseItem>) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const selectProduct = (i: number, val: string) => {
    if (val === "__new__") { update(i, { productId: null, name: "" }); return; }
    const p = inventory.find((x) => x.id === val);
    if (p) update(i, { productId: p.id, name: p.name, ptr: p.batches[0]?.ptr ?? 0, mrp: p.batches[0]?.mrp ?? 0, gst: p.gst, hsn: p.hsn });
  };
  const addLine = () => setLines((l) => [...l, blankPurchaseItem()]);
  const removeLine = (i: number) => setLines((l) => (l.length > 1 ? l.filter((_, idx) => idx !== i) : l));

  const t = purchaseTotals(lines);
  const supplier = suppliers.find((s) => s.id === supplierId) ?? suppliers[0];
  const valid = invoiceNo.trim() && lines.some((x) => (x.qty + (x.freeQty || 0)) > 0 && x.batchNo.trim() && (x.productId || x.name.trim()));

  const save = async () => {
    const res = await receivePurchase({ supplierId, supplierName: supplier?.name ?? "Distributor", invoiceNo, invoiceDate, items: lines });
    if (res) { onClose(); go("inventory"); }
  };

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" style={{ maxWidth: 880 }} onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>New purchase entry · goods inward</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-form-grid-3" style={{ marginBottom: 18 }}>
            <div className="pd-field"><label>Distributor / supplier</label><select className="pd-select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="pd-field" data-field="invoiceNo"><label>Invoice no.</label><input className="pd-input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="BPD/26-27/8842" /></div>
            <div className="pd-field"><label>Invoice date</label><input className="pd-input" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
          </div>

          {/* ── bulk CSV import ── */}
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onCsv} />
          <div className="pd-flex" style={{ gap: 8, alignItems: "center", marginBottom: 12, padding: "10px 12px", background: "var(--wash2)", borderRadius: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}><IconDoc size={13} /> Bulk entry</span>
            <span className="pd-muted" style={{ fontSize: 12.5, flex: 1 }}>Import a whole purchase bill / stock list from CSV — products are matched by name, new ones are created.</span>
            <button className="pd-btn pd-btn-ghost" onClick={downloadPurchaseTemplate}><IconPrint size={14} /> Template</button>
            <button className="pd-btn pd-btn-primary" onClick={() => fileRef.current?.click()}><IconPlus size={14} /> Import CSV</button>
          </div>
          {csv && (
            <div className="pd-pill" style={{ marginBottom: 12, width: "100%", justifyContent: "flex-start", padding: "8px 12px", background: csv.items.length ? "var(--green-w, #eaf6ef)" : "var(--rose-w)" }}>
              {csv.items.length
                ? <span><IconCheck size={13} /> Imported {csv.items.length} lines · {csv.matched} matched, {csv.created} new{csv.skipped ? `, ${csv.skipped} skipped` : ""}{csv.errors.length ? ` · ${csv.errors.length} need attention (check qty)` : ""}. Review & edit below, then save.</span>
                : <span style={{ color: "var(--rose)" }}><IconAlert size={13} /> {csv.errors[0] ?? "Could not read the CSV."}</span>}
            </div>
          )}

          <div className="pd-sec-head" style={{ marginBottom: 10 }}><h2 style={{ fontSize: 14 }}>Billed items</h2><span className="sub">free goods are stocked but not charged</span></div>

          {lines.map((line, i) => {
            const isNew = line.productId === null;
            const lineTotal = line.ptr * line.qty * (1 + line.gst / 100);
            return (
              <div className="pd-pline" key={i}>
                <div className="pd-pline-top">
                  <select className="pd-select" value={isNew ? "__new__" : line.productId ?? ""} onChange={(e) => selectProduct(i, e.target.value)}>
                    <option value="" disabled>Select product…</option>
                    <option value="__new__">New product (add to catalogue)</option>
                    {inventory.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.pack}</option>)}
                  </select>
                  <span className="pd-pline-tot">{inr2(lineTotal)}</span>
                  <button className="pd-iconbtn" onClick={() => removeLine(i)} title="Remove line"><IconTrash size={15} /></button>
                </div>

                {isNew && (
                  <div className="pd-pline-new">
                    <div className="pd-field"><label>Product name</label><input className="pd-input" value={line.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="e.g. Azithromycin 500" /></div>
                    <div className="pd-field"><label>Composition</label><input className="pd-input" value={line.composition} onChange={(e) => update(i, { composition: e.target.value })} placeholder="Azithromycin 500mg" /></div>
                    <div className="pd-field"><label>Category</label><select className="pd-select" value={line.category} onChange={(e) => update(i, { category: e.target.value })}>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
                    <div className="pd-field"><label>Schedule</label><select className="pd-select" value={line.schedule} onChange={(e) => update(i, { schedule: e.target.value as Schedule })}>{SCHEDS.map((s) => <option key={s} value={s}>{SCHEDULE_META[s].label}</option>)}</select></div>
                    <div className="pd-field"><label>Manufacturer</label><input className="pd-input" value={line.manufacturer} onChange={(e) => update(i, { manufacturer: e.target.value })} /></div>
                    <div className="pd-field"><label>Pack</label><input className="pd-input" value={line.pack} onChange={(e) => update(i, { pack: e.target.value })} placeholder="Strip of 10" /></div>
                    <div className="pd-field"><label>Form</label><select className="pd-select" value={line.form} onChange={(e) => update(i, { form: e.target.value as DosageForm })}>{FORMS.map((x) => <option key={x}>{x}</option>)}</select></div>
                    <div className="pd-field"><label>Emoji</label><input className="pd-input" value={line.emoji} onChange={(e) => update(i, { emoji: e.target.value })} maxLength={2} /></div>
                  </div>
                )}

                <div className="pd-pline-grid">
                  <div className="pd-field"><label>Batch no.</label><input className="pd-input" value={line.batchNo} onChange={(e) => update(i, { batchNo: e.target.value })} /></div>
                  <div className="pd-field"><label>Expiry</label><input className="pd-input" value={line.expiry} onChange={(e) => update(i, { expiry: e.target.value })} placeholder="2027-06" /></div>
                  <div className="pd-field"><label>Qty</label><input className="pd-input" type="number" value={line.qty || ""} onChange={(e) => update(i, { qty: Number(e.target.value) || 0 })} /></div>
                  <div className="pd-field"><label>Free</label><input className="pd-input" type="number" value={line.freeQty || ""} onChange={(e) => update(i, { freeQty: Number(e.target.value) || 0 })} /></div>
                  <div className="pd-field"><label>Rate / PTR</label><input className="pd-input" type="number" value={line.ptr || ""} onChange={(e) => update(i, { ptr: Number(e.target.value) || 0 })} /></div>
                  <div className="pd-field"><label>MRP</label><input className="pd-input" type="number" value={line.mrp || ""} onChange={(e) => update(i, { mrp: Number(e.target.value) || 0 })} /></div>
                  <div className="pd-field"><label>GST%</label><select className="pd-select" value={line.gst} onChange={(e) => update(i, { gst: Number(e.target.value) })}>{GSTS.map((x) => <option key={x} value={x}>{x}%</option>)}</select></div>
                </div>
              </div>
            );
          })}

          <button className="pd-btn pd-btn-ghost pd-btn-block" onClick={addLine}><IconPlus size={15} /> Add another item</button>

          <div className="pd-flex" style={{ justifyContent: "flex-end", gap: 26, marginTop: 16, paddingTop: 14, borderTop: "1px dashed var(--line-2)" }}>
            <span style={{ fontSize: 13 }} className="pd-muted">{t.lines} lines · <b style={{ color: "var(--ink)" }}>{t.units} units</b></span>
            <span style={{ fontSize: 13 }} className="pd-muted">Taxable <b style={{ color: "var(--ink)" }}>{inr(t.taxable)}</b></span>
            <span style={{ fontSize: 13 }} className="pd-muted">GST <b style={{ color: "var(--ink)" }}>{inr(t.gst)}</b></span>
            <span style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 18, color: "var(--dark)" }}>Bill {inr(t.total)}</span>
          </div>
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-primary" disabled={!valid} onClick={save}><IconCheck size={16} /> Save & update stock</button>
        </div>
      </div>
    </div>
  );
}

// ── view a past purchase ────────────────────────────────────────
function ViewPurchase({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
  const t = purchaseTotals(purchase.items);
  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>{purchase.id} · {purchase.supplierName}</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-inv-meta-grid" style={{ borderTop: "1px solid var(--line)", marginBottom: 4 }}>
            <div><span className="lb">Distributor: </span><b>{purchase.supplierName}</b></div>
            <div><span className="lb">Invoice no: </span><b>{purchase.invoiceNo}</b></div>
            <div><span className="lb">Invoice date: </span>{purchase.invoiceDate}</div>
            <div><span className="lb">Entered: </span>{fmtDateTime(purchase.createdAt)}</div>
          </div>
          <table className="pd-tbl" style={{ marginTop: 10 }}>
            <thead><tr><th>Item</th><th>Batch</th><th>Exp</th><th className="num">Qty</th><th className="num">Free</th><th className="num">Rate</th><th className="num">MRP</th><th className="num">GST</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {purchase.items.map((it, i) => (
                <tr key={i}><td style={{ fontWeight: 700 }}>{it.name}{!it.productId && <span className="pd-tag" style={{ marginLeft: 6 }}>new</span>}</td><td className="pd-mono">{it.batchNo}</td><td>{it.expiry}</td><td className="num">{it.qty}</td><td className="num">{it.freeQty || "—"}</td><td className="num">{inr2(it.ptr)}</td><td className="num">{inr2(it.mrp)}</td><td className="num">{it.gst}%</td><td className="num" style={{ fontWeight: 700 }}>{inr2(it.ptr * it.qty * (1 + it.gst / 100))}</td></tr>
              ))}
            </tbody>
            <tfoot><tr style={{ background: "var(--wash2)", fontWeight: 800 }}><td colSpan={8}>Bill total ({t.units} units stocked)</td><td className="num">{inr2(t.total)}</td></tr></tfoot>
          </table>
        </div>
        <div className="pd-modal-foot"><button className="pd-btn pd-btn-ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
