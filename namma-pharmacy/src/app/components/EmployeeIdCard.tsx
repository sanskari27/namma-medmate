"use client";
import { useRef, useState } from "react";
import { Employee, PharmacyProfile } from "../data";
import { IconPrint, IconPlus, IconUpload, IconX } from "./Icon";

const fmtDay = (s?: string) => { if (!s) return "—"; const d = new Date(s); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };

const ACCENTS = [
  { key: "Forest", from: "#1B3D29", to: "#2F7D52" },
  { key: "Teal", from: "#0f3a3f", to: "#1f7d8c" },
  { key: "Blue", from: "#16305e", to: "#2563EB" },
  { key: "Violet", from: "#3a2d6e", to: "#6d4fc4" },
  { key: "Slate", from: "#1f2937", to: "#475569" },
  { key: "Gold", from: "#6a4a10", to: "#c9922f" },
];

// Digital staff ID card — front + back, customisable (orientation / accent / logo).
// Self-contained styles (incl. @media print) so it works on desktop + phone.
export default function EmployeeIdCard({ emp, profile, onClose }: { emp: Employee; profile: PharmacyProfile; onClose: () => void }) {
  const initials = emp.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const validThru = (() => { const d = new Date(emp.joinedOn); if (isNaN(d.getTime())) return "—"; d.setFullYear(d.getFullYear() + 3); return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }); })();

  const [orient, setOrient] = useState<"landscape" | "portrait">("landscape");
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [band, setBand] = useState("EMPLOYEE IDENTITY CARD");
  const [showBack, setShowBack] = useState(true);
  const [logo, setLogo] = useState<string | undefined>(profile.logo);
  const logoRef = useRef<HTMLInputElement>(null);
  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setLogo(r.result as string); r.readAsDataURL(f); e.target.value = ""; };

  const cardCls = `idc-card${orient === "portrait" ? " portrait" : ""}`;
  const LogoMark = ({ sm }: { sm?: boolean }) => <span className={`idc-logo${sm ? " sm" : ""}`}>{logo ? <img src={logo} alt="" /> : <IconPlus size={sm ? 14 : 18} />}</span>;

  return (
    <div className="idc-wrap" onClick={onClose}>
      <style>{CSS}</style>
      <div className="idc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="idc-controls">
          <b>Digital Employee ID — {emp.name}</b>
          <span style={{ flex: 1 }} />
          <button className="idc-btn idc-btn-primary" onClick={() => window.print()}><IconPrint size={14} /> Print / Save PDF</button>
          <button className="idc-btn" onClick={onClose}><IconX size={13} /> Close</button>
        </div>

        {/* ── customise bar (not printed) ── */}
        <div className="idc-custom">
          <div className="idc-ctl">
            <label>Orientation</label>
            <div className="idc-seg">
              <button className={orient === "landscape" ? "on" : ""} onClick={() => setOrient("landscape")}>▭ Horizontal</button>
              <button className={orient === "portrait" ? "on" : ""} onClick={() => setOrient("portrait")}>▯ Vertical</button>
            </div>
          </div>
          <div className="idc-ctl">
            <label>Theme</label>
            <div className="idc-swatches">
              {ACCENTS.map((a) => <button key={a.key} title={a.key} className={`idc-sw${accent.key === a.key ? " on" : ""}`} style={{ background: `linear-gradient(135deg,${a.from},${a.to})` }} onClick={() => setAccent(a)} />)}
            </div>
          </div>
          <div className="idc-ctl">
            <label>Logo</label>
            <input ref={logoRef} type="file" accept="image/*" hidden onChange={onLogo} />
            <button className="idc-btn idc-btn-sm" onClick={() => logoRef.current?.click()}><IconUpload size={12} /> {logo ? "Change" : "Upload"}</button>
            {logo && logo !== profile.logo && <button className="idc-btn idc-btn-sm" onClick={() => setLogo(profile.logo)}>Reset</button>}
          </div>
          <div className="idc-ctl grow">
            <label>Band text</label>
            <input className="idc-inp" value={band} onChange={(e) => setBand(e.target.value)} placeholder="EMPLOYEE IDENTITY CARD" />
          </div>
          <label className="idc-check"><input type="checkbox" checked={showBack} onChange={(e) => setShowBack(e.target.checked)} /> Show back</label>
        </div>

        <div className="idc-print-area" style={{ ["--af" as string]: accent.from, ["--at" as string]: accent.to }}>
          <div className="idc-cards">
            {/* ───── FRONT ───── */}
            <div className={cardCls}>
              <span className="idc-tag">FRONT</span>
              <div className="idc-top">
                <LogoMark />
                <div className="idc-org"><b>{profile.name}</b><small>{profile.tagline || "Staff Identity Card"}</small></div>
              </div>
              <div className="idc-band">{band || "EMPLOYEE IDENTITY CARD"}</div>
              <div className="idc-body">
                <div className="idc-photo">{emp.photo ? <img src={emp.photo} alt={emp.name} /> : <span>{initials}</span>}</div>
                <div className="idc-info">
                  <div className="idc-name">{emp.name}</div>
                  <div className="idc-role">{emp.position}{emp.department ? ` · ${emp.department}` : ""}</div>
                  <div className="idc-rows">
                    <div><span>ID</span><b className="mono">{emp.id}</b></div>
                    <div><span>Phone</span><b>{emp.phone || "—"}</b></div>
                    <div><span>Blood</span><b>{emp.bloodGroup || "—"}</b></div>
                    <div><span>Type</span><b>{emp.employment}</b></div>
                  </div>
                </div>
              </div>
              <div className="idc-foot"><span>Joined {fmtDay(emp.joinedOn)}</span><span>Valid thru {validThru}</span></div>
            </div>

            {/* ───── BACK ───── */}
            {showBack && (
              <div className={`${cardCls} idc-back`}>
                <span className="idc-tag">BACK</span>
                <div className="idc-top sm">
                  <LogoMark sm />
                  <div className="idc-org"><b>{profile.name}</b></div>
                </div>
                <div className="idc-backrows">
                  <div><span>Employee</span><b>{emp.name} · {emp.id}</b></div>
                  <div><span>Designation</span><b>{emp.position}</b></div>
                  <div><span>Emergency contact</span><b>{emp.emergencyName ? `${emp.emergencyName} · ${emp.emergencyPhone || ""}` : "—"}</b></div>
                  <div><span>Issued by</span><b>{profile.name}</b></div>
                  <div><span>Address</span><b className="wrap">{profile.address || `${profile.city}, ${profile.state}`}</b></div>
                  <div><span>Contact</span><b>{profile.phone}</b></div>
                </div>
                <div className="idc-barcode" aria-label={`barcode ${emp.id}`}><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><span>{emp.id}</span></div>
                <div className="idc-backfoot">
                  <div className="idc-sign"><i />Authorised signatory</div>
                  <p>If found, please return to the issuer above. This card remains the property of {profile.name} and must be surrendered on cessation of employment.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.idc-wrap { position: fixed; inset: 0; z-index: 200; background: rgba(15,30,22,.55); display: flex; align-items: center; justify-content: center; padding: 20px; overflow: auto; }
.idc-modal { background: #f3f7f4; border-radius: 16px; box-shadow: 0 24px 60px rgba(0,0,0,.3); width: 100%; max-width: 780px; max-height: 94vh; overflow: auto; }
.idc-controls { display: flex; align-items: center; gap: 8px; padding: 14px 16px; border-bottom: 1px solid #dce7e0; position: sticky; top: 0; background: #f3f7f4; z-index: 3; }
.idc-controls b { font-family: Manrope, sans-serif; font-size: 14px; color: #1B3D29; }
.idc-btn { display: inline-flex; align-items: center; gap: 5px; font-family: inherit; font-size: 13px; font-weight: 700; padding: 8px 13px; border-radius: 9px; border: 1px solid #cfe0d6; background: #fff; color: #1B3D29; cursor: pointer; }
.idc-btn-sm { padding: 5px 9px; font-size: 12px; }
.idc-btn-primary { background: #2F7D52; color: #fff; border-color: #2F7D52; }

/* customise bar */
.idc-custom { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; padding: 11px 16px; border-bottom: 1px solid #dce7e0; background: #eef4f0; }
.idc-ctl { display: flex; flex-direction: column; gap: 5px; }
.idc-ctl.grow { flex: 1 1 180px; }
.idc-ctl > label { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: #6a8a78; }
.idc-seg { display: inline-flex; border: 1px solid #cfe0d6; border-radius: 8px; overflow: hidden; background: #fff; }
.idc-seg button { border: 0; background: none; font-family: inherit; font-size: 12.5px; font-weight: 700; padding: 6px 11px; color: #5d7a6b; cursor: pointer; }
.idc-seg button.on { background: #2F7D52; color: #fff; }
.idc-swatches { display: flex; gap: 6px; }
.idc-sw { width: 24px; height: 24px; border-radius: 7px; border: 2px solid transparent; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,.15); }
.idc-sw.on { border-color: #1B3D29; box-shadow: 0 0 0 2px #fff, 0 0 0 4px #1B3D29; }
.idc-inp { font-family: inherit; font-size: 13px; padding: 7px 10px; border: 1px solid #cfe0d6; border-radius: 8px; background: #fff; color: #16241c; width: 100%; }
.idc-check { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; color: #1B3D29; align-self: flex-end; padding-bottom: 6px; cursor: pointer; }

.idc-print-area { padding: 24px; }
.idc-cards { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; }

.idc-card { position: relative; width: 340px; height: 214px; border-radius: 14px; background: #fff; box-shadow: 0 8px 22px rgba(27,61,41,.16); border: 1px solid #e1ece5; overflow: hidden; display: flex; flex-direction: column; color: #16241c; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.idc-tag { position: absolute; top: 8px; right: 10px; font-size: 8px; font-weight: 800; letter-spacing: .12em; color: rgba(255,255,255,.55); z-index: 1; }
.idc-back .idc-tag { color: rgba(22,36,28,.3); }
.idc-top { display: flex; align-items: center; gap: 9px; padding: 12px 14px; background: linear-gradient(135deg, var(--af,#1B3D29), var(--at,#2F7D52)); color: #fff; }
.idc-top.sm { padding: 9px 14px; }
.idc-logo { width: 34px; height: 34px; border-radius: 8px; background: #fff; display: grid; place-items: center; font-size: 18px; overflow: hidden; flex-shrink: 0; color: #2F7D52; }
.idc-logo.sm { width: 26px; height: 26px; }
.idc-logo img { width: 100%; height: 100%; object-fit: contain; }
.idc-org b { font-family: Manrope, sans-serif; font-weight: 800; font-size: 14px; display: block; line-height: 1.15; }
.idc-org small { font-size: 9.5px; opacity: .85; }
.idc-band { background: #D9A648; color: #1B3D29; font-weight: 800; font-size: 9px; letter-spacing: .14em; text-align: center; padding: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.idc-body { display: flex; gap: 12px; padding: 12px 14px; flex: 1; }
.idc-photo { width: 72px; height: 86px; border-radius: 8px; background: #E6F2EB; border: 1px solid #cfe0d6; display: grid; place-items: center; overflow: hidden; flex-shrink: 0; }
.idc-photo img { width: 100%; height: 100%; object-fit: cover; }
.idc-photo span { font-family: Manrope, sans-serif; font-weight: 800; font-size: 26px; color: #2F7D52; }
.idc-info { flex: 1; min-width: 0; }
.idc-name { font-family: Manrope, sans-serif; font-weight: 800; font-size: 16px; color: #1B3D29; line-height: 1.1; }
.idc-role { font-size: 11px; color: #5d7a6b; margin: 2px 0 8px; }
.idc-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 10px; }
.idc-rows > div { display: flex; flex-direction: column; }
.idc-rows span { font-size: 7.5px; text-transform: uppercase; letter-spacing: .06em; color: #8AAE9A; font-weight: 700; }
.idc-rows b { font-size: 11px; color: #16241c; }
.mono { font-family: "IBM Plex Mono", monospace; }
.idc-foot { display: flex; justify-content: space-between; padding: 7px 14px; background: #F0FAF4; border-top: 1px solid #e1ece5; font-size: 9px; color: #5d7a6b; }

.idc-back { padding: 0; }
.idc-backrows { padding: 10px 14px; display: flex; flex-direction: column; gap: 5px; flex: 1; }
.idc-backrows > div { display: flex; gap: 8px; font-size: 10.5px; }
.idc-backrows span { color: #8AAE9A; font-weight: 700; min-width: 96px; flex-shrink: 0; }
.idc-backrows b { color: #16241c; font-weight: 700; }
.idc-backrows b.wrap { font-weight: 600; }
.idc-barcode { display: flex; align-items: center; gap: 1.5px; padding: 0 14px; height: 30px; }
.idc-barcode i { display: block; width: 2px; height: 22px; background: #16241c; }
.idc-barcode i:nth-child(2n) { width: 1px; opacity: .8; }
.idc-barcode i:nth-child(3n) { width: 3px; }
.idc-barcode span { font-family: "IBM Plex Mono", monospace; font-size: 9px; letter-spacing: .12em; margin-left: 8px; color: #16241c; }
.idc-backfoot { padding: 6px 14px 12px; }
.idc-sign { display: flex; flex-direction: column; align-items: flex-end; font-size: 8.5px; color: #5d7a6b; margin-bottom: 6px; }
.idc-sign i { display: block; width: 110px; border-top: 1px solid #8AAE9A; margin-bottom: 2px; }
.idc-backfoot p { font-size: 7.5px; color: #8AAE9A; line-height: 1.3; margin: 0; }

/* ── PORTRAIT (vertical) ── */
.idc-card.portrait { width: 214px; height: 340px; }
.idc-card.portrait .idc-top { flex-direction: column; text-align: center; gap: 4px; padding: 9px 12px 7px; }
.idc-card.portrait .idc-org b { line-height: 1.1; }
.idc-card.portrait .idc-org small { font-size: 8px; }
.idc-card.portrait .idc-logo { width: 34px; height: 34px; }
.idc-card.portrait.idc-back .idc-top { flex-direction: row; padding: 9px 14px; text-align: left; }
.idc-card.portrait .idc-body { flex-direction: column; align-items: center; text-align: center; gap: 6px; padding: 8px 12px; }
.idc-card.portrait .idc-foot { padding: 5px 14px; }
.idc-card.portrait .idc-photo { width: 76px; height: 90px; }
.idc-card.portrait .idc-info { width: 100%; }
.idc-card.portrait .idc-name { font-size: 16px; }
.idc-card.portrait .idc-role { margin-bottom: 6px; }
.idc-card.portrait .idc-rows { text-align: left; gap: 5px 12px; }
.idc-card.portrait .idc-rows > div { line-height: 1.15; }
.idc-card.portrait .idc-rows b { font-size: 12px; }
.idc-card.portrait.idc-back .idc-backrows { gap: 4px; padding: 9px 12px; }
.idc-card.portrait.idc-back .idc-backrows > div { font-size: 9.5px; line-height: 1.25; }
.idc-card.portrait.idc-back .idc-backrows span { min-width: 62px; }
.idc-card.portrait.idc-back .idc-backfoot { padding: 4px 12px 9px; }
.idc-card.portrait.idc-back .idc-sign { margin-bottom: 4px; }
.idc-card.portrait.idc-back .idc-backfoot p { font-size: 7px; }

@media print {
  body * { visibility: hidden !important; }
  .idc-print-area, .idc-print-area * { visibility: visible !important; }
  .idc-print-area { position: fixed; inset: 0; padding: 14mm; background: #fff; }
  .idc-cards { gap: 10mm; }
  .idc-card { width: 85.6mm; height: 53.98mm; box-shadow: none; border: 1px solid #ccc; page-break-inside: avoid; }
  .idc-card.portrait { width: 53.98mm; height: 85.6mm; }
  .idc-tag { display: none; }
  @page { size: auto; margin: 10mm; }
}
`;
