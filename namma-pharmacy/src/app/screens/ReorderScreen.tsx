"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import {
  isLowStock, stockOf, suggestedSupplierId, bestSupplyFor, effectiveSupplyPrice,
  schemeLabel, suggestedReorderQty, POItem, timeAgo, inr2,
} from "../data";
import { IconSend, IconTruck, IconCheck, IconTrendDown, IconCash, IconBulb } from "../components/Icon";
import { Thumb } from "../components/bits";

export default function ReorderScreen() {
  const { inventory, suppliers, supplyList, purchaseOrders, sendPurchaseOrder, markPOReceived, setProductSupplier, now, go } = usePharma();
  const [qtys, setQtys] = useState<Record<string, number>>({});

  const low = inventory.filter((p) => isLowStock(p));
  const qtyFor = (id: string) => qtys[id] ?? suggestedReorderQty(inventory.find((p) => p.id === id)!);

  // supply rows for a product
  const rowsFor = (pid: string) => supplyList.filter((e) => e.productId === pid);
  const entryFor = (pid: string, sid: string) => supplyList.find((e) => e.productId === pid && e.supplierId === sid);

  // group low-stock items by SUGGESTED distributor (cheapest landed price, after bonus)
  const groups = suppliers.map((s) => ({
    supplier: s,
    items: low.filter((p) => suggestedSupplierId(p, suppliers, supplyList) === s.id),
  })).filter((g) => g.items.length > 0);

  // estimated savings: buying each multi-source item from its cheapest source vs its priciest
  const estSavings = low.reduce((sum, p) => {
    const rows = rowsFor(p.id);
    if (rows.length < 2) return sum;
    const effs = rows.map(effectiveSupplyPrice);
    return sum + (Math.max(...effs) - Math.min(...effs)) * qtyFor(p.id);
  }, 0);

  const send = (supplierId: string, supplierName: string, items: typeof low) => {
    const poItems: POItem[] = items.map((p) => ({ productId: p.id, name: p.name, qty: qtyFor(p.id) })).filter((x) => x.qty > 0);
    sendPurchaseOrder(supplierId, supplierName, poItems);
    setQtys((q) => { const n = { ...q }; items.forEach((p) => delete n[p.id]); return n; });
  };

  return (
    <div className="pd-canvas-wide">
      <div className="pd-stats" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="pd-stat"><div className="ic ic-rose"><IconTrendDown size={18} /></div><div className="lbl">Items below reorder level</div><div className="val">{low.length}</div></div>
        <div className="pd-stat"><div className="ic ic-blue"><IconTruck size={18} /></div><div className="lbl">Distributors to order from</div><div className="val">{groups.length}</div></div>
        <div className="pd-stat"><div className="ic ic-green"><IconCash size={18} /></div><div className="lbl">Est. savings (best price)</div><div className="val">{inr2(estSavings)}</div><div className="split">vs priciest source · this order</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconSend size={18} /></div><div className="lbl">Open purchase orders</div><div className="val">{purchaseOrders.filter((p) => p.status === "sent").length}</div></div>
      </div>

      {low.length === 0 ? (
        <div className="pd-card pd-card-pad"><div className="pd-empty"><div className="em"><IconCheck size={30} /></div><h3>Everything well stocked</h3><p>No products are below their reorder level right now.</p></div></div>
      ) : (
        <div className="pd-sec">
          <div className="pd-sec-head"><h2>Suggested orders by distributor</h2><span className="sub">grouped under the <b>cheapest landed price</b> (after bonus / free-goods schemes) — adjust the distributor or quantity anytime</span></div>
          {groups.map((g) => (
            <div className="pd-card" key={g.supplier.id} style={{ marginBottom: 16 }}>
              <div className="pd-card-head">
                <div className="pd-flex"><span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--wash)", color: "var(--mid)", display: "grid", placeItems: "center" }}><IconTruck size={20} /></span><div><h3>{g.supplier.name}</h3><span className="sub pd-mono">{g.supplier.gstin} · {g.supplier.phone}</span></div></div>
                <button className="pd-btn pd-btn-primary" onClick={() => send(g.supplier.id, g.supplier.name, g.items)}><IconSend size={15} /> Send order ({g.items.length})</button>
              </div>
              <div className="pd-tbl-wrap">
                <table className="pd-tbl">
                  <thead><tr><th>Product</th><th className="num">In stock</th><th className="num">Reorder at</th><th className="num">Landed price</th><th className="num">Save / pack</th><th className="num">Order qty</th><th>Distributor</th></tr></thead>
                  <tbody>
                    {g.items.map((p) => {
                      const rows = rowsFor(p.id);
                      const sel = entryFor(p.id, g.supplier.id);
                      const cheapest = bestSupplyFor(p.id, supplyList);
                      const selEff = sel ? effectiveSupplyPrice(sel) : undefined;
                      const effs = rows.map(effectiveSupplyPrice);
                      const maxEff = effs.length ? Math.max(...effs) : undefined;
                      const isBest = !!(cheapest && sel && cheapest.id === sel.id);
                      const savePack = (selEff !== undefined && maxEff !== undefined && rows.length > 1) ? maxEff - selEff : 0;
                      const cheaperElsewhere = cheapest && (!sel || cheapest.id !== sel.id) ? cheapest : undefined;
                      return (
                        <tr key={p.id}>
                          <td><div className="prod"><span className="em"><Thumb p={p} /></span><span><span className="nm">{p.name}</span><div className="sub">{p.pack}</div></span></div></td>
                          <td className="num"><span className="pd-pill pill-rose">{stockOf(p)}</span></td>
                          <td className="num pd-muted">{p.reorderLevel}</td>
                          <td className="num">
                            {sel ? (
                              <>
                                <span style={{ fontWeight: 700 }}>{inr2(selEff!)}</span>
                                {schemeLabel(sel) && <div className="sub pd-muted" style={{ fontSize: 11 }}>{inr2(sel.purchasePrice)} · {schemeLabel(sel)} free</div>}
                                {isBest && rows.length > 1 && <div><span className="pd-pill pill-green" style={{ fontSize: 10.5 }}><i className="d" />Best price</span></div>}
                              </>
                            ) : <span className="pd-muted" style={{ fontSize: 11.5 }}>no quote</span>}
                          </td>
                          <td className="num">
                            {savePack > 0 ? <span style={{ fontWeight: 700, color: "#1f7a46" }}>{inr2(savePack)}</span> : <span className="pd-muted">—</span>}
                            {cheaperElsewhere && (
                              <div className="sub" style={{ fontSize: 11 }}>
                                <button className="pd-linkbtn" title="Switch to cheaper distributor" onClick={() => setProductSupplier(p.id, cheaperElsewhere.supplierId)} style={{ color: "#b9842f", fontWeight: 700, background: "none", border: 0, cursor: "pointer", padding: 0 }}>
                                  <IconBulb size={13} /> {suppliers.find((s) => s.id === cheaperElsewhere.supplierId)?.name?.split(" ")[0]} {inr2(effectiveSupplyPrice(cheaperElsewhere))} →
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="num">
                            <div className="pd-qty" style={{ marginLeft: "auto" }}>
                              <button onClick={() => setQtys((q) => ({ ...q, [p.id]: Math.max(0, qtyFor(p.id) - 5) }))}>−</button>
                              <span>{qtyFor(p.id)}</span>
                              <button onClick={() => setQtys((q) => ({ ...q, [p.id]: qtyFor(p.id) + 5 }))}>+</button>
                            </div>
                          </td>
                          <td>
                            <select className="pd-select" style={{ padding: "5px 8px", maxWidth: 220 }} value={suggestedSupplierId(p, suppliers, supplyList)} onChange={(e) => setProductSupplier(p.id, e.target.value)}>
                              {suppliers.map((s) => {
                                const en = entryFor(p.id, s.id);
                                return <option key={s.id} value={s.id}>{s.name}{en ? ` · ${inr2(effectiveSupplyPrice(en))}` : ""}</option>;
                              })}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pd-card">
        <div className="pd-card-head"><h3>Purchase orders</h3><span className="sub">sent to distributors</span></div>
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>PO no.</th><th>Distributor</th><th>Items</th><th>Sent</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {purchaseOrders.map((po) => (
                <tr key={po.id}>
                  <td className="pd-mono" style={{ fontWeight: 700 }}>{po.id}</td>
                  <td style={{ fontWeight: 600 }}>{po.supplierName}</td>
                  <td>{po.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</td>
                  <td>{timeAgo(po.createdAt, now)}</td>
                  <td><span className={`pd-pill ${po.status === "received" ? "pill-green" : po.status === "sent" ? "pill-blue" : "pill-gray"}`}><i className="d" />{po.status === "received" ? "Received" : po.status === "sent" ? "Sent · awaiting" : "Draft"}</span></td>
                  <td className="num">
                    {po.status === "sent" && <div className="pd-flex pd-gap6" style={{ justifyContent: "flex-end" }}>
                      <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => go("purchases")}>Record GRN</button>
                      <button className="pd-btn pd-btn-sm pd-btn-primary" onClick={() => markPOReceived(po.id)}><IconCheck size={14} /> Received</button>
                    </div>}
                  </td>
                </tr>
              ))}
              {purchaseOrders.length === 0 && <tr><td colSpan={6}><div className="pd-empty" style={{ padding: 24 }}><p>No purchase orders yet.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
