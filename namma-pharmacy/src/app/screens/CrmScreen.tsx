"use client";
import { useState, useMemo } from "react";
import { usePharma } from "../pharmaState";
import {
  inr, fmtDateTime, timeAgo, custKeyOf, waLink, smsLink, catLabel, computeInvoice, PAY_LABEL, BLOOD_GROUPS, Sale,
} from "../data";
import {
  buildPatients, Patient, PatientMed, Segment, SEGMENTS, segLabel, TIERS, tierOf, refillsDue, atRisk,
  attributedSales, crmMsg, Campaign,
} from "../lib/crm";
import { IconSearch, IconX, IconWhatsApp, IconMessage, IconCheck, IconUser, IconRupee, IconReports, IconAlert, IconClock, IconGift, IconStar, IconSparkle, IconStethoscope, IconHeart, IconDot, IconMail, IconRefresh, IconTrendDown, IconMega, IconPhone, IconReceipt, IconPin, IconCalendar, IconBox, IconPill } from "../components/Icon";

type Tab = "overview" | "patients" | "reminders" | "loyalty" | "campaigns" | "feedback" | "analytics";
const TABS: { k: Tab; label: string }[] = [
  { k: "overview", label: "Overview" }, { k: "patients", label: "Patients & Segments" },
  { k: "reminders", label: "Reminders" }, { k: "loyalty", label: "Loyalty" },
  { k: "campaigns", label: "Campaigns" }, { k: "feedback", label: "Feedback" }, { k: "analytics", label: "Analytics" },
];
const wa = (phone: string, text: string) => phone && window.open(waLink(phone, text), "_blank");
const sms = (phone: string, text: string) => phone && window.open(smsLink(phone, text), "_blank");

export default function CrmScreen() {
  const { sales, inventory, creditPayments, crm, profile, now, setPatientMeta, addCampaign, addFeedback, logReminder, redeemPoints, go } = usePharma();
  const [tab, setTab] = useState<Tab>("overview");
  const [sel, setSel] = useState<string | null>(null);

  const creditKeys = useMemo(() => {
    const k = new Set<string>();
    for (const s of sales) if (s.status !== "cancelled" && s.payMode === "credit") k.add(custKeyOf(s.customer));
    for (const p of creditPayments) k.add(p.custKey);
    return k;
  }, [sales, creditPayments]);
  const patients = useMemo(() => buildPatients(sales, inventory, creditKeys, now, crm.meta), [sales, inventory, creditKeys, now, crm.meta]);
  const redeemedBy = useMemo(() => { const m = new Map<string, number>(); for (const r of crm.redemptions) m.set(r.custKey, (m.get(r.custKey) ?? 0) + r.points); return m; }, [crm.redemptions]);
  const current = patients.find((p) => p.key === sel) ?? null;

  const shared = { patients, profile, now, sales, crm, redeemedBy, setPatientMeta, addCampaign, addFeedback, logReminder, redeemPoints, openPatient: setSel, go };

  return (
    <div className="pd-canvas-wide">
      <div className="pd-toolbar">
        <div className="pd-seg" style={{ flexWrap: "wrap" }}>
          {TABS.map((t) => <button key={t.k} className={tab === t.k ? "on" : ""} onClick={() => setTab(t.k)}>{t.label}</button>)}
        </div>
      </div>

      {tab === "overview" && <Overview {...shared} />}
      {tab === "patients" && <Patients {...shared} />}
      {tab === "reminders" && <Reminders {...shared} />}
      {tab === "loyalty" && <Loyalty {...shared} />}
      {tab === "campaigns" && <Campaigns {...shared} />}
      {tab === "feedback" && <FeedbackTab {...shared} />}
      {tab === "analytics" && <Analytics {...shared} />}

      {current && <PatientModal p={current} onClose={() => setSel(null)} {...shared} />}
    </div>
  );
}

