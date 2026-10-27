"use client";
import { useMemo, useState } from "react";
import { usePharma } from "../pharmaState";
import {
  Supplier, SupplyEntry, InvProduct, inr, inr2, allottedSupplierId,
  bestSupplyFor, effectiveSupplyPrice, schemeLabel, isDevice, mrpOf, catLabel, isValidGstin,
} from "../data";
import { IconPlus, IconX, IconTrash, IconEdit, IconTruck, IconMail, IconBox, IconCard, IconUsers, IconPhone, IconReceipt, IconRefresh, IconStar, IconScale, IconCash, IconTag, IconCheck } from "../components/Icon";
import { Thumb } from "../components/bits";

type Tab = "directory" | "supply" | "compare";

export default function DistributorsScreen() {
  const [tab, setTab] = useState<Tab>("directory");
  const { suppliers, supplyList } = usePharma();
  return (
    <div className="pd-canvas-wide">
      <div className="pd-seg" style={{ marginBottom: 18 }}>
        <button className={tab === "directory" ? "on" : ""} onClick={() => setTab("directory")}>Distributors ({suppliers.length})</button>
        <button className={tab === "supply" ? "on" : ""} onClick={() => setTab("supply")}>Supply list ({supplyList.length})</button>
        <button className={tab === "compare" ? "on" : ""} onClick={() => setTab("compare")}>Price compare</button>
      </div>
      {tab === "directory" && <Directory />}
      {tab === "supply" && <SupplyList />}
      {tab === "compare" && <PriceCompare />}
    </div>
  );
}

/* ─────────────── Tab 1 · Distributor directory ─────────────── */
function Directory() {
  const { suppliers, inventory, addSupplier, updateSupplier, removeSupplier } = usePharma();
  const [edit, setEdit] = useState<Supplier | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");

  const prodCount = useMemo(() => {
    const m: Record<string, number> = {};
    inventory.forEach((p) => { const id = allottedSupplierId(p, suppliers); m[id] = (m[id] || 0) + 1; });
    return m;
  }, [inventory, suppliers]);

  const totalOutstanding = suppliers.reduce((s, x) => s + (x.outstanding || 0), 0);
  const activeCount = suppliers.filter((s) => s.active !== false).length;

  const filtered = suppliers.filter((s) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return [s.name, s.gstin, s.phone, s.contactPerson, s.city, s.email].filter(Boolean).some((v) => v!.toLowerCase().includes(t));
  });

  return (
    <>
      <div className="pd-stats" >
        <div className="pd-stat"><div className="ic ic-blue"><IconTruck size={18} /></div><div className="lbl">Distributors</div><div className="val">{suppliers.length}</div><div className="split">{activeCount} active</div></div>
        <div className="pd-stat"><div className="ic ic-green"><IconBox size={18} /></div><div className="lbl">Products sourced</div><div className="val">{inventory.length}</div><div className="split">across all suppliers</div></div>
        <div className="pd-stat"><div className="ic ic-rose"><IconCard size={18} /></div><div className="lbl">Total outstanding</div><div className="val">{inr(totalOutstanding)}</div><div className="split">payable to distributors</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconUsers size={18} /></div><div className="lbl">On credit terms</div><div className="val">{suppliers.filter((s) => (s.paymentTerms || "").toLowerCase().includes("credit")).length}</div><div className="split">credit accounts</div></div>
      </div>

      <div className="pd-toolbar">
        <h2 style={{ fontSize: 16 }}>Distributor directory</h2>
        <div className="pd-spacer" />
        <input className="pd-input" placeholder="Search name, GSTIN, contact…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
        <button className="pd-btn pd-btn-primary" onClick={() => setAdding(true)}><IconPlus size={16} /> Add distributor</button>
      </div>

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>Distributor</th><th>Contact</th><th>GSTIN / DL No.</th><th>Payment terms</th><th className="num">Products</th><th className="num">Outstanding</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="prod">
                      <span className="em" style={{ background: "var(--wash)", color: "var(--mid)", display: "grid", placeItems: "center" }}><IconTruck size={18} /></span>
                      <span><span className="nm">{s.name}</span><div className="sub">{[s.city, s.state].filter(Boolean).join(", ") || "—"}</div></span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.contactPerson || "—"}</div>
                    <div className="sub pd-muted" style={{ fontSize: 11.5 }}><IconPhone size={12} /> {s.phone}</div>
                    {s.email && <div className="sub pd-muted" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5 }}><IconMail size={12} /> {s.email}</div>}
                  </td>
                  <td className="pd-mono" style={{ fontSize: 12 }}>{s.gstin || "—"}<div className="pd-muted">{s.dlNo || "—"}</div></td>
                  <td>{s.paymentTerms || "—"}</td>
                  <td className="num"><span className="pd-pill pill-blue">{prodCount[s.id] || 0}</span></td>
                  <td className="num" style={{ fontWeight: 700, color: (s.outstanding || 0) > 0 ? "#b4232a" : "var(--mid)" }}>{inr(s.outstanding || 0)}</td>
                  <td><span className={`pd-pill ${s.active !== false ? "pill-green" : "pill-gray"}`}><i className="d" />{s.active !== false ? "Active" : "Inactive"}</span></td>
                  <td className="num">
                    <div className="pd-flex pd-gap6" style={{ justifyContent: "flex-end" }}>
                      <button className="pd-iconbtn" title="Edit" onClick={() => setEdit(s)}><IconEdit size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8}><div className="pd-empty" style={{ padding: 28 }}><div className="em"><IconTruck size={30} /></div><p>{q ? "No distributors match your search." : "No distributors added yet."}</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {(adding || edit) && (
        <DistributorModal
          init={edit ?? undefined}
          onClose={() => { setAdding(false); setEdit(null); }}
          onSave={async (data) => {
            const err = edit ? await updateSupplier(edit.id, data) : await addSupplier(data);
            if (!err) { setAdding(false); setEdit(null); }
          }}
        />
      )}
    </>
  );
}

