"use client";
import { useRef, useState } from "react";
import { usePharma } from "../pharmaState";
import {
  PHARMACY_BUSINESS_TYPES, REGISTRATION_TYPES, INDUSTRY_TYPES, INDIAN_STATES, PharmacyProfile, ProfileFile, setupGap,
} from "../data";
import {
  IconArrowRight, IconCheck, IconUpload, IconStore, IconReceipt, IconKiosk, IconRupee, IconInventory, IconUsers,
  IconBox, IconGlobe, IconChart, IconBulb, IconFolder, IconSparkle,
} from "./Icon";

const STEPS = [
  { t: "Welcome", s: "Let's set up your pharmacy" },
  { t: "Business profile", s: "Tell us about your pharmacy" },
  { t: "Location", s: "Where is your store?" },
  { t: "Tax & licences", s: "GST, PAN & drug licences" },
  { t: "Pharmacist", s: "Registered pharmacist on record" },
  { t: "Invoice & branding", s: "How your bills look" },
  { t: "Features", s: "Turn on what you need" },
  { t: "Catalogue", s: "Start your medicine list" },
  { t: "Review", s: "Confirm & finish" },
];

type Draft = PharmacyProfile & {
  invoicePrefix: string; terms: string; kioskEnabled: boolean; looseDefault: boolean;
};

