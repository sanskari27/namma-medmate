"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import { inr } from "../data";
import { REFERRALS } from "../lib/referrals";
import { IconGift, IconCheck, IconSend, IconInbox, IconStore, IconCash } from "../components/Icon";

export default function ReferScreen() {
  const { profile, toast } = usePharma();
  const code = profile.name.replace(/[^A-Za-z]/g, "").slice(0, 6).toUpperCase() + "500";
  const [copied, setCopied] = useState(false);

  const referrals = REFERRALS;
  const earned = referrals.filter((r) => r.status === "Earned").reduce((a, r) => a + r.reward, 0);

  const copy = () => { try { navigator.clipboard?.writeText(code); } catch {} setCopied(true); toast("Referral code copied"); setTimeout(() => setCopied(false), 1500); };

  const steps = [
    { ic: IconInbox, t: "Share your code", s: "Send your referral code to other pharmacy owners." },
    { ic: IconStore, t: "They join Namma MedMate", s: "They sign up & activate any paid plan using your code." },
    { ic: IconCash, t: "You both earn ₹500", s: "₹500 credit lands in both accounts after their first month." },
  ];

  return (
    <div className="pd-canvas-wide" style={{ maxWidth: 980 }}>
      {/* hero */}
      <div className="pd-card pd-card-pad" style={{ marginBottom: 16, background: "linear-gradient(120deg,var(--dark),var(--green))", color: "#fff", display: "flex", alignItems: "center", gap: 20 }}>
        <span style={{ fontSize: 54 }}><IconGift size={40} /></span>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: "#fff", fontSize: 24 }}>Refer a pharmacy, earn {inr(500)}</h2>
          <p style={{ fontSize: 13.5, opacity: .9, marginTop: 4 }}>Invite neighbouring chemists to Namma MedMate. You both get ₹500 subscription credit when they activate a plan.</p>
        </div>
      </div>

      <div className="pd-grid-2">
        <div>
          {/* code box */}
          <div className="pd-card pd-card-pad" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>YOUR REFERRAL CODE</div>
            <div className="pd-flex" style={{ justifyContent: "space-between", marginTop: 8 }}>
              <span className="pd-mono" style={{ fontFamily: "IBM Plex Mono", fontSize: 26, fontWeight: 700, letterSpacing: ".08em", color: "var(--dark)" }}>{code}</span>
              <button className="pd-btn pd-btn-primary" onClick={copy}>{copied ? <><IconCheck size={15} /> Copied</> : "Copy"}</button>
            </div>
            <div className="pd-flex pd-gap6" style={{ marginTop: 14 }}>
              <button className="pd-btn pd-btn-ghost pd-btn-block" onClick={() => toast("Share sheet opened")}><IconSend size={15} /> WhatsApp</button>
              <button className="pd-btn pd-btn-ghost pd-btn-block" onClick={() => toast("Share sheet opened")}>Email</button>
            </div>
          </div>

          {/* earnings */}
          <div className="pd-stats-2">
            <div className="pd-stat"><div className="ic ic-gold"><IconGift size={18} /></div><div className="lbl">Total earned</div><div className="val">{inr(earned)}</div></div>
            <div className="pd-stat"><div className="ic ic-green"><IconStore size={18} /></div><div className="lbl">Pharmacies referred</div><div className="val">{referrals.length}</div></div>
          </div>
        </div>

        {/* how it works */}
        <div className="pd-card">
          <div className="pd-card-head"><h3>How it works</h3></div>
          <div className="pd-card-pad">
            {steps.map((s, i) => (
              <div className="pd-row" key={i}>
                <span className="em" style={{ fontSize: 20 }}><s.ic size={18} /></span>
                <span className="gw"><div className="t">{i + 1}. {s.t}</div><div className="s">{s.s}</div></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pd-card" style={{ marginTop: 16 }}>
        <div className="pd-card-head"><h3>Your referrals</h3></div>
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>Pharmacy</th><th>Area</th><th>Status</th><th className="num">Reward</th></tr></thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.name}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td><td>{r.area}</td>
                  <td><span className={`pd-pill ${r.status === "Earned" ? "pill-green" : r.status === "Signed up" ? "pill-blue" : "pill-gray"}`}><i className="d" />{r.status}</span></td>
                  <td className="num" style={{ fontWeight: 700 }}>{r.reward ? inr(r.reward) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
