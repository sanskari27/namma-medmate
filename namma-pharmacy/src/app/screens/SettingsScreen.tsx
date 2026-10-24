"use client";
import { useState, useRef } from "react";
import { usePharma } from "../pharmaState";
import {
  PharmacyProfile, BizDetail, INDIAN_STATES,
  PHARMACY_BUSINESS_TYPES, REGISTRATION_TYPES, INDUSTRY_TYPES,
} from "../data";
import { IconCheck, IconPlus, IconTrash, IconUpload, IconX, IconDot, IconSettings } from "../components/Icon";

export default function SettingsScreen() {
  const { profile, updateProfile, invoiceSettings, updateInvoiceSettings, toggleStoreOpen, resetDemo, startSetup, suppliers, go, toast } = usePharma();
  const [f, setF] = useState<PharmacyProfile>(profile);
  const [terms, setTerms] = useState(invoiceSettings.terms);
  const [nd, setNd] = useState<BizDetail>({ label: "", value: "" });
  const logoRef = useRef<HTMLInputElement>(null);
  const signRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<PharmacyProfile>) => setF((p) => ({ ...p, ...patch }));

  const dirty = JSON.stringify(f) !== JSON.stringify(profile) || terms !== invoiceSettings.terms;
  const save = () => { updateProfile(f); updateInvoiceSettings({ terms }); toast("Business settings saved"); };
  const discard = () => { setF(profile); setTerms(invoiceSettings.terms); };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>, key: "logo" | "signature") => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader(); r.onload = () => set({ [key]: r.result as string } as Partial<PharmacyProfile>); r.readAsDataURL(file);
  };
  const toggleType = (t: string) => set({ businessTypes: f.businessTypes.includes(t) ? f.businessTypes.filter((x) => x !== t) : [...f.businessTypes, t] });
  const addDetail = () => { if (!nd.label.trim() || !nd.value.trim()) return; set({ extraDetails: [...f.extraDetails, nd] }); setNd({ label: "", value: "" }); };
  const removeDetail = (i: number) => set({ extraDetails: f.extraDetails.filter((_, idx) => idx !== i) });

  return (
    <div className="pd-canvas-wide">
      {/* header / save bar */}
      <div className="pd-toolbar" style={{ position: "sticky", top: -22, zIndex: 5, background: "var(--bg)", paddingTop: 4, paddingBottom: 8 }}>
        <div><h2 style={{ fontSize: 16 }}>Business Settings</h2><span className="pd-muted" style={{ fontSize: 12.5 }}>Edit your pharmacy details — shown on invoices & reports</span></div>
        <div className="pd-spacer" />
        <button className="pd-btn pd-btn-ghost" disabled={!dirty} onClick={discard}>Discard</button>
        <button className="pd-btn pd-btn-primary" disabled={!dirty} onClick={save}><IconCheck size={16} /> Save changes</button>
      </div>

      {/* store-open quick toggle */}
      <div className="pd-card pd-card-pad" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ color: profile.storeOpen ? "var(--green)" : "var(--rose)" }}><IconDot size={8} /></span>
        <div style={{ flex: 1 }}><h3 style={{ fontSize: 15 }}>Online store</h3><p className="pd-muted" style={{ fontSize: 12.5 }}>{profile.storeOpen ? "Accepting online orders." : "Paused — counter billing still works."}</p></div>
        <button className={`pd-switch${profile.storeOpen ? " on" : ""}`} style={{ transform: "scale(1.2)" }} onClick={toggleStoreOpen} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 16, alignItems: "start" }}>
        {/* ───── LEFT column ───── */}
        <div className="pd-card pd-card-pad">
          {/* logo + name */}
          <div className="pd-flex" style={{ gap: 16, marginBottom: 16, alignItems: "flex-start" }}>
            <div>
              <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e, "logo")} />
              <button onClick={() => logoRef.current?.click()} style={{ width: 92, height: 92, borderRadius: 14, border: "1px dashed var(--line-2)", background: f.logo ? "#000" : "var(--wash2)", display: "grid", placeItems: "center", overflow: "hidden", padding: 0 }}>
                {f.logo ? <img src={f.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : <span style={{ textAlign: "center", color: "var(--muted)", fontSize: 11 }}><IconUpload size={18} /><br />Logo</span>}
              </button>
              {f.logo && <button className="pd-btn pd-btn-sm pd-btn-ghost" style={{ marginTop: 6, width: 92 }} onClick={() => set({ logo: undefined })}>Remove</button>}
            </div>
            <div style={{ flex: 1 }}>
              <div className="pd-field"><label>Business Name *</label><input className="pd-input" value={f.name} onChange={(e) => set({ name: e.target.value })} /></div>
              <div className="pd-field" style={{ marginTop: 10 }}><label>Tagline</label><input className="pd-input" value={f.tagline} onChange={(e) => set({ tagline: e.target.value })} /></div>
            </div>
          </div>

          <div className="pd-form-grid">
            <div className="pd-field"><label>Company Phone Number</label><input className="pd-input" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
            <div className="pd-field"><label>Company E-Mail</label><input className="pd-input" value={f.email} onChange={(e) => set({ email: e.target.value })} /></div>
            <div className="pd-field pd-span2"><label>Billing Address</label><textarea className="pd-textarea" value={f.address} onChange={(e) => set({ address: e.target.value })} /></div>
            <div className="pd-field"><label>State</label>
              <select className="pd-select" value={f.state} onChange={(e) => set({ state: e.target.value })}>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
            <div className="pd-field"><label>Pincode</label><input className="pd-input" value={f.pincode} onChange={(e) => set({ pincode: e.target.value })} /></div>
            <div className="pd-field pd-span2"><label>City</label><input className="pd-input" value={f.city} onChange={(e) => set({ city: e.target.value })} /></div>
          </div>

          {/* GST */}
          <div className="pd-pl-head">Tax & registration</div>
          <div className="pd-field"><label>Are you GST Registered?</label>
            <div className="pd-flex pd-gap6" style={{ marginTop: 4 }}>
              <button className={`pd-chip${f.gstRegistered ? " on" : ""}`} onClick={() => set({ gstRegistered: true })}>Yes</button>
              <button className={`pd-chip${!f.gstRegistered ? " on" : ""}`} onClick={() => set({ gstRegistered: false })}>No</button>
            </div>
          </div>
          {f.gstRegistered && <div className="pd-field" style={{ marginTop: 10 }}><label>GSTIN *</label><input className="pd-input pd-mono" value={f.gstin} onChange={(e) => set({ gstin: e.target.value })} /></div>}

          <ToggleRow label="Enable e-Invoicing" badge="New" on={f.eInvoicing} onClick={() => set({ eInvoicing: !f.eInvoicing })} />

          <div className="pd-form-grid" style={{ marginTop: 12 }}>
            <div className="pd-field"><label>PAN Number</label><input className="pd-input pd-mono" value={f.pan} onChange={(e) => set({ pan: e.target.value })} /></div>
            <div className="pd-field"><label>Drug Licence No. (D.L.)</label><input className="pd-input pd-mono" value={f.dlNo} onChange={(e) => set({ dlNo: e.target.value })} /></div>
            <div className="pd-field pd-span2"><label>FSSAI Licence No.</label><input className="pd-input pd-mono" value={f.fssai} onChange={(e) => set({ fssai: e.target.value })} /></div>
          </div>

          <ToggleRow label="Enable TDS" on={f.enableTDS} onClick={() => set({ enableTDS: !f.enableTDS })} />
          <ToggleRow label="Enable TCS" on={f.enableTCS} onClick={() => set({ enableTCS: !f.enableTCS })} />

          <div className="pd-field" style={{ marginTop: 12 }}><label>Registered pharmacist (on invoice)</label><input className="pd-input" value={f.pharmacist} onChange={(e) => set({ pharmacist: e.target.value })} /></div>
        </div>

        {/* ───── RIGHT column ───── */}
        <div>
          <div className="pd-card pd-card-pad" style={{ marginBottom: 16 }}>
            <div className="pd-field"><label>Business Type (select multiple, if applicable)</label>
              <div className="pd-flex pd-gap6" style={{ marginTop: 6, flexWrap: "wrap" }}>
                {PHARMACY_BUSINESS_TYPES.map((t) => <button key={t} className={`pd-chip${f.businessTypes.includes(t) ? " on" : ""}`} onClick={() => toggleType(t)}>{t}</button>)}
              </div>
            </div>
            <div className="pd-form-grid" style={{ marginTop: 14 }}>
              <div className="pd-field"><label>Industry Type</label><select className="pd-select" value={f.industryType} onChange={(e) => set({ industryType: e.target.value })}>{INDUSTRY_TYPES.map((i) => <option key={i}>{i}</option>)}</select></div>
              <div className="pd-field"><label>Business Registration Type</label><select className="pd-select" value={f.registrationType} onChange={(e) => set({ registrationType: e.target.value })}>{REGISTRATION_TYPES.map((r) => <option key={r}>{r}</option>)}</select></div>
            </div>
          </div>

          {/* T&C + signature */}
          <div className="pd-card pd-card-pad" style={{ marginBottom: 16 }}>
            <div className="pd-card" style={{ background: "var(--wash2)", padding: "10px 12px", marginBottom: 14, border: "1px solid var(--line)" }}>
              <span style={{ fontSize: 12.5 }}><b>Note:</b> Terms &amp; Conditions and Signature below are shown on your invoices.</span>
            </div>
            <div className="pd-field"><label>Terms &amp; Conditions</label><textarea className="pd-textarea" value={terms} onChange={(e) => setTerms(e.target.value)} /></div>

            <div className="pd-field" style={{ marginTop: 14 }}><label>Signature</label>
              <input ref={signRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e, "signature")} />
              {f.signature ? (
                <div style={{ border: "1px dashed var(--line-2)", borderRadius: 12, padding: 12, display: "inline-block", marginTop: 4 }}>
                  <img src={f.signature} alt="signature" style={{ maxHeight: 90, maxWidth: 220, objectFit: "contain", display: "block" }} />
                  <button className="pd-btn pd-btn-sm" style={{ color: "var(--rose)", background: "none", padding: "4px 0" }} onClick={() => set({ signature: undefined })}>Remove</button>
                </div>
              ) : (
                <button className="pd-btn pd-btn-ghost" style={{ marginTop: 4 }} onClick={() => signRef.current?.click()}><IconUpload size={15} /> Upload signature / stamp</button>
              )}
            </div>
          </div>

          {/* additional business details */}
          <div className="pd-card pd-card-pad">
            <h3 style={{ fontSize: 14 }}>Add Business Details</h3>
            <p className="pd-muted" style={{ fontSize: 12.5, marginBottom: 12 }}>Additional info such as MSME number, Website, etc.</p>
            <div className="pd-flex pd-gap6" style={{ alignItems: "stretch" }}>
              <input className="pd-input" placeholder="Label (e.g. MSME)" value={nd.label} onChange={(e) => setNd({ ...nd, label: e.target.value })} />
              <span className="pd-flex" style={{ color: "var(--muted)" }}>=</span>
              <input className="pd-input" placeholder="Value" value={nd.value} onChange={(e) => setNd({ ...nd, value: e.target.value })} />
              <button className="pd-btn pd-btn-primary" onClick={addDetail}><IconPlus size={15} /> Add</button>
            </div>
            {f.extraDetails.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {f.extraDetails.map((d, i) => (
                  <div className="pd-flex" key={i} style={{ justifyContent: "space-between", padding: "9px 0", borderTop: "1px solid var(--line)" }}>
                    <div><div style={{ fontWeight: 700, fontSize: 13 }}>{d.label}</div><div className="pd-muted" style={{ fontSize: 12.5 }}>{d.value}</div></div>
                    <button className="pd-iconbtn" onClick={() => removeDetail(i)} title="Remove"><IconTrash size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* suppliers */}
      <div className="pd-card" style={{ marginTop: 16 }}>
        <div className="pd-card-head"><h3>Distributors</h3><button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => go("distributors")}>Manage distributors →</button></div>
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>Distributor</th><th>GSTIN</th><th>Phone</th></tr></thead>
            <tbody>{suppliers.map((s) => <tr key={s.id}><td style={{ fontWeight: 700 }}>{s.name}</td><td className="pd-mono">{s.gstin}</td><td>{s.phone}</td></tr>)}</tbody>
          </table>
        </div>
      </div>

      {/* re-run setup */}
      <div className="pd-card pd-card-pad" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 24 }}><IconSettings size={24} /></span>
        <div style={{ flex: 1 }}><h3 style={{ fontSize: 14 }}>Store setup wizard</h3><p className="pd-muted" style={{ fontSize: 12.5 }}>Re-run the guided setup to reconfigure your pharmacy, features and catalogue.</p></div>
        <button className="pd-btn pd-btn-ghost" onClick={startSetup}>Run setup</button>
      </div>

      {/* reset */}
      <div className="pd-card pd-card-pad" style={{ marginTop: 16, borderColor: "#f3d3d3", background: "var(--rose-bg)" }}>
        <div className="pd-flex" style={{ justifyContent: "space-between" }}>
          <div><h3 style={{ fontSize: 14, color: "var(--rose)" }}>Reset demo data</h3><p className="pd-muted" style={{ fontSize: 12.5 }}>Clears saved changes and restores seed inventory, orders & settings.</p></div>
          <button className="pd-btn pd-btn-rose" onClick={resetDemo}>Reset</button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, on, onClick, badge }: { label: string; on: boolean; onClick: () => void; badge?: string }) {
  return (
    <div className="pd-flex" style={{ justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid var(--line)" }}>
      <span className="pd-flex pd-gap6" style={{ fontSize: 13.5, fontWeight: 600 }}>{label}{badge && <span className="pd-pill pill-blue" style={{ fontSize: 9 }}>{badge}</span>}</span>
      <button className={`pd-switch${on ? " on" : ""}`} onClick={onClick} />
    </div>
  );
}