export default function SetupWizard() {
  const { profile, invoiceSettings, kiosk, commitSetup, showFault, clearFault } = usePharma();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [d, setD] = useState<Draft>({
    ...profile,
    gstRegistered: true,
    phone: profile.phone,
    invoicePrefix: invoiceSettings.prefix, terms: invoiceSettings.terms,
    kioskEnabled: kiosk.enabled, looseDefault: true,
  });
  const set = (p: Partial<Draft>) => setD((s) => ({ ...s, ...p }));
  const logoRef = useRef<HTMLInputElement>(null);
  const signRef = useRef<HTMLInputElement>(null);
  const onFile = (e: React.ChangeEvent<HTMLInputElement>, key: "logo" | "signature") => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader(); r.onload = () => set({ [key]: r.result as string } as Partial<Draft>); r.readAsDataURL(file);
  };
  const toggleType = (t: string) => set({ businessTypes: d.businessTypes.includes(t) ? d.businessTypes.filter((x) => x !== t) : [...d.businessTypes, t] });
  const last = step === STEPS.length - 1;

  const blocked = (through: number) => {
    const issue = setupGap(d);
    if (!issue || issue.step > through) { clearFault(); return false; }
    setStep(issue.step);
    showFault(issue.message);
    return true;
  };

  const finish = async () => {
    if (savingRef.current) return;
    if (blocked(STEPS.length - 1)) return;
    savingRef.current = true;
    setSaving(true);
    const err = await commitSetup({
      profile: {
        name: d.name, tagline: d.tagline, logo: d.logo, email: d.email.trim(),
        address: d.address, city: d.city, state: d.state, pincode: d.pincode,
        gstRegistered: true, gstin: d.gstin, eInvoicing: d.eInvoicing, pan: d.pan,
        dlNo: d.dlNo, fssai: d.fssai, gstFile: d.gstFile, panFile: d.panFile, dlFile: d.dlFile, fssaiFile: d.fssaiFile,
        enableTDS: d.enableTDS, enableTCS: d.enableTCS,
        businessTypes: d.businessTypes, industryType: d.industryType, registrationType: d.registrationType,
        signature: d.signature, pharmacist: d.pharmacist, storeOpen: d.storeOpen,
      },
      invoice: { prefix: d.invoicePrefix, terms: d.terms },
      kioskEnabled: d.kioskEnabled,
      loose: d.looseDefault,
    });
    savingRef.current = false;
    setSaving(false);
    if (err?.field === "gstin") setStep(3);
  };

  return (
    <div className="pd-setup">
      <div className="pd-setup-card">
        <div className="pd-setup-head">
          <div className="top">
            <span className="pd-brand-tx" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--dark)", display: "grid", placeItems: "center", color: "#fff" }}>＋</span>
              <b style={{ fontFamily: "Manrope", fontSize: 15, color: "var(--dark)" }}>Namma MedMate · Store setup</b>
            </span>
            <span className="st">Step {step + 1} of {STEPS.length}</span>
          </div>
          <h2>{STEPS[step].t}</h2>
          <p>{STEPS[step].s}</p>
          <div className="pd-setup-steps">{STEPS.map((_, i) => <i key={i} className={i === step ? "on" : i < step ? "done" : ""} />)}</div>
        </div>

        <div className="pd-setup-body">
          {step === 0 && (
            <div className="pd-setup-hero">
              <div className="em"><IconStore size={28} /></div>
              <h2>Welcome to your pharmacy console</h2>
              <p>A quick setup gets your store ready for GST billing, inventory, online orders & more. It takes about 2 minutes — you can change everything later in Settings.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, maxWidth: 520, margin: "20px auto 0", textAlign: "left" }}>
                {[[<IconReceipt size={18} key="r" />, "GST billing & invoices"], [<IconBox size={18} key="b" />, "Inventory, batches & expiry"], [<IconGlobe size={18} key="g" />, "Online store & orders"], [<IconChart size={18} key="c" />, "Reports, GST & CA sharing"]].map(([e, t]) => (
                  <div className="pd-feat" key={t as string} style={{ marginBottom: 0 }}><span className="ico" style={{ fontSize: 18 }}>{e}</span><div className="gw"><div className="t">{t}</div></div></div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <>
              <div className="pd-flex" style={{ gap: 16, marginBottom: 16, alignItems: "flex-start" }}>
                <div>
                  <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e, "logo")} />
                  <button onClick={() => logoRef.current?.click()} style={{ width: 84, height: 84, borderRadius: 14, border: "1px dashed var(--line-2)", background: d.logo ? "#000" : "var(--wash2)", display: "grid", placeItems: "center", overflow: "hidden", padding: 0 }}>
                    {d.logo ? <img src={d.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <span style={{ color: "var(--muted)", fontSize: 11, textAlign: "center" }}><IconUpload size={18} /><br />Logo</span>}
                  </button>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="pd-field" data-field="name"><label>Pharmacy name *</label><input className="pd-input" autoFocus value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Sri Sai Medicals" /></div>
                  <div className="pd-field" style={{ marginTop: 10 }}><label>Tagline</label><input className="pd-input" value={d.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder="Your neighbourhood pharmacy" /></div>
                </div>
              </div>
              <div className="pd-field"><label>Business type (select all that apply)</label>
                <div className="pd-flex pd-gap6" style={{ marginTop: 6, flexWrap: "wrap" }}>
                  {PHARMACY_BUSINESS_TYPES.map((t) => <button key={t} className={`pd-chip${d.businessTypes.includes(t) ? " on" : ""}`} onClick={() => toggleType(t)}>{t}</button>)}
                </div>
              </div>
              <div className="pd-form-grid" style={{ marginTop: 14 }}>
                <div className="pd-field"><label>Registration type *</label><select className="pd-select" value={d.registrationType} onChange={(e) => set({ registrationType: e.target.value })}>{REGISTRATION_TYPES.map((r) => <option key={r}>{r}</option>)}</select></div>
                <div className="pd-field"><label>Industry *</label><select className="pd-select" value={d.industryType} onChange={(e) => set({ industryType: e.target.value })}>{INDUSTRY_TYPES.map((i) => <option key={i}>{i}</option>)}</select></div>
                <div className="pd-field" data-field="phone"><label>Phone *</label><input className="pd-input" value={d.phone} readOnly aria-readonly="true" style={{ background: "var(--wash2)" }} /><span className="pd-muted" style={{ fontSize: 12 }}>Login uses this number, so it cannot be changed.</span></div>
                <div className="pd-field" data-field="email"><label>Email *</label><input className="pd-input" value={d.email} onChange={(e) => set({ email: e.target.value })} placeholder="store@email.com" /></div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="pd-form-grid">
              <div className="pd-field pd-span2"><label>Billing address *</label><textarea className="pd-textarea" value={d.address} onChange={(e) => set({ address: e.target.value })} /></div>
              <div className="pd-field"><label>City *</label><input className="pd-input" value={d.city} onChange={(e) => set({ city: e.target.value })} /></div>
              <div className="pd-field"><label>Pincode *</label><input className="pd-input" value={d.pincode} onChange={(e) => set({ pincode: e.target.value })} /></div>
              <div className="pd-field pd-span2"><label>State *</label><select className="pd-select" value={d.state} onChange={(e) => set({ state: e.target.value })}><option value="">Select state</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
            </div>
          )}

          {step === 3 && (
            <>
              <div className="pd-form-grid">
                <LicenceField label="GSTIN" value={d.gstin} file={d.gstFile} onValue={(gstin) => set({ gstin, gstRegistered: true })} onFile={(gstFile) => set({ gstFile })} />
                <LicenceField label="PAN number" value={d.pan} file={d.panFile} onValue={(pan) => set({ pan })} onFile={(panFile) => set({ panFile })} />
                <LicenceField label="Drug Licence No. (D.L.)" value={d.dlNo} file={d.dlFile} onValue={(dlNo) => set({ dlNo })} onFile={(dlFile) => set({ dlFile })} />
                <LicenceField label="FSSAI Licence No." value={d.fssai} file={d.fssaiFile} onValue={(fssai) => set({ fssai })} onFile={(fssaiFile) => set({ fssaiFile })} />
              </div>
              <FeatRow ico={<IconRupee size={18} />} t="Enable TDS" s="Deduct TDS on applicable purchases" on={d.enableTDS} onClick={() => set({ enableTDS: !d.enableTDS })} />
              <FeatRow ico={<IconRupee size={18} />} t="Enable TCS" s="Collect TCS on applicable sales" on={d.enableTCS} onClick={() => set({ enableTCS: !d.enableTCS })} />
            </>
          )}

          {step === 4 && (
            <div className="pd-form-grid">
              <div className="pd-field pd-span2"><label>Registered pharmacist *</label><input className="pd-input" value={d.pharmacist} onChange={(e) => set({ pharmacist: e.target.value })} placeholder="Name, B.Pharm (Reg. No.)" /></div>
              <p className="pd-muted pd-span2" style={{ fontSize: 12.5 }}><IconBulb size={14} /> You can add cashiers, managers & more pharmacists later under <b>Manage Users</b> — each with their own role, PIN & permissions.</p>
            </div>
          )}

          {step === 5 && (
            <div className="pd-form-grid">
              <div className="pd-field"><label>Invoice number prefix *</label><input className="pd-input pd-mono" value={d.invoicePrefix} onChange={(e) => set({ invoicePrefix: e.target.value })} /></div>
              <div className="pd-field"><label>Signature / stamp *</label>
                <input ref={signRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e, "signature")} />
                {d.signature
                  ? <div className="pd-flex pd-gap6"><img src={d.signature} alt="" style={{ height: 40, border: "1px solid var(--line)", borderRadius: 8, padding: 2 }} /><button className="pd-btn pd-btn-sm pd-btn-ghost" onClick={() => signRef.current?.click()}>Replace</button></div>
                  : <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => signRef.current?.click()}><IconUpload size={14} /> Upload</button>}
              </div>
              <div className="pd-field pd-span2"><label>Terms &amp; conditions (shown on invoices)</label><textarea className="pd-textarea" value={d.terms} onChange={(e) => set({ terms: e.target.value })} /></div>
            </div>
          )}

          {step === 6 && (
            <>
              <FeatRow ico={<IconStore size={18} />} t="Accept online orders" s="List your store on the Namma MedMate customer app" on={d.storeOpen} onClick={() => set({ storeOpen: !d.storeOpen })} />
              <FeatRow ico={<IconKiosk size={18} />} t="Self-order kiosk" s="In-store screen for customers to order themselves" on={d.kioskEnabled} onClick={() => set({ kioskEnabled: !d.kioskEnabled })} />
              <FeatRow ico={<IconReceipt size={18} />} t="e-Invoicing" s="Generate IRN/e-invoices for B2B sales" on={d.eInvoicing} onClick={() => set({ eInvoicing: !d.eInvoicing })} />
              <FeatRow ico={<IconInventory size={18} />} t="Loose / per-tablet selling" s="Allow selling individual tablets by default (per-strip eligible items)" on={d.looseDefault} onClick={() => set({ looseDefault: !d.looseDefault })} />
              <div className="pd-feat" style={{ opacity: .85 }}><span className="ico"><IconUsers size={18} /></span><div className="gw"><div className="t">Low-stock & expiry alerts</div><div className="s">Always on — dashboard flags items to reorder or that are expiring</div></div><span className="pd-pill pill-green"><i className="d" />On</span></div>
            </>
          )}

          {step === 7 && (
            <div className="pd-setup-hero">
              <div className="em"><IconFolder size={28} /></div>
              <h2>Your catalogue starts empty</h2>
              <p>Add medicines under Inventory, or enter a distributor bill under Purchases and stock is created from that bill. Nothing is preloaded.</p>
            </div>
          )}

          {step === 8 && (
            <>
              <div className="pd-flex" style={{ gap: 12, marginBottom: 16 }}>
                <span style={{ width: 52, height: 52, borderRadius: 13, background: d.logo ? "#000" : "var(--wash)", display: "grid", placeItems: "center", overflow: "hidden", fontSize: 24 }}>{d.logo ? <img src={d.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <IconStore size={24} />}</span>
                <div><div style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 18 }}>{d.name || "Your pharmacy"}</div><div className="pd-muted" style={{ fontSize: 12.5 }}>{d.businessTypes.join(", ") || "Retail Pharmacy"} · {d.city}, {d.state}</div></div>
              </div>
              <div className="pd-setup-review">
                <div className="r"><span className="k">GSTIN</span><span className="v">{d.gstin}{d.gstFile ? " · attached" : ""}</span></div>
                <div className="r"><span className="k">PAN</span><span className="v">{d.pan}{d.panFile ? " · attached" : ""}</span></div>
                <div className="r"><span className="k">Drug Licence</span><span className="v">{d.dlNo}{d.dlFile ? " · attached" : ""}</span></div>
                <div className="r"><span className="k">FSSAI</span><span className="v">{d.fssai}{d.fssaiFile ? " · attached" : ""}</span></div>
                <div className="r"><span className="k">Invoice prefix</span><span className="v">{d.invoicePrefix}</span></div>
                <div className="r"><span className="k">Pharmacist</span><span className="v">{d.pharmacist.split(",")[0] || "—"}</span></div>
                <div className="r"><span className="k">Signature</span><span className="v">{d.signature ? "Attached" : "—"}</span></div>
                <div className="r"><span className="k">Online orders</span><span className="v">{d.storeOpen ? "On" : "Off"}</span></div>
                <div className="r"><span className="k">Kiosk</span><span className="v">{d.kioskEnabled ? "On" : "Off"}</span></div>
                <div className="r"><span className="k">Loose selling</span><span className="v">{d.looseDefault ? "On" : "Off"}</span></div>
                <div className="r"><span className="k">Catalogue</span><span className="v">Empty — you add stock</span></div>
              </div>
              <div className="pd-card pd-card-pad" style={{ background: "var(--wash2)", marginTop: 16, textAlign: "center" }}>
                <span style={{ fontSize: 13 }}><IconSparkle size={13} /> You’re all set! Click <b>Finish setup</b> to open your dashboard.</span>
              </div>
            </>
          )}
        </div>

        <div className="pd-setup-foot">
          <button className="pd-btn pd-btn-ghost" disabled={step === 0 || saving} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
          <div className="pd-flex pd-gap6">
            {last
              ? <button className="pd-btn pd-btn-primary pd-btn-lg" disabled={saving} onClick={finish}><IconCheck size={16} /> Finish setup</button>
              : <button className="pd-btn pd-btn-primary" onClick={() => { if (!blocked(step)) setStep((s) => s + 1); }}>{step === 0 ? "Get started" : "Continue"} <IconArrowRight size={15} /></button>}
          </div>
        </div>
      </div>
      <p className="pd-copyright" style={{ marginTop: 14 }}>© 2026 Medmate India Technology Private Limited</p>
    </div>
  );
}

