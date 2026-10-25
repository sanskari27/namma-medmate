"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import { CA_REPORT_TYPES, inr, computeInvoice, purchaseTotals, fmtDateTime, Advisor, AdvisorType } from "../data";
import { IconCheck, IconSend, IconPlus, IconEdit, IconTrash, IconX, IconCalc, IconReceipt } from "../components/Icon";

const PERIODS = ["June 2026", "May 2026", "April 2026", "Q1 FY 2026-27", "FY 2025-26"];
const TYPE_PILL: Record<AdvisorType, string> = { CA: "pill-blue", Accountant: "pill-green" };

export default function CAReportScreen() {
  const { advisors, addAdvisor, updateAdvisor, removeAdvisor, caShares, shareWithCA, sales, purchases, profile } = usePharma();
  const [period, setPeriod] = useState(PERIODS[0]);
  const [picked, setPicked] = useState<string[]>(["gst", "sales", "pl"]);
  const [recipient, setRecipient] = useState(advisors[0]?.id ?? "");
  const [edit, setEdit] = useState<Advisor | AdvisorType | null>(null); // Advisor = edit, AdvisorType = add

  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const rec = advisors.find((a) => a.id === recipient) ?? advisors[0];

  const live = sales.filter((s) => s.status !== "cancelled").map((s) => computeInvoice(s.items, s.discount));
  const outputGst = live.reduce((a, t) => a + t.totalTax, 0);
  const inputGst = purchases.reduce((a, p) => a + purchaseTotals(p.items).gst, 0);
  const netRev = live.reduce((a, t) => a + t.payable, 0);

  return (
    <div className="pd-canvas-wide" style={{ maxWidth: 1040 }}>
      <div className="pd-grid-2">
        {/* compose share */}
        <div className="pd-card">
          <div className="pd-card-head"><h3>Share reports</h3></div>
          <div className="pd-card-pad">
            <div className="pd-form-grid" style={{ marginBottom: 4 }}>
              <div className="pd-field"><label>Reporting period</label>
                <select className="pd-select" value={period} onChange={(e) => setPeriod(e.target.value)}>{PERIODS.map((p) => <option key={p}>{p}</option>)}</select>
              </div>
              <div className="pd-field"><label>Send to</label>
                <select className="pd-select" value={recipient} onChange={(e) => setRecipient(e.target.value)}>
                  {advisors.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                </select>
              </div>
            </div>
            <div className="pd-pl-head">Include reports</div>
            {CA_REPORT_TYPES.map((r) => (
              <label key={r.key} className="pd-flex" style={{ justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line)", cursor: "pointer" }}>
                <span style={{ fontSize: 13.5 }}>{r.icon} {r.label}</span>
                <button type="button" className={`pd-switch${picked.includes(r.key) ? " on" : ""}`} onClick={() => toggle(r.key)} />
              </label>
            ))}
            <button className="pd-btn pd-btn-primary pd-btn-block" style={{ marginTop: 16 }} disabled={picked.length === 0 || !rec} onClick={() => shareWithCA(period, picked, recipient)}>
              <IconSend size={16} /> Share {picked.length} report{picked.length !== 1 ? "s" : ""}{rec ? ` with ${rec.name.split(" ").slice(-1)[0]}` : ""}
            </button>
            <p className="pd-muted" style={{ fontSize: 11.5, marginTop: 10 }}>This saves the share on your account. It does not email the reports.</p>
          </div>
        </div>

        {/* advisors + snapshot */}
        <div>
          <div className="pd-card" style={{ marginBottom: 16 }}>
            <div className="pd-card-head">
              <h3>Your CA &amp; Accountant</h3>
              <div className="pd-flex pd-gap6">
                <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => setEdit("CA")}><IconPlus size={14} /> CA</button>
                <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => setEdit("Accountant")}><IconPlus size={14} /> Accountant</button>
              </div>
            </div>
            <div className="pd-card-pad" style={{ paddingTop: 8, paddingBottom: 8 }}>
              {advisors.length === 0 && <div className="pd-empty" style={{ padding: 20 }}><p>No advisors yet. Add your CA or accountant.</p></div>}
              {advisors.map((a) => (
                <div className="pd-row" key={a.id}>
                  <span style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--wash)", display: "grid", placeItems: "center", flexShrink: 0 }}>{a.type === "CA" ? <IconCalc size={20} /> : <IconReceipt size={20} />}</span>
                  <span className="gw">
                    <div className="t pd-flex pd-gap6">{a.name} <span className={`pd-pill ${TYPE_PILL[a.type]}`}>{a.type}</span></div>
                    <div className="s">{a.firm} · {a.email} · {a.phone}</div>
                  </span>
                  <button className="pd-iconbtn" title="Edit" onClick={() => setEdit(a)}><IconEdit size={15} /></button>
                  <button className="pd-iconbtn" title="Remove" onClick={() => removeAdvisor(a.id)}><IconTrash size={15} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="pd-card pd-card-pad">
            <div className="pd-pl-head" style={{ marginTop: 0 }}>Snapshot (all data)</div>
            <div className="pd-pl">
              <div className="r"><span className="lb">GSTIN</span><span className="vl pd-mono" style={{ fontSize: 12 }}>{profile.gstin}</span></div>
              <div className="r"><span className="lb">Net revenue</span><span className="vl">{inr(netRev)}</span></div>
              <div className="r"><span className="lb">Output GST</span><span className="vl">{inr(outputGst)}</span></div>
              <div className="r"><span className="lb">Input GST credit</span><span className="vl">{inr(inputGst)}</span></div>
              <div className="r tot"><span className="lb">Net GST</span><span className={`vl ${outputGst - inputGst >= 0 ? "neg" : "pos"}`}>{inr(Math.abs(outputGst - inputGst))}{outputGst - inputGst < 0 ? " cr" : ""}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="pd-card" style={{ marginTop: 16 }}>
        <div className="pd-card-head"><h3>Sharing history</h3></div>
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>Ref</th><th>Period</th><th>Reports</th><th>Shared with</th><th>When</th><th>Status</th></tr></thead>
            <tbody>
              {caShares.map((s) => (
                <tr key={s.id}>
                  <td className="pd-mono" style={{ fontWeight: 700 }}>{s.id}</td>
                  <td>{s.period}</td>
                  <td>{s.reports.map((r) => CA_REPORT_TYPES.find((x) => x.key === r)?.label.split(" ")[0]).join(", ")}</td>
                  <td>{s.recipient}<div className="pd-muted pd-mono" style={{ fontSize: 11 }}>{s.sentTo}</div></td>
                  <td>{fmtDateTime(s.createdAt)}</td>
                  <td><span className="pd-pill pill-green"><i className="d" />Shared</span></td>
                </tr>
              ))}
              {caShares.length === 0 && <tr><td colSpan={6}><div className="pd-empty" style={{ padding: 24 }}><p>No reports shared yet.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {edit && <AdvisorModal initial={edit} onClose={() => setEdit(null)} onSave={async (a, id) => { const err = id ? await updateAdvisor(id, a) : await addAdvisor(a); if (!err) setEdit(null); }} />}
    </div>
  );
}

function AdvisorModal({ initial, onClose, onSave }: { initial: Advisor | AdvisorType; onClose: () => void; onSave: (a: Omit<Advisor, "id">, id?: string) => void }) {
  const isEdit = typeof initial !== "string";
  const [f, setF] = useState<Omit<Advisor, "id">>(isEdit
    ? { type: initial.type, name: initial.name, firm: initial.firm, email: initial.email, phone: initial.phone }
    : { type: initial, name: "", firm: "", email: "", phone: "" });
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>{isEdit ? `Edit ${initial.name}` : `Add ${f.type}`}</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-field" style={{ marginBottom: 12 }}><label>Type</label>
            <div className="pd-flex pd-gap6">
              {(["CA", "Accountant"] as AdvisorType[]).map((t) => <button key={t} className={`pd-chip${f.type === t ? " on" : ""}`} onClick={() => set({ type: t })}>{t === "CA" ? <><IconCalc size={13} /> Chartered Accountant</> : <><IconReceipt size={13} /> Accountant</>}</button>)}
            </div>
          </div>
          <div className="pd-form-grid">
            <div className="pd-field pd-span2" data-field="name"><label>Name</label><input className="pd-input" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder={f.type === "CA" ? "CA Sunil Sharma" : "Meena Iyer"} /></div>
            <div className="pd-field pd-span2"><label>Firm / organisation</label><input className="pd-input" value={f.firm} onChange={(e) => set({ firm: e.target.value })} /></div>
            <div className="pd-field" data-field="email"><label>Email</label><input className="pd-input" value={f.email} onChange={(e) => set({ email: e.target.value })} /></div>
            <div className="pd-field" data-field="phone"><label>Phone</label><input className="pd-input" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
          </div>
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-primary" disabled={!f.name.trim() || !f.email.trim()} onClick={() => onSave(f, isEdit ? initial.id : undefined)}><IconCheck size={15} /> {isEdit ? "Save" : "Add"}</button>
        </div>
      </div>
    </div>
  );
}
