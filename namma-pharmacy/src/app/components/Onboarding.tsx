"use client";
import { useState, useRef, useEffect } from "react";
import { usePharma, BusinessType } from "../pharmaState";
import { IconArrowRight, IconCheck, IconStore, IconRx, IconReports, IconReceipt, IconGlobe, IconChart, IconHospital } from "./Icon";

type Phase = "intro" | "type" | "login";

const SLIDES: { Ic: (p: { size?: number }) => React.ReactNode; t: string; s: string }[] = [
  { Ic: IconReceipt, t: "Billing, GST & inventory in one place", s: "Counter & online sales, batch-wise stock, expiry alerts and one-tap GST invoices — built for Indian pharmacies." },
  { Ic: IconGlobe, t: "Sell online & accept orders", s: "List your store on the Namma MedMate app, manage prescriptions, offers and a self-order kiosk." },
  { Ic: IconChart, t: "Reports, credit & CRM", s: "Daybook, GST returns, customer khata, loyalty and campaigns — share clean reports with your CA." },
];

const TYPES: { key: BusinessType; Ic: (p: { size?: number }) => React.ReactNode; t: string; s: string; bullets: string[] }[] = [
  { key: "pharmacy", Ic: IconStore, t: "Retail Pharmacy", s: "Standalone medical store / chemist",
    bullets: ["Counter & online billing", "Inventory, purchases & reorder", "Customers, khata & CRM"] },
  { key: "hospital", Ic: IconHospital, t: "Hospital Pharmacy", s: "In-hospital pharmacy & IPD store",
    bullets: ["Everything in Retail, plus:", "IPD wards & ward indents", "Departments & insurance / TPA claims"] },
];

function Mark() {
  return (
    <span className="pd-ob-mark">
      <svg width={30} height={30} viewBox="0 0 40 40" fill="none" aria-hidden>
        <defs><linearGradient id="obLogo" x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#4A9E6E" /><stop offset="1" stopColor="#1B3D29" /></linearGradient></defs>
        <path d="M20 3.5C12.5 3.5 6.5 9.3 6.5 17c0 8.6 10.7 17.3 12.7 18.8a1.4 1.4 0 0 0 1.6 0C22.8 34.3 33.5 25.6 33.5 17 33.5 9.3 27.5 3.5 20 3.5Z" fill="url(#obLogo)" />
        <circle cx="20" cy="16.5" r="8.7" fill="#fff" /><path d="M18 10.5h4V14h3.5v4H22v3.5h-4V18h-3.5v-4H18z" fill="#2F7D52" />
        <circle cx="27" cy="9" r="3" fill="#D9A648" stroke="#fff" strokeWidth="1.4" />
      </svg>
    </span>
  );
}