function LicenceField({ label, value, file, onValue, onFile }: { label: string; value: string; file?: ProfileFile; onValue: (v: string) => void; onFile: (f: ProfileFile) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]; if (!picked) return;
    const r = new FileReader();
    r.onload = () => onFile({ name: picked.name, dataUrl: String(r.result || "") });
    r.readAsDataURL(picked);
    e.target.value = "";
  };
  return (
    <>
      <div className="pd-field" data-field={label === "GSTIN" ? "gstin" : undefined}><label>{label} *</label><input className="pd-input pd-mono" value={value} onChange={(e) => onValue(e.target.value.toUpperCase())} /></div>
      <div className="pd-field"><label>{label} document *</label>
        <input ref={ref} type="file" accept="image/*,.pdf,application/pdf" hidden onChange={pick} />
        {file?.dataUrl
          ? <div className="pd-flex pd-gap6" style={{ alignItems: "center" }}><span style={{ fontSize: 12.5, fontWeight: 700 }}>{file.name}</span><button type="button" className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => ref.current?.click()}>Replace</button></div>
          : <button type="button" className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => ref.current?.click()}><IconUpload size={14} /> Attach</button>}
      </div>
    </>
  );
}

function FeatRow({ ico, t, s, on, onClick }: { ico: React.ReactNode; t: string; s: string; on: boolean; onClick: () => void }) {
  return (
    <div className="pd-feat">
      <span className="ico">{ico}</span>
      <div className="gw"><div className="t">{t}</div><div className="s">{s}</div></div>
      <button className={`pd-switch${on ? " on" : ""}`} onClick={onClick} />
    </div>
  );
}
