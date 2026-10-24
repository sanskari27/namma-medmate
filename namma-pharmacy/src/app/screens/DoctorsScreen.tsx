"use client";
import { useState, useRef, useMemo } from "react";
import { usePharma } from "../pharmaState";
import { inr } from "../data";
import {
  DoctorProfile, blankDoctor, DOCTOR_SPECIALTIES, DOCTOR_STATUS_META, DoctorStatus,
} from "../lib/hospital";
import { IconSearch, IconPlus, IconX, IconUpload, IconMail, IconTrash, IconPhone } from "../components/Icon";

const TONE: Record<string, string> = { green: "pill-green", rose: "pill-rose", blue: "pill-blue" };

export default function DoctorsScreen() {
  const { doctors, departments, addDoctor, updateDoctor, removeDoctor } = usePharma();
  const [q, setQ] = useState("");
  const [dep, setDep] = useState("all");
  const [status, setStatus] = useState<"all" | DoctorStatus>("all");
  const [editing, setEditing] = useState<DoctorProfile | "new" | null>(null);

  const rows = useMemo(() => doctors
    .filter((d) => dep === "all" || d.department === dep)
    .filter((d) => status === "all" || d.status === status)
    .filter((d) => !q.trim() || `${d.name} ${d.specialty} ${d.department} ${d.regNo} ${d.qualification}`.toLowerCase().includes(q.toLowerCase())),
    [doctors, dep, status, q]);

  return (
    <div className="pd-canvas-wide">
      <div className="pd-summary-chips" style={{ marginBottom: 16 }}>
        <div className="pd-schip">Doctors<b>{doctors.length}</b></div>
        <div className="pd-schip">Available<b>{doctors.filter((d) => d.status === "active").length}</b></div>
        <div className="pd-schip">On leave<b>{doctors.filter((d) => d.status === "on-leave").length}</b></div>
        <div className="pd-schip">Departments<b>{new Set(doctors.map((d) => d.department)).size}</b></div>
      </div>

      <div className="pd-toolbar">
        <select className="pd-select" value={dep} onChange={(e) => setDep(e.target.value)}>
          <option value="all">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <select className="pd-select" value={status} onChange={(e) => setStatus(e.target.value as "all" | DoctorStatus)}>
          <option value="all">All status</option>
          <option value="active">Available</option>
          <option value="on-leave">On leave</option>
          <option value="visiting">Visiting</option>
        </select>
        <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Name, specialty, reg no…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="pd-spacer" />
        <button className="pd-btn pd-btn-primary" onClick={() => setEditing("new")}><IconPlus size={16} /> Add Doctor</button>
      </div>

      <div className="pd-grid-cards" style={{ marginTop: 16 }}>
        {rows.map((d) => {
          const sm = DOCTOR_STATUS_META[d.status];
          return (
            <div className="pd-card pd-card-pad pd-doc" key={d.id}>
              <div className="pd-flex" style={{ alignItems: "flex-start", gap: 13 }}>
                <span className="pd-doc-ava">{d.photo ? <img src={d.photo} alt={d.name} /> : d.emoji}</span>
                <div className="pd-grow">
                  <div className="pd-flex" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h3 style={{ fontSize: 16 }}>{d.name}</h3>
                    <span className={`pd-pill ${TONE[sm.tone]}`}>{sm.label}</span>
                  </div>
                  <div className="pd-muted" style={{ fontSize: 12.5, marginTop: 2 }}>{d.qualification}</div>
                  <span className="pd-pill pill-blue" style={{ marginTop: 6 }}>{d.specialty}</span>
                </div>
              </div>
              <div className="pd-doc-meta">
                <div><span>Department</span><b>{d.department || "—"}</b></div>
                <div><span>Reg. no.</span><b className="pd-mono">{d.regNo || "—"}</b></div>
                <div><span>Experience</span><b>{d.experience} yrs</b></div>
                <div><span>OPD room</span><b>{d.opdRoom || "—"}</b></div>
                <div><span>Consults</span><b>{d.days} · {d.timing}</b></div>
                <div><span>Fee</span><b>{inr(d.fee)}</b></div>
                <div><span>Languages</span><b>{d.languages}</b></div>
              </div>
              {d.bio && <p className="pd-muted" style={{ fontSize: 12.5, marginTop: 8, fontStyle: "italic" }}>{d.bio}</p>}
              <div className="pd-flex pd-gap6" style={{ marginTop: 12, flexWrap: "wrap" }}>
                {d.phone && <a className="pd-btn pd-btn-ghost pd-btn-sm" href={`tel:${d.phone}`}><IconPhone size={14} /> {d.phone}</a>}
                {d.email && <a className="pd-btn pd-btn-ghost pd-btn-sm" href={`mailto:${d.email}`}><IconMail size={13} /> Email</a>}
                <div className="pd-spacer" />
                <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => setEditing(d)}>Edit</button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <div className="pd-empty">No doctors match. Add one with “Add Doctor”.</div>}
      </div>

      {editing && <DoctorModal initial={editing === "new" ? null : editing} departments={departments.map((d) => d.name)}
        onClose={() => setEditing(null)}
        onSave={(d) => { editing === "new" ? addDoctor(d) : updateDoctor((editing as DoctorProfile).id, d); setEditing(null); }}
        onDelete={editing !== "new" ? () => { removeDoctor((editing as DoctorProfile).id); setEditing(null); } : undefined} />}
    </div>
  );
}

function DoctorModal({ initial, departments, onClose, onSave, onDelete }: {
  initial: DoctorProfile | null; departments: string[];
  onClose: () => void; onSave: (d: Omit<DoctorProfile, "id">) => void; onDelete?: () => void;
}) {
  const [d, setD] = useState<Omit<DoctorProfile, "id">>(initial ?? { ...blankDoctor(), department: departments[0] ?? "" });
  const set = (p: Partial<DoctorProfile>) => setD((s) => ({ ...s, ...p }));
  const fileRef = useRef<HTMLInputElement>(null);
  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => set({ photo: r.result as string }); r.readAsDataURL(f);
  };
  const valid = d.name.trim().length > 0;

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head">
          <h3>{initial ? "Edit doctor" : "Add doctor"}</h3>
          <button className="pd-iconbtn" onClick={onClose}><IconX size={18} /></button>
        </div>
        <div className="pd-modal-body">
          {/* photo */}
          <div className="pd-flex" style={{ gap: 16, marginBottom: 16, alignItems: "center" }}>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
            <button className="pd-doc-ava lg" onClick={() => fileRef.current?.click()} title="Upload photo">
              {d.photo ? <img src={d.photo} alt="" /> : <span style={{ fontSize: 30 }}>{d.emoji}</span>}
            </button>
            <div>
              <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => fileRef.current?.click()}><IconUpload size={13} /> {d.photo ? "Change photo" : "Upload photo"}</button>
              {d.photo && <button className="pd-btn pd-btn-ghost pd-btn-sm" style={{ color: "var(--rose)", marginLeft: 6 }} onClick={() => set({ photo: undefined })}>Remove</button>}
              <p className="pd-muted" style={{ fontSize: 11.5, marginTop: 6 }}>Square photo works best · JPG/PNG</p>
            </div>
          </div>

          <div className="pd-form-grid">
            <div className="pd-field pd-span2"><label>Full name *</label><input className="pd-input" autoFocus value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Dr. …" /></div>
            <div className="pd-field"><label>Qualification</label><input className="pd-input" value={d.qualification} onChange={(e) => set({ qualification: e.target.value })} placeholder="MBBS, MD…" /></div>
            <div className="pd-field"><label>Specialty</label><select className="pd-select" value={d.specialty} onChange={(e) => set({ specialty: e.target.value })}>{DOCTOR_SPECIALTIES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div className="pd-field"><label>Department</label><select className="pd-select" value={d.department} onChange={(e) => set({ department: e.target.value })}><option value="">— Select —</option>{departments.map((x) => <option key={x}>{x}</option>)}</select></div>
            <div className="pd-field"><label>Medical Reg. No.</label><input className="pd-input pd-mono" value={d.regNo} onChange={(e) => set({ regNo: e.target.value })} placeholder="e.g. KMC-12345" /></div>
            <div className="pd-field"><label>Gender</label><select className="pd-select" value={d.gender} onChange={(e) => set({ gender: e.target.value as DoctorProfile["gender"], emoji: e.target.value === "Female" ? "👩‍⚕️" : "👨‍⚕️" })}><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div className="pd-field"><label>Experience (years)</label><input className="pd-input" type="number" min={0} value={d.experience || ""} onChange={(e) => set({ experience: Number(e.target.value) || 0 })} /></div>
            <div className="pd-field"><label>Phone</label><input className="pd-input" value={d.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 …" /></div>
            <div className="pd-field"><label>Email</label><input className="pd-input" value={d.email} onChange={(e) => set({ email: e.target.value })} placeholder="doctor@hospital.in" /></div>
            <div className="pd-field"><label>OPD room</label><input className="pd-input" value={d.opdRoom} onChange={(e) => set({ opdRoom: e.target.value })} placeholder="OPD-1" /></div>
            <div className="pd-field"><label>Consulting days</label><input className="pd-input" value={d.days} onChange={(e) => set({ days: e.target.value })} placeholder="Mon–Sat" /></div>
            <div className="pd-field"><label>Consulting hours</label><input className="pd-input" value={d.timing} onChange={(e) => set({ timing: e.target.value })} placeholder="10:00 AM – 1:00 PM" /></div>
            <div className="pd-field"><label>Consultation fee (₹)</label><input className="pd-input" type="number" min={0} value={d.fee || ""} onChange={(e) => set({ fee: Number(e.target.value) || 0 })} /></div>
            <div className="pd-field"><label>Status</label><select className="pd-select" value={d.status} onChange={(e) => set({ status: e.target.value as DoctorStatus })}><option value="active">Available</option><option value="on-leave">On leave</option><option value="visiting">Visiting</option></select></div>
            <div className="pd-field pd-span2"><label>Languages</label><input className="pd-input" value={d.languages} onChange={(e) => set({ languages: e.target.value })} placeholder="English, Hindi, Kannada" /></div>
            <div className="pd-field pd-span2"><label>About / notes</label><textarea className="pd-textarea" value={d.bio} onChange={(e) => set({ bio: e.target.value })} placeholder="Areas of expertise, achievements…" /></div>
          </div>
        </div>
        <div className="pd-modal-foot">
          {onDelete && <button className="pd-btn pd-btn-ghost" style={{ color: "var(--rose)" }} onClick={onDelete}><IconTrash size={15} /> Remove</button>}
          <div className="pd-spacer" />
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-primary" disabled={!valid} onClick={() => onSave(d)}>{initial ? "Save changes" : "Add doctor"}</button>
        </div>
      </div>
    </div>
  );
}