export default function Onboarding() {
  const { signIn } = usePharma();
  const [phase, setPhase] = useState<Phase>("intro");
  const [slide, setSlide] = useState(0);
  const [type, setType] = useState<BusinessType>("pharmacy");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const DEMO_OTP = "123456";
  const otpRef = useRef<HTMLInputElement>(null);

  // auto-advance the intro carousel
  useEffect(() => {
    if (phase !== "intro") return;
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => { if (otpSent) otpRef.current?.focus(); }, [otpSent]);

  const phoneOk = phone.replace(/\D/g, "").length >= 10;
  const sendOtp = () => { if (phoneOk) setOtpSent(true); };
  const verify = () => { if (otp.replace(/\D/g, "").length === 6) signIn(type, name); };
  const tt = TYPES.find((x) => x.key === type)!;

  return (
    <div className="pd-ob">
      {/* brand / story panel */}
      <aside className="pd-ob-aside">
        <div className="pd-ob-brand"><Mark /><div><b><em>Namma</em> MedMate</b><small>Partner Console</small></div></div>
        <div className="pd-ob-quote">
          <h1>Run your{type === "hospital" ? " hospital" : ""} pharmacy<br />from one screen.</h1>
          <p>Billing, inventory, online orders, GST & {type === "hospital" ? "IPD wards, indents and insurance claims." : "customer credit — everything in one console."}</p>
        </div>
        <div className="pd-ob-trust">
          <div><span className="pd-ob-ico"><IconStore size={16} /></span> Trusted by 1,200+ stores</div>
          <div><span className="pd-ob-ico"><IconRx size={16} /></span> Rx-aware & DPCO compliant</div>
          <div><span className="pd-ob-ico"><IconReports size={16} /></span> GST returns & CA-ready</div>
        </div>
        <p className="pd-ob-foot">© 2026 Medmate India Technology Private Limited · All rights reserved.</p>
      </aside>

      {/* working panel */}
      <main className="pd-ob-main">
        <div className="pd-ob-card">
          {phase === "intro" && (
            <div className="pd-ob-intro">
              <div className="pd-ob-slide">
                <div className="em">{SLIDES[slide].Ic({ size: 40 })}</div>
                <h2>{SLIDES[slide].t}</h2>
                <p>{SLIDES[slide].s}</p>
              </div>
              <div className="pd-ob-dots">{SLIDES.map((_, i) => <i key={i} className={i === slide ? "on" : ""} onClick={() => setSlide(i)} />)}</div>
              <button className="pd-btn pd-btn-primary pd-btn-lg pd-ob-cta" onClick={() => setPhase("type")}>Get started <IconArrowRight size={16} /></button>
              <button className="pd-ob-link" onClick={() => setPhase("login")}>I already have an account · Log in</button>
            </div>
          )}

          {phase === "type" && (
            <div className="pd-ob-step">
              <h2 className="pd-ob-h">Choose your business</h2>
              <p className="pd-ob-sub">This tailors your dashboard. You can change it later in Settings.</p>
              <div className="pd-ob-types">
                {TYPES.map((x) => (
                  <button key={x.key} className={`pd-ob-type${type === x.key ? " on" : ""}`} onClick={() => setType(x.key)}>
                    <span className="em">{x.Ic({ size: 30 })}</span>
                    <span className="tx"><b>{x.t}</b><small>{x.s}</small></span>
                    <ul>{x.bullets.map((b) => <li key={b}><IconCheck size={13} /> {b}</li>)}</ul>
                    <span className={`pd-ob-radio${type === x.key ? " on" : ""}`} />
                  </button>
                ))}
              </div>
              <div className="pd-ob-row">
                <button className="pd-btn pd-btn-ghost" onClick={() => setPhase("intro")}>Back</button>
                <button className="pd-btn pd-btn-primary pd-btn-lg" onClick={() => setPhase("login")}>Continue <IconArrowRight size={16} /></button>
              </div>
            </div>
          )}

          {phase === "login" && (
            <div className="pd-ob-step">
              <span className="pd-ob-badge">{tt.Ic({ size: 15 })} {tt.t}</span>
              <h2 className="pd-ob-h">{otpSent ? "Enter the OTP" : "Log in to continue"}</h2>
              <p className="pd-ob-sub">{otpSent ? `We sent a 6-digit code to ${phone}.` : "Sign in with your registered mobile number."}</p>

              {!otpSent ? (
                <>
                  <div className="pd-field"><label>Business name <span style={{ color: "var(--faint)", fontWeight: 600 }}>(optional)</span></label>
                    <input className="pd-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "hospital" ? "City Care Hospital Pharmacy" : "Sri Sai Medicals"} /></div>
                  <div className="pd-field" style={{ marginTop: 12 }}><label>Mobile number</label>
                    <div className="pd-ob-phone">
                      <span>+91</span>
                      <input className="pd-input" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="98860 12345" onKeyDown={(e) => e.key === "Enter" && sendOtp()} autoFocus />
                    </div>
                  </div>
                  <button className="pd-btn pd-btn-primary pd-btn-lg pd-ob-cta" disabled={!phoneOk} onClick={sendOtp}>Send OTP <IconArrowRight size={16} /></button>
                </>
              ) : (
                <>
                  <div className="pd-field"><label>6-digit OTP</label>
                    <input ref={otpRef} className="pd-input pd-mono pd-ob-otp" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="••••••" onKeyDown={(e) => e.key === "Enter" && verify()} />
                  </div>
                  <div className="pd-ob-demo">Demo OTP: <b>{DEMO_OTP}</b> <button className="pd-ob-link" style={{ display: "inline", margin: 0 }} onClick={() => setOtp(DEMO_OTP)}>Auto-fill</button></div>
                  <button className="pd-btn pd-btn-primary pd-btn-lg pd-ob-cta" disabled={otp.replace(/\D/g, "").length !== 6} onClick={verify}><IconCheck size={16} /> Verify &amp; log in</button>
                  <button className="pd-ob-link" onClick={() => { setOtpSent(false); setOtp(""); }}>← Change number</button>
                </>
              )}

              <div className="pd-ob-row" style={{ justifyContent: "center", marginTop: 18 }}>
                <button className="pd-ob-link" onClick={() => setPhase("type")}>← Change business type</button>
              </div>
              <p className="pd-ob-terms">By continuing you agree to the Terms of Service & Privacy Policy.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