/* ─────────────── Tab 2 · Supply list ─────────────── */
function SupplyList() {
  const { supplyList, suppliers, inventory, addSupply, updateSupply, removeSupply, setPreferredSupply } = usePharma();
  const [edit, setEdit] = useState<SupplyEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [supFilter, setSupFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "medicine" | "device">("all");

  const prodOf = (id: string) => inventory.find((p) => p.id === id);
  const supOf = (id: string) => suppliers.find((s) => s.id === id);

  const rows = supplyList.filter((e) => {
    const p = prodOf(e.productId);
    if (!p) return false;
    if (supFilter !== "all" && e.supplierId !== supFilter) return false;
    if (typeFilter === "device" && !isDevice(p)) return false;
    if (typeFilter === "medicine" && isDevice(p)) return false;
    if (q.trim()) {
      const t = q.toLowerCase();
      if (![p.name, p.composition, p.manufacturer, supOf(e.supplierId)?.name].filter(Boolean).some((v) => v!.toLowerCase().includes(t))) return false;
    }
    return true;
  }).sort((a, b) => (prodOf(a.productId)!.name).localeCompare(prodOf(b.productId)!.name));

  const deviceCount = supplyList.filter((e) => { const p = prodOf(e.productId); return p && isDevice(p); }).length;

  return (
    <>
      <div className="pd-stats" >
        <div className="pd-stat"><div className="ic ic-blue"><IconReceipt size={18} /></div><div className="lbl">Supply items</div><div className="val">{supplyList.length}</div><div className="split">{supplyList.length - deviceCount} medicines · {deviceCount} devices</div></div>
        <div className="pd-stat"><div className="ic ic-green"><IconRefresh size={18} /></div><div className="lbl">Multi-source items</div><div className="val">{multiSourceCount(supplyList)}</div><div className="split">supplied by 2+ distributors</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconStar size={18} /></div><div className="lbl">Preferred set</div><div className="val">{supplyList.filter((e) => e.preferred).length}</div><div className="split">marked best source</div></div>
      </div>

      <div className="pd-toolbar">
        <h2 style={{ fontSize: 16 }}>Medicines & devices by distributor</h2>
        <div className="pd-spacer" />
        <select className="pd-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} style={{ maxWidth: 140 }}>
          <option value="all">All types</option><option value="medicine">Medicines</option><option value="device">Devices</option>
        </select>
        <select className="pd-select" value={supFilter} onChange={(e) => setSupFilter(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="all">All distributors</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="pd-input" placeholder="Search medicine / device…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 220 }} />
        <button className="pd-btn pd-btn-primary" onClick={() => setAdding(true)}><IconPlus size={16} /> Add supply item</button>
      </div>

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>Medicine / device</th><th>Type</th><th>Distributor</th><th className="num">Purchase ₹</th><th className="num">MRP ₹</th><th className="num">Margin</th><th className="num">Price rank</th><th></th></tr></thead>
            <tbody>
              {rows.map((e) => {
                const p = prodOf(e.productId)!;
                const sup = supOf(e.supplierId);
                const best = bestSupplyFor(e.productId, supplyList);
                const isCheapest = best?.id === e.id;
                const sources = supplyList.filter((x) => x.productId === e.productId).length;
                const mrp = e.mrp ?? mrpOf(p);
                const eff = effectiveSupplyPrice(e);
                const bestEff = best ? effectiveSupplyPrice(best) : eff;
                const margin = mrp > 0 ? ((mrp - eff) / mrp) * 100 : 0;
                return (
                  <tr key={e.id}>
                    <td><div className="prod"><span className="em"><Thumb p={p} /></span><span><span className="nm">{p.name} {e.preferred && <span title="Preferred source"><IconStar size={13} /></span>}</span><div className="sub">{p.composition} · {p.pack}</div></span></div></td>
                    <td><span className={`pd-pill ${isDevice(p) ? "pill-teal" : "pill-gray"}`}>{isDevice(p) ? "Device" : "Medicine"}</span><div className="sub pd-muted" style={{ fontSize: 11 }}>{catLabel(p.category)}</div></td>
                    <td style={{ fontWeight: 600 }}>{sup?.name ?? "—"}{e.note && <div className="sub pd-muted" style={{ fontSize: 11 }}>{e.note}</div>}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{inr2(e.purchasePrice)}{schemeLabel(e) && <div className="sub" style={{ fontSize: 11, color: "#1f7a46", fontWeight: 700 }}>{schemeLabel(e)} → {inr2(eff)}</div>}</td>
                    <td className="num pd-muted">{inr2(mrp)}</td>
                    <td className="num"><span className={`pd-pill ${margin >= 30 ? "pill-green" : margin >= 15 ? "pill-gold" : "pill-rose"}`}>{margin.toFixed(0)}%</span></td>
                    <td className="num">{sources > 1 ? (isCheapest ? <span className="pd-pill pill-green"><i className="d" />Lowest</span> : <span className="pd-muted" style={{ fontSize: 11.5 }}>+{inr2(eff - bestEff)}</span>) : <span className="pd-muted" style={{ fontSize: 11.5 }}>only source</span>}</td>
                    <td className="num">
                      <div className="pd-flex pd-gap6" style={{ justifyContent: "flex-end" }}>
                        {!e.preferred && <button className="pd-btn pd-btn-ghost pd-btn-sm" title="Mark preferred source" onClick={() => setPreferredSupply(e.id)}><IconStar size={14} /></button>}
                        <button className="pd-iconbtn" title="Edit" onClick={() => setEdit(e)}><IconEdit size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={8}><div className="pd-empty" style={{ padding: 28 }}><div className="em"><IconReceipt size={30} /></div><p>No supply items match. Add what you purchase from each distributor.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {(adding || edit) && (
        <SupplyModal
          init={edit ?? undefined}
          onClose={() => { setAdding(false); setEdit(null); }}
          onSave={async (data) => {
            const err = edit ? await updateSupply(edit.id, data) : await addSupply(data);
            if (!err) { setAdding(false); setEdit(null); }
          }}
        />
      )}
    </>
  );
}

/* ─────────────── Tab 3 · Price comparison ─────────────── */
function PriceCompare() {
  const { supplyList, suppliers, inventory } = usePharma();
  const [q, setQ] = useState("");
  const [onlyMulti, setOnlyMulti] = useState(true);

  const prodOf = (id: string) => inventory.find((p) => p.id === id);
  const supOf = (id: string) => suppliers.find((s) => s.id === id);

  // group supply rows by product
  const groups = useMemo(() => {
    const m: Record<string, SupplyEntry[]> = {};
    supplyList.forEach((e) => { (m[e.productId] ||= []).push(e); });
    return Object.entries(m)
      .map(([pid, rows]) => ({ p: prodOf(pid), rows: rows.slice().sort((a, b) => effectiveSupplyPrice(a) - effectiveSupplyPrice(b)) }))
      .filter((g) => g.p)
      .filter((g) => !onlyMulti || g.rows.length > 1)
      .filter((g) => !q.trim() || g.p!.name.toLowerCase().includes(q.toLowerCase()) || g.p!.composition.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.p!.name.localeCompare(b.p!.name));
  }, [supplyList, inventory, onlyMulti, q]);

  const totalSaving = groups.reduce((sum, g) => {
    if (g.rows.length < 2) return sum;
    return sum + (effectiveSupplyPrice(g.rows[g.rows.length - 1]) - effectiveSupplyPrice(g.rows[0]));
  }, 0);

  return (
    <>
      <div className="pd-stats" >
        <div className="pd-stat"><div className="ic ic-blue"><IconScale size={18} /></div><div className="lbl">Comparable items</div><div className="val">{multiSourceCount(supplyList)}</div><div className="split">supplied by 2+ distributors</div></div>
        <div className="pd-stat"><div className="ic ic-green"><IconCash size={18} /></div><div className="lbl">Saving per pack</div><div className="val">{inr2(totalSaving)}</div><div className="split">buying each at its lowest</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconTag size={18} /></div><div className="lbl">Distributors compared</div><div className="val">{suppliers.length}</div><div className="split">across your supply list</div></div>
      </div>

      <div className="pd-toolbar">
        <h2 style={{ fontSize: 16 }}>Purchase-price comparison</h2>
        <div className="pd-spacer" />
        <label className="pd-flex" style={{ gap: 8, alignItems: "center", fontSize: 12.5, fontWeight: 600 }}>
          <button type="button" className={`pd-switch${onlyMulti ? " on" : ""}`} onClick={() => setOnlyMulti((v) => !v)} aria-label="Toggle" />
          Only multi-source
        </label>
        <input className="pd-input" placeholder="Search medicine…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 220 }} />
      </div>

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>Medicine / device</th><th>Quotes from distributors (low → high)</th><th className="num">Best ₹</th><th className="num">Saving / pack</th></tr></thead>
            <tbody>
              {groups.map((g) => {
                const p = g.p!;
                const low = g.rows[0];
                const high = g.rows[g.rows.length - 1];
                const saving = g.rows.length > 1 ? effectiveSupplyPrice(high) - effectiveSupplyPrice(low) : 0;
                return (
                  <tr key={p.id}>
                    <td><div className="prod"><span className="em"><Thumb p={p} /></span><span><span className="nm">{p.name}</span><div className="sub">{isDevice(p) ? "Device · " : ""}{p.pack}</div></span></div></td>
                    <td>
                      <div className="pd-flex" style={{ flexWrap: "wrap", gap: 6 }}>
                        {g.rows.map((r, i) => (
                          <span key={r.id} className={`pd-pill ${i === 0 ? "pill-green" : "pill-gray"}`} title={schemeLabel(r) ? `${inr2(r.purchasePrice)} list, ${schemeLabel(r)} scheme` : (i === 0 ? "Lowest landed price" : undefined)} style={{ gap: 5 }}>
                            {r.preferred && <><IconStar size={12} /> </>}{supOf(r.supplierId)?.name ?? "—"} · {inr2(effectiveSupplyPrice(r))}{schemeLabel(r) ? ` (${schemeLabel(r)})` : ""}{i === 0 && g.rows.length > 1 ? <> <IconCheck size={12} /></> : ""}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 700, color: "#1f7a46" }}>{inr2(effectiveSupplyPrice(low))}</td>
                    <td className="num" style={{ fontWeight: 700, color: saving > 0 ? "#1f7a46" : "var(--mid)" }}>{saving > 0 ? inr2(saving) : "—"}</td>
                  </tr>
                );
              })}
              {groups.length === 0 && <tr><td colSpan={4}><div className="pd-empty" style={{ padding: 28 }}><div className="em"><IconScale size={30} /></div><p>{onlyMulti ? "No medicine is sourced from 2+ distributors yet. Add the same item under different distributors in the Supply list to compare prices." : "No supply items to compare."}</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const multiSourceCount = (list: SupplyEntry[]) => {
  const m: Record<string, number> = {};
  list.forEach((e) => { m[e.productId] = (m[e.productId] || 0) + 1; });
  return Object.values(m).filter((n) => n > 1).length;
};

/* ─────────────── Modals ─────────────── */
const BLANK_SUP: Omit<Supplier, "id"> = {
  name: "", gstin: "", phone: "", contactPerson: "", email: "", address: "",
  city: "", state: "Karnataka", dlNo: "", paymentTerms: "30 days credit", outstanding: 0, active: true,
};

function DistributorModal({ init, onClose, onSave }: { init?: Supplier; onClose: () => void; onSave: (d: Omit<Supplier, "id">) => void }) {
  const { showFault } = usePharma();
  const [f, setF] = useState<Omit<Supplier, "id">>(init ? { ...init } : { ...BLANK_SUP });
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="pd-modal-head"><h3>{init ? "Edit distributor" : "Add distributor"}</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-form-grid">
            <div className="pd-field pd-span2" data-field="name"><label>Distributor / firm name *</label><input className="pd-input" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Bengaluru Pharma Distributors" /></div>
            <div className="pd-field"><label>Contact person</label><input className="pd-input" value={f.contactPerson || ""} onChange={(e) => set({ contactPerson: e.target.value })} /></div>
            <div className="pd-field" data-field="phone"><label>Phone *</label><input className="pd-input" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 …" /></div>
            <div className="pd-field" data-field="email"><label>Email</label><input className="pd-input" value={f.email || ""} onChange={(e) => set({ email: e.target.value })} /></div>
            <div className="pd-field" data-field="gstin"><label>GSTIN</label><input className="pd-input pd-mono" value={f.gstin} onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} placeholder="29ABCDE1234F1Z5" /></div>
            <div className="pd-field"><label>Drug licence no.</label><input className="pd-input pd-mono" value={f.dlNo || ""} onChange={(e) => set({ dlNo: e.target.value.toUpperCase() })} placeholder="KA-W-…" /></div>
            <div className="pd-field pd-span2"><label>Address</label><input className="pd-input" value={f.address || ""} onChange={(e) => set({ address: e.target.value })} /></div>
            <div className="pd-field"><label>City</label><input className="pd-input" value={f.city || ""} onChange={(e) => set({ city: e.target.value })} /></div>
            <div className="pd-field"><label>State</label><input className="pd-input" value={f.state || ""} onChange={(e) => set({ state: e.target.value })} /></div>
            <div className="pd-field"><label>Payment terms</label>
              <select className="pd-select" value={f.paymentTerms || ""} onChange={(e) => set({ paymentTerms: e.target.value })}>
                <option>Advance</option><option>On delivery</option><option>7 days credit</option><option>15 days credit</option><option>30 days credit</option><option>45 days credit</option>
              </select>
            </div>
            <div className="pd-field"><label>Outstanding payable (₹)</label><input className="pd-input" type="number" value={f.outstanding ?? 0} onChange={(e) => set({ outstanding: Number(e.target.value) || 0 })} /></div>
          </div>
          <div className="pd-flex" style={{ marginTop: 16, gap: 10, alignItems: "center" }}>
            <button type="button" className={`pd-switch${f.active !== false ? " on" : ""}`} onClick={() => set({ active: !(f.active !== false) })} aria-label="Toggle active" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Active — show in purchases & reorder lists</span>
          </div>
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-primary" disabled={!f.name.trim() || !f.phone.trim()} onClick={() => { if (f.gstin.trim() && !isValidGstin(f.gstin)) { showFault("Enter a valid GSTIN"); return; } onSave(f); }}>{init ? "Save changes" : "Add distributor"}</button>
        </div>
      </div>
    </div>
  );
}

function SupplyModal({ init, onClose, onSave }: { init?: SupplyEntry; onClose: () => void; onSave: (d: Omit<SupplyEntry, "id">) => void }) {
  const { inventory, suppliers, supplyList } = usePharma();
  const [f, setF] = useState<Omit<SupplyEntry, "id">>(
    init ? { ...init } : { productId: inventory[0]?.id ?? "", supplierId: suppliers[0]?.id ?? "", purchasePrice: 0, mrp: undefined, bonusBuy: undefined, bonusFree: undefined, preferred: false, note: "" }
  );
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  const prod: InvProduct | undefined = inventory.find((p) => p.id === f.productId);
  const others = supplyList.filter((e) => e.productId === f.productId && e.id !== init?.id);
  // when picking a product, default MRP to its printed MRP for convenience
  const onPickProduct = (id: string) => {
    const p = inventory.find((x) => x.id === id);
    set({ productId: id, mrp: f.mrp ?? (p ? mrpOf(p) : undefined) });
  };
  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="pd-modal-head"><h3>{init ? "Edit supply item" : "Add supply item"}</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-form-grid">
            <div className="pd-field pd-span2"><label>Medicine / device *</label>
              <select className="pd-select" value={f.productId} onChange={(e) => onPickProduct(e.target.value)}>
                {inventory.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.pack}{isDevice(p) ? " (device)" : ""}</option>)}
              </select>
            </div>
            <div className="pd-field pd-span2"><label>Distributor *</label>
              <select className="pd-select" value={f.supplierId} onChange={(e) => set({ supplierId: e.target.value })}>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="pd-field" data-field="amount"><label>Purchase price ₹ (per pack) *</label><input className="pd-input" type="number" step="0.01" value={f.purchasePrice || ""} onChange={(e) => set({ purchasePrice: Number(e.target.value) || 0 })} /></div>
            <div className="pd-field"><label>MRP ₹ (per pack)</label><input className="pd-input" type="number" step="0.01" value={f.mrp ?? ""} onChange={(e) => set({ mrp: e.target.value === "" ? undefined : Number(e.target.value) })} /></div>
            <div className="pd-field"><label>Bonus — buy</label><input className="pd-input" type="number" value={f.bonusBuy ?? ""} onChange={(e) => set({ bonusBuy: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="e.g. 10" /></div>
            <div className="pd-field"><label>… get free</label><input className="pd-input" type="number" value={f.bonusFree ?? ""} onChange={(e) => set({ bonusFree: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="e.g. 1" /></div>
            <div className="pd-field pd-span2"><label>Note (credit / shipping)</label><input className="pd-input" value={f.note || ""} onChange={(e) => set({ note: e.target.value })} placeholder="e.g. free shipping above ₹5000" /></div>
          </div>
          {f.purchasePrice > 0 && schemeLabel(f as SupplyEntry) && (
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "#1f7a46" }}>Landed cost after {schemeLabel(f as SupplyEntry)} scheme: {inr2(effectiveSupplyPrice(f as SupplyEntry))} / pack</div>
          )}

          {others.length > 0 && (
            <div className="pd-card pd-card-pad" style={{ marginTop: 14, background: "var(--wash2)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 6 }}>{prod?.name} is also supplied by:</div>
              <div className="pd-flex" style={{ flexWrap: "wrap", gap: 6 }}>
                {others.slice().sort((a, b) => effectiveSupplyPrice(a) - effectiveSupplyPrice(b)).map((o) => (
                  <span key={o.id} className="pd-pill pill-gray">{suppliers.find((s) => s.id === o.supplierId)?.name} · {inr2(effectiveSupplyPrice(o))}{schemeLabel(o) ? ` (${schemeLabel(o)})` : ""}</span>
                ))}
              </div>
              {f.purchasePrice > 0 && (() => {
                const myEff = effectiveSupplyPrice(f as SupplyEntry);
                const bestOther = Math.min(...others.map((o) => effectiveSupplyPrice(o)));
                return myEff <= bestOther
                  ? <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "#1f7a46" }}><IconCheck size={13} /> Lowest landed price — {inr2(bestOther - myEff)} cheaper than the next.</div>
                  : <div style={{ marginTop: 8, fontSize: 12, color: "var(--mid)" }}>{inr2(myEff - bestOther)} more than the cheapest current source (landed).</div>;
              })()}
            </div>
          )}

          <div className="pd-flex" style={{ marginTop: 16, gap: 10, alignItems: "center" }}>
            <button type="button" className={`pd-switch${f.preferred ? " on" : ""}`} onClick={() => set({ preferred: !f.preferred })} aria-label="Toggle preferred" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Mark as preferred source for this item</span>
          </div>
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-primary" disabled={!f.productId || !f.supplierId || f.purchasePrice <= 0} onClick={() => onSave(f)}>{init ? "Save changes" : "Add supply item"}</button>
        </div>
      </div>
    </div>
  );
}
