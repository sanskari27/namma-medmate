"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import { CATEGORIES, catLabel, Offer, OfferType, OfferScope, inr } from "../data";
import { IconPlus, IconX, IconTrash, IconOffer, IconTag, IconGlobe } from "../components/Icon";

export default function OffersScreen() {
  const { offers, inventory, addOffer, toggleOffer, removeOffer } = usePharma();
  const [open, setOpen] = useState(false);

  const productsIn = (o: Offer) => inventory.filter((p) =>
    o.scope === "all" ? true : o.scope === "category" ? p.category === o.target : p.id === o.target).length;

  return (
    <div className="pd-canvas-wide">
      <div className="pd-toolbar">
        <h2 style={{ fontSize: 16 }}>Active & scheduled offers</h2>
        <div className="pd-spacer" />
        <button className="pd-btn pd-btn-primary" onClick={() => setOpen(true)}><IconPlus size={16} /> Create offer</button>
      </div>

      {offers.length === 0 ? (
        <div className="pd-card pd-card-pad"><div className="pd-empty"><div className="em"><IconTag size={30} /></div><h3>No offers yet</h3><p>Create a discount to attract online customers.</p></div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
          {offers.map((o) => (
            <div className="pd-card" key={o.id} style={{ opacity: o.active ? 1 : 0.62 }}>
              <div className="pd-card-pad">
                <div className="pd-flex" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: "linear-gradient(135deg,var(--gold),var(--gold-d))", color: "#fff", display: "grid", placeItems: "center" }}><IconOffer size={22} /></div>
                  <button className={`pd-switch${o.active ? " on" : ""}`} onClick={() => toggleOffer(o.id)} aria-label="Toggle offer" />
                </div>
                <h3 style={{ fontSize: 15 }}>{o.title}</h3>
                <div className="pd-flex pd-gap6" style={{ marginTop: 8, flexWrap: "wrap" }}>
                  <span className="pd-pill pill-green">{o.type === "pct" ? `${o.value}% OFF` : `${inr(o.value)} OFF`}</span>
                  <span className="pd-mono pd-tag">{o.code}</span>
                  {o.online ? <span className="pd-pill pill-blue"><IconGlobe size={12} /> Online</span> : <span className="pd-pill pill-gray">Counter</span>}
                </div>
                <p className="pd-muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                  Applies to <b>{o.scope === "all" ? "all products" : o.scope === "category" ? catLabel(o.target ?? "") : "1 product"}</b> · {productsIn(o)} items
                </p>
              </div>
              <div className="pd-modal-foot" style={{ borderTop: "1px solid var(--line)", justifyContent: "space-between" }}>
                <span className="pd-pill" style={{ background: o.active ? "var(--wash)" : "#eef2ef", color: o.active ? "var(--mid)" : "var(--muted)" }}><i className="d" />{o.active ? "Running" : "Paused"}</span>
                <button className="pd-iconbtn" title="Delete" onClick={() => removeOffer(o.id)}><IconTrash size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <OfferModal onClose={() => setOpen(false)} onSave={async (o) => { const err = await addOffer(o); if (!err) setOpen(false); }} />}
    </div>
  );
}

function OfferModal({ onClose, onSave }: { onClose: () => void; onSave: (o: Offer) => void }) {
  const { inventory } = usePharma();
  const [f, setF] = useState<Offer>({
    id: "of" + Math.floor(Date.now() % 100000), title: "", code: "", type: "pct", value: 10,
    scope: "all", target: undefined, online: true, active: true,
  });
  const set = (patch: Partial<Offer>) => setF((p) => ({ ...p, ...patch }));
  const valid = f.title.trim() && f.code.trim() && f.value > 0;

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>Create offer</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-form-grid">
            <div className="pd-field pd-span2" data-field="name"><label>Offer title</label><input className="pd-input" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Monsoon Health Sale" /></div>
            <div className="pd-field"><label>Coupon code</label><input className="pd-input pd-mono" value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="NAMMA25" /></div>
            <div className="pd-field"><label>Discount type</label><select className="pd-select" value={f.type} onChange={(e) => set({ type: e.target.value as OfferType })}><option value="pct">Percentage %</option><option value="flat">Flat ₹</option></select></div>
            <div className="pd-field"><label>{f.type === "pct" ? "Percent off" : "Amount off (₹)"}</label><input className="pd-input" type="number" value={f.value} onChange={(e) => set({ value: Number(e.target.value) || 0 })} /></div>
            <div className="pd-field"><label>Applies to</label><select className="pd-select" value={f.scope} onChange={(e) => set({ scope: e.target.value as OfferScope, target: undefined })}><option value="all">All products</option><option value="category">A category</option><option value="product">One product</option></select></div>
            {f.scope === "category" && <div className="pd-field pd-span2"><label>Category</label><select className="pd-select" value={f.target ?? ""} onChange={(e) => set({ target: e.target.value })}><option value="">Select…</option>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>}
            {f.scope === "product" && <div className="pd-field pd-span2"><label>Product</label><select className="pd-select" value={f.target ?? ""} onChange={(e) => set({ target: e.target.value })}><option value="">Select…</option>{inventory.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>}
          </div>
          <label className="pd-flex" style={{ marginTop: 16, gap: 10, cursor: "pointer" }}>
            <button type="button" className={`pd-switch${f.online ? " on" : ""}`} onClick={() => set({ online: !f.online })} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Show this offer on the customer app (online)</span>
          </label>
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-primary" disabled={!valid} onClick={() => onSave(f)}>Launch offer</button>
        </div>
      </div>
    </div>
  );
}
