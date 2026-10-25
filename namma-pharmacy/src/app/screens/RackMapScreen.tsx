"use client";
import { useState, useMemo } from "react";
import { usePharma } from "../pharmaState";
import {
  InvProduct, stockOf, hasLocation, groupByLocation, composeRack,
  matchesLocation, locationCodes, normalizeRack, inr, inr2, stockValue, mrpOf, looseUnitsOf,
  monthsToExpiry, isExpired, catLabel, packNoun, plural, unitNoun, stockLabel,
} from "../data";
import { Thumb, ScheduleTag } from "../components/bits";
import { IconSearch, IconInventory, IconPrint, IconCheck, IconX, IconPlus, IconTrash, IconReports, IconMap, IconPin, IconHelp, IconFolder, IconBox, IconUnlock, IconReceipt, IconTag } from "../components/Icon";
import { exportRackAuditCsv } from "../lib/stockExport";

type Tab = "map" | "assign";

export default function RackMapScreen() {
  const { inventory, racks, now, createRack, removeRack, setProductLocation, bulkAssignLocation, toast } = usePharma();
  const [tab, setTab] = useState<Tab>("map");
  const [q, setQ] = useState("");
  const [labels, setLabels] = useState(false);
  const [openRack, setOpenRack] = useState<string | null>(null);
  const [medId, setMedId] = useState<string | null>(null);

  const unassigned = inventory.filter((p) => !hasLocation(p));
  const groups = useMemo(() => groupByLocation(inventory, racks), [inventory, racks]);
  const zones = new Set(groups.map((g) => g.zone));
  const detail = openRack ? groups.find((g) => g.code === openRack) ?? { code: openRack, zone: "", items: [] } : null;
  const med = medId ? inventory.find((p) => p.id === medId) ?? null : null;

  return (
    <div className="pd-canvas-wide">
      <div className="pd-stats" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="pd-stat"><div className="ic ic-green"><IconInventory size={18} /></div><div className="lbl">Racks created</div><div className="val">{groups.length}</div></div>
        <div className="pd-stat"><div className="ic ic-blue"><IconMap size={18} /></div><div className="lbl">Racks / zones</div><div className="val">{zones.size}</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconPin size={18} /></div><div className="lbl">Medicines mapped</div><div className="val">{inventory.length - unassigned.length}</div></div>
        <div className="pd-stat"><div className="ic ic-rose"><IconHelp size={18} /></div><div className="lbl">No location yet</div><div className="val">{unassigned.length}</div></div>
      </div>

      <div className="pd-toolbar">
        <div className="pd-seg">
          <button className={tab === "map" ? "on" : ""} onClick={() => setTab("map")}><IconMap size={14} /> Rack map</button>
          <button className={tab === "assign" ? "on" : ""} onClick={() => setTab("assign")}><IconPin size={14} /> Assign locations{unassigned.length ? " · " + unassigned.length : ""}</button>
        </div>
        <div className="pd-spacer" />
        <div className="pd-search-inline">
          <span className="ic"><IconSearch size={17} /></span>
          <input placeholder="Search medicine or rack code (e.g. A3-12)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="pd-btn pd-btn-ghost" onClick={() => { exportRackAuditCsv(inventory, now); toast("Rack & storage audit exported"); }} disabled={!inventory.length}><IconReports size={16} /> Audit Excel</button>
        <button className="pd-btn pd-btn-ghost" onClick={() => setLabels(true)} disabled={!groups.length}><IconPrint size={16} /> Print rack labels</button>
      </div>

      {tab === "map"
        ? <RackMap groups={groups} q={q} unassigned={unassigned} onGoAssign={() => setTab("assign")}
            createRack={async (c) => {
              const result = await createRack(c);
              if (result === "added") { toast(`Rack ${normalizeRack(c)} created`); return true; }
              if (result === "exists") toast("That rack already exists");
              return false;
            }}
            onOpen={(c) => setOpenRack(c)} onMed={(id) => setMedId(id)} />
        : <AssignLocations inventory={inventory} q={q} setProductLocation={setProductLocation} bulkAssignLocation={bulkAssignLocation} toast={toast} />}

      {labels && <LabelSheet groups={groups} onClose={() => setLabels(false)} />}
      {detail && (
        <RackDetailModal
          code={detail.code} items={detail.items} inventory={inventory}
          onClose={() => setOpenRack(null)} onMed={(id) => setMedId(id)}
          onAdd={async (id) => { const p = inventory.find((x) => x.id === id); if (!await setProductLocation(id, detail.code)) toast(`${p?.name ?? "Item"} → ${detail.code}`); }}
          onRemoveItem={async (id) => { const p = inventory.find((x) => x.id === id); if (!await setProductLocation(id, "")) toast(`Removed ${p?.name ?? "item"} from ${detail.code}`); }}
          onDeleteRack={() => { removeRack(detail.code); toast(`Rack ${detail.code} removed`); setOpenRack(null); }}
        />
      )}
      {med && <MedicineDetailModal p={med} now={now} onClose={() => setMedId(null)} />}
    </div>
  );
}

