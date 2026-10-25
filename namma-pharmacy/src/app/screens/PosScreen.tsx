"use client";
import { useState, useEffect } from "react";
import { usePharma } from "../pharmaState";
import QtyBox from "../components/QtyBox";
import {
  CATEGORIES, inr, inr2, billUnit, stockOf, isLowStock, earliestBatch,
  looseSellable, unitNoun, totalUnits, stockLabel,
  PayMode, PAY_LABEL, SALE_SOURCES, hasLocation, matchesLocation,
} from "../data";
import { INSURERS } from "../lib/hospital";
import { ScheduleTag, Thumb } from "../components/bits";
import { IconSearch, IconPrint, IconX, IconAlert, IconShare, IconCamera, IconPin, IconHash, IconReceipt, IconHospital, IconCheck, IconCash, IconPhone, IconCard, IconTruck, IconShield, IconUser, IconArrowRight } from "../components/Icon";
import Invoice from "../components/Invoice";
import ShareSheet from "../components/ShareSheet";

const PAY_OPTS: { m: PayMode; Ic: (p: { size?: number }) => React.ReactNode }[] = [
  { m: "cash", Ic: IconCash }, { m: "upi", Ic: IconPhone }, { m: "card", Ic: IconCard }, { m: "cod", Ic: IconTruck }, { m: "credit", Ic: IconReceipt }, { m: "insurance", Ic: IconShield },
];