// ════════════════════ OVERVIEW ════════════════════
function Overview(s: any) {
  const { patients, openPatient } = s;
  const active = patients.filter((p: Patient) => p.daysSince <= 30).length;
  const risk = atRisk(patients);
  const dueSoon = refillsDue(patients, 7);
  const pts = patients.reduce((a: number, p: Patient) => a + Math.max(0, p.points - (s.redeemedBy.get(p.key) ?? 0)), 0);
  const fb = s.crm.feedbacks;
  const avg = fb.length ? (fb.reduce((a: number, f: any) => a + f.rating, 0) / fb.length) : 0;
  const dist = SEGMENTS.map((seg) => ({ seg, n: patients.filter((p: Patient) => p.segments.includes(seg.key)).length }));
  const maxN = Math.max(1, ...dist.map((d) => d.n));

  return (
    <>
      <div className="pd-stats" >
        <div className="pd-stat"><div className="ic ic-green"><IconUser size={18} /></div><div className="lbl">Patients</div><div className="val">{patients.length}</div></div>
        <div className="pd-stat"><div className="ic ic-blue"><IconCheck size={18} /></div><div className="lbl">Active (30d)</div><div className="val">{active}</div></div>
        <div className="pd-stat"><div className="ic ic-rose"><IconAlert size={18} /></div><div className="lbl">At-risk</div><div className="val">{risk.length}</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconClock size={18} /></div><div className="lbl">Refills due (7d)</div><div className="val">{dueSoon.length}</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconGift size={18} /></div><div className="lbl">Loyalty points</div><div className="val">{pts.toLocaleString("en-IN")}</div></div>
        <div className="pd-stat"><div className="ic ic-green"><IconStar size={18} /></div><div className="lbl">Avg rating</div><div className="val">{avg ? avg.toFixed(1) : "—"}</div></div>
      </div>

      <div className="pd-grid-2">
        <div className="pd-card">
          <div className="pd-card-head"><h3>Refills due this week</h3><span className="sub">chronic care</span></div>
          <div className="pd-card-pad">
            {dueSoon.length === 0 ? <div className="pd-empty" style={{ padding: 16 }}><p>No refills due in 7 days.</p></div> :
              dueSoon.slice(0, 6).map((p: Patient) => (
                <div className="pd-row" key={p.key} style={{ cursor: "pointer" }} onClick={() => openPatient(p.key)}>
                  <span className="em"><IconClock size={15} /></span>
                  <span className="gw"><div className="t">{p.name}</div><div className="s">{p.refill!.med}</div></span>
                  <span className={`pd-pill ${p.refill!.daysLeft <= 0 ? "pill-rose" : "pill-gold"}`}>{p.refill!.daysLeft <= 0 ? "Overdue" : `${p.refill!.daysLeft}d`}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="pd-card">
          <div className="pd-card-head"><h3>Segment distribution</h3></div>
          <div className="pd-card-pad">
            {dist.map((d) => (
              <div key={d.seg.key} style={{ marginBottom: 10 }}>
                <div className="pd-flex" style={{ justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span>{d.seg.emoji} {d.seg.label}</span><b>{d.n}</b></div>
                <div className="pd-prog"><i style={{ width: `${(d.n / maxN) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pd-card" style={{ marginTop: 16 }}>
        <div className="pd-card-head"><h3>At-risk / lapsed patients</h3><span className="sub">no purchase in 60+ days</span></div>
        <div className="pd-tbl-wrap"><table className="pd-tbl">
          <thead><tr><th>Patient</th><th>Phone</th><th className="num">Orders</th><th className="num">Lifetime</th><th>Last seen</th><th>Win back</th></tr></thead>
          <tbody>
            {risk.length === 0 && <tr><td colSpan={6}><div className="pd-empty"><div className="em"><IconSparkle size={30} /></div><p>No at-risk patients — great retention!</p></div></td></tr>}
            {risk.slice(0, 8).map((p: Patient) => (
              <tr key={p.key} style={{ cursor: "pointer" }} onClick={() => openPatient(p.key)}>
                <td><div className="prod"><span className="em"><IconUser size={15} /></span><span className="nm">{p.name}</span></div></td>
                <td className="pd-mono">{p.phone || "—"}</td><td className="num">{p.orders}</td><td className="num">{inr(p.spent)}</td><td>{timeAgo(p.lastAt, s.now)}</td>
                <td onClick={(e) => e.stopPropagation()}><button className="pd-btn pd-btn-ghost" disabled={!p.phone} onClick={() => { wa(p.phone, crmMsg.winback(p.name, s.profile.name)); s.logReminder({ custKey: p.key, custName: p.name, kind: "winback", channel: "whatsapp" }); }}><IconWhatsApp size={14} /> Win back</button></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </>
  );
}

// ════════════════════ PATIENTS & SEGMENTS ════════════════════
function Patients(s: any) {
  const { patients, openPatient, redeemedBy } = s;
  const [seg, setSeg] = useState<Segment | "all">("all");
  const [q, setQ] = useState("");
  const list = patients.filter((p: Patient) => (seg === "all" || p.segments.includes(seg)) && (!q || `${p.name} ${p.phone}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <div className="pd-toolbar">
        <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Search patient…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="pd-select" value={seg} onChange={(e) => setSeg(e.target.value as any)} style={{ width: 180 }}>
          <option value="all">All segments ({patients.length})</option>
          {SEGMENTS.map((x) => <option key={x.key} value={x.key}>{x.emoji} {x.label} ({patients.filter((p: Patient) => p.segments.includes(x.key)).length})</option>)}
        </select>
      </div>
      <div className="pd-card"><div className="pd-tbl-wrap"><table className="pd-tbl">
        <thead><tr><th>Patient</th><th>Segments</th><th>Tier</th><th className="num">Points</th><th className="num">RFM</th><th className="num">Orders</th><th>Last visit</th><th className="num">Lifetime</th></tr></thead>
        <tbody>
          {list.map((p: Patient) => (
            <tr key={p.key} style={{ cursor: "pointer" }} onClick={() => openPatient(p.key)}>
              <td><div className="prod"><span className="em"><IconUser size={15} /></span><span className="nm">{p.name}{p.chronic && <span className="pd-tag" style={{ marginLeft: 6 }}>chronic</span>}</span></div></td>
              <td>{p.segments.map((g) => <span key={g} className="pd-pill pill-gray" style={{ marginRight: 4, fontSize: 11 }}>{segLabel(g)}</span>)}</td>
              <td><span className="pd-pill pill-gold">{p.tier}</span></td>
              <td className="num" style={{ fontWeight: 700 }}>{Math.max(0, p.points - (redeemedBy.get(p.key) ?? 0))}</td>
              <td className="num">{p.rfm.score}</td><td className="num">{p.orders}</td><td>{timeAgo(p.lastAt, s.now)}</td><td className="num" style={{ fontWeight: 800 }}>{inr(p.spent)}</td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={8}><div className="pd-empty"><div className="em"><IconSearch size={30} /></div><p>No patients in this segment.</p></div></td></tr>}
        </tbody>
      </table></div></div>
    </>
  );
}

// ════════════════════ REMINDERS ════════════════════
function Reminders(s: any) {
  const { patients, profile, logReminder } = s;
  const due = refillsDue(patients, 14);
  const send = (p: Patient, kind: "refill" | "adherence" | "followup", ch: "whatsapp" | "sms") => {
    const text = kind === "refill" ? crmMsg.refill(p.name, profile.name, p.refill?.med ?? "your medicine") : kind === "adherence" ? crmMsg.adherence(p.name, profile.name) : crmMsg.followup(p.name, profile.name);
    (ch === "whatsapp" ? wa : sms)(p.phone, text);
    logReminder({ custKey: p.key, custName: p.name, kind, channel: ch });
  };
  return (
    <>
      <div className="pd-summary-chips" style={{ marginBottom: 14 }}>
        <div className="pd-schip">Refills due (14d)<b>{due.length}</b></div>
        <div className="pd-schip">Chronic patients<b>{patients.filter((p: Patient) => p.chronic).length}</b></div>
        <div className="pd-schip">Reminders sent<b>{s.crm.reminders.length}</b></div>
      </div>
      <div className="pd-card"><div className="pd-tbl-wrap"><table className="pd-tbl">
        <thead><tr><th>Patient</th><th>Medicine</th><th>Due</th><th>Phone</th><th>Send reminder</th></tr></thead>
        <tbody>
          {due.length === 0 && <tr><td colSpan={5}><div className="pd-empty"><div className="em"><IconClock size={30} /></div><p>No refills due in the next 14 days.</p></div></td></tr>}
          {due.map((p: Patient) => (
            <tr key={p.key}>
              <td><div className="prod"><span className="em"><IconUser size={15} /></span><span className="nm">{p.name}</span></div></td>
              <td>{p.refill!.med}</td>
              <td><span className={`pd-pill ${p.refill!.daysLeft <= 0 ? "pill-rose" : "pill-gold"}`}>{p.refill!.daysLeft <= 0 ? "Overdue" : `in ${p.refill!.daysLeft}d`}</span></td>
              <td className="pd-mono">{p.phone || "—"}</td>
              <td><div className="pd-flex" style={{ gap: 6 }}>
                <button className="pd-btn pd-btn-ghost" disabled={!p.phone} onClick={() => send(p, "refill", "whatsapp")}><IconWhatsApp size={14} /> Refill</button>
                <button className="pd-btn pd-btn-ghost" disabled={!p.phone} onClick={() => send(p, "followup", "whatsapp")} title="Lab / follow-up"><IconStethoscope size={14} /></button>
                <button className="pd-btn pd-btn-ghost" disabled={!p.phone} onClick={() => send(p, "refill", "sms")} title="SMS"><IconMessage size={14} /></button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table></div></div>
      {s.crm.reminders.length > 0 && (
        <div className="pd-card" style={{ marginTop: 14 }}>
          <div className="pd-card-head"><h3>Recent reminders sent</h3></div>
          <div className="pd-card-pad">
            {s.crm.reminders.slice(0, 8).map((r: any) => <div className="pd-row" key={r.id}><span className="em">{r.kind === "winback" ? <IconHeart size={15} /> : r.kind === "followup" ? <IconStethoscope size={15} /> : <IconClock size={15} />}</span><span className="gw"><div className="t">{r.custName}</div><div className="s">{r.kind} · {r.channel}</div></span><span className="pd-muted" style={{ fontSize: 11.5 }}>{timeAgo(r.at, s.now)}</span></div>)}
          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════ LOYALTY ════════════════════
function Loyalty(s: any) {
  const { patients, redeemedBy, openPatient } = s;
  const avail = (p: Patient) => Math.max(0, p.points - (redeemedBy.get(p.key) ?? 0));
  const ranked = [...patients].sort((a, b) => avail(b) - avail(a));
  const totalPts = patients.reduce((a: number, p: Patient) => a + avail(p), 0);
  return (
    <>
      <div className="pd-summary-chips" style={{ marginBottom: 14 }}>
        <div className="pd-schip">Points outstanding<b>{totalPts.toLocaleString("en-IN")}</b></div>
        <div className="pd-schip">≈ Liability<b>{inr(totalPts)}</b></div>
        {TIERS.map((t) => <div className="pd-schip" key={t.tier}>{t.tier}<b>{patients.filter((p: Patient) => p.tier === t.tier).length}</b></div>)}
      </div>
      <div className="pd-card"><div className="pd-tbl-wrap"><table className="pd-tbl">
        <thead><tr><th>Patient</th><th>Tier</th><th className="num">Earned</th><th className="num">Redeemed</th><th className="num">Available</th><th className="num">Value</th><th></th></tr></thead>
        <tbody>
          {ranked.slice(0, 50).map((p: Patient) => (
            <tr key={p.key} style={{ cursor: "pointer" }} onClick={() => openPatient(p.key)}>
              <td><div className="prod"><span className="em"><IconUser size={15} /></span><span className="nm">{p.name}</span></div></td>
              <td><span className="pd-pill pill-gold">{p.tier}</span></td>
              <td className="num">{p.points}</td><td className="num pd-muted">{redeemedBy.get(p.key) ?? 0}</td>
              <td className="num" style={{ fontWeight: 800 }}>{avail(p)}</td><td className="num">{inr(avail(p))}</td>
              <td className="num" onClick={(e) => e.stopPropagation()}><button className="pd-btn pd-btn-ghost" disabled={avail(p) <= 0} onClick={() => s.redeemPoints(p.key, p.name, Math.min(avail(p), 50))}>Redeem 50</button></td>
            </tr>
          ))}
        </tbody>
      </table></div></div>
      <p className="pd-muted" style={{ fontSize: 12.5, marginTop: 10 }}>ⓘ Patients earn 1 point per ₹100 spent. Tiers: Silver 12+ · Gold 50+ · Platinum 120+ points. Referral: invite a patient, both get ₹100 credit (use Khata to apply).</p>
    </>
  );
}

// ════════════════════ CAMPAIGNS ════════════════════
function Campaigns(s: any) {
  const { patients, profile, crm, addCampaign, sales } = s;
  const [seg, setSeg] = useState<Segment | "all">("chronic");
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [offer, setOffer] = useState("");
  const [message, setMessage] = useState("");
  const recipients = patients.filter((p: Patient) => (seg === "all" || p.segments.includes(seg)) && p.phone);
  const defaultMsg = `Hi! This is ${profile.name}. ` + (offer ? `${offer}. ` : "") + `Visit us or reply to order your medicines. Stay healthy!`;
  const text = message || defaultMsg;
  const launch = async () => {
    if (recipients.length === 0) return;
    const err = await addCampaign({ name: `${segLabel(seg as Segment) || "All"} blast`, segment: seg, channel, message: text, offerLabel: offer || undefined, reach: recipients.length });
    if (!err && recipients[0].phone) (channel === "whatsapp" ? wa : sms)(recipients[0].phone, text.replace("Hi!", `Hi ${recipients[0].name}!`));
  };
  return (
    <div className="pd-grid-2">
      <div className="pd-card">
        <div className="pd-card-head"><h3>New campaign</h3><span className="sub">{recipients.length} recipients</span></div>
        <div className="pd-card-pad" style={{ display: "grid", gap: 12 }}>
          <div className="pd-field"><label>Target segment</label><select className="pd-select" value={seg} onChange={(e) => setSeg(e.target.value as any)}><option value="all">Everyone with phone</option>{SEGMENTS.map((x) => <option key={x.key} value={x.key}>{x.emoji} {x.label}</option>)}</select></div>
          <div className="pd-field"><label>Channel</label><div className="pd-seg"><button className={channel === "whatsapp" ? "on" : ""} onClick={() => setChannel("whatsapp")}>WhatsApp</button><button className={channel === "sms" ? "on" : ""} onClick={() => setChannel("sms")}>SMS</button></div></div>
          <div className="pd-field"><label>Offer (optional)</label><input className="pd-input" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="e.g. 10% off all diabetes meds" /></div>
          <div className="pd-field"><label>Message</label><textarea className="pd-input" rows={4} value={text} onChange={(e) => setMessage(e.target.value)} /></div>
          <button className="pd-btn pd-btn-primary pd-btn-block" disabled={recipients.length === 0} onClick={launch}><IconWhatsApp size={16} /> Send to {recipients.length} {channel === "whatsapp" ? "on WhatsApp" : "via SMS"}</button>
          <p className="pd-muted" style={{ fontSize: 11.5 }}>ⓘ Opens the first recipient prefilled for you to send, and logs the campaign reach. Bulk send needs a WhatsApp Business API (can be wired later).</p>
        </div>
      </div>
      <div className="pd-card">
        <div className="pd-card-head"><h3>Campaign history</h3><span className="sub">{crm.campaigns.length} sent</span></div>
        <div className="pd-card-pad">
          {crm.campaigns.length === 0 && <div className="pd-empty" style={{ padding: 16 }}><p>No campaigns yet.</p></div>}
          {crm.campaigns.map((c: Campaign) => {
            const rev = attributedSales(c, patients, sales);
            return (
              <div className="pd-row" key={c.id}>
                <span className="em">{c.channel === "whatsapp" ? <span style={{color:"var(--green)"}}><IconDot size={8} /></span> : <IconMail size={15} />}</span>
                <span className="gw"><div className="t">{c.name} · {c.reach} sent</div><div className="s">{segLabel(c.segment as Segment) || "All"}{c.offerLabel ? " · " + c.offerLabel : ""} · {fmtDateTime(c.sentAt)}</div></span>
                <span style={{ textAlign: "right", fontSize: 12 }}><b style={{ color: "var(--green)" }}>{inr(rev)}</b><br /><span className="pd-muted" style={{ fontSize: 11 }}>attributed</span></span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════ FEEDBACK ════════════════════
function FeedbackTab(s: any) {
  const { patients, profile, crm, addFeedback } = s;
  const [pk, setPk] = useState("");
  const [rating, setRating] = useState(5);
  const [nps, setNps] = useState(9);
  const [comment, setComment] = useState("");
  const fb = crm.feedbacks;
  const avg = fb.length ? fb.reduce((a: number, f: any) => a + f.rating, 0) / fb.length : 0;
  const promoters = fb.filter((f: any) => (f.nps ?? 0) >= 9).length, detractors = fb.filter((f: any) => (f.nps ?? 0) <= 6).length;
  const npsScore = fb.length ? Math.round(((promoters - detractors) / fb.length) * 100) : 0;
  const save = async () => { const p = patients.find((x: Patient) => x.key === pk); if (!p) return; const err = await addFeedback({ custKey: p.key, custName: p.name, rating, nps, comment: comment.trim() || undefined }); if (!err) setComment(""); };
  return (
    <div className="pd-grid-2">
      <div className="pd-card">
        <div className="pd-card-head"><h3>Log feedback</h3></div>
        <div className="pd-card-pad" style={{ display: "grid", gap: 12 }}>
          <div className="pd-field"><label>Patient</label><select className="pd-select" value={pk} onChange={(e) => setPk(e.target.value)}><option value="">Select patient…</option>{patients.map((p: Patient) => <option key={p.key} value={p.key}>{p.name}</option>)}</select></div>
          <div className="pd-field"><label>Rating</label><div className="pd-flex" style={{ gap: 6 }}>{[1, 2, 3, 4, 5].map((n) => <button key={n} className={`pd-btn ${rating >= n ? "pd-btn-primary" : "pd-btn-ghost"}`} onClick={() => setRating(n)}>★</button>)}</div></div>
          <div className="pd-field"><label>NPS (0–10): would they recommend us?</label><input className="pd-input" type="number" min={0} max={10} value={nps} onChange={(e) => setNps(Math.max(0, Math.min(10, Number(e.target.value) || 0)))} style={{ width: 90 }} /></div>
          <div className="pd-field"><label>Comment</label><textarea className="pd-input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What did they say?" /></div>
          <div className="pd-flex" style={{ gap: 8 }}>
            <button className="pd-btn pd-btn-primary" disabled={!pk} onClick={save}><IconCheck size={15} /> Save feedback</button>
            <button className="pd-btn pd-btn-ghost" disabled={!pk} onClick={() => { const p = patients.find((x: Patient) => x.key === pk); if (p) wa(p.phone, crmMsg.feedback(p.name, profile.name)); }}><IconWhatsApp size={15} /> Request via WhatsApp</button>
          </div>
        </div>
      </div>
      <div className="pd-card">
        <div className="pd-card-head"><h3>Feedback & NPS</h3><span className="sub">{fb.length} responses</span></div>
        <div className="pd-card-pad">
          <div className="pd-summary-chips" style={{ marginBottom: 12 }}>
            <div className="pd-schip">Avg rating<b>{avg ? avg.toFixed(1) + "★" : "—"}</b></div>
            <div className="pd-schip">NPS<b>{fb.length ? npsScore : "—"}</b></div>
            <div className="pd-schip">Promoters<b>{promoters}</b></div>
            <div className="pd-schip">Detractors<b>{detractors}</b></div>
          </div>
          {fb.length === 0 && <div className="pd-empty" style={{ padding: 16 }}><p>No feedback yet.</p></div>}
          {fb.slice(0, 10).map((f: any) => (
            <div className="pd-row" key={f.id}>
              <span className="em">{"★".repeat(f.rating)}</span>
              <span className="gw"><div className="t">{f.custName} {f.nps != null && <span className="pd-muted" style={{ fontSize: 11 }}>· NPS {f.nps}</span>}</div><div className="s">{f.comment || "—"}</div></span>
              <span className="pd-muted" style={{ fontSize: 11.5 }}>{timeAgo(f.at, s.now)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ════════════════════ ANALYTICS ════════════════════
function Analytics(s: any) {
  const { patients, sales } = s;
  const ltv = patients.length ? patients.reduce((a: number, p: Patient) => a + p.spent, 0) / patients.length : 0;
  const repeat = patients.filter((p: Patient) => p.orders > 1).length;
  const retention = patients.length ? Math.round((repeat / patients.length) * 100) : 0;
  const risk = atRisk(patients);
  const rfm = [...patients].sort((a, b) => b.rfm.score - a.rfm.score).slice(0, 10);
  const campRev = s.crm.campaigns.reduce((a: number, c: Campaign) => a + attributedSales(c, patients, sales), 0);
  return (
    <>
      <div className="pd-stats" >
        <div className="pd-stat"><div className="ic ic-green"><IconRupee size={18} /></div><div className="lbl">Avg lifetime value</div><div className="val">{inr(ltv)}</div></div>
        <div className="pd-stat"><div className="ic ic-blue"><IconRefresh size={18} /></div><div className="lbl">Retention (repeat)</div><div className="val">{retention}%</div></div>
        <div className="pd-stat"><div className="ic ic-rose"><IconTrendDown size={18} /></div><div className="lbl">Churn risk</div><div className="val">{risk.length}</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconMega size={18} /></div><div className="lbl">Campaign sales</div><div className="val">{inr(campRev)}</div></div>
        <div className="pd-stat"><div className="ic ic-blue"><IconStar size={18} /></div><div className="lbl">RFM leaders</div><div className="val">{rfm.length}</div></div>
      </div>
      <div className="pd-card">
        <div className="pd-card-head"><h3>Top patients by RFM</h3><span className="sub">recency · frequency · monetary</span></div>
        <div className="pd-tbl-wrap"><table className="pd-tbl">
          <thead><tr><th>Patient</th><th className="num">R</th><th className="num">F</th><th className="num">M</th><th className="num">RFM</th><th className="num">Orders</th><th className="num">Lifetime</th><th>Segments</th></tr></thead>
          <tbody>
            {rfm.map((p: Patient) => (
              <tr key={p.key} style={{ cursor: "pointer" }} onClick={() => s.openPatient(p.key)}>
                <td><div className="prod"><span className="em"><IconUser size={15} /></span><span className="nm">{p.name}</span></div></td>
                <td className="num">{p.rfm.r}</td><td className="num">{p.rfm.f}</td><td className="num">{p.rfm.m}</td>
                <td className="num"><span className="pd-pill pill-green">{p.rfm.score}</span></td>
                <td className="num">{p.orders}</td><td className="num" style={{ fontWeight: 800 }}>{inr(p.spent)}</td>
                <td>{p.segments.map((g) => segLabel(g)).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </>
  );
}

// small inline spend sparkline for the patient profile
function PtSpark({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const w = 220, h = 40, max = Math.max(...data, 1), min = Math.min(...data, 0), rng = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 3 - ((v - min) / rng) * (h - 8)] as const);
  const line = `M ${pts.map((p) => p.join(",")).join(" L ")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: 40 }} aria-hidden>
      <path d={`${line} L ${w},${h} L 0,${h} Z`} fill="var(--mid)" opacity="0.1" />
      <path d={line} fill="none" stroke="var(--mid)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {pts.map((pt, i) => <circle key={i} cx={pt[0]} cy={pt[1]} r="2.4" fill="var(--mid)" />)}
    </svg>
  );
}
const GENDERS = ["Male", "Female", "Other"];

// ════════════════════ PATIENT 360° PROFILE ════════════════════
function PatientModal(props: any) {
  const { p, onClose, profile, sales, crm, setPatientMeta, redeemPoints, redeemedBy, logReminder, now } = props;
  const meta = p.meta ?? {};
  const avail = Math.max(0, p.points - (redeemedBy.get(p.key) ?? 0));
  const redeemed = redeemedBy.get(p.key) ?? 0;

  const hist: Sale[] = sales.filter((s: Sale) => s.status !== "cancelled" && custKeyOf(s.customer) === p.key).sort((a: Sale, b: Sale) => b.createdAt - a.createdAt);
  const orderTotal = (s: Sale) => computeInvoice(s.items, s.discount).payable;
  const spendSeries = [...hist].reverse().map(orderTotal);
  const ptReminders = crm.reminders.filter((r: any) => r.custKey === p.key);
  const ptFeedback = crm.feedbacks.filter((f: any) => f.custKey === p.key);
  const ptRedemptions = crm.redemptions.filter((r: any) => r.custKey === p.key);

  const curMin = TIERS.find((t) => t.tier === p.tier)!.min;
  const nextTier = [...TIERS].filter((t) => t.min > p.points).sort((a, b) => a.min - b.min)[0];
  const tierProg = nextTier ? Math.min(100, Math.max(0, ((p.points - curMin) / (nextTier.min - curMin)) * 100)) : 100;
  const initials = p.name.split(" ").filter(Boolean).map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();

  const [f, setF] = useState({ age: meta.age?.toString() ?? "", gender: meta.gender ?? "", bloodGroup: meta.bloodGroup ?? "", dob: meta.dob ?? "", address: meta.address ?? "", conditions: (meta.conditions ?? []).join(", "), allergies: (meta.allergies ?? []).join(", "), note: meta.note ?? "", consent: meta.consent ?? false });
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const saveMeta = () => setPatientMeta(p.key, {
    age: f.age ? Number(f.age) : undefined, gender: f.gender || undefined, bloodGroup: f.bloodGroup || undefined, dob: f.dob || undefined, address: f.address.trim() || undefined,
    conditions: f.conditions.split(",").map((x: string) => x.trim()).filter(Boolean), allergies: f.allergies.split(",").map((x: string) => x.trim()).filter(Boolean), note: f.note.trim() || undefined, consent: f.consent,
  });

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head">
          <div className="pd-pt-head">
            <span className="pd-pt-ava">{initials || <IconUser size={22} />}</span>
            <div>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>{p.name} <span className="pd-pill pill-gold">{p.tier}</span>{p.chronic && <span className="pd-pill pill-rose">chronic</span>}</h3>
              <div className="pd-muted" style={{ fontSize: 12.5, marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span><IconPhone size={11} /> {p.phone || "—"}</span>{p.email && <span><IconMail size={11} /> {p.email}</span>}
                <span><IconClock size={11} /> {p.daysSince === 0 ? "seen today" : `last seen ${timeAgo(p.lastAt, now)}`}</span>
              </div>
            </div>
          </div>
          <button className="pd-x" onClick={onClose}><IconX size={18} /></button>
        </div>

        <div className="pd-modal-body pd-pt-body">
          {/* segments + quick actions */}
          <div className="pd-flex" style={{ gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {p.segments.map((g: Segment) => <span key={g} className="pd-pill pill-green">{segLabel(g)}</span>)}
            {p.refill && <span className={`pd-pill ${p.refill.daysLeft <= 0 ? "pill-rose" : "pill-gold"}`}>Refill {p.refill.daysLeft <= 0 ? "overdue" : `in ${p.refill.daysLeft}d`}: {p.refill.med}</span>}
          </div>
          <div className="pd-flex" style={{ gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            <button className="pd-btn pd-btn-primary pd-btn-sm" disabled={!p.phone} onClick={() => wa(p.phone, crmMsg.feedback(p.name, profile.name))}><IconWhatsApp size={14} /> WhatsApp</button>
            {p.phone && <a className="pd-btn pd-btn-ghost pd-btn-sm" href={`tel:${p.phone}`}><IconPhone size={14} /> Call</a>}
            {p.refill && <button className="pd-btn pd-btn-ghost pd-btn-sm" disabled={!p.phone} onClick={() => { wa(p.phone, crmMsg.refill(p.name, profile.name, p.refill.med)); logReminder({ custKey: p.key, custName: p.name, kind: "refill", channel: "whatsapp" }); }}><IconClock size={14} /> Refill reminder</button>}
            <button className="pd-btn pd-btn-ghost pd-btn-sm" disabled={!p.phone} onClick={() => { wa(p.phone, crmMsg.winback(p.name, profile.name)); logReminder({ custKey: p.key, custName: p.name, kind: "winback", channel: "whatsapp" }); }}><IconHeart size={14} /> Win-back</button>
            <button className="pd-btn pd-btn-ghost pd-btn-sm" disabled={avail <= 0} onClick={() => redeemPoints(p.key, p.name, Math.min(avail, 50))}><IconGift size={14} /> Redeem 50</button>
            <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => { onClose(); props.go("pos"); }}><IconReceipt size={14} /> New sale</button>
          </div>

          {/* KPI tiles */}
          <div className="pd-pt-kpis">
            <div className="k"><span className="l">Lifetime spend</span><span className="v">{inr(p.spent)}</span></div>
            <div className="k"><span className="l">Orders</span><span className="v">{p.orders}</span></div>
            <div className="k"><span className="l">Avg order</span><span className="v">{inr(p.avgOrder)}</span></div>
            <div className="k"><span className="l">Units bought</span><span className="v">{p.units}</span></div>
            <div className="k"><span className="l">Points available</span><span className="v">{avail}</span></div>
            <div className="k"><span className="l">RFM score</span><span className="v">{p.rfm.score}<small> /15</small></span></div>
            <div className="k"><span className="l">First visit</span><span className="v sm">{fmtDateTime(p.firstAt).split(",")[0]}</span></div>
            <div className="k"><span className="l">Days since</span><span className="v">{p.daysSince}<small>d</small></span></div>
          </div>

          {spendSeries.length >= 2 && (
            <div className="pd-card pd-card-pad" style={{ marginBottom: 14 }}>
              <div className="pd-flex" style={{ justifyContent: "space-between", marginBottom: 4 }}><b style={{ fontSize: 12.5 }}>Spend per visit</b><span className="pd-muted" style={{ fontSize: 11.5 }}>{spendSeries.length} visits · online {p.onlineOrders}/{p.orders}</span></div>
              <PtSpark data={spendSeries} />
            </div>
          )}

          <div className="pd-grid-2">
            {/* medicines bought */}
            <div>
              <div className="pd-pl-head" style={{ marginTop: 0 }}>Medicines bought <span className="pd-muted" style={{ fontWeight: 500, fontSize: 12 }}>· {p.medicines.length}</span></div>
              <div className="pd-card" style={{ overflow: "hidden" }}>
                {p.medicines.length === 0 ? <div className="pd-empty" style={{ padding: 16 }}><p>—</p></div> :
                  p.medicines.slice(0, 8).map((m: PatientMed) => (
                    <div className="pd-medrow" key={m.productId}>
                      <span className="em"><IconPill size={14} /></span>
                      <span className="gw"><div className="t">{m.name}</div><div className="s">{catLabel(m.category)} · {m.orders}× · last {timeAgo(m.lastAt, now)}</div></span>
                      <span className="pd-pill pill-gray">{m.qty} u</span>
                    </div>
                  ))}
              </div>
              {p.categories.length > 0 && <div className="pd-flex" style={{ gap: 5, flexWrap: "wrap", marginTop: 8 }}>{p.categories.map((c: string) => <span key={c} className="pd-pill pill-gray" style={{ fontSize: 11 }}>{catLabel(c)}</span>)}</div>}
            </div>

            {/* purchase history */}
            <div>
              <div className="pd-pl-head" style={{ marginTop: 0 }}>Purchase history <span className="pd-muted" style={{ fontWeight: 500, fontSize: 12 }}>· {hist.length}</span></div>
              <div className="pd-card" style={{ overflow: "hidden", maxHeight: 260, overflowY: "auto" }}>
                {hist.length === 0 ? <div className="pd-empty" style={{ padding: 16 }}><p>No purchases.</p></div> :
                  hist.slice(0, 20).map((s: Sale) => (
                    <div className="pd-medrow" key={s.id}>
                      <span className="em"><IconReceipt size={14} /></span>
                      <span className="gw"><div className="t pd-mono">{s.id} {s.paid === false && <span className="pd-pill pill-rose" style={{ fontSize: 10 }}>unpaid</span>}</div><div className="s">{fmtDateTime(s.createdAt)} · {s.items.reduce((a, i) => a + i.qty, 0)} items · {s.channel === "online" ? "Online" : "Counter"} · {PAY_LABEL[s.payMode]}</div></span>
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{inr(orderTotal(s))}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* loyalty */}
          <div className="pd-pl-head">Loyalty &amp; tier</div>
          <div className="pd-card pd-card-pad" style={{ marginBottom: 12 }}>
            <div className="pd-flex" style={{ justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
              <span><b className="pd-pill pill-gold">{p.tier}</b> · {p.points} pts earned · {redeemed} redeemed</span>
              <span className="pd-muted">{nextTier ? `${nextTier.min - p.points} pts to ${nextTier.tier}` : "Top tier reached"}</span>
            </div>
            <div className="pd-tierbar"><i style={{ width: `${tierProg}%` }} /></div>
            {ptRedemptions.length > 0 && <div className="pd-muted" style={{ fontSize: 11.5, marginTop: 8 }}>Recent: {ptRedemptions.slice(0, 3).map((r: any) => `${r.points} pts (${inr(r.value)})`).join(" · ")}</div>}
          </div>

          {/* clinical + personal */}
          <div className="pd-pl-head">Clinical &amp; personal profile</div>
          <div className="pd-form-grid" style={{ marginBottom: 10 }}>
            <div className="pd-field"><label>Age</label><input className="pd-input" type="number" value={f.age} onChange={(e) => set({ age: e.target.value })} placeholder="—" /></div>
            <div className="pd-field"><label>Gender</label><select className="pd-select" value={f.gender} onChange={(e) => set({ gender: e.target.value })}><option value="">—</option>{GENDERS.map((g) => <option key={g}>{g}</option>)}</select></div>
            <div className="pd-field"><label>Blood group</label><select className="pd-select" value={f.bloodGroup} onChange={(e) => set({ bloodGroup: e.target.value })}><option value="">—</option>{BLOOD_GROUPS.map((b) => <option key={b}>{b}</option>)}</select></div>
            <div className="pd-field"><label>Date of birth</label><input className="pd-input" type="date" value={f.dob} onChange={(e) => set({ dob: e.target.value })} /></div>
            <div className="pd-field pd-span2"><label>Conditions (comma-sep)</label><input className="pd-input" value={f.conditions} onChange={(e) => set({ conditions: e.target.value })} placeholder="e.g. Diabetes, Hypertension" /></div>
            <div className="pd-field pd-span2"><label>Allergies</label><input className="pd-input" value={f.allergies} onChange={(e) => set({ allergies: e.target.value })} placeholder="e.g. Penicillin, Sulfa" /></div>
            <div className="pd-field pd-span2"><label>Address</label><input className="pd-input" value={f.address} onChange={(e) => set({ address: e.target.value })} placeholder="Delivery / home address" /></div>
            <div className="pd-field pd-span2"><label>Care note</label><input className="pd-input" value={f.note} onChange={(e) => set({ note: e.target.value })} placeholder="Anything to remember for this patient…" /></div>
          </div>
          <label className="pd-flex pd-gap6" style={{ cursor: "pointer", fontSize: 12.5, marginBottom: 10 }}>
            <input type="checkbox" checked={f.consent} onChange={(e) => set({ consent: e.target.checked })} /> Consent to WhatsApp/SMS reminders &amp; offers
          </label>
          <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={saveMeta}><IconCheck size={14} /> Save profile</button>

          {/* engagement history */}
          {(ptReminders.length > 0 || ptFeedback.length > 0) && (
            <>
              <div className="pd-pl-head">Engagement history</div>
              <div className="pd-grid-2">
                <div className="pd-card" style={{ overflow: "hidden" }}>
                  <div className="pd-card-head"><h3 style={{ fontSize: 13 }}>Reminders sent</h3><span className="sub">{ptReminders.length}</span></div>
                  <div className="pd-card-pad" style={{ paddingTop: 4 }}>
                    {ptReminders.length === 0 ? <p className="pd-muted" style={{ fontSize: 12 }}>None yet.</p> :
                      ptReminders.slice(0, 5).map((r: any) => <div className="pd-medrow" key={r.id}><span className="em"><IconMessage size={13} /></span><span className="gw"><div className="t" style={{ textTransform: "capitalize" }}>{r.kind}</div><div className="s">{r.channel}</div></span><span className="pd-muted" style={{ fontSize: 11 }}>{timeAgo(r.at, now)}</span></div>)}
                  </div>
                </div>
                <div className="pd-card" style={{ overflow: "hidden" }}>
                  <div className="pd-card-head"><h3 style={{ fontSize: 13 }}>Feedback</h3><span className="sub">{ptFeedback.length}</span></div>
                  <div className="pd-card-pad" style={{ paddingTop: 4 }}>
                    {ptFeedback.length === 0 ? <p className="pd-muted" style={{ fontSize: 12 }}>None yet.</p> :
                      ptFeedback.slice(0, 5).map((fb: any) => <div className="pd-medrow" key={fb.id}><span className="em" style={{ color: "var(--gold-d)" }}>{"★".repeat(fb.rating)}</span><span className="gw"><div className="t">{fb.comment || "—"}</div><div className="s">{fb.nps != null ? `NPS ${fb.nps}` : ""}</div></span><span className="pd-muted" style={{ fontSize: 11 }}>{timeAgo(fb.at, now)}</span></div>)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="pd-modal-foot"><button className="pd-btn pd-btn-ghost" onClick={onClose}>Close</button><button className="pd-btn pd-btn-primary" onClick={() => { onClose(); props.go("pos"); }}><IconReceipt size={15} /> New sale</button></div>
      </div>
    </div>
  );
}
