"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import { Department } from "../lib/hospital";
import { IconPlus, IconEdit, IconTrash, IconX } from "../components/Icon";

const TYPES: Department["type"][] = ["OPD", "IPD", "Diagnostic", "Support"];
const TYPE_TONE: Record<string, string> = { OPD: "pill-blue", IPD: "pill-gold", Diagnostic: "pill-teal", Support: "pill-gray" };
const blank = { name: "", head: "", type: "OPD" as Department["type"] };

export default function DepartmentsScreen() {
  const { departments, doctors, addDepartment, updateDepartment, removeDepartment } = usePharma();
  const [form, setForm] = useState<typeof blank | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const inDept = (name: string) => doctors.filter((d) => d.department === name);

  const save = async () => {
    if (!form?.name.trim()) return;
    const body = { name: form.name.trim(), head: form.head.trim(), type: form.type };
    const fault = editing ? await updateDepartment(editing, body) : await addDepartment(body);
    if (fault) return;
    setForm(null);
    setEditing(null);
  };

  return (
    <div className="pd-canvas-wide">
      <div className="pd-flex" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <div className="pd-summary-chips">
          <div className="pd-schip">Departments<b>{departments.length}</b></div>
          <div className="pd-schip">Doctors<b>{doctors.length}</b></div>
        </div>
        <button className="pd-btn pd-btn-primary" onClick={() => { setEditing(null); setForm(blank); }}><IconPlus size={15} /> Add department</button>
      </div>

      {form && (
        <div className="pd-card pd-card-pad" style={{ marginBottom: 16 }}>
          <div className="pd-flex" style={{ justifyContent: "space-between" }}>
            <h3>{editing ? "Edit department" : "New department"}</h3>
            <button className="pd-btn pd-btn-ghost" onClick={() => { setForm(null); setEditing(null); }}><IconX size={15} /></button>
          </div>
          <div className="pd-grid-2" style={{ marginTop: 12 }}>
            <div className="pd-field" data-field="name"><label>Name</label><input className="pd-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="pd-field"><label>Head</label><input className="pd-input" value={form.head} onChange={(e) => setForm({ ...form, head: e.target.value })} /></div>
            <div className="pd-field"><label>Type</label>
              <select className="pd-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Department["type"] })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <button className="pd-btn pd-btn-primary" style={{ marginTop: 12 }} onClick={() => void save()}>Save</button>
        </div>
      )}

      {departments.length === 0 ? <div className="pd-empty"><p>No departments yet.</p></div> : <div className="pd-grid-cards">
        {departments.map((d) => {
          const linked = inDept(d.name);
          return (
            <div className="pd-card pd-card-pad" key={d.id}>
              <div className="pd-flex" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: 15.5 }}>{d.name}</h3>
                  <div className="pd-muted" style={{ fontSize: 12.5 }}>Head: {d.head || "—"}</div>
                </div>
                <span className={`pd-pill ${TYPE_TONE[d.type] ?? "pill-gray"}`}>{d.type}</span>
              </div>
              <ul className="pd-ob-itemlist">
                {linked.length === 0 ? <li><span className="pd-muted">No doctors in this department</span></li> : linked.map((doc) => (
                  <li key={doc.id}><span>{doc.name} · <em className="pd-muted" style={{ fontStyle: "normal" }}>{doc.specialty}</em></span><b>{doc.opdRoom ?? "—"}</b></li>
                ))}
              </ul>
              <div className="pd-flex pd-gap6" style={{ marginTop: 10 }}>
                <button className="pd-btn pd-btn-ghost" onClick={() => { setEditing(d.id); setForm({ name: d.name, head: d.head, type: d.type }); }}><IconEdit size={14} /> Edit</button>
                <button className="pd-btn pd-btn-ghost" onClick={() => removeDepartment(d.id)}><IconTrash size={14} /> Remove</button>
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}
