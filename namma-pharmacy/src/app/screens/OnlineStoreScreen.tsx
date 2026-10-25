"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import {
  CATEGORIES, catLabel, inr, mrpOf, sellPrice, stockOf, InvProduct, Offer,
} from "../data";
import { IconSearch, IconStore, IconX, IconGlobe, IconTag, IconBulb, IconCart } from "../components/Icon";
import { Thumb } from "../components/bits";

// price after an applied offer (online customer-facing)
function offerPrice(p: InvProduct, offers: Offer[]) {
  const base = sellPrice(p);
  const of = offers.find((o) => o.id === p.offerId && o.active && o.online);
  if (!of) return { price: base, off: 0, label: "" };
  const applies = of.scope === "all" || (of.scope === "category" && of.target === p.category) || (of.scope === "product" && of.target === p.id);
  if (!applies) return { price: base, off: 0, label: "" };
  const price = of.type === "pct" ? Math.round(base * (1 - of.value / 100)) : Math.max(0, base - of.value);
  return { price, off: base - price, label: of.title };
}

export default function OnlineStoreScreen() {
  const { inventory, offers, profile, toggleOnline, setOnlinePrice, setProductOffer, toggleStoreOpen, go } = usePharma();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [editPrice, setEditPrice] = useState<InvProduct | null>(null);
  const [tab, setTab] = useState<"manage" | "preview">("manage");

  const list = inventory.filter((p) => {
    if (cat !== "all" && p.category !== cat) return false;
    if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const onlineList = inventory.filter((p) => p.online && stockOf(p) > 0);
  const liveCount = inventory.filter((p) => p.online).length;
  const hiddenCount = inventory.length - liveCount;
  const offerCount = inventory.filter((p) => p.offerId && offers.find((o) => o.id === p.offerId && o.active)).length;
  const onlineOffers = offers.filter((o) => o.online);

  return (
    <div className="pd-canvas-wide">
      {/* store status banner */}
      <div className="pd-card pd-card-pad" style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 16, background: profile.storeOpen ? "linear-gradient(100deg,var(--wash),#fff)" : "var(--rose-bg)" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: profile.storeOpen ? "var(--mid)" : "var(--rose)", color: "#fff", display: "grid", placeItems: "center" }}><IconStore size={24} /></div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 15 }}>{profile.storeOpen ? "Your online store is live" : "Online store is paused"}</h3>
          <p className="pd-muted" style={{ fontSize: 12.5 }}>{profile.storeOpen ? `${onlineList.length} products visible to customers on the Namma MedMate app right now.` : "Customers cannot place online orders. Counter billing still works."}</p>
        </div>
        <button className={`pd-switch${profile.storeOpen ? " on" : ""}`} onClick={toggleStoreOpen} style={{ transform: "scale(1.2)" }} aria-label="Toggle store" />
      </div>

      <div className="pd-stats" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="pd-stat"><div className="ic ic-green"><IconGlobe size={18} /></div><div className="lbl">Live online</div><div className="val">{liveCount}</div><div className="split">visible to customers</div></div>
        <div className="pd-stat"><div className="ic ic-gold"></div><div className="lbl">Hidden</div><div className="val">{hiddenCount}</div><div className="split">counter-only items</div></div>
        <div className="pd-stat"><div className="ic ic-blue"><IconTag size={18} /></div><div className="lbl">On offer</div><div className="val">{offerCount}</div><div className="split">discounted online</div></div>
      </div>

      <div className="pd-toolbar">
        <div className="pd-seg">
          <button className={tab === "manage" ? "on" : ""} onClick={() => setTab("manage")}>Manage listings</button>
          <button className={tab === "preview" ? "on" : ""} onClick={() => setTab("preview")}>Customer preview</button>
        </div>
        <div className="pd-spacer" />
        <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      {tab === "manage" && (
        <>
          <div className="pd-pos-cat" style={{ marginBottom: 14 }}>
            <button className={`pd-chip${cat === "all" ? " on" : ""}`} onClick={() => setCat("all")}>All</button>
            {CATEGORIES.map((c) => <button key={c.key} className={`pd-chip${cat === c.key ? " on" : ""}`} onClick={() => setCat(c.key)}>{c.emoji} {c.label}</button>)}
          </div>
          <div className="pd-card">
            <div className="pd-tbl-wrap">
              <table className="pd-tbl">
                <thead><tr><th>Product</th><th className="num">MRP</th><th className="num">Online price</th><th>Offer</th><th className="num">Customer pays</th><th>Show online</th></tr></thead>
                <tbody>
                  {list.map((p) => {
                    const op = offerPrice(p, offers);
                    const out = stockOf(p) <= 0;
                    return (
                      <tr key={p.id} style={{ opacity: p.online ? 1 : 0.55 }}>
                        <td><div className="prod"><span className="em"><Thumb p={p} /></span><span><span className="nm">{p.name}</span><div className="sub">{catLabel(p.category)} · {p.pack}{out ? " · out of stock" : ""}</div></span></div></td>
                        <td className="num">{inr(mrpOf(p))}</td>
                        <td className="num">
                          <button className="pd-iconbtn" style={{ width: "auto", padding: "5px 10px", fontWeight: 700 }} onClick={() => setEditPrice(p)}>
                            {p.onlinePrice ? inr(p.onlinePrice) : <span className="pd-muted">= MRP</span>}
                          </button>
                        </td>
                        <td>
                          <select className="pd-select" style={{ padding: "6px 8px", maxWidth: 170 }} value={p.offerId ?? ""} onChange={(e) => setProductOffer(p.id, e.target.value || undefined)}>
                            <option value="">No offer</option>
                            {onlineOffers.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                          </select>
                        </td>
                        <td className="num">
                          {op.off > 0 ? <span><b style={{ color: "var(--green)" }}>{inr(op.price)}</b> <span className="pd-strike">{inr(sellPrice(p))}</span></span> : <b>{inr(op.price)}</b>}
                        </td>
                        <td><button className={`pd-switch${p.online ? " on" : ""}`} onClick={() => toggleOnline(p.id)} aria-label="Toggle online" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="pd-muted" style={{ fontSize: 12.5, marginTop: 12 }}><IconBulb size={13} /> Turn a product off to keep it counter-only (it won’t appear on the customer app). Set an online price to discount below MRP, or attach an active offer for an automatic deal badge.</p>
        </>
      )}

      {tab === "preview" && (
        <div className="pd-card pd-card-pad">
          <div className="pd-flex" style={{ justifyContent: "space-between", marginBottom: 14 }}>
            <div><h3 style={{ fontSize: 15 }}>{profile.name}</h3><p className="pd-muted" style={{ fontSize: 12.5 }}>As customers see it on the Namma MedMate app</p></div>
            <a className="pd-btn pd-btn-ghost pd-btn-sm" href="/namma-medmate" target="_blank" rel="noreferrer">Open customer app ↗</a>
          </div>
          {onlineList.length === 0 ? (
            <div className="pd-empty"><div className="em"><IconCart size={30} /></div><p>No products are live online yet. Toggle some on in “Manage listings”.</p></div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14 }}>
              {onlineList.map((p) => {
                const op = offerPrice(p, offers);
                return (
                  <div key={p.id} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 12, position: "relative", background: "#fff" }}>
                    {op.off > 0 && <span className="pd-pill pill-rose" style={{ position: "absolute", top: 8, left: 8 }}>{Math.round((op.off / sellPrice(p)) * 100)}% OFF</span>}
                    <div style={{ height: 70, borderRadius: 10, background: "var(--wash)", display: "grid", placeItems: "center", fontSize: 34, marginBottom: 8, overflow: "hidden" }}>{p.image ? <img className="pd-thumb" src={p.image} alt={p.name} /> : p.emoji}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.25 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.pack}</div>
                    <div className="pd-flex" style={{ marginTop: 8, justifyContent: "space-between" }}>
                      <span><b style={{ fontFamily: "Manrope", fontSize: 15, color: "var(--dark)" }}>{inr(op.price)}</b> {op.off > 0 && <span className="pd-strike">{inr(sellPrice(p))}</span>}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "var(--green)", border: "1px solid var(--mint)", borderRadius: 7, padding: "3px 8px" }}>ADD</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {editPrice && <PriceModal product={editPrice} onClose={() => setEditPrice(null)} onSave={async (price) => { const err = await setOnlinePrice(editPrice.id, price); if (!err) setEditPrice(null); }} />}
    </div>
  );
}

function PriceModal({ product, onClose, onSave }: { product: InvProduct; onClose: () => void; onSave: (p: number | undefined) => void }) {
  const [val, setVal] = useState<string>(product.onlinePrice ? String(product.onlinePrice) : "");
  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>Online price · {product.name}</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <p className="pd-muted" style={{ fontSize: 13, marginBottom: 14 }}>Printed MRP is <b>{inr(mrpOf(product))}</b>. Set a lower online selling price, or leave blank to sell at MRP.</p>
          <div className="pd-field" data-field="amount"><label>Online selling price (₹)</label><input className="pd-input" type="number" autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder={String(mrpOf(product))} /></div>
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={() => onSave(undefined)}>Reset to MRP</button>
          <button className="pd-btn pd-btn-primary" onClick={() => onSave(val ? Number(val) : undefined)}>Save price</button>
        </div>
      </div>
    </div>
  );
}