export default function PosScreen() {
  const {
    inventory, pos, posAdd, posDec, posSetQty, posRemove, posClear, posSetBatch, scanToPos, toast, posCustomer, setPosCustomer,
    posDiscount, setPosDiscount, posDiscountMode, setPosDiscountMode, posDiscountFlat, posPay, setPosPay, posTotals, posCount, checkoutPos,
    lastInvoice, setLastInvoice, profile, registerBack,
    isHospital, wards, posSource, setPosSource, posWard, setPosWard, posInsurer, setPosInsurer, posPatientId, setPosPatientId,
  } = usePharma();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [share, setShare] = useState(false);
  const [scan, setScan] = useState("");
  const [step, setStep] = useState<"cart" | "pay">("cart");
  // global Back on the payment page returns to the cart page (not the previous route)
  useEffect(() => {
    registerBack(step === "pay" ? () => { setStep("cart"); return true; } : null);
    return () => registerBack(null);
  }, [step, registerBack]);
  const onScan = () => { const code = scan.trim(); if (!code) return; const hit = scanToPos(code); toast(hit ? `${hit.name}${hit.batchNo ? " · Batch " + hit.batchNo : ""}` : `No match for “${code}”`); setScan(""); };

  const list = inventory.filter((p) => {
    if (cat !== "all" && p.category !== cat) return false;
    if (q && !(`${p.name} ${p.composition} ${p.manufacturer}`.toLowerCase().includes(q.toLowerCase()) || matchesLocation(p, q))) return false;
    return true;
  });

  const packQty = (id: string) => pos.find((x) => x.productId === id && !x.loose)?.qty ?? 0;
  const looseQty = (id: string) => pos.find((x) => x.productId === id && x.loose)?.qty ?? 0;
  const hasRx = pos.some((l) => inventory.find((p) => p.id === l.productId)?.schedule !== "OTC");
  const rxOk = !hasRx || posCustomer.doctor.trim().length > 0;
  const isCredit = posPay === "credit";
  const creditOk = !isCredit || posCustomer.name.trim().length > 0;
  const isInsurance = posPay === "insurance";
  const insurerOk = !isInsurance || posInsurer.trim().length > 0;
  const wardOk = !isHospital || posSource !== "ward" || posWard.trim().length > 0;
  const payOpts = isHospital ? PAY_OPTS : PAY_OPTS.filter((o) => o.m !== "insurance");
  const okToBill = rxOk && creditOk && insurerOk && wardOk;
  // page-1 (cart) details that must be set before moving to the payment page
  const detailsOk = rxOk && wardOk;

  const doCheckout = async () => { if (!okToBill) return; const err = await checkoutPos(); if (!err) setStep("cart"); };
  const doReception = async () => { if (!rxOk || !wardOk || !insurerOk) return; const err = await checkoutPos({ paid: false }); if (!err) setStep("cart"); };
  // if the cart empties (cleared / checked out) drop back to the cart page
  if (step === "pay" && pos.length === 0) setStep("cart");

  const sourceLabel = SALE_SOURCES.find((s) => s.key === posSource)?.short ?? "Counter";

  // one bill line's computed values (shared by cart + review)
  const lineView = (line: typeof pos[number]) => {
    const p = inventory.find((x) => x.id === line.productId);
    if (!p) return null;
    const loose = !!line.loose;
    const pinned = !loose && line.batchNo ? p.batches.find((x) => x.batchNo === line.batchNo) : null;
    const b = pinned ?? earliestBatch(p);
    const unit = billUnit(p, { loose, batchNo: b?.batchNo }).price;
    const maxQty = loose ? totalUnits(p) : (pinned ? pinned.qty : stockOf(p));
    return { p, loose, pinned, b, unit, maxQty };
  };

  return (
    <>
      {/* ── step bar ── */}
      <div className="pd-posbar">
        <button className={`pd-posstep ${step === "cart" ? "on" : "done"}`} onClick={() => setStep("cart")}><span className="n">{step === "pay" ? <IconCheck size={12} /> : 1}</span> Cart &amp; customer</button>
        <span className="pd-posbar-arw"><IconArrowRight size={15} /></span>
        <button className={`pd-posstep ${step === "pay" ? "on" : ""}`} disabled={pos.length === 0 || !detailsOk} onClick={() => setStep("pay")}><span className="n">2</span> Payment</button>
      </div>

      {step === "cart" ? (
        <div className="pd-pos">
          {/* ── product browser ── */}
          <div>
            <div className="pd-toolbar" style={{ gap: 10 }}>
              <div className="pd-scanbar">
                <span className="ic"><IconCamera size={17} /></span>
                <input placeholder="Scan barcode / type batch no. + Enter" value={scan} onChange={(e) => setScan(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onScan(); } }} autoFocus />
                <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={onScan} disabled={!scan.trim()}>Add</button>
              </div>
              <div className="pd-search-inline">
                <span className="ic"><IconSearch size={17} /></span>
                <input placeholder="Search medicine, salt, brand…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
            <div className="pd-pos-cat">
              <button className={`pd-chip${cat === "all" ? " on" : ""}`} onClick={() => setCat("all")}>All</button>
              {CATEGORIES.map((c) => (
                <button key={c.key} className={`pd-chip${cat === c.key ? " on" : ""}`} onClick={() => setCat(c.key)}>{c.emoji} {c.label}</button>
              ))}
            </div>
            <div className="pd-pos-grid">
              {list.map((p) => {
                const out = totalUnits(p) <= 0;
                const n = packQty(p.id);
                const ln = looseQty(p.id);
                const loose = looseSellable(p);
                return (
                  <button key={p.id} className={`pd-pcard${out ? " out" : ""}`} onClick={() => stockOf(p) > 0 && posAdd(p.id)}>
                    {n > 0 && <span className="added">{n}</span>}
                    {n === 0 && <span className="corner"><ScheduleTag schedule={p.schedule} /></span>}
                    <div className="em"><Thumb p={p} /></div>
                    <div className="nm">{p.name}</div>
                    <div className="sub">{p.pack}{hasLocation(p) && <span className="pd-rackchip" title="Rack location"><IconPin size={11} /> {p.rack}</span>}</div>
                    <div className="pr">{inr(billUnit(p).price)}</div>
                    <div className={`st ${out ? "out" : isLowStock(p) ? "low" : "ok"}`}>
                      {out ? "Out of stock" : isLowStock(p) ? `Low · ${stockLabel(p)}` : stockLabel(p)}
                    </div>
                    {loose && !out && (
                      <span className={`pd-loose-btn${ln > 0 ? " on" : ""}`} role="button" title={`Sell loose ${unitNoun(p)}s @ ${inr2(billUnit(p, { loose: true }).price)} each`} onClick={(e) => { e.stopPropagation(); posAdd(p.id, true); }}>
                        <IconHash size={13} /> Loose · {inr2(billUnit(p, { loose: true }).price)}/{unitNoun(p)}{ln > 0 ? ` · ${ln}` : ""}
                      </span>
                    )}
                  </button>
                );
              })}
              {list.length === 0 && <div className="pd-empty" style={{ gridColumn: "1/-1" }}><div className="em"><IconSearch size={28} /></div><p>No medicines match “{q}”.</p></div>}
            </div>
          </div>

          {/* ── cart panel ── */}
          <div className="pd-bill">
            <div className="pd-bill-head">
              <h3>Current bill{posCount > 0 && <span className="pd-bill-count">{posCount}</span>}</h3>
              {pos.length > 0 && <button className="pd-btn pd-btn-sm pd-btn-ghost" onClick={posClear}><IconX size={13} /> Clear</button>}
            </div>

            <div className="pd-bill-items">
              {pos.length === 0 ? (
                <div className="pd-empty" style={{ padding: "34px 12px" }}><div className="em"><IconReceipt size={28} /></div><p>Scan or tap a medicine to start billing.</p></div>
              ) : pos.map((line) => {
                const v = lineView(line);
                if (!v) return null;
                const { p, loose, pinned, unit, maxQty } = v;
                return (
                  <div className="pd-bitem" key={line.productId + (loose ? "L" : "") + "-" + (line.batchNo ?? "auto")}>
                    <div className="lt">
                      <div className="nm">{p.name} {hasLocation(p) && <span className="pd-rackchip" title="Rack location"><IconPin size={11} /> {p.rack}</span>}{loose && <span className="pd-tag" style={{ marginLeft: 2 }}>loose</span>}{pinned && <span className="pd-tag" style={{ marginLeft: 2, background: "var(--wash)", color: "var(--mid)" }}>scanned</span>}</div>
                      <div className="sub">
                        {loose
                          ? <>{inr2(unit)}/{unitNoun(p)} · {p.gst}% GST · <select className="pd-batchsel" value={line.batchNo ?? ""} onClick={(e) => e.stopPropagation()} onChange={(e) => posSetBatch(p.id, e.target.value || undefined, true)}>
                              <option value="">From batch: auto (FEFO)</option>
                              {p.batches.filter((x) => x.qty > 0 || x.batchNo === line.batchNo).map((x) => <option key={x.batchNo} value={x.batchNo}>Batch {x.batchNo} · exp {x.expiry} · {x.qty} strips</option>)}
                            </select></>
                          : <>{inr(unit)} · {p.gst}% GST · <select className="pd-batchsel" value={line.batchNo ?? ""} onClick={(e) => e.stopPropagation()} onChange={(e) => posSetBatch(p.id, e.target.value || undefined, false)}>
                              <option value="">Batch: auto (FEFO {earliestBatch(p)?.batchNo ?? "—"})</option>
                              {p.batches.filter((x) => x.qty > 0 || x.batchNo === line.batchNo).map((x) => <option key={x.batchNo} value={x.batchNo}>Batch {x.batchNo} · exp {x.expiry} · {x.qty} left</option>)}
                            </select></>}
                      </div>
                    </div>
                    <QtyBox qty={line.qty} max={maxQty} onDec={() => posDec(p.id, loose, line.batchNo)} onInc={() => posAdd(p.id, loose, line.batchNo)} onSet={(n) => posSetQty(p.id, n, loose, line.batchNo)} onRemove={() => posRemove(p.id, loose, line.batchNo)} />
                    <div className="pr">{inr(unit * line.qty)}</div>
                  </div>
                );
              })}
            </div>

            <div className="pd-bill-foot">
              {/* customer */}
              <div className="pd-bill-sec">
                <div className="pd-sec-lbl"><IconUser size={12} /> Customer</div>
                <div className="pd-bill-cust">
                  <input className="pd-input" data-field="name" placeholder="Name (walk-in)" value={posCustomer.name} onChange={(e) => setPosCustomer({ name: e.target.value })} />
                  <input className="pd-input" data-field="phone" placeholder="Phone" value={posCustomer.phone} onChange={(e) => setPosCustomer({ phone: e.target.value })} inputMode="tel" />
                </div>
                {hasRx && (
                  <>
                    <input className={`pd-input${!rxOk ? " pd-input-warn" : ""}`} data-field="doctor" style={{ marginTop: 8, width: "100%" }} placeholder="Prescribing doctor (required for Rx items)" value={posCustomer.doctor} onChange={(e) => setPosCustomer({ doctor: e.target.value })} />
                    <div className={`pd-rxhint ${rxOk ? "ok" : "warn"}`}>{rxOk ? <><IconCheck size={12} /> Rx doctor recorded</> : <><IconAlert size={12} /> This bill has Rx-only medicine — enter the doctor</>}</div>
                  </>
                )}
              </div>

              {isHospital && (
                <div className="pd-bill-sec">
                  <div className="pd-sec-lbl">Sale source <span style={{ fontWeight: 500, color: "var(--faint)", textTransform: "none", letterSpacing: 0 }}>· ward / emergency → Hospital Billing</span></div>
                  <div className="pd-src-chips">
                    {SALE_SOURCES.filter((s) => s.key === "opd" || s.key === "counter" || s.key === posSource).map((s) => (
                      <button key={s.key} className={`pd-src-chip${posSource === s.key ? " on" : ""}`} onClick={() => setPosSource(s.key)}>
                        <span>{s.emoji}</span>{s.short}
                      </button>
                    ))}
                  </div>
                  {posSource === "ward" && (
                    <select className="pd-select" style={{ marginTop: 8, width: "100%" }} value={posWard} onChange={(e) => setPosWard(e.target.value)}>
                      <option value="">Select ward / room…</option>
                      {wards.map((w) => <option key={w.id} value={w.name}>{w.name} ({w.code})</option>)}
                    </select>
                  )}
                  {(posSource === "ward" || posSource === "emergency") && (
                    <input className="pd-input" style={{ marginTop: 8, width: "100%" }} placeholder="Patient ID / UHID (for settlement)" value={posPatientId} onChange={(e) => setPosPatientId(e.target.value)} />
                  )}
                </div>
              )}

              {/* proceed */}
              <div className="pd-bill-pay">
                <div className="pd-bill-topay" style={{ background: "none", border: 0, padding: "2px 0 12px" }}><span>Items total (incl. GST)</span><b>{inr(posTotals.payable)}</b></div>
                <button className="pd-btn pd-btn-primary pd-btn-lg pd-btn-block" disabled={pos.length === 0 || !detailsOk} onClick={() => setStep("pay")}>
                  Proceed to bill <IconArrowRight size={16} />
                </button>
                {pos.length > 0 && !detailsOk && <div className="pd-rxhint warn" style={{ justifyContent: "center", marginTop: 8 }}><IconAlert size={12} /> {!rxOk ? "Enter the prescribing doctor to continue" : "Select the ward to continue"}</div>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── payment page ── */
        <div className="pd-checkout">
          <button className="pd-btn pd-btn-ghost pd-btn-sm" style={{ marginBottom: 14 }} onClick={() => setStep("cart")}>← Back to add items</button>
          <div className="pd-checkout-grid">
            {/* order review */}
            <div className="pd-card">
              <div className="pd-card-head">
                <h3>Order summary {posCount > 0 && <span className="pd-muted" style={{ fontWeight: 600, fontSize: 13 }}>· {posCount} items</span>}</h3>
                <button className="pd-btn pd-btn-sm pd-btn-ghost" onClick={() => setStep("cart")}><span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><IconArrowRight size={13} /></span> Edit</button>
              </div>
              <div className="pd-card-pad">
                <div className="pd-co-facts">
                  <div><span className="k">Customer</span><span className="v">{posCustomer.name.trim() || "Walk-in"}{posCustomer.phone ? ` · ${posCustomer.phone}` : ""}</span></div>
                  {hasRx && <div><span className="k">Prescribing doctor</span><span className="v">{posCustomer.doctor.trim() || "—"}</span></div>}
                  {isHospital && <div><span className="k">Sale source</span><span className="v">{sourceLabel}{posSource === "ward" && posWard ? ` · ${posWard}` : ""}{posPatientId ? ` · ${posPatientId}` : ""}</span></div>}
                </div>
                <table className="pd-tbl" style={{ marginTop: 4 }}>
                  <thead><tr><th>Item</th><th>Batch</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th></tr></thead>
                  <tbody>
                    {pos.map((line) => {
                      const v = lineView(line);
                      if (!v) return null;
                      const { p, loose, b, unit } = v;
                      return (
                        <tr key={line.productId + (loose ? "L" : "") + "-" + (line.batchNo ?? "auto")}>
                          <td style={{ fontWeight: 600 }}>{p.name}{loose && <span className="pd-tag" style={{ marginLeft: 4 }}>loose</span>}</td>
                          <td className="pd-mono" style={{ fontSize: 11.5 }}>{b?.batchNo ?? "—"}</td>
                          <td className="num">{line.qty}{loose ? ` ${unitNoun(p)}` : ""}</td>
                          <td className="num">{inr(unit)}</td>
                          <td className="num" style={{ fontWeight: 700 }}>{inr(unit * line.qty)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* payment */}
            <div className="pd-bill pd-checkout-pay">
              <div className="pd-bill-head"><h3>Bill &amp; payment</h3></div>
              <div className="pd-bill-sum">
                <div className="pd-billrow"><span>Subtotal (incl. GST)</span><span>{inr(posTotals.gross)}</span></div>
                <div className="pd-billrow disc-row">
                  <span>Discount{posDiscountMode === "percent" && posDiscountFlat > 0 ? ` · −${inr(posDiscountFlat)}` : ""}</span>
                  <span className="pd-disc-ctl">
                    <input className="pd-input" type="number" min={0} value={posDiscount || ""} placeholder="0" onChange={(e) => setPosDiscount(Math.max(0, Number(e.target.value) || 0))} />
                    <div className="pd-seg">
                      <button className={posDiscountMode === "flat" ? "on" : ""} onClick={() => setPosDiscountMode("flat")}>₹</button>
                      <button className={posDiscountMode === "percent" ? "on" : ""} onClick={() => setPosDiscountMode("percent")}>%</button>
                    </div>
                  </span>
                </div>
                <div className="pd-billrow"><span>Taxable value</span><span>{inr(posTotals.taxable)}</span></div>
                <div className="pd-billrow"><span>CGST + SGST</span><span>{inr(posTotals.totalTax)}</span></div>
              </div>
              <div className="pd-bill-topay"><span>To pay</span><b>{inr(posTotals.payable)}</b></div>

              <div className="pd-bill-pay">
                <div className="pd-sec-lbl" style={{ marginBottom: 7 }}>Payment method</div>
                <div className="pd-pay-grid">
                  {payOpts.map((o) => (
                    <button key={o.m} className={`pd-pay${posPay === o.m ? " on" : ""}`} onClick={() => setPosPay(o.m)}>
                      <span className="ic"><o.Ic size={16} /></span>{PAY_LABEL[o.m]}
                    </button>
                  ))}
                </div>

                {isInsurance && (
                  <select className="pd-select" style={{ width: "100%", marginBottom: 10 }} value={posInsurer} onChange={(e) => setPosInsurer(e.target.value)}>
                    <option value="">Select insurer / TPA…</option>
                    {INSURERS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                )}

                {isCredit && (
                  <div className="pd-pill pill-gold" style={{ width: "100%", justifyContent: "center", padding: "7px", marginBottom: 10, fontSize: 12.5 }}>
                    {creditOk ? `On ${posCustomer.name.trim()}'s credit account (khata) — settled later` : "Enter a customer name to give credit"}
                  </div>
                )}
                {isCredit ? (
                  <button className="pd-btn pd-btn-primary pd-btn-lg pd-btn-block" disabled={pos.length === 0 || !creditOk} onClick={doCheckout}>
                    <IconReceipt size={17} /> Record {inr(posTotals.payable)} on credit
                  </button>
                ) : (
                  <>
                    <button className="pd-btn pd-btn-primary pd-btn-lg pd-btn-block" disabled={pos.length === 0 || !okToBill} onClick={doCheckout}>
                      <IconPrint size={17} /> {isInsurance ? `Bill ${inr(posTotals.payable)} to insurer` : `Charge ${inr(posTotals.payable)} & invoice`}
                    </button>
                    <button className="pd-btn pd-btn-ghost pd-btn-block" style={{ marginTop: 8 }} disabled={pos.length === 0 || !rxOk || !wardOk || !insurerOk} onClick={doReception}>
                      <IconHospital size={15} /> Send to reception · pay later
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── invoice modal ── */}
      {lastInvoice && (
        <div className="pd-modal-wrap" onClick={() => setLastInvoice(null)}>
          <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
            <div className="pd-modal-head pd-no-print">
              <h3>{lastInvoice.payMode === "credit" ? `Bill ${lastInvoice.id} · on credit (khata)` : lastInvoice.paid === false ? `Bill ${lastInvoice.id} · sent to reception` : `Invoice ${lastInvoice.id} · created`}</h3>
              <button className="pd-x" onClick={() => setLastInvoice(null)}><IconX size={18} /></button>
            </div>
            <div className="pd-modal-body">
              <Invoice sale={lastInvoice} profile={profile} />
            </div>
            <div className="pd-modal-foot pd-no-print">
              <button className="pd-btn pd-btn-ghost" onClick={() => setLastInvoice(null)}>Done</button>
              <button className="pd-btn pd-btn-ghost" onClick={() => setShare(true)}><IconShare size={16} /> Share bill</button>
              <button className="pd-btn pd-btn-primary" onClick={() => window.print()}><IconPrint size={16} /> Print / Save PDF</button>
            </div>
          </div>
        </div>
      )}

      {share && lastInvoice && <ShareSheet sale={lastInvoice} profile={profile} onClose={() => setShare(false)} />}
    </>
  );
}
