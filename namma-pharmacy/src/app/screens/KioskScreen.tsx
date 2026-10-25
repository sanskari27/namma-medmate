"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import { CATEGORIES, inr, inr2, billUnit, totalUnits, looseSellable, unitNoun, PayMode, PAY_LABEL, InvProduct } from "../data";
import { IconKiosk, IconX, IconCheck, IconHash, IconCart } from "../components/Icon";
import { Thumb } from "../components/bits";

const ACCENTS: Record<string, string> = { green: "linear-gradient(135deg,#1B3D29,#3D8B60)", dark: "linear-gradient(135deg,#0c2516,#11331f)", gold: "linear-gradient(135deg,#8a5a12,#D9A648)" };

export default function KioskScreen() {
  const { kiosk, updateKiosk } = usePharma();
  const [preview, setPreview] = useState(false);

  const togglePay = (m: PayMode) => {
    const has = kiosk.payModes.includes(m);
    updateKiosk({ payModes: has ? kiosk.payModes.filter((x) => x !== m) : [...kiosk.payModes, m] });
  };

  return (
    <div className="pd-canvas-wide" style={{ maxWidth: 920 }}>
      <div className="pd-card pd-card-pad" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16, background: kiosk.enabled ? "linear-gradient(100deg,var(--wash),#fff)" : "var(--rose-bg)" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: kiosk.enabled ? "var(--mid)" : "var(--rose)", color: "#fff", display: "grid", placeItems: "center" }}><IconKiosk size={24} /></div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 15 }}>{kiosk.enabled ? "Self-order kiosk is enabled" : "Kiosk disabled"}</h3>
          <p className="pd-muted" style={{ fontSize: 12.5 }}>McDonald’s-style in-store screen where customers browse & order themselves; orders land at your counter.</p>
        </div>
        <button className="pd-btn pd-btn-ghost" onClick={() => setPreview(true)}>▶ Launch preview</button>
        <button className={`pd-switch${kiosk.enabled ? " on" : ""}`} style={{ transform: "scale(1.2)" }} onClick={() => updateKiosk({ enabled: !kiosk.enabled })} aria-label="Toggle kiosk" />
      </div>

      <div className="pd-card">
        <div className="pd-card-head"><h3>Kiosk configuration</h3></div>
        <div className="pd-card-pad">
          <div className="pd-form-grid">
            <div className="pd-field pd-span2"><label>Display name (shown on kiosk)</label><input className="pd-input" value={kiosk.displayName} onChange={(e) => updateKiosk({ displayName: e.target.value })} /></div>
            <div className="pd-field pd-span2"><label>Welcome message</label><input className="pd-input" value={kiosk.welcome} onChange={(e) => updateKiosk({ welcome: e.target.value })} /></div>
            <div className="pd-field"><label>Staff exit PIN</label><input className="pd-input pd-mono" value={kiosk.pin} maxLength={6} onChange={(e) => updateKiosk({ pin: e.target.value })} /></div>
            <div className="pd-field"><label>Idle reset (seconds)</label><input className="pd-input" type="number" value={kiosk.idleResetSec} onChange={(e) => updateKiosk({ idleResetSec: Number(e.target.value) || 0 })} /></div>
            <div className="pd-field pd-span2"><label>Accent theme</label>
              <div className="pd-flex pd-gap6">
                {(["green", "dark", "gold"] as const).map((a) => (
                  <button key={a} className={`pd-chip${kiosk.accent === a ? " on" : ""}`} onClick={() => updateKiosk({ accent: a })} style={{ textTransform: "capitalize" }}>{a}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="pd-pl-head">Customer options</div>
          <ToggleRow label="Show prices on kiosk" on={kiosk.showPrices} onClick={() => updateKiosk({ showPrices: !kiosk.showPrices })} />
          <ToggleRow label="Allow prescription upload at kiosk" on={kiosk.allowRx} onClick={() => updateKiosk({ allowRx: !kiosk.allowRx })} />

          <div className="pd-pl-head">Accepted payments at kiosk</div>
          <div className="pd-flex pd-gap6" style={{ flexWrap: "wrap" }}>
            {(["cash", "upi", "card", "cod"] as PayMode[]).map((m) => (
              <button key={m} className={`pd-chip${kiosk.payModes.includes(m) ? " on" : ""}`} onClick={() => togglePay(m)}>{PAY_LABEL[m]}</button>
            ))}
          </div>
          <p className="pd-muted" style={{ fontSize: 12, marginTop: 10 }}>Only products that are <b>live online & in stock</b> appear on the kiosk. Manage which in <b>Online Store</b>. Kiosk orders are recorded as counter sales and deduct stock automatically.</p>
        </div>
      </div>

      {preview && <KioskPreview onClose={() => setPreview(false)} />}
    </div>
  );
}

function ToggleRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="pd-flex" style={{ justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
      <button className={`pd-switch${on ? " on" : ""}`} onClick={onClick} />
    </div>
  );
}

// ── functional kiosk preview (Mc-model self order) ──────────────
function KioskPreview({ onClose }: { onClose: () => void }) {
  const { inventory, kiosk, placeKioskOrder } = usePharma();
  const [cat, setCat] = useState("all");
  const [cart, setCart] = useState<{ productId: string; qty: number; loose: boolean }[]>([]);
  const [pay, setPay] = useState<PayMode>(kiosk.payModes[0] ?? "cash");
  const [done, setDone] = useState<string | null>(null);

  const products = inventory.filter((p) => p.online && totalUnits(p) > 0 && (cat === "all" || p.category === cat));
  const same = (l: { productId: string; loose: boolean }, id: string, loose: boolean) => l.productId === id && l.loose === loose;
  const add = (id: string, loose = false) => setCart((c) => (c.some((x) => same(x, id, loose)) ? c.map((x) => (same(x, id, loose) ? { ...x, qty: x.qty + 1 } : x)) : [...c, { productId: id, qty: 1, loose }]));
  const dec = (id: string, loose = false) => setCart((c) => c.flatMap((x) => (same(x, id, loose) ? (x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []) : [x])));
  const unitPrice = (p: InvProduct, loose: boolean) => billUnit(p, { loose }).price;
  const items = cart.map((l) => { const p = inventory.find((x) => x.id === l.productId); return p ? { p, qty: l.qty, loose: l.loose } : null; }).filter(Boolean) as { p: InvProduct; qty: number; loose: boolean }[];
  const total = items.reduce((a, x) => a + unitPrice(x.p, x.loose) * x.qty, 0);
  const count = items.reduce((a, x) => a + x.qty, 0);
  const packQty = (id: string) => cart.find((x) => x.productId === id && !x.loose)?.qty ?? 0;
  const looseQty = (id: string) => cart.find((x) => x.productId === id && x.loose)?.qty ?? 0;

  const place = async () => { const s = await placeKioskOrder(cart, pay); if (s) { setDone(s.id); setCart([]); } };

  return (
    <div className="pd-modal-wrap" onClick={onClose} style={{ padding: 0 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 1000, height: "92vh", borderRadius: 18, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column" }}>
        {/* kiosk header */}
        <div style={{ background: ACCENTS[kiosk.accent], color: "#fff", padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 20 }}>{kiosk.displayName}</div><div style={{ fontSize: 12.5, opacity: .85 }}>{kiosk.welcome}</div></div>
          <button className="pd-x" onClick={onClose} style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}><IconX size={18} /></button>
        </div>

        {done ? (
          <div className="pd-empty" style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <div><div className="em" style={{ fontSize: 60 }}><IconCheck size={60} /></div><h3 style={{ fontSize: 22 }}>Order placed!</h3><p style={{ fontSize: 15 }}>Token <b>{done}</b> — please collect & pay at the counter.</p>
              <button className="pd-btn pd-btn-primary pd-btn-lg" style={{ marginTop: 18 }} onClick={() => setDone(null)}>Start new order</button></div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 320px", overflow: "hidden" }}>
            {/* products */}
            <div style={{ overflowY: "auto", padding: 18 }}>
              <div className="pd-pos-cat" style={{ marginBottom: 14 }}>
                <button className={`pd-chip${cat === "all" ? " on" : ""}`} onClick={() => setCat("all")}>All</button>
                {CATEGORIES.map((c) => <button key={c.key} className={`pd-chip${cat === c.key ? " on" : ""}`} onClick={() => setCat(c.key)}>{c.emoji} {c.label}</button>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
                {products.map((p) => {
                  const n = packQty(p.id), ln = looseQty(p.id);
                  return (
                    <button key={p.id} className="pd-pcard" onClick={() => add(p.id)}>
                      {n > 0 && <span className="added">{n}</span>}
                      <div className="em" style={{ width: 48, height: 48, fontSize: 24, overflow: "hidden" }}><Thumb p={p} /></div>
                      <div className="nm">{p.name}</div>
                      <div className="sub">{p.pack}</div>
                      {kiosk.showPrices && <div className="pr">{inr(unitPrice(p, false))}</div>}
                      {looseSellable(p) && (
                        <span className={`pd-loose-btn${ln > 0 ? " on" : ""}`} role="button"
                          title={`Add a single ${unitNoun(p)}`}
                          onClick={(e) => { e.stopPropagation(); add(p.id, true); }}>
                          <IconHash size={13} /> 1 {unitNoun(p)}{kiosk.showPrices ? ` · ${inr2(unitPrice(p, true))}` : ""}{ln > 0 ? ` · ${ln}` : ""}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* cart */}
            <div style={{ borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", background: "var(--wash2)" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", fontFamily: "Manrope", fontWeight: 800, fontSize: 16 }}><IconCart size={16} /> Your order {count > 0 && `· ${count}`}</div>
              <div style={{ flex: 1, overflowY: "auto", padding: "6px 16px" }}>
                {items.length === 0 ? <div className="pd-empty" style={{ padding: 30 }}><p>Tap products to add them.</p></div> :
                  items.map(({ p, qty, loose }) => (
                    <div className="pd-bitem" key={p.id + (loose ? "-loose" : "")}>
                      <div className="lt"><div className="nm">{p.name} {loose && <span className="pd-tag">loose</span>}</div>{kiosk.showPrices && <div className="sub">{inr2(unitPrice(p, loose))}{loose ? `/${unitNoun(p)}` : ""}</div>}</div>
                      <div className="pd-qty" data-field="qty"><button onClick={() => dec(p.id, loose)}>−</button><span>{qty}</span><button onClick={() => add(p.id, loose)}>+</button></div>
                    </div>
                  ))}
              </div>
              <div style={{ padding: 16, borderTop: "1px solid var(--line)" }}>
                {kiosk.showPrices && <div className="pd-billrow tot" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}><span>Total</span><span>{inr(total)}</span></div>}
                <div className="pd-flex pd-gap6" style={{ flexWrap: "wrap", margin: "10px 0" }}>
                  {kiosk.payModes.map((m) => <button key={m} className={`pd-chip${pay === m ? " on" : ""}`} onClick={() => setPay(m)}>{PAY_LABEL[m]}</button>)}
                </div>
                <button className="pd-btn pd-btn-primary pd-btn-lg pd-btn-block" disabled={count === 0} onClick={place}><IconCheck size={17} /> Place order</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
