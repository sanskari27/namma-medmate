"use client";
import { useState, useMemo } from "react";
import { usePharma } from "../pharmaState";
import { inr, fmtDateTime, computeInvoice, timeAgo, Sale, PayMode, PAY_LABEL } from "../data";
import {
  Ward, WardType, WARD_TYPES, Admission, PayerType, wardBedNos, occupiedBedsOf,
  admissionAtBed, hospitalOccupancy, activeAdmissions, INSURERS,
} from "../lib/hospital";
import { IconSearch, IconPlus, IconX, IconRupee, IconPos, IconTrash, IconCheck, IconArrowRight, IconSettings, IconCash, IconShield } from "../components/Icon";

const billTotal = (s: Sale) => computeInvoice(s.items, s.discount).payable;
const daysIn = (from: number, now: number) => Math.max(1, Math.ceil((now - from) / 86400000));
const TYPE_TONE: Record<WardType, string> = { ICU: "pill-rose", General: "pill-gray", Surgical: "pill-blue", Pediatric: "pill-gold", Maternity: "pill-teal", Private: "pill-green" };

export default function WardsScreen() {
  const { wards, admissions, sales, now } = usePharma();
  const [tab, setTab] = useState<"beds" | "admissions">("beds");
  const [setup, setSetup] = useState(false);
  const [admit, setAdmit] = useState<{ wardId: string; bed: string } | true | null>(null);
  const [viewAdm, setViewAdm] = useState<string | null>(null);

  const occ = hospitalOccupancy(wards, admissions);
  const active = activeAdmissions(admissions);
  const current = admissions.find((a) => a.id === viewAdm) ?? null;

  return (
    <div className="pd-canvas-wide">
      <div className="pd-summary-chips" style={{ marginBottom: 16 }}>
        <div className="pd-schip">Wards<b>{wards.length}</b></div>
        <div className="pd-schip">Total beds<b>{occ.beds}</b></div>
        <div className="pd-schip">Occupied<b>{occ.occ}</b></div>
        <div className="pd-schip">Free<b>{occ.free}</b></div>
        <div className="pd-schip">Occupancy<b>{occ.pct}%</b></div>
        <div className="pd-schip">Admitted<b>{active.length}</b></div>
      </div>

      <div className="pd-toolbar">
        <div className="pd-seg">
          <button className={tab === "beds" ? "on" : ""} onClick={() => setTab("beds")}>Bed map</button>
          <button className={tab === "admissions" ? "on" : ""} onClick={() => setTab("admissions")}>Admissions ({active.length})</button>
        </div>
        <div className="pd-spacer" />
        <button className="pd-btn pd-btn-ghost" onClick={() => setSetup(true)}><IconSettings size={14} /> Manage wards</button>
        <button className="pd-btn pd-btn-primary" onClick={() => setAdmit(true)}><IconPlus size={16} /> Admit patient</button>
      </div>

      {tab === "beds" ? (
        <div className="pd-grid-cards" style={{ marginTop: 16 }}>
          {wards.map((w) => {
            const occSet = occupiedBedsOf(admissions, w.id);
            const beds = wardBedNos(w);
            const pct = w.beds ? Math.round((occSet.size / w.beds) * 100) : 0;
            return (
              <div className="pd-card pd-card-pad" key={w.id}>
                <div className="pd-flex" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: 16 }}>{w.name}</h3>
                    <div className="pd-muted" style={{ fontSize: 12.5, marginTop: 2 }}>{w.code} · {w.floor} · {w.sister}</div>
                  </div>
                  <span className={`pd-pill ${TYPE_TONE[w.type]}`}>{w.type}</span>
                </div>
                <div className="pd-flex" style={{ justifyContent: "space-between", fontSize: 12.5, margin: "12px 0 5px" }}>
                  <span className="pd-muted">{occSet.size}/{w.beds} beds occupied</span>
                  <b style={{ color: pct >= 85 ? "var(--rose)" : pct >= 60 ? "var(--amber)" : "var(--mid)" }}>{pct}%</b>
                </div>
                <div className={`pd-prog${pct >= 85 ? " rose" : pct >= 60 ? " amber" : ""}`}><i style={{ width: pct + "%" }} /></div>
                <div className="pd-bedgrid">
                  {beds.map((bed) => {
                    const a = admissionAtBed(admissions, w.id, bed);
                    return (
                      <button key={bed} className={`pd-bed${a ? " occ" : " free"}`} title={a ? `${a.name} · ${a.patientId}` : `${bed} · free`}
                        onClick={() => a ? setViewAdm(a.id) : setAdmit({ wardId: w.id, bed })}>
                        <span className="no">{bed}</span>
                        <span className="pt">{a ? a.name.split(" ")[0] : "+ Free"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <AdmissionsTable admissions={active} sales={sales} now={now} onOpen={setViewAdm} />
      )}

      {setup && <WardSetupModal onClose={() => setSetup(false)} />}
      {admit && <AdmitModal preset={admit === true ? null : admit} onClose={() => setAdmit(null)} onAdmitted={(id) => { setAdmit(null); setViewAdm(id); }} />}
      {current && <AdmissionModal adm={current} onClose={() => setViewAdm(null)} />}
    </div>
  );
}

/* ── admissions table ───────────────────────────────────────── */
function AdmissionsTable({ admissions, sales, now, onOpen }: { admissions: Admission[]; sales: Sale[]; now: number; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const rows = admissions.filter((a) => !q.trim() || `${a.name} ${a.patientId} ${a.bed} ${a.wardName} ${a.doctor}`.toLowerCase().includes(q.toLowerCase()));
  const outstandingOf = (a: Admission) => sales.filter((s) => s.patientId === a.patientId && s.status !== "cancelled" && s.paid === false).reduce((x, s) => x + billTotal(s), 0);

  return (
    <div className="pd-card" style={{ marginTop: 16 }}>
      <div className="pd-card-head"><h3>Admitted patients</h3>
        <div className="pd-search-inline"><span className="ic"><IconSearch size={16} /></span><input placeholder="Patient, UHID, bed…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="pd-tbl-wrap">
        <table className="pd-tbl">
          <thead><tr><th>Patient</th><th>UHID</th><th>Ward · Bed</th><th>Doctor</th><th>Payer</th><th>Admitted</th><th className="num">Outstanding</th><th></th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => onOpen(a.id)}>
                <td><b>{a.name}</b><div className="pd-muted" style={{ fontSize: 11 }}>{a.gender}{a.age ? ` · ${a.age}y` : ""}</div></td>
                <td className="pd-mono">{a.patientId}</td>
                <td>{a.wardName}<div className="pd-muted pd-mono" style={{ fontSize: 11 }}>{a.bed}</div></td>
                <td>{a.doctor || "—"}</td>
                <td>{a.payerType === "insurance" ? <span className="pd-pill pill-blue">{a.insurer ?? "Insurance"}</span> : <span className="pd-pill pill-gray">Self-pay</span>}</td>
                <td style={{ whiteSpace: "nowrap" }}>{daysIn(a.admittedAt, now)}d · {timeAgo(a.admittedAt, now)}</td>
                <td className="num" style={{ fontWeight: 800, color: outstandingOf(a) > 0 ? "var(--rose)" : "var(--mid)" }}>{inr(outstandingOf(a))}</td>
                <td><IconArrowRight size={15} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8}><div className="pd-empty">No admitted patients.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── ward setup (add / edit / remove wards) ─────────────────── */
function WardSetupModal({ onClose }: { onClose: () => void }) {
  const { wards, addWard, updateWard, removeWard } = usePharma();
  const [draft, setDraft] = useState<Omit<Ward, "id">>({ name: "", code: "", floor: "", type: "General", beds: 10, occupied: 0, sister: "" });
  const setD = (p: Partial<Ward>) => setDraft((s) => ({ ...s, ...p }));
  const add = async () => { if (!draft.name.trim() || !draft.code.trim()) return; const err = await addWard(draft); if (!err) setDraft({ name: "", code: "", floor: "", type: "General", beds: 10, occupied: 0, sister: "" }); };

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>Manage wards & beds</h3><button className="pd-iconbtn" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-tbl-wrap">
            <table className="pd-tbl">
              <thead><tr><th>Ward name</th><th>Code</th><th>Floor</th><th>Category</th><th>Beds</th><th>Nurse in-charge</th><th></th></tr></thead>
              <tbody>
                {wards.map((w) => (
                  <tr key={w.id}>
                    <td><input className="pd-input" value={w.name} onChange={(e) => updateWard(w.id, { name: e.target.value })} /></td>
                    <td><input className="pd-input pd-mono" style={{ width: 90 }} value={w.code} onChange={(e) => updateWard(w.id, { code: e.target.value.toUpperCase() })} /></td>
                    <td><input className="pd-input" style={{ width: 110 }} value={w.floor} onChange={(e) => updateWard(w.id, { floor: e.target.value })} /></td>
                    <td><select className="pd-select" value={w.type} onChange={(e) => updateWard(w.id, { type: e.target.value as WardType })}>{WARD_TYPES.map((t) => <option key={t}>{t}</option>)}</select></td>
                    <td><input className="pd-input" type="number" min={0} style={{ width: 70 }} value={w.beds} onChange={(e) => updateWard(w.id, { beds: Math.max(0, Number(e.target.value) || 0) })} /></td>
                    <td><input className="pd-input" value={w.sister} onChange={(e) => updateWard(w.id, { sister: e.target.value })} /></td>
                    <td><button className="pd-iconbtn" title="Remove ward" onClick={() => removeWard(w.id)}><IconTrash size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pd-card pd-card-pad" style={{ marginTop: 16, background: "var(--wash2)" }}>
            <b style={{ display: "block", marginBottom: 10 }}>Add a ward</b>
            <div className="pd-form-grid">
              <div className="pd-field pd-span2" data-field="name"><label>Ward name</label><input className="pd-input" value={draft.name} onChange={(e) => setD({ name: e.target.value })} placeholder="e.g. Orthopaedic Ward" /></div>
              <div className="pd-field"><label>Code / bed prefix</label><input className="pd-input pd-mono" value={draft.code} onChange={(e) => setD({ code: e.target.value.toUpperCase() })} placeholder="ORT" /></div>
              <div className="pd-field"><label>Floor</label><input className="pd-input" value={draft.floor} onChange={(e) => setD({ floor: e.target.value })} placeholder="3rd floor" /></div>
              <div className="pd-field"><label>Category</label><select className="pd-select" value={draft.type} onChange={(e) => setD({ type: e.target.value as WardType })}>{WARD_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div className="pd-field"><label>Bed capacity</label><input className="pd-input" type="number" min={1} value={draft.beds || ""} onChange={(e) => setD({ beds: Math.max(0, Number(e.target.value) || 0) })} /></div>
              <div className="pd-field pd-span2"><label>Nurse in-charge</label><input className="pd-input" value={draft.sister} onChange={(e) => setD({ sister: e.target.value })} placeholder="Sr. …" /></div>
            </div>
            <button className="pd-btn pd-btn-primary" style={{ marginTop: 12 }} disabled={!draft.name.trim() || !draft.code.trim()} onClick={add}><IconPlus size={15} /> Add ward · {draft.beds} beds ({draft.code}-1…{draft.code}-{draft.beds})</button>
          </div>
        </div>
        <div className="pd-modal-foot"><div className="pd-spacer" /><button className="pd-btn pd-btn-primary" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

/* ── admit patient ──────────────────────────────────────────── */
function AdmitModal({ preset, onClose, onAdmitted }: { preset: { wardId: string; bed: string } | null; onClose: () => void; onAdmitted: (id: string) => void }) {
  const { wards, admissions, doctors, admitPatient } = usePharma();
  const suggestUhid = `UHID-${100400 + admissions.length + 1}`;
  const [wardId, setWardId] = useState(preset?.wardId ?? wards[0]?.id ?? "");
  const ward = wards.find((w) => w.id === wardId);
  const freeBeds = ward ? wardBedNos(ward).filter((b) => !occupiedBedsOf(admissions, ward.id).has(b)) : [];
  const [bed, setBed] = useState(preset?.bed ?? freeBeds[0] ?? "");
  const [f, setF] = useState({ name: "", patientId: suggestUhid, age: "", gender: "Male" as Admission["gender"], phone: "", doctor: doctors[0]?.name ?? "", diagnosis: "", payerType: "self" as PayerType, insurer: INSURERS[0], policyNo: "" });
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));
  const pickWard = (id: string) => { setWardId(id); const w = wards.find((x) => x.id === id); const fb = w ? wardBedNos(w).filter((b) => !occupiedBedsOf(admissions, w.id).has(b)) : []; setBed(fb[0] ?? ""); };
  const valid = f.name.trim() && f.patientId.trim() && ward && bed && (f.payerType === "self" || f.insurer);

  const save = async () => {
    if (!valid || !ward) return;
    const adm = await admitPatient({
      patientId: f.patientId.trim(), name: f.name.trim(), age: f.age ? Number(f.age) : undefined, gender: f.gender, phone: f.phone.trim(),
      wardId: ward.id, wardName: ward.name, bed, doctor: f.doctor, diagnosis: f.diagnosis,
      payerType: f.payerType, insurer: f.payerType === "insurance" ? f.insurer : undefined, policyNo: f.payerType === "insurance" ? f.policyNo : undefined,
    });
    if (!adm) return;
    onAdmitted(adm.id);
  };

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>Admit patient</h3><button className="pd-iconbtn" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-form-grid">
            <div className="pd-field pd-span2" data-field="name"><label>Patient name *</label><input className="pd-input" autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Full name" /></div>
            <div className="pd-field"><label>Patient ID / UHID *</label><input className="pd-input pd-mono" value={f.patientId} onChange={(e) => set({ patientId: e.target.value })} /></div>
            <div className="pd-field" data-field="phone"><label>Phone</label><input className="pd-input" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 …" /></div>
            <div className="pd-field"><label>Age</label><input className="pd-input" type="number" min={0} value={f.age} onChange={(e) => set({ age: e.target.value })} /></div>
            <div className="pd-field"><label>Gender</label><select className="pd-select" value={f.gender} onChange={(e) => set({ gender: e.target.value as Admission["gender"] })}><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div className="pd-field"><label>Ward *</label><select className="pd-select" value={wardId} onChange={(e) => pickWard(e.target.value)}>{wards.map((w) => <option key={w.id} value={w.id}>{w.name} ({wardBedNos(w).filter((b) => !occupiedBedsOf(admissions, w.id).has(b)).length} free)</option>)}</select></div>
            <div className="pd-field"><label>Bed *</label><select className="pd-select" value={bed} onChange={(e) => setBed(e.target.value)}>{!freeBeds.length && <option value="">No free beds</option>}{[...(preset && !freeBeds.includes(preset.bed) ? [preset.bed] : []), ...freeBeds].map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
            <div className="pd-field"><label>Attending doctor</label><select className="pd-select" value={f.doctor} onChange={(e) => set({ doctor: e.target.value })}><option value="">—</option>{doctors.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}</select></div>
            <div className="pd-field pd-span2"><label>Diagnosis / reason</label><input className="pd-input" value={f.diagnosis} onChange={(e) => set({ diagnosis: e.target.value })} placeholder="e.g. Acute appendicitis" /></div>
            <div className="pd-field pd-span2"><label>Payer</label>
              <div className="pd-flex pd-gap6">
                <button className={`pd-chip${f.payerType === "self" ? " on" : ""}`} onClick={() => set({ payerType: "self" })}><IconCash size={14} /> Self-pay</button>
                <button className={`pd-chip${f.payerType === "insurance" ? " on" : ""}`} onClick={() => set({ payerType: "insurance" })}><IconShield size={14} /> Insurance / TPA</button>
              </div>
            </div>
            {f.payerType === "insurance" && <>
              <div className="pd-field"><label>Insurer / TPA</label><select className="pd-select" value={f.insurer} onChange={(e) => set({ insurer: e.target.value })}>{INSURERS.map((i) => <option key={i}>{i}</option>)}</select></div>
              <div className="pd-field"><label>Policy / claim no.</label><input className="pd-input pd-mono" value={f.policyNo} onChange={(e) => set({ policyNo: e.target.value })} placeholder="Policy no." /></div>
            </>}
          </div>
        </div>
        <div className="pd-modal-foot"><div className="pd-spacer" /><button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button><button className="pd-btn pd-btn-primary" disabled={!valid} onClick={save}><IconCheck size={15} /> Admit to {bed || "bed"}</button></div>
      </div>
    </div>
  );
}

/* ── admission detail · bills · settle & discharge ──────────── */
const SETTLE_MODES: PayMode[] = ["cash", "upi", "card", "insurance"];
function AdmissionModal({ adm, onClose }: { adm: Admission; onClose: () => void }) {
  const { sales, now, settleBills, dischargePatient, startWardBilling } = usePharma();
  const bills = useMemo(() => sales.filter((s) => s.patientId === adm.patientId && s.status !== "cancelled").sort((a, b) => b.createdAt - a.createdAt), [sales, adm.patientId]);
  const total = bills.reduce((a, s) => a + billTotal(s), 0);
  const unpaid = bills.filter((s) => s.paid === false);
  const outstanding = unpaid.reduce((a, s) => a + billTotal(s), 0);
  const [mode, setMode] = useState<PayMode>(adm.payerType === "insurance" ? "insurance" : "cash");

  const settleDischarge = () => { if (unpaid.length) settleBills(unpaid.map((s) => s.id), mode); dischargePatient(adm.id); onClose(); };
  const dischargeOnly = () => { dischargePatient(adm.id); onClose(); };

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head">
          <div>
            <h3>{adm.name} <span className="pd-muted" style={{ fontWeight: 600, fontSize: 13 }}>· {adm.bed}</span></h3>
            <small className="pd-muted">{adm.patientId} · {adm.wardName} · admitted {daysIn(adm.admittedAt, now)}d ago ({fmtDateTime(adm.admittedAt)})</small>
          </div>
          <button className="pd-iconbtn" onClick={onClose}><IconX size={18} /></button>
        </div>
        <div className="pd-modal-body">
          {/* patient facts */}
          <div className="pd-doc-meta" style={{ marginTop: 0 }}>
            <div><span>Attending</span><b>{adm.doctor || "—"}</b></div>
            <div><span>Diagnosis</span><b>{adm.diagnosis || "—"}</b></div>
            <div><span>Payer</span><b>{adm.payerType === "insurance" ? (adm.insurer ?? "Insurance") : "Self-pay"}</b></div>
            <div><span>{adm.payerType === "insurance" ? "Policy no." : "Phone"}</span><b className="pd-mono">{adm.payerType === "insurance" ? (adm.policyNo || "—") : (adm.phone || "—")}</b></div>
          </div>

          <div className="pd-summary-chips" style={{ margin: "16px 0" }}>
            <div className="pd-schip">Bills<b>{bills.length}</b></div>
            <div className="pd-schip">Total<b>{inr(total)}</b></div>
            <div className="pd-schip">Settled<b>{inr(total - outstanding)}</b></div>
            <div className="pd-schip">Outstanding<b>{inr(outstanding)}</b></div>
          </div>

          <div className="pd-flex" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <b>Medicine bills</b>
            <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={() => { startWardBilling(adm); onClose(); }}><IconPos size={14} /> Bill medicines</button>
          </div>
          <div className="pd-tbl-wrap">
            <table className="pd-tbl">
              <thead><tr><th>Invoice</th><th>Date</th><th>Items</th><th>Payment</th><th>Status</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {bills.map((s) => (
                  <tr key={s.id}>
                    <td className="pd-mono" style={{ fontWeight: 700 }}>{s.id}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(s.createdAt)}</td>
                    <td>{s.items.length}<div className="pd-muted" style={{ fontSize: 11 }}>{s.items.map((i) => i.name).join(", ").slice(0, 36)}</div></td>
                    <td>{PAY_LABEL[s.payMode]}</td>
                    <td><span className={`pd-pill ${s.paid === false ? "pill-rose" : "pill-green"}`}>{s.paid === false ? "Unpaid" : "Paid"}</span></td>
                    <td className="num" style={{ fontWeight: 800 }}>{inr(billTotal(s))}</td>
                  </tr>
                ))}
                {bills.length === 0 && <tr><td colSpan={6}><div className="pd-empty" style={{ padding: "18px" }}>No bills yet — use “Bill medicines”.</div></td></tr>}
              </tbody>
            </table>
          </div>

          {/* final settlement */}
          <div className="pd-card pd-card-pad" style={{ marginTop: 16, background: "var(--wash2)" }}>
            <div className="pd-flex" style={{ justifyContent: "space-between", marginBottom: outstanding > 0 ? 10 : 0 }}>
              <b>Final bill & discharge</b>
              <span style={{ fontFamily: "Manrope", fontWeight: 800, color: outstanding > 0 ? "var(--rose)" : "var(--mid)" }}>{inr(outstanding)} due</span>
            </div>
            {outstanding > 0 ? (
              <>
                <div className="pd-flex pd-gap6" style={{ marginBottom: 12, flexWrap: "wrap" }}>
                  {SETTLE_MODES.map((m) => <button key={m} className={`pd-chip${mode === m ? " on" : ""}`} onClick={() => setMode(m)}>{PAY_LABEL[m]}</button>)}
                </div>
                <button className="pd-btn pd-btn-primary pd-btn-lg pd-btn-block" onClick={settleDischarge}><IconRupee size={16} /> Settle {inr(outstanding)} ({PAY_LABEL[mode]}) & discharge</button>
              </>
            ) : (
              <button className="pd-btn pd-btn-primary pd-btn-lg pd-btn-block" onClick={dischargeOnly}><IconCheck size={16} /> Discharge patient · free bed {adm.bed}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
