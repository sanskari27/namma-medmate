"use client";
import { useState, useEffect } from "react";
import { usePharma } from "../pharmaState";
import { inr, computeInvoice, fmtDateTime, packDone, packTotal, packComplete, Sale } from "../data";
import { Thumb } from "./bits";
import { IconX, IconCheck, IconPrint, IconTruck, IconPin, IconCamera, IconPill, IconBox } from "./Icon";
import Invoice from "./Invoice";

// Online-order fulfilment: pick & scan → seal in a Namma MedMate packet (invoice) → hand to delivery partner.
export default function PackOrder({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const { sales, inventory, profile, startPacking, scanPackLine, pickPackLine, sealPacket, handToRider, advanceOrder, toast } = usePharma();
  const sale = sales.find((s) => s.id === saleId) ?? null;
  const [scan, setScan] = useState("");
  const [rider, setRider] = useState({ name: "", phone: "", vehicle: "" });

  useEffect(() => { startPacking(saleId); }, [saleId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sale?.fulfillment?.rider) setRider((r) => ({ ...r, ...sale.fulfillment!.rider })); }, [sale?.fulfillment?.rider]);

  if (!sale) return null;
  const t = computeInvoice(sale.items, sale.discount);
  const done = packDone(sale), tot = packTotal(sale), ready = packComplete(sale);
  const lines = sale.fulfillment?.lines ?? [];
  const prodOf = (id: string) => inventory.find((p) => p.id === id);

  const doScan = () => {
    const code = scan.trim(); if (!code) return;
    const r = scanPackLine(saleId, code);
    if (r) toast(`${r.name} · batch ${r.batchNo} · ${r.scanned}/${r.qty}`);
    setScan("");
  };

  // which step are we on?
  const step: "pack" | "handover" | "done" =
    sale.status === "accepted" ? "pack" : sale.status === "packed" ? "handover" : "done";

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head pd-no-print">
          <div>
            <h3>Pack &amp; dispatch · <span className="pd-mono">{sale.id}</span></h3>
            <div className="pd-muted" style={{ fontSize: 12.5, marginTop: 3 }}>{sale.customer.name}{sale.customer.phone ? ` · ${sale.customer.phone}` : ""}{sale.customer.address ? ` · ${sale.customer.address}` : ""}</div>
          </div>
          <button className="pd-x" onClick={onClose}><IconX size={18} /></button>
        </div>

        {/* step rail */}
        <div className="pd-no-print" style={{ padding: "12px 20px 0" }}>
          <div className="pd-packsteps">
            {[["pack", "1 · Scan & pack"], ["handover", "2 · Seal packet"], ["done", "3 · Hand to delivery"]].map(([k, label], i) => {
              const order = ["pack", "handover", "done"];
              const cur = order.indexOf(step);
              const cls = order.indexOf(k) < cur ? "done" : order.indexOf(k) === cur ? "on" : "";
              return <div key={k} className={`pd-packstep ${cls}`}><span className="n">{order.indexOf(k) < cur ? <IconCheck size={13} /> : i + 1}</span>{label.replace(/^\d+ · /, "")}</div>;
            })}
          </div>
        </div>

        <div className="pd-modal-body">
          {step === "pack" && (
            <>
              <div className="pd-flex" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <b style={{ fontSize: 13.5 }}>Scan each medicine to pack</b>
                <span className="pd-muted" style={{ fontSize: 12.5 }}>{done} / {tot} units packed</span>
              </div>
              <div className="pd-packbar"><i style={{ width: `${tot ? (done / tot) * 100 : 0}%` }} /></div>

              <div className="pd-scanbar" style={{ margin: "12px 0 14px" }}>
                <span className="ic"><IconCamera size={15} /></span>
                <input autoFocus placeholder="Scan barcode / type batch no. + Enter" value={scan} onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doScan(); } }} />
                <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={doScan} disabled={!scan.trim()}>Add</button>
              </div>

              <div className="pd-card" style={{ overflow: "hidden" }}>
                {lines.map((ln) => {
                  const p = prodOf(ln.productId);
                  const full = ln.scanned >= ln.qty;
                  return (
                    <div className={`pd-packrow${full ? " ok" : ""}`} key={ln.productId}>
                      <span className="em">{p ? <Thumb p={p} /> : <IconPill size={15} />}</span>
                      <span className="nm">{ln.name}<span className="pd-muted" style={{ fontSize: 11 }}>{ln.batchNo ? ` · batch ${ln.batchNo}` : p ? ` · ${p.composition}` : ""}</span></span>
                      <span className={`pd-pill ${full ? "pill-green" : "pill-gray"}`} style={{ minWidth: 54, justifyContent: "center" }}>{ln.scanned}/{ln.qty}</span>
                      <div className="pd-qty">
                        <button onClick={() => pickPackLine(saleId, ln.productId, -1)} disabled={ln.scanned <= 0} aria-label="un-pick">−</button>
                        <span style={{ minWidth: 26, textAlign: "center", fontWeight: 800, fontSize: 13 }}>{ln.scanned}</span>
                        <button onClick={() => pickPackLine(saleId, ln.productId, 1)} disabled={full} aria-label="pick manually">+</button>
                      </div>
                      {full && <IconCheck size={16} />}
                    </div>
                  );
                })}
              </div>
              <p className="pd-muted" style={{ fontSize: 11.5, marginTop: 10 }}>Scanning deducts the exact batch from inventory automatically. Scanner not working? Use −/+ to pick manually (FEFO — earliest expiry first).</p>
            </>
          )}

          {step === "handover" && (
            <>
              <div className="pd-card pd-card-pad" style={{ background: "var(--wash2)", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}><IconBox size={24} /></span>
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 14 }}>Packed &amp; invoice generated</b>
                  <div className="pd-muted" style={{ fontSize: 12 }}>{tot} units sealed in a Namma MedMate packet · invoice {inr(t.payable)}{sale.fulfillment?.sealedAt ? ` · ${fmtDateTime(sale.fulfillment.sealedAt)}` : ""}</div>
                </div>
                <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => window.print()}><IconPrint size={14} /> Print invoice</button>
              </div>

              <div className="pd-pl-head" style={{ marginTop: 0 }}>Assign delivery partner</div>
              <div className="pd-form-grid">
                <div className="pd-field pd-span2"><label>Delivery partner name</label><input className="pd-input" autoFocus value={rider.name} onChange={(e) => setRider({ ...rider, name: e.target.value })} placeholder="e.g. Suresh (rider)" /></div>
                <div className="pd-field"><label>Phone</label><input className="pd-input" value={rider.phone} onChange={(e) => setRider({ ...rider, phone: e.target.value })} placeholder="+91 …" inputMode="tel" /></div>
                <div className="pd-field"><label>Vehicle no. (optional)</label><input className="pd-input" value={rider.vehicle} onChange={(e) => setRider({ ...rider, vehicle: e.target.value })} placeholder="KA-01-AB-1234" /></div>
              </div>
              <p className="pd-muted" style={{ fontSize: 12, marginTop: 10 }}>Match the packet's <b className="pd-mono">{sale.id}</b> label to the order before handing it over.</p>

              {/* off-screen printable invoice */}
              <div className="pd-print-area" style={{ position: "absolute", left: -99999, top: 0 }}><Invoice sale={sale} profile={profile} /></div>
            </>
          )}

          {step === "done" && <DispatchedView sale={sale} now={Date.now()} onDelivered={() => advanceOrder(saleId)} />}
        </div>

        <div className="pd-modal-foot pd-no-print">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Close</button>
          <div className="pd-spacer" />
          {step === "pack" && <button className="pd-btn pd-btn-primary" disabled={!ready} onClick={() => { sealPacket(saleId); toast(`${sale.id} sealed in a Namma MedMate packet`); }}>{ready ? "Seal packet & generate invoice →" : `Scan all ${tot} units to continue`}</button>}
          {step === "handover" && <button className="pd-btn pd-btn-primary" disabled={!rider.name.trim()} onClick={() => { handToRider(saleId, { name: rider.name.trim(), phone: rider.phone.trim() || undefined, vehicle: rider.vehicle.trim() || undefined }); toast(`${sale.id} handed to ${rider.name.trim()}`); }}><IconTruck size={15} /> Hand to delivery partner</button>}
          {step === "done" && sale.status === "out" && <button className="pd-btn pd-btn-gold" onClick={() => { advanceOrder(saleId); toast(`${sale.id} marked delivered`); }}>Mark delivered</button>}
        </div>
      </div>
    </div>
  );
}

