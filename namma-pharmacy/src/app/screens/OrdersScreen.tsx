"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import {
  inr, computeInvoice, timeAgo, fmtDateTime, PAY_LABEL, ONLINE_FLOW,
  STATUS_LABEL, Sale, Channel, OrderStatus, Prescription, PayMode,
} from "../data";
import { StatusPill, ChannelPill } from "../components/bits";
import { IconSearch, IconPrint, IconX, IconArrowRight, IconRx, IconClock, IconShare, IconCash, IconGlobe, IconStore, IconBolt, IconBox, IconTruck, IconInbox, IconCheck, IconPin } from "../components/Icon";
import Invoice from "../components/Invoice";
import ShareSheet from "../components/ShareSheet";
import RxView from "../components/RxView";
import PackOrder from "../components/PackOrder";

type Filter = "all" | "online" | "offline" | "action" | "unpaid";

export default function OrdersScreen() {
  const { sales, prescriptions, profile, advanceOrder, cancelOrder, markPaid, now, go } = usePharma();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<Sale | null>(null);
  const [viewTab, setViewTab] = useState<"history" | "invoice">("history");
  const [shareSale, setShareSale] = useState<Sale | null>(null);
  const [packId, setPackId] = useState<string | null>(null);
  const openOrder = (s: Sale, tab: "history" | "invoice" = "history") => { setViewTab(tab); setView(s); };

  const total = (s: Sale) => computeInvoice(s.items, s.discount).payable;

  const list = [...sales].sort((a, b) => b.createdAt - a.createdAt).filter((s) => {
    if (filter === "online" && s.channel !== "online") return false;
    if (filter === "offline" && s.channel !== "offline") return false;
    if (filter === "action" && !(s.channel === "online" && (s.status === "new" || s.status === "accepted" || s.status === "packed"))) return false;
    if (filter === "unpaid" && !(s.paid === false && s.status !== "cancelled")) return false;
    if (q && !(`${s.id} ${s.customer.name} ${s.customer.phone ?? ""}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });

  const nextLabel = (s: Sale): string | null => {
    const i = ONLINE_FLOW.indexOf(s.status);
    if (i < 0 || i >= ONLINE_FLOW.length - 1) return null;
    return STATUS_LABEL[ONLINE_FLOW[i + 1]];
  };

  const counts = {
    all: sales.length,
    online: sales.filter((s) => s.channel === "online").length,
    offline: sales.filter((s) => s.channel === "offline").length,
    action: sales.filter((s) => s.channel === "online" && ["new", "accepted", "packed"].includes(s.status)).length,
    unpaid: sales.filter((s) => s.paid === false && s.status !== "cancelled").length,
  };

  return (
    <div className="pd-canvas-wide">
      <div className="pd-toolbar">
        <div className="pd-seg">
          {(["all", "online", "offline", "action", "unpaid"] as Filter[]).map((f) => (
            <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "online" ? <><IconGlobe size={13} /> Online</> : f === "offline" ? <><IconStore size={13} /> Counter</> : f === "action" ? <><IconBolt size={13} /> Needs action</> : <><IconCash size={13} /> Unpaid</>} ({counts[f]})
            </button>
          ))}
        </div>
        <div className="pd-spacer" />
        <div className="pd-search-inline">
          <span className="ic"><IconSearch size={17} /></span>
          <input placeholder="Search invoice, customer, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead>
              <tr><th>Invoice</th><th>Customer</th><th>Items</th><th>Channel</th><th>Payment</th><th>Status</th><th className="num">Amount</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((s) => {
                return (
                  <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => openOrder(s)}>
                    <td className="pd-mono" style={{ fontWeight: 700 }}>
                      {s.id}
                      {s.rx && <span className="pd-tag rx" style={{ marginLeft: 6 }}><IconRx size={11} /> Rx</span>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.customer.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{timeAgo(s.createdAt, now)}{s.customer.phone ? ` · ${s.customer.phone}` : ""}</div>
                    </td>
                    <td>{s.items.reduce((a, i) => a + i.qty, 0)} units<div style={{ fontSize: 11.5, color: "var(--muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.items.map((i) => i.name).join(", ")}</div></td>
                    <td><ChannelPill channel={s.channel} /></td>
                    <td>{s.paid === false ? <span className="pd-pill pill-rose"><i className="d" />Unpaid</span> : PAY_LABEL[s.payMode]}</td>
                    <td><StatusPill status={s.status} /></td>
                    <td className="num" style={{ fontWeight: 800 }}>{inr(total(s))}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="pd-flex pd-gap6" style={{ justifyContent: "flex-end" }}>
                        {s.paid === false && (
                          <button className="pd-btn pd-btn-sm pd-btn-gold" onClick={() => markPaid(s.id, s.payMode)}><IconCash size={14} /> Mark paid</button>
                        )}
                        {s.channel === "online" && s.status === "new" && (
                          <>
                            <button className="pd-btn pd-btn-sm pd-btn-primary" onClick={() => advanceOrder(s.id)}>Accept</button>
                            <button className="pd-btn pd-btn-sm pd-btn-rose" onClick={() => cancelOrder(s.id)}>Reject</button>
                          </>
                        )}
                        {s.channel === "online" && s.status === "accepted" && (
                          <button className="pd-btn pd-btn-sm pd-btn-primary" onClick={() => setPackId(s.id)}><IconBox size={14} /> Pack order</button>
                        )}
                        {s.channel === "online" && s.status === "packed" && (
                          <button className="pd-btn pd-btn-sm pd-btn-primary" onClick={() => setPackId(s.id)}><IconTruck size={14} /> Hand to delivery</button>
                        )}
                        {s.channel === "online" && s.status === "out" && (
                          <button className="pd-btn pd-btn-sm pd-btn-gold" onClick={() => advanceOrder(s.id)}>Mark delivered</button>
                        )}
                        <button className="pd-btn pd-btn-ghost pd-btn-sm" title="View order history" onClick={() => openOrder(s, "history")}><IconClock size={14} /> History</button>
                        <button className="pd-iconbtn" title="Share bill" onClick={() => setShareSale(s)}><IconShare size={16} /></button>
                        <button className="pd-iconbtn" title="View &amp; print invoice" onClick={() => openOrder(s, "invoice")}><IconPrint size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={8}><div className="pd-empty"><div className="em"><IconInbox size={28} /></div><p>No orders in this view.</p></div></td></tr>}
            </tbody>
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
          onPack={() => { setView(null); setPackId(view.id); }}
          now={now}
        />
      )}

      {packId && <PackOrder saleId={packId} onClose={() => setPackId(null)} />}
      {shareSale && <ShareSheet sale={sales.find((x) => x.id === shareSale.id) ?? shareSale} profile={profile} onClose={() => setShareSale(null)} />}
    </div>
  );
}

// link an order to a prescription by rxId, else best-effort by customer name
export function matchRx(prescriptions: Prescription[], s: Sale): Prescription | undefined {
  if (!s.rx) return undefined;
  return prescriptions.find((r) => r.patient.toLowerCase() === s.customer.name.toLowerCase());
}

function OrderTimeline({ status }: { status: OrderStatus }) {
  const idx = ONLINE_FLOW.indexOf(status);
  return (
    <div className="pd-flex pd-no-print" style={{ margin: "4px 0 18px", gap: 0, justifyContent: "space-between" }}>
      {ONLINE_FLOW.map((st, i) => (
        <div key={st} style={{ flex: 1, textAlign: "center", position: "relative" }}>
          {i > 0 && <div style={{ position: "absolute", left: "-50%", top: 11, width: "100%", height: 3, background: i <= idx ? "var(--mid)" : "var(--line)" }} />}
          <div style={{ position: "relative", width: 24, height: 24, borderRadius: "50%", margin: "0 auto", display: "grid", placeItems: "center", background: i <= idx ? "var(--mid)" : "var(--line)", color: "#fff", fontSize: 12, fontWeight: 800 }}>{i < idx ? <IconCheck size={12} /> : i + 1}</div>
          <div style={{ fontSize: 10.5, marginTop: 5, fontWeight: 700, color: i <= idx ? "var(--dark)" : "var(--muted)" }}>{STATUS_LABEL[st]}</div>
        </div>
      ))}
    </div>
  );
}

const RX_PILL: Record<string, string> = { pending: "pill-gold", approved: "pill-blue", dispensed: "pill-green", rejected: "pill-rose" };

export function OrderDetail({ sale, rx, profile, onClose, onAdvance, onCancel, onMarkPaid, onShare, onOpenRx, onPack, now, initialTab = "history" }: {
  sale: Sale; rx?: Prescription; profile: any; onClose: () => void;
  onAdvance: () => void; onCancel: () => void; onMarkPaid: (m: PayMode) => void; onShare: () => void; onOpenRx: () => void; onPack?: () => void; now: number;
  initialTab?: "history" | "invoice";
}) {
  const [tab, setTab] = useState<"history" | "invoice">(initialTab);
  const [payMode, setPayMode] = useState<PayMode>(sale.payMode);
  const doPrint = () => { setTab("invoice"); setTimeout(() => window.print(), 80); };
  const t = computeInvoice(sale.items, sale.discount);
  const idx = ONLINE_FLOW.indexOf(sale.status);
  const nextLabel = sale.channel === "online" && idx >= 0 && idx < ONLINE_FLOW.length - 1 ? STATUS_LABEL[ONLINE_FLOW[idx + 1]] : null;
  const history = [...(sale.history ?? [{ status: sale.status, at: sale.createdAt }])].sort((a, b) => a.at - b.at);
  // remaining (future) online steps not yet reached
  const future = sale.channel === "online" && sale.status !== "cancelled"
    ? ONLINE_FLOW.slice(idx + 1).map((st) => ({ status: st, at: 0, future: true }))
    : [];

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head pd-no-print">
          <div>
            <h3>{sale.id} <span style={{ fontWeight: 600, fontSize: 13, color: "var(--muted)" }}>· {sale.channel === "online" ? "Online order" : "Counter sale"}</span></h3>
            <div className="pd-flex pd-gap6" style={{ marginTop: 5 }}><StatusPill status={sale.status} /><ChannelPill channel={sale.channel} />{sale.rx && <span className="pd-tag rx"><IconRx size={11} /> Prescription</span>}</div>
          </div>
          <button className="pd-x" onClick={onClose}><IconX size={18} /></button>
        </div>

        <div className="pd-no-print" style={{ padding: "12px 20px 0" }}>
          <div className="pd-seg">
            <button className={tab === "history" ? "on" : ""} onClick={() => setTab("history")}>Details &amp; history</button>
            <button className={tab === "invoice" ? "on" : ""} onClick={() => setTab("invoice")}>Invoice</button>
          </div>
        </div>

        <div className="pd-modal-body">
          {tab === "history" ? (
            <>
              {/* quick facts */}
              <div className="pd-fact">
                <div><div className="k">Order date &amp; time</div><div className="v sm">{fmtDateTime(sale.createdAt)}</div></div>
                <div><div className="k">Amount</div><div className="v">{inr(t.payable)}</div></div>
                <div><div className="k">Payment</div><div className="v sm" style={sale.paid === false ? { color: "var(--rose)" } : undefined}>{sale.paid === false ? "Unpaid · at reception" : PAY_LABEL[sale.payMode]}</div></div>
                <div><div className="k">Customer</div><div className="v sm">{sale.customer.name}{sale.customer.phone ? ` · ${sale.customer.phone}` : ""}</div></div>
                <div><div className="k">Items</div><div className="v sm">{sale.items.reduce((a, i) => a + i.qty, 0)} units · {sale.items.length} lines</div></div>
                <div><div className="k">GST</div><div className="v sm">{inr(t.totalTax)} ({inr(t.taxable)} taxable)</div></div>
              </div>

              {sale.customer.address && <p className="pd-muted" style={{ fontSize: 12.5, marginBottom: 14 }}><IconPin size={12} /> Deliver to: {sale.customer.address}</p>}

              {/* reception: collect pending payment */}
              {sale.paid === false && (
                <div className="pd-card pd-card-pad" style={{ background: "var(--rose-bg)", border: "1px solid #f3d3d3", marginBottom: 16 }}>
                  <div className="pd-flex" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                    <div><div style={{ fontWeight: 800, fontSize: 14, color: "var(--rose)" }}>Payment pending · {inr(t.payable)}</div><div className="pd-muted" style={{ fontSize: 12 }}>Sent to reception from billing. Collect & mark paid.</div></div>
                  </div>
                  <div className="pd-flex pd-gap6" style={{ flexWrap: "wrap", marginBottom: 10 }}>
                    {(["cash", "upi", "card"] as PayMode[]).map((m) => <button key={m} className={`pd-chip${payMode === m ? " on" : ""}`} onClick={() => setPayMode(m)}>{PAY_LABEL[m]}</button>)}
                  </div>
                  <button className="pd-btn pd-btn-gold pd-btn-block" onClick={() => onMarkPaid(payMode)}><IconCash size={15} /> Mark as paid · {PAY_LABEL[payMode]}</button>
                </div>
              )}

              {sale.channel === "online" && sale.status !== "cancelled" && <OrderTimeline status={sale.status} />}

              {/* status history with timestamps */}
              <div className="pd-pl-head" style={{ marginTop: 0 }}>Status history</div>
              <div className="pd-vtl">
                {history.map((e, i) => (
                  <div className={`ev${e.status === "cancelled" ? " cancel" : ""}`} key={i}>
                    <div className="t">{STATUS_LABEL[e.status]}</div>
                    <div className="d">{fmtDateTime(e.at)} · {timeAgo(e.at, now)}</div>
                  </div>
                ))}
                {future.map((e, i) => (
                  <div className="ev future" key={"f" + i}><div className="t">{STATUS_LABEL[e.status]}</div><div className="d">Pending</div></div>
                ))}
              </div>

              {/* linked prescription */}
              {sale.rx && (
                <>
                  <div className="pd-pl-head pd-flex" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <span>Prescription</span>
                    {rx && <span className="pd-flex pd-gap6" style={{ alignItems: "center" }}>
                      <span className={`pd-pill ${RX_PILL[rx.status]}`}><i className="d" />{rx.status}</span>
                      <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={onOpenRx}>Open <IconArrowRight size={13} /></button>
                    </span>}
                  </div>
                  {rx ? (
                    <>
                      <div className="pd-flex pd-gap6" style={{ marginBottom: 8 }}>
                        <span className="pd-mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{rx.id}</span>
                        <span className={`pd-pill ${rx.kind === "digital" ? "pill-teal" : "pill-gray"}`}>{rx.kind === "digital" ? "Namma MedMate digital Rx" : "Uploaded photo"}</span>
                      </div>
                      <RxView rx={rx} />
                    </>
                  ) : (
                    <p className="pd-muted" style={{ fontSize: 12.5 }}>Prescription-required items — Rx verified at billing (Dr. {sale.customer.doctor ?? "on file"}).</p>
                  )}
                </>
              )}

              {/* items */}
              <div className="pd-pl-head">Items</div>
              <table className="pd-tbl">
                <thead><tr><th>Item</th><th>Batch</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {sale.items.map((it) => (
                    <tr key={it.productId + it.batchNo}><td style={{ fontWeight: 600 }}>{it.name}</td><td className="pd-mono">{it.batchNo}</td><td className="num">{it.qty}</td><td className="num">{inr(it.price)}</td><td className="num" style={{ fontWeight: 700 }}>{inr(it.price * it.qty)}</td></tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={4}>Total payable</td><td className="num">{inr(t.payable)}</td></tr></tfoot>
              </table>
            </>
          ) : (
            <Invoice sale={sale} profile={profile} />
          )}
        </div>

        <div className="pd-modal-foot pd-no-print">
          {sale.channel === "online" && sale.status === "new" && <button className="pd-btn pd-btn-rose" onClick={onCancel}>Reject order</button>}
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Close</button>
          <button className="pd-btn pd-btn-ghost" onClick={onShare}><IconShare size={15} /> Share</button>
          {sale.channel === "online" && sale.status === "new" && <button className="pd-btn pd-btn-gold" onClick={onAdvance}>Accept order</button>}
          {sale.channel === "online" && (sale.status === "accepted" || sale.status === "packed") && onPack && <button className="pd-btn pd-btn-gold" onClick={onPack}>{sale.status === "accepted" ? <><IconBox size={15} /> Pack & dispatch</> : <><IconTruck size={15} /> Hand to delivery</>}</button>}
          {sale.channel === "online" && sale.status === "out" && <button className="pd-btn pd-btn-gold" onClick={onAdvance}>Mark delivered</button>}
          <button className="pd-btn pd-btn-primary" onClick={doPrint}><IconPrint size={16} /> Print / PDF</button>
        </div>
      </div>
    </div>
  );
}
