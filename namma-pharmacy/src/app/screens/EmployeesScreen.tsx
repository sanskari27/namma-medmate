"use client";
import { useMemo, useRef, useState } from "react";
import { usePharma } from "../pharmaState";
import {
  inr, Employee, EMPLOYEE_POSITIONS, EMPLOYMENT_TYPES, EmploymentType, BLOOD_GROUPS,
  blankEmployee, employeeTenure, monthlyPayroll, maskAccount, isValidIfsc,
  DOC_LABELS, EmployeeDoc,
} from "../data";
import { IconPlus, IconSearch, IconPrint, IconUpload, IconIdCard, IconUser, IconX, IconUsers, IconCash, IconRupee, IconDoc, IconImage, IconTrash, IconBriefcase, IconArrowRight } from "../components/Icon";
import EmployeeIdCard from "../components/EmployeeIdCard";

const ymd = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmtDay = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
const csvCell = (c: unknown) => `"${String(c ?? "").replace(/"/g, '""')}"`;
const download = (blob: Blob, name: string) => { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 6000); };

export default function EmployeesScreen() {
  const { employees, addEmployee, updateEmployee, removeEmployee, now, profile } = usePharma();
  const [q, setQ] = useState("");
  const [pos, setPos] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [idCardOf, setIdCardOf] = useState<Employee | null>(null);

  const rows = useMemo(() => employees
    .filter((e) => pos === "all" || e.position === pos)
    .filter((e) => status === "all" || e.status === status)
    .filter((e) => !q.trim() || `${e.id} ${e.name} ${e.position} ${e.phone} ${e.department ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.id.localeCompare(b.id)), [employees, pos, status, q]);

  const active = employees.filter((e) => e.status === "active").length;
  const payroll = monthlyPayroll(employees);
  const avgSalary = active ? Math.round(payroll / active) : 0;
  const totalDocs = employees.reduce((a, e) => a + (e.documents?.length ?? 0), 0);
  const missingDocs = employees.filter((e) => (e.documents?.length ?? 0) === 0).length;
  // team composition by position
  const byPosition = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of employees) m.set(e.position, (m.get(e.position) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [employees]);
  const posMax = Math.max(1, ...byPosition.map(([, n]) => n));
  const byType = EMPLOYMENT_TYPES.map((t) => ({ t, n: employees.filter((e) => e.employment === t).length }));

  const exportCsv = () => {
    const head = ["Code", "Name", "Position", "Department", "Employment", "Status", "Phone", "Email", "DOB", "Joined", "Monthly salary", "PAN", "Aadhaar", "Bank", "Account name", "Account no", "IFSC", "UPI", "Emergency contact", "Address"];
    const lines = rows.map((e) => [e.id, e.name, e.position, e.department ?? "", e.employment, e.status, e.phone, e.email ?? "", e.dob ?? "", e.joinedOn, e.salary, e.pan ?? "", e.aadhaar ?? "", e.bankName ?? "", e.accountName ?? "", e.accountNumber ?? "", e.ifsc ?? "", e.upi ?? "", e.emergencyName ? `${e.emergencyName} ${e.emergencyPhone ?? ""}` : "", e.address ?? ""]);
    const csv = [head, ...lines].map((r) => r.map(csvCell).join(",")).join("\n");
    download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), `employees-${ymd(now)}.csv`);
  };

  return (
    <div className="pd-canvas-wide">
      <div className="pd-toolbar">
        <select className="pd-select" style={{ width: 170 }} value={pos} onChange={(e) => setPos(e.target.value)}>
          <option value="all">All positions</option>
          {EMPLOYEE_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="pd-select" style={{ width: 130 }} value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </select>
        <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Search name, code, phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="pd-spacer" />
        <button className="pd-btn pd-btn-ghost" disabled={!rows.length} onClick={exportCsv}><IconPrint size={15} /> Export</button>
        <button className="pd-btn pd-btn-primary" onClick={() => setEditing("new")}><IconPlus size={16} /> Add Employee</button>
      </div>

      <div className="pd-stats" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        <div className="pd-stat"><div className="ic ic-green"><IconUsers size={18} /></div><div className="lbl">Team size</div><div className="val">{employees.length}</div><div className="split">{active} active · {employees.length - active} inactive</div></div>
        <div className="pd-stat"><div className="ic ic-blue"><IconCash size={18} /></div><div className="lbl">Monthly payroll</div><div className="val">{inr(payroll)}</div><div className="split">{inr(payroll * 12)}/yr</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconRupee size={18} /></div><div className="lbl">Avg salary</div><div className="val">{inr(avgSalary)}</div><div className="split">per active staff</div></div>
        <div className="pd-stat"><div className="ic ic-green"><IconDoc size={18} /></div><div className="lbl">Documents on file</div><div className="val">{totalDocs}</div><div className="split">{missingDocs} staff with none</div></div>
        <div className="pd-stat"><div className="ic ic-blue"><IconBriefcase size={18} /></div><div className="lbl">Full-time</div><div className="val">{byType.find((x) => x.t === "Full-time")?.n ?? 0}</div><div className="split">{byType.find((x) => x.t === "Part-time")?.n ?? 0} PT · {byType.find((x) => x.t === "Contract")?.n ?? 0} contract</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconUser size={18} /></div><div className="lbl">Positions</div><div className="val">{byPosition.length}</div><div className="split">roles across team</div></div>
      </div>

      <div className="pd-card" style={{ marginBottom: 16 }}>
        <div className="pd-card-head"><h3>Team composition</h3><span className="sub">by role</span></div>
        <div className="pd-card-pad">
          <div className="pd-grid-2">
            {byPosition.map(([role, n]) => (
              <div key={role} style={{ marginBottom: 9 }}>
                <div className="pd-flex" style={{ justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}><span>{role}</span><b>{n}</b></div>
                <div className="pd-prog"><i style={{ width: `${(n / posMax) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>Code</th><th>Employee</th><th>Position</th><th>Phone</th><th>Joined</th><th className="num">Salary / mo</th><th>Docs</th><th>Status</th><th>ID card</th></tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} style={{ cursor: "pointer" }} onClick={() => setEditing(e)}>
                  <td className="pd-mono" style={{ fontWeight: 700 }}>{e.id}</td>
                  <td><div className="prod"><span className="em" style={{ overflow: "hidden" }}>{e.photo ? <img src={e.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : e.emoji}</span><span className="nm">{e.name}</span></div></td>
                  <td>{e.position}{e.department ? <span className="pd-muted" style={{ fontSize: 11.5 }}> · {e.department}</span> : null}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{e.phone}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDay(e.joinedOn)}<div className="pd-muted" style={{ fontSize: 11 }}>{employeeTenure(e.joinedOn, now)}</div></td>
                  <td className="num" style={{ fontWeight: 800 }}>{inr(e.salary)}</td>
                  <td>{e.documents?.length ? <span className="pd-pill pill-gray"><IconDoc size={11} /> {e.documents.length}</span> : <span className="pd-muted" title="No documents uploaded">—</span>}</td>
                  <td><span className={`pd-pill ${e.status === "active" ? "pill-green" : "pill-gray"}`}>{e.status === "active" ? "Active" : "Inactive"}</span></td>
                  <td><button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={(ev) => { ev.stopPropagation(); setIdCardOf(e); }}><IconIdCard size={14} /> ID card</button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={9}><div className="pd-empty"><div className="em"><IconUser size={28} /></div><p>No employees match this filter. Add your first team member.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EmployeeForm
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => { const err = editing === "new" ? await addEmployee(data) : await updateEmployee(editing.id, data); if (!err) setEditing(null); }}
          onDelete={editing !== "new" ? () => { removeEmployee(editing.id); setEditing(null); } : undefined}
          now={now}
          onIdCard={editing !== "new" ? () => { setIdCardOf(editing as Employee); setEditing(null); } : undefined}
        />
      )}

      {idCardOf && <EmployeeIdCard emp={idCardOf} profile={profile} onClose={() => setIdCardOf(null)} />}
    </div>
  );
}