// ── rack map: medicines grouped by physical location ────────────
function RackMap({ groups, q, unassigned, onGoAssign, createRack, onOpen, onMed }: {
  groups: { code: string; zone: string; items: InvProduct[] }[]; q: string; unassigned: InvProduct[];
  onGoAssign: () => void; createRack: (code: string) => Promise<boolean>; onOpen: (code: string) => void; onMed: (id: string) => void;
}) {
  const t = q.trim().toLowerCase();
  const [nr, setNr] = useState("");
  const matchProd = (p: InvProduct) => !t || `${p.name} ${p.composition} ${p.manufacturer}`.toLowerCase().includes(t) || matchesLocation(p, t);
  const shown = groups
    .map((g) => ({ ...g, items: g.items.filter(matchProd) }))
    .filter((g) => (!t ? true : g.items.length > 0 || g.code.toLowerCase().includes(t)));
  const submitNew = async () => { if (nr.trim() && await createRack(nr)) setNr(""); };

  return (
    <>
      {/* create a rack manually */}
      <div className="pd-card pd-card-pad" style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13 }}><IconFolder size={15} /> Create a rack</b>
        <input className="pd-input pd-mono" data-field="rack" style={{ width: 130 }} value={nr} onChange={(e) => setNr(e.target.value.toUpperCase())} onKeyDown={(e) => { if (e.key === "Enter") void submitNew(); }} placeholder="e.g. A3-12" />
        <button className="pd-btn pd-btn-primary pd-btn-sm" disabled={!nr.trim()} onClick={submitNew}><IconPlus size={14} /> Add rack</button>
        <span className="pd-muted" style={{ fontSize: 11.5 }}>Make the on-screen code identical to the printed shelf label. Click any rack below to add / arrange medicines inside it.</span>
      </div>

      {unassigned.length > 0 && !t && (
        <div className="pd-card pd-card-pad" style={{ background: "var(--amber-bg)", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}><IconHelp size={22} /></span>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 13.5 }}>{unassigned.length} medicine{unassigned.length !== 1 ? "s" : ""} have no rack location yet</b>
            <div className="pd-muted" style={{ fontSize: 12 }}>Assign them so staff can find stock on the shelves quickly.</div>
          </div>
          <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={onGoAssign}>Assign now →</button>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="pd-card"><div className="pd-empty"><div className="em"><IconMap size={28} /></div><p>{q ? `No locations match “${q}”.` : "No racks yet — create one above."}</p></div></div>
      ) : (
        <div className="pd-rackgrid">
          {shown.map((g) => (
            <div className="pd-rackcard" key={g.code}>
              <button className="pd-rackcard-head" onClick={() => onOpen(g.code)} title={`Manage rack ${g.code}`}>
                <span className="code">{g.code}</span>
                <span className="pd-muted" style={{ fontSize: 11.5 }}>{g.items.length} item{g.items.length !== 1 ? "s" : ""} · manage ›</span>
              </button>
              <div className="pd-rackcard-list scroll">
                {g.items.map((p) => (
                  <button className="pd-rackrow click" key={p.id} onClick={() => onMed(p.id)} title="View medicine details">
                    <span className="em"><Thumb p={p} /></span>
                    <span className="nm">{p.name}<span className="pd-muted" style={{ fontSize: 11 }}> · {p.composition}</span></span>
                    <span className={`pd-pill ${stockOf(p) === 0 ? "pill-rose" : "pill-gray"}`}>{stockOf(p)} in stock</span>
                  </button>
                ))}
                {g.items.length === 0 && <button className="pd-rackrow pd-muted click" style={{ fontSize: 12, justifyContent: "center" }} onClick={() => onOpen(g.code)}>Empty — click to add medicines</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── open a rack: arrange medicines in it (search + add / remove) ─
function RackDetailModal({ code, items, inventory, onClose, onAdd, onRemoveItem, onDeleteRack, onMed }: {
  code: string; items: InvProduct[]; inventory: InvProduct[];
  onClose: () => void; onAdd: (id: string) => void; onRemoveItem: (id: string) => void; onDeleteRack: () => void; onMed: (id: string) => void;
}) {
  const [pq, setPq] = useState("");
  const t = pq.trim().toLowerCase();
  const here = new Set(items.map((p) => p.id));
  const results = inventory
    .filter((p) => !here.has(p.id) && (!t || `${p.name} ${p.composition} ${p.manufacturer}`.toLowerCase().includes(t)))
    .slice(0, 8);

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3><IconFolder size={16} /> Rack <span className="pd-mono">{code}</span></h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          {/* search + add */}
          <div className="pd-field" style={{ marginBottom: 10 }}>
            <label>Add medicine to this rack</label>
            <div className="pd-search-inline" style={{ width: "100%" }}><span className="ic"><IconSearch size={16} /></span><input autoFocus placeholder="Search medicine by name, salt, brand…" value={pq} onChange={(e) => setPq(e.target.value)} /></div>
          </div>
          {pq.trim() && (
            <div className="pd-pickbox" style={{ marginBottom: 14 }}>
              <div className="pd-picklist">
                {results.map((p) => (
                  <button key={p.id} className="pd-pickitem" onClick={() => onAdd(p.id)}>
                    <b>{p.name}</b><span className="pd-muted"> · {p.composition || p.manufacturer} · {stockOf(p)} in stock{hasLocation(p) ? ` · now at ${locationCodes(p).join(" · ")}` : ""}</span>
                  </button>
                ))}
                {results.length === 0 && <div className="pd-muted" style={{ padding: "10px 12px", fontSize: 12.5 }}>No other medicine matches “{pq}”.</div>}
              </div>
            </div>
          )}

          {/* medicines currently in this rack */}
          <div className="pd-flex" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <b style={{ fontSize: 13 }}>In this rack</b><span className="pd-muted" style={{ fontSize: 12 }}>{items.length} item{items.length !== 1 ? "s" : ""}</span>
          </div>
          {items.length === 0 ? (
            <div className="pd-empty" style={{ padding: "20px 10px" }}><div className="em"><IconBox size={28} /></div><p>No medicines here yet. Search above to add some.</p></div>
          ) : (
            <div className="pd-rackcard-list scroll tall" style={{ border: "1px solid var(--line)", borderRadius: "var(--r)" }}>
              {items.map((p) => (
                <div className="pd-rackrow" key={p.id}>
                  <button className="pd-rackrow-main" onClick={() => onMed(p.id)} title="View medicine details">
                    <span className="em"><Thumb p={p} /></span>
                    <span className="nm">{p.name}<span className="pd-muted" style={{ fontSize: 11 }}> · {p.composition}</span></span>
                    <span className={`pd-pill ${stockOf(p) === 0 ? "pill-rose" : "pill-gray"}`}>{stockOf(p)}</span>
                  </button>
                  <button className="pd-iconbtn" title="Remove from this rack" onClick={() => onRemoveItem(p.id)}><IconX size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-sm" style={{ color: "var(--rose)", background: "none" }} disabled={items.length > 0} title={items.length ? "Move out all medicines first" : "Delete this rack"} onClick={onDeleteRack}><IconTrash size={14} /> Delete rack</button>
          <div className="pd-spacer" />
          <button className="pd-btn pd-btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ── medicine details (stock, batches, expiry, value) ────────────
function MedicineDetailModal({ p, now, onClose }: { p: InvProduct; now: number; onClose: () => void }) {
  const mrpValue = p.batches.reduce((a, b) => a + b.qty * b.mrp, 0);
  const buyValue = stockValue(p);
  const totalQty = stockOf(p);
  const facts: [string, React.ReactNode][] = [
    ["Composition / salt", p.composition], ["Manufacturer", p.manufacturer], ["Pack", p.pack],
    ["Category", catLabel(p.category)], ["Form", p.form], ["HSN", p.hsn], ["GST", `${p.gst}%`],
    ["Rack location", hasLocation(p) ? <span className="pd-mono">{locationCodes(p).join(" · ")}</span> : "—"],
    ["Reorder level", `${p.reorderLevel} units`],
  ];
  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head">
          <h3 className="pd-flex" style={{ gap: 10, alignItems: "center" }}>
            <span className="em" style={{ width: 34, height: 34, borderRadius: 9, background: "var(--wash)", display: "grid", placeItems: "center", overflow: "hidden" }}><Thumb p={p} /></span>
            {p.name} {hasLocation(p) && <span className="pd-rackchip"><IconPin size={11} /> {p.rack}</span>} <ScheduleTag schedule={p.schedule} />
          </h3>
          <button className="pd-x" onClick={onClose}><IconX size={18} /></button>
        </div>
        <div className="pd-modal-body">
          {/* value summary */}
          <div className="pd-stats" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 16 }}>
            <div className="pd-stat"><div className="ic ic-green"><IconBox size={18} /></div><div className="lbl">In stock</div><div className="val" style={{ fontSize: 18 }}>{stockLabel(p)}</div></div>
            <div className="pd-stat"><div className="ic ic-gold"><IconUnlock size={18} /></div><div className="lbl">Loose {unitNoun(p)}s</div><div className="val" style={{ fontSize: 18 }}>{looseUnitsOf(p)}</div></div>
            <div className="pd-stat"><div className="ic ic-blue"><IconReceipt size={18} /></div><div className="lbl">Purchase value (cost)</div><div className="val" style={{ fontSize: 18 }}>{inr(buyValue)}</div></div>
            <div className="pd-stat"><div className="ic ic-rose"><IconTag size={18} /></div><div className="lbl">MRP value</div><div className="val" style={{ fontSize: 18 }}>{inr(mrpValue)}</div></div>
          </div>

          {/* details grid */}
          <div className="pd-rack-facts">
            {facts.map(([k, v]) => <div className="f" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>)}
          </div>

          {/* batch table */}
          <b style={{ fontSize: 13, display: "block", margin: "16px 0 8px" }}>Batches · stock, expiry & value</b>
          <div className="pd-tbl-wrap">
            <table className="pd-tbl">
              <thead><tr><th>Batch no.</th><th>Expiry</th><th className="num">Qty</th><th className="num">MRP</th><th className="num">Purchase / PTR</th><th className="num">MRP value</th><th className="num">Purchase value</th></tr></thead>
              <tbody>
                {p.batches.length === 0 && <tr><td colSpan={7}><div className="pd-empty" style={{ padding: "16px" }}><p>No batches in stock.</p></div></td></tr>}
                {p.batches.map((b) => {
                  const mo = monthsToExpiry(b.expiry, now); const exp = isExpired(b.expiry, now);
                  return (
                    <tr key={b.batchNo}>
                      <td className="pd-mono" style={{ fontWeight: 700 }}>{b.batchNo || "—"}</td>
                      <td><span className={`pd-pill ${exp ? "pill-rose" : mo <= 4 ? "pill-gold" : "pill-gray"}`}>{b.expiry}{exp ? " · expired" : mo <= 4 ? ` · ${mo}mo` : ""}</span></td>
                      <td className="num" style={{ fontWeight: 700 }}>{b.qty}</td>
                      <td className="num">{inr(b.mrp)}</td>
                      <td className="num">{inr2(b.ptr)}</td>
                      <td className="num">{inr(b.qty * b.mrp)}</td>
                      <td className="num">{inr(b.qty * b.ptr)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {p.batches.length > 0 && (
                <tfoot><tr style={{ background: "var(--wash2)", fontWeight: 800 }}>
                  <td colSpan={2}>Total · {p.batches.length} batch{p.batches.length !== 1 ? "es" : ""}</td>
                  <td className="num">{totalQty}</td><td className="num" colSpan={2}></td>
                  <td className="num">{inr(mrpValue)}</td><td className="num">{inr(buyValue)}</td>
                </tr></tfoot>
              )}
            </table>
          </div>
          <p className="pd-muted" style={{ fontSize: 11.5, marginTop: 10 }}>Purchase value = stock × purchase price (PTR). MRP value = stock × MRP. Stock updates automatically from purchases & sales.</p>
        </div>
      </div>
    </div>
  );
}

// ── assign / re-arrange locations ───────────────────────────────
function AssignLocations({ inventory, q, setProductLocation, bulkAssignLocation, toast }: {
  inventory: InvProduct[]; q: string;
  setProductLocation: (id: string, rack: string, rackAlt?: string) => Promise<unknown>;
  bulkAssignLocation: (ids: string[], rack: string) => Promise<unknown>;
  toast: (m: string) => void;
}) {
  const [onlyUnset, setOnlyUnset] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [rack, setRack] = useState("");
  const [shelf, setShelf] = useState("");
  const [bin, setBin] = useState("");
  const code = composeRack(rack, shelf, bin);

  const t = q.trim().toLowerCase();
  const list = inventory.filter((p) => {
    if (onlyUnset && hasLocation(p)) return false;
    if (t && !(`${p.name} ${p.composition} ${p.manufacturer}`.toLowerCase().includes(t) || matchesLocation(p, t))) return false;
    return true;
  });

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allShownSelected = list.length > 0 && list.every((p) => sel.has(p.id));
  const toggleAll = () => setSel((s) => { const n = new Set(s); if (allShownSelected) list.forEach((p) => n.delete(p.id)); else list.forEach((p) => n.add(p.id)); return n; });

  const assignSelected = async () => {
    if (!code || sel.size === 0) return;
    if (await bulkAssignLocation([...sel], code)) return;
    toast(`${sel.size} medicine${sel.size !== 1 ? "s" : ""} → ${code}`);
    setSel(new Set());
  };

  return (
    <div className="pd-rack-assign">
      {/* location builder */}
      <div className="pd-card pd-card-pad" style={{ marginBottom: 14 }}>
        <div className="pd-flex" style={{ gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="pd-field" data-field="rack" style={{ width: 90 }}><label>Rack</label><input className="pd-input" value={rack} onChange={(e) => setRack(e.target.value.toUpperCase())} placeholder="A" maxLength={4} /></div>
          <div className="pd-field" style={{ width: 80 }}><label>Shelf</label><input className="pd-input" value={shelf} onChange={(e) => setShelf(e.target.value)} placeholder="3" maxLength={3} /></div>
          <div className="pd-field" style={{ width: 80 }}><label>Bin</label><input className="pd-input" value={bin} onChange={(e) => setBin(e.target.value)} placeholder="12" maxLength={4} /></div>
          <div style={{ alignSelf: "stretch", display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
            <div>
              <div className="pd-muted" style={{ fontSize: 11 }}>Location code</div>
              <div className="pd-rack-preview">{code || "—"}</div>
            </div>
          </div>
          <div className="pd-spacer" />
          <button className="pd-btn pd-btn-primary" disabled={!code || sel.size === 0} onClick={assignSelected}>
            <IconCheck size={16} /> Assign to {sel.size || ""} selected
          </button>
        </div>
        <div className="pd-muted" style={{ fontSize: 11.5, marginTop: 10 }}>
          Read like an address: <b>Rack</b> (cupboard A, B, C…) → <b>Shelf</b> (top = 1) → <b>Bin</b> (slot left→right). Keep the on-screen code identical to the printed shelf label. Tip: keep fast-movers in racks nearest the counter.
        </div>
      </div>

      {/* filter row */}
      <div className="pd-flex" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <label className="pd-flex pd-gap6" style={{ cursor: "pointer", fontSize: 13 }}>
          <input type="checkbox" checked={onlyUnset} onChange={(e) => setOnlyUnset(e.target.checked)} /> Show only medicines with no location
        </label>
        <span className="pd-muted" style={{ fontSize: 12.5 }}>{list.length} shown · {sel.size} selected</span>
      </div>

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" checked={allShownSelected} onChange={toggleAll} aria-label="Select all shown" /></th>
                <th>Medicine</th><th>Stock</th><th>Current location</th><th style={{ width: 200 }}>Set location</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => <AssignRow key={p.id} p={p} checked={sel.has(p.id)} onToggle={() => toggle(p.id)} onSave={async (v) => { if (!await setProductLocation(p.id, v)) toast(`${p.name} → ${v}`); }} fillCode={code} />)}
              {list.length === 0 && <tr><td colSpan={5}><div className="pd-empty"><div className="em"><IconCheck size={28} /></div><p>{onlyUnset ? "Every medicine has a location. Nice and tidy!" : "No medicines match."}</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AssignRow({ p, checked, onToggle, onSave, fillCode }: {
  p: InvProduct; checked: boolean; onToggle: () => void; onSave: (v: string) => void; fillCode: string;
}) {
  const [val, setVal] = useState(p.rack || "");
  const dirty = val.trim() !== (p.rack || "").trim();
  return (
    <tr>
      <td><input type="checkbox" checked={checked} onChange={onToggle} aria-label={`Select ${p.name}`} /></td>
      <td>
        <div className="prod">
          <span className="em"><Thumb p={p} /></span>
          <span><span className="nm">{p.name}</span><div className="sub">{p.composition}</div></span>
        </div>
      </td>
      <td><span className={`pd-pill ${stockOf(p) === 0 ? "pill-rose" : "pill-gray"}`}>{stockOf(p)}</span></td>
      <td className="pd-mono">{hasLocation(p) ? locationCodes(p).join(" · ") : <span className="pd-muted">—</span>}</td>
      <td>
        <div className="pd-flex pd-gap6">
          <input className="pd-input pd-mono" data-field="rack" style={{ width: 96 }} value={val} onChange={(e) => setVal(e.target.value.toUpperCase())} placeholder={fillCode || "A3-12"} />
          {fillCode && val.trim() !== fillCode && <button className="pd-iconbtn" title={`Use ${fillCode}`} onClick={() => setVal(fillCode)}>↤</button>}
          <button className="pd-btn pd-btn-sm pd-btn-primary" disabled={!dirty || !val.trim()} onClick={() => onSave(val.trim())}>Save</button>
        </div>
      </td>
    </tr>
  );
}

// ── printable rack-label sheet (stick on each shelf/bin) ─────────
function LabelSheet({ groups, onClose }: { groups: { code: string; zone: string; items: InvProduct[] }[]; onClose: () => void }) {
  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head pd-no-print"><h3>Rack labels · {groups.length} locations</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <p className="pd-muted pd-no-print" style={{ fontSize: 12.5, marginBottom: 12 }}>Print, cut along the boxes, and stick each label on its matching bin. The code must read identically on the shelf and on screen.</p>
          <div className="pd-labelsheet pd-print-area">
            {groups.map((g) => (
              <div className="pd-label" key={g.code}>
                <div className="zone">RACK {g.zone}</div>
                <div className="code">{g.code}</div>
                <div className="brand"><em>Namma</em> <b>MedMate</b></div>
              </div>
            ))}
          </div>
        </div>
        <div className="pd-modal-foot pd-no-print">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Close</button>
          <button className="pd-btn pd-btn-primary" onClick={() => window.print()}><IconPrint size={15} /> Print labels</button>
        </div>
      </div>
    </div>
  );
}