function DispatchedView({ sale, onDelivered }: { sale: Sale; now: number; onDelivered: () => void }) {
  const r = sale.fulfillment?.rider;
  return (
    <>
      <div className="pd-card pd-card-pad" style={{ background: "var(--wash2)", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}><IconTruck size={24} /></span>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 14 }}>{sale.status === "delivered" ? "Delivered" : "Out for delivery"}</b>
          <div className="pd-muted" style={{ fontSize: 12 }}>Handed to {r?.name ?? "delivery partner"}{r?.phone ? ` · ${r.phone}` : ""}{r?.vehicle ? ` · ${r.vehicle}` : ""}{sale.fulfillment?.handedAt ? ` · ${fmtDateTime(sale.fulfillment.handedAt)}` : ""}</div>
        </div>
      </div>
      <div className="pd-fact">
        <div><div className="k">Order</div><div className="v sm pd-mono">{sale.id}</div></div>
        <div><div className="k">Customer</div><div className="v sm">{sale.customer.name}</div></div>
        <div><div className="k">Deliver to</div><div className="v sm">{sale.customer.address ?? "—"}</div></div>
      </div>
      {sale.status === "out" && <p className="pd-muted" style={{ fontSize: 12, marginTop: 12 }}>When the rider confirms delivery, mark it below.</p>}
      {sale.status === "delivered" && <p className="pd-muted" style={{ fontSize: 12, marginTop: 12 }}><IconCheck size={13} /> This order has been delivered. {/* onDelivered unused here */}<span style={{ display: "none" }}>{String(!!onDelivered)}</span></p>}
    </>
  );
}