function EmployeeForm({ initial, onClose, onSave, onDelete, now, onIdCard }: {
  initial: Employee | null; onClose: () => void; onSave: (e: Omit<Employee, "id">) => void; onDelete?: () => void; now: number; onIdCard?: () => void;
}) {
  const [f, setF] = useState<Omit<Employee, "id">>(() => initial ? { ...initial } : { ...blankEmployee(), joinedOn: ymd(now) });
  const set = (patch: Partial<Employee>) => setF((p) => ({ ...p, ...patch }));
  const ifscBad = !!f.ifsc && !isValidIfsc(f.ifsc);
  const valid = f.name.trim() && f.phone.trim() && f.position && f.salary >= 0 && !ifscBad;
  const photoRef = useRef<HTMLInputElement>(null);
  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const r = new FileReader(); r.onload = () => set({ photo: r.result as string }); r.readAsDataURL(file); };

  // ── documents (photo / PDF) ──
  const docRef = useRef<HTMLInputElement>(null);
  const [docLabel, setDocLabel] = useState(DOC_LABELS[0]);
  const addDoc = (doc: EmployeeDoc) => setF((p) => ({ ...p, documents: [...(p.documents ?? []), doc] }));
  const removeDoc = (id: string) => setF((p) => ({ ...p, documents: (p.documents ?? []).filter((d) => d.id !== id) }));
  const onDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const kind: "image" | "pdf" = /pdf$/i.test(file.name) || file.type === "application/pdf" ? "pdf" : "image";
      const r = new FileReader();
      r.onload = () => addDoc({ id: `DOC-${Date.now()}-${Math.round(Math.random() * 1e5)}`, label: docLabel, kind, fileName: file.name, dataUrl: r.result as string, at: Date.now() });
      r.readAsDataURL(file);
    });
    e.target.value = "";
  };
  const docs = f.documents ?? [];

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>{initial ? `Edit ${initial.name}` : "Add Employee"}{initial && <span className="pd-mono pd-muted" style={{ fontSize: 12, marginLeft: 8 }}>{initial.id}</span>}</h3><button className="pd-icon-btn" onClick={onClose}><IconX size={16} /></button></div>
        <div className="pd-modal-body" style={{ display: "grid", gap: 14, maxHeight: "70vh", overflowY: "auto" }}>
          <Section title="Personal" />
          {/* photo */}
          <div className="pd-flex" style={{ gap: 14, alignItems: "center" }}>
            <input ref={photoRef} type="file" accept="image/*" hidden onChange={onPhoto} />
            <button onClick={() => photoRef.current?.click()} title="Upload photo" style={{ width: 72, height: 86, borderRadius: 10, border: "1px dashed var(--line-2)", background: f.photo ? "#000" : "var(--wash2)", display: "grid", placeItems: "center", overflow: "hidden", padding: 0, cursor: "pointer", flexShrink: 0 }}>
              {f.photo ? <img src={f.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "var(--muted)", fontSize: 11, textAlign: "center" }}><IconUpload size={16} /><br />Photo</span>}
            </button>
            <div>
              <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => photoRef.current?.click()}><IconUpload size={13} /> {f.photo ? "Change photo" : "Upload photo"}</button>
              {f.photo && <button className="pd-btn pd-btn-ghost pd-btn-sm" style={{ color: "var(--rose)", marginLeft: 6 }} onClick={() => set({ photo: undefined })}>Remove</button>}
              <p className="pd-muted" style={{ fontSize: 11.5, marginTop: 6 }}>Used on the digital ID card · passport-style works best</p>
            </div>
          </div>
          <div className="pd-grid-2">
            <Field label="Full name *" field="name"><input className="pd-input" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Anjali Menon" /></Field>
            <Field label="Phone *" field="phone"><input className="pd-input" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 …" /></Field>
            <Field label="Email" field="email"><input className="pd-input" value={f.email ?? ""} onChange={(e) => set({ email: e.target.value })} placeholder="name@pharmacy.in" /></Field>
            <Field label="Date of birth"><input className="pd-input" type="date" value={f.dob ?? ""} onChange={(e) => set({ dob: e.target.value })} /></Field>
            <Field label="Blood group"><select className="pd-select" value={f.bloodGroup ?? ""} onChange={(e) => set({ bloodGroup: e.target.value })}><option value="">—</option>{BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}</select></Field>
          </div>
          <Field label="Address"><input className="pd-input" value={f.address ?? ""} onChange={(e) => set({ address: e.target.value })} placeholder="Residential address" /></Field>

          <Section title="Employment" />
          <div className="pd-grid-2">
            <Field label="Position *"><select className="pd-select" value={f.position} onChange={(e) => set({ position: e.target.value })}>{EMPLOYEE_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
            <Field label="Department"><input className="pd-input" value={f.department ?? ""} onChange={(e) => set({ department: e.target.value })} placeholder="e.g. Dispensing" /></Field>
            <Field label="Employment type"><select className="pd-select" value={f.employment} onChange={(e) => set({ employment: e.target.value as EmploymentType })}>{EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Status"><select className="pd-select" value={f.status} onChange={(e) => set({ status: e.target.value as "active" | "inactive" })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
            <Field label="Joining date"><input className="pd-input" type="date" value={f.joinedOn} onChange={(e) => set({ joinedOn: e.target.value })} /></Field>
            <Field label="Monthly salary ₹"><input className="pd-input" inputMode="numeric" value={f.salary || ""} onChange={(e) => set({ salary: Number(e.target.value) || 0 })} placeholder="0" /></Field>
          </div>

          <Section title="Statutory IDs" />
          <div className="pd-grid-2">
            <Field label="PAN"><input className="pd-input" value={f.pan ?? ""} onChange={(e) => set({ pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" /></Field>
            <Field label="Aadhaar"><input className="pd-input" value={f.aadhaar ?? ""} onChange={(e) => set({ aadhaar: e.target.value })} placeholder="XXXX XXXX XXXX" /></Field>
          </div>

          <Section title={`Documents${docs.length ? ` · ${docs.length}` : ""}`} />
          <input ref={docRef} type="file" accept="image/*,application/pdf,.pdf" multiple hidden onChange={onDocs} />
          <div className="pd-flex" style={{ gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="pd-field" style={{ flex: "1 1 200px" }}><label>Document type</label>
              <select className="pd-select" value={docLabel} onChange={(e) => setDocLabel(e.target.value)}>{DOC_LABELS.map((l) => <option key={l}>{l}</option>)}</select>
            </div>
            <button type="button" className="pd-btn pd-btn-ghost" onClick={() => docRef.current?.click()}><IconUpload size={14} /> Upload photo / PDF</button>
          </div>
          <p className="pd-muted" style={{ fontSize: 11.5, marginTop: -4 }}>Attach ID proofs & certificates — JPG/PNG or PDF. You can select multiple files.</p>
          {docs.length === 0 ? (
            <div className="pd-empty" style={{ padding: "18px 10px", border: "1px dashed var(--line-2)", borderRadius: "var(--r)" }}><div className="em"><IconDoc size={26} /></div><p>No documents yet — upload Aadhaar, PAN, licence, etc.</p></div>
          ) : (
            <div className="pd-card" style={{ overflow: "hidden" }}>
              {docs.map((d) => (
                <div className="pd-docrow" key={d.id}>
                  {d.kind === "image"
                    ? <span className="thumb"><img src={d.dataUrl} alt="" /></span>
                    : <span className="thumb pdf"><IconDoc size={18} /></span>}
                  <span className="gw"><div className="t">{d.label}</div><div className="s">{d.fileName} · {d.kind === "pdf" ? "PDF" : "Image"}</div></span>
                  <a className="pd-btn pd-btn-ghost pd-btn-sm" href={d.dataUrl} target="_blank" rel="noreferrer">View</a>
                  <a className="pd-iconbtn" href={d.dataUrl} download={d.fileName} title="Download"><span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><IconUpload size={14} /></span></a>
                  <button className="pd-iconbtn" title="Remove" onClick={() => removeDoc(d.id)}><IconTrash size={14} /></button>
                </div>
              ))}
            </div>
          )}

          <Section title="Salary bank account" />
          <div className="pd-grid-2">
            <Field label="Bank name"><input className="pd-input" value={f.bankName ?? ""} onChange={(e) => set({ bankName: e.target.value })} placeholder="e.g. HDFC Bank" /></Field>
            <Field label="Account holder name"><input className="pd-input" value={f.accountName ?? ""} onChange={(e) => set({ accountName: e.target.value })} placeholder="As per bank" /></Field>
            <Field label="Account number"><input className="pd-input" value={f.accountNumber ?? ""} onChange={(e) => set({ accountNumber: e.target.value })} placeholder="Account no." /></Field>
            <Field label="IFSC" field="ifsc"><input className="pd-input" style={ifscBad ? { borderColor: "var(--rose)" } : undefined} value={f.ifsc ?? ""} onChange={(e) => set({ ifsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234" />{ifscBad && <span className="pd-field-err">Invalid IFSC</span>}</Field>
            <Field label="UPI ID"><input className="pd-input" value={f.upi ?? ""} onChange={(e) => set({ upi: e.target.value })} placeholder="name@bank" /></Field>
          </div>

          <Section title="Emergency contact" />
          <div className="pd-grid-2">
            <Field label="Contact name"><input className="pd-input" value={f.emergencyName ?? ""} onChange={(e) => set({ emergencyName: e.target.value })} placeholder="Name" /></Field>
            <Field label="Contact phone"><input className="pd-input" value={f.emergencyPhone ?? ""} onChange={(e) => set({ emergencyPhone: e.target.value })} placeholder="+91 …" /></Field>
          </div>
          <Field label="Notes"><input className="pd-input" value={f.note ?? ""} onChange={(e) => set({ note: e.target.value })} placeholder="Anything else to record" /></Field>
        </div>
        <div className="pd-modal-foot">
          {onDelete && <button className="pd-btn pd-btn-ghost" style={{ color: "var(--rose)", marginRight: "auto" }} onClick={onDelete}>Delete</button>}
          {onIdCard && <button className="pd-btn pd-btn-ghost" onClick={onIdCard}><IconIdCard size={14} /> ID card</button>}
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-primary" disabled={!valid} onClick={() => onSave(f)}>{initial ? "Save changes" : "Add employee"}</button>
        </div>
      </div>
    </div>
  );
}

const Section = ({ title }: { title: string }) => (
  <div style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid var(--line)", paddingBottom: 6 }}>{title}</div>
);
const Field = ({ label, children, field }: { label: string; children: React.ReactNode; field?: string }) => (
  <div className="pd-field" data-field={field}><label>{label}</label>{children}</div>
);
