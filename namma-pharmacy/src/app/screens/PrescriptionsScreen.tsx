"use client";
import { useMemo, useState } from "react";
import { usePharma } from "../pharmaState";
import {
  timeAgo, fmtDateTime, RxStatus, Prescription, InvProduct, sellPrice, inr, stockOf,
  SCHEDULE_META, rxWaitMins, rxOverdue, rxTurnaroundMins, rxAvailability, rxScheduledCount,
  fmtMins, RX_SLA_MINS, waLink, smsLink,
} from "../data";
import { ChannelPill } from "../components/bits";
import {
  IconCheck, IconX, IconRx, IconArrowRight, IconClock, IconDoc, IconPill, IconAlert,
  IconPhone, IconWhatsApp, IconRupee, IconBox, IconStethoscope, IconUser, IconSearch,
  IconBolt, IconCalendar, IconChart, IconShield,
} from "../components/Icon";
import RxView from "../components/RxView";

const RX_PILL: Record<RxStatus, string> = { pending: "pill-gold", approved: "pill-blue", dispensed: "pill-green", rejected: "pill-rose" };
const RX_LABEL: Record<RxStatus, string> = { pending: "Pending review", approved: "Approved", dispensed: "Dispensed", rejected: "Rejected" };
const KIND_LABEL: Record<string, string> = { digital: "Digital Rx", uploaded: "Uploaded" };
const REJECT_REASONS = [
  "Prescription illegible — please re-upload a clear photo",
  "Prescriber could not be verified",
  "Prescription expired (older than 6 months)",
  "Medicine not stocked — please contact the store",
];
const startOfToday = (now: number) => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); };

export default function PrescriptionsScreen() {
  const { prescriptions, inventory, now, approveRx, rejectRx, dispenseRx } = usePharma();
  const [tab, setTab] = useState<RxStatus | "all">("pending");
  const [kind, setKind] = useState<"all" | "digital" | "uploaded">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Prescription | null>(null);
  const [rejecting, setRejecting] = useState<Prescription | null>(null);
  const kpiKey = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } };

  const counts = (s: RxStatus) => prescriptions.filter((r) => r.status === s).length;

  // ── metrics ──
  const m = useMemo(() => {
    const total = prescriptions.length;
    const pending = prescriptions.filter((r) => r.status === "pending");
    const overdue = pending.filter((r) => rxOverdue(r, now));
    const approved = prescriptions.filter((r) => r.status === "approved");
    const dispensed = prescriptions.filter((r) => r.status === "dispensed");
    const t0 = startOfToday(now);
    const dispToday = dispensed.filter((r) => (r.dispensedAt ?? 0) >= t0);
    const dispTodayValue = dispToday.reduce((a, r) => a + rxAvailability(r, inventory).value, 0);
    const digital = prescriptions.filter((r) => r.kind === "digital").length;
    const turns = dispensed.map((r) => rxTurnaroundMins(r)).filter((x): x is number => x != null);
    const avgTurn = turns.length ? Math.round(turns.reduce((a, b) => a + b, 0) / turns.length) : null;
    const byDoctor: Record<string, number> = {};
    prescriptions.forEach((r) => { if (r.doctor && !/illegible/i.test(r.doctor)) byDoctor[r.doctor] = (byDoctor[r.doctor] || 0) + 1; });
    const topDoctors = Object.entries(byDoctor).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { total, pending, overdue, approved, dispensed, dispToday, dispTodayValue, digital, uploaded: total - digital, avgTurn, topDoctors };
  }, [prescriptions, inventory, now]);

  const digitalPct = m.total ? Math.round((m.digital / m.total) * 100) : 0;
  const slaPct = m.pending.length ? Math.round(((m.pending.length - m.overdue.length) / m.pending.length) * 100) : 100;

  // ── filtered + prioritised list ──
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return prescriptions
      .filter((r) => (tab === "all" || r.status === tab) && (kind === "all" || r.kind === kind) &&
        (!ql || `${r.id} ${r.patient} ${r.doctor}`.toLowerCase().includes(ql)))
      .sort((a, b) => {
        if (!!a.urgent !== !!b.urgent) return a.urgent ? -1 : 1;
        if (a.status === "pending" && b.status === "pending") return a.uploadedAt - b.uploadedAt; // oldest first
        return b.uploadedAt - a.uploadedAt;
      });
  }, [prescriptions, tab, kind, q]);

  const TABS: { k: RxStatus | "all"; label: string; n?: number }[] = [
    { k: "pending", label: "Pending", n: counts("pending") },
    { k: "approved", label: "Approved", n: counts("approved") },
    { k: "dispensed", label: "Dispensed", n: counts("dispensed") },
    { k: "rejected", label: "Rejected", n: counts("rejected") },
    { k: "all", label: "All" },
  ];

  return (
    <div className="pd-canvas-wide">
      {/* ── KPIs ── */}
      <div className="pd-stats" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        <div className="pd-stat link" role="button" tabIndex={0} onClick={() => setTab("pending")} onKeyDown={kpiKey(() => setTab("pending"))} title="Pending queue">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="ic ic-gold"><IconClock size={18} /></div><div className="lbl">Pending review</div><div className="val">{m.pending.length}</div>
          <div className="split">{m.overdue.length ? <b style={{ color: "var(--rose)" }}>{m.overdue.length} over SLA</b> : "all within 2h"}</div>
        </div>
        <div className="pd-stat link" role="button" tabIndex={0} onClick={() => setTab("approved")} onKeyDown={kpiKey(() => setTab("approved"))} title="Ready to bill">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="ic ic-blue"><IconCheck size={18} /></div><div className="lbl">Awaiting dispense</div><div className="val">{m.approved.length}</div>
          <div className="split">approved · ready to bill</div>
        </div>
        <div className="pd-stat"><div className="ic ic-green"><IconRupee size={18} /></div><div className="lbl">Dispensed today</div><div className="val">{m.dispToday.length}</div><div className="split">{inr(m.dispTodayValue)} billed</div></div>
        <div className="pd-stat"><div className="ic ic-teal"><IconBolt size={18} /></div><div className="lbl">Avg turnaround</div><div className="val">{fmtMins(m.avgTurn)}</div><div className="split">upload → dispensed</div></div>
        <div className="pd-stat"><div className="ic ic-violet"><IconPill size={18} /></div><div className="lbl">Digital share</div><div className="val">{digitalPct}%</div><div className="split">{m.digital} digital · {m.uploaded} uploaded</div></div>
        <div className="pd-stat"><div className="ic ic-green"><IconShield size={18} /></div><div className="lbl">SLA on-time</div><div className="val">{slaPct}%</div><div className="split">pending within 2h</div></div>
      </div>

      {/* ── overdue alert ── */}
      {m.overdue.length > 0 && tab !== "pending" && (
        <button className="pd-rx-alert" onClick={() => setTab("pending")}>
          <IconAlert size={16} /> <b>{m.overdue.length} prescription{m.overdue.length > 1 ? "s" : ""}</b> waiting more than {RX_SLA_MINS / 60}h — review now <IconArrowRight size={14} />
        </button>
      )}

      {/* ── insights ── */}
      <div className="pd-rx-insights">
        <div className="pd-card pd-card-pad">
          <div className="pd-rx-inhead"><IconStethoscope size={15} /> Top prescribers</div>
          {m.topDoctors.length === 0 ? <p className="pd-muted" style={{ fontSize: 12.5 }}>No data yet.</p> : m.topDoctors.map(([doc, n]) => {
            const max = m.topDoctors[0][1] || 1;
            return (
              <div key={doc} style={{ marginBottom: 9 }}>
                <div className="pd-flex" style={{ justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}><span>{doc}</span><b>{n} Rx</b></div>
                <div className="pd-prog"><i style={{ width: `${(n / max) * 100}%` }} /></div>
              </div>
            );
          })}
        </div>
        <div className="pd-card pd-card-pad">
          <div className="pd-rx-inhead"><IconChart size={15} /> Source &amp; compliance</div>
          <div className="pd-rx-splitbar" aria-hidden>
            <span className="dig" style={{ width: `${digitalPct}%` }} />
            <span className="upl" style={{ width: `${100 - digitalPct}%` }} />
          </div>
          <div className="pd-rx-legend">
            <span><i className="dig" /> Digital {m.digital}</span>
            <span><i className="upl" /> Uploaded {m.uploaded}</span>
          </div>
          <div className="pd-rx-facts">
            <div><span>Within SLA</span><b>{m.pending.length - m.overdue.length}/{m.pending.length || 0}</b></div>
            <div><span>Avg turnaround</span><b>{fmtMins(m.avgTurn)}</b></div>
            <div><span>Dispensed</span><b>{m.dispensed.length}</b></div>
            <div><span>Rejected</span><b>{counts("rejected")}</b></div>
          </div>
        </div>
      </div>

      {/* ── toolbar ── */}
      <div className="pd-toolbar" style={{ flexWrap: "wrap", gap: 10 }}>
        <div className="pd-seg">
          {TABS.map((t) => <button key={t.k} className={tab === t.k ? "on" : ""} onClick={() => setTab(t.k)}>{t.label}{t.n != null ? ` (${t.n})` : ""}</button>)}
        </div>
        <div className="pd-spacer" />
        <div className="pd-seg">
          <button className={kind === "all" ? "on" : ""} onClick={() => setKind("all")}>All sources</button>
          <button className={kind === "digital" ? "on" : ""} onClick={() => setKind("digital")}>Digital</button>
          <button className={kind === "uploaded" ? "on" : ""} onClick={() => setKind("uploaded")}>Uploaded</button>
        </div>
        <div className="pd-search" style={{ maxWidth: 240 }}>
          <IconSearch size={15} />
          <input placeholder="Search patient, doctor, Rx no…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {list.length === 0 ? (
        <div className="pd-card pd-card-pad"><div className="pd-empty"><div className="em"><IconDoc size={28} /></div><h3>Nothing here</h3><p>No prescriptions match this view.</p></div></div>
      ) : (
        <div className="pd-rx-grid">
          {list.map((r) => <RxCard key={r.id} r={r} now={now} inventory={inventory} onOpen={() => setOpen(r)} onApprove={() => approveRx(r.id)} onReject={() => setRejecting(r)} onDispense={() => dispenseRx(r.id)} />)}
        </div>
      )}

      {open && <RxDetail rx={open} inventory={inventory} now={now} onClose={() => setOpen(null)}
        onApprove={() => { approveRx(open.id); setOpen(null); }}
        onReject={() => { setRejecting(open); setOpen(null); }}
        onDispense={() => { dispenseRx(open.id); setOpen(null); }} />}

      {rejecting && <RejectModal rx={rejecting} onClose={() => setRejecting(null)} onConfirm={(reason) => { rejectRx(rejecting.id, reason); setRejecting(null); }} />}
    </div>
  );
}

// ══════════════════ card ══════════════════
function RxCard({ r, now, inventory, onOpen, onApprove, onReject, onDispense }: {
  r: Prescription; now: number; inventory: InvProduct[];
  onOpen: () => void; onApprove: () => void; onReject: () => void; onDispense: () => void;
}) {
  const av = rxAvailability(r, inventory);
  const meds = av.items;
  const wait = rxWaitMins(r, now);
  const overdue = rxOverdue(r, now);
  const scheduled = rxScheduledCount(r, inventory);

  return (
    <div className={`pd-card pd-rxcard${overdue ? " overdue" : ""}`}>
      <div className="pd-card-head">
        <div className="pd-flex pd-gap6" style={{ alignItems: "center" }}>
          <span className={`pd-rx-kindico ${r.kind}`}>{r.kind === "digital" ? <IconPill size={15} /> : <IconDoc size={15} />}</span>
          <div><h3 style={{ fontSize: 13.5 }}>{r.id}{r.urgent && <span className="pd-pill pill-rose" style={{ marginLeft: 6 }}><IconBolt size={10} /> Urgent</span>}</h3><div className="sub">{timeAgo(r.uploadedAt, now)}</div></div>
        </div>
        <span className={`pd-pill ${RX_PILL[r.status]}`}><i className="d" />{RX_LABEL[r.status]}</span>
      </div>

      <div className="pd-card-pad" style={{ paddingTop: 10, paddingBottom: 10 }}>
        <button onClick={onOpen} className="pd-rx-patient">
          <span className="av">{r.patient[0]}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="nm">{r.patient}</span>
            <span className="dr"><IconStethoscope size={11} /> {r.doctor}{r.regNo ? ` · ${r.regNo}` : ""}</span>
          </span>
          <span className="pd-pill pill-gray">{KIND_LABEL[r.kind]}</span>
        </button>

        {/* status-aware meta row */}
        {r.status === "pending" && <div className={`pd-rx-sla${overdue ? " over" : ""}`}><IconClock size={12} /> Waiting {fmtMins(wait)}{overdue ? ` · over ${RX_SLA_MINS / 60}h SLA` : ` · SLA ${RX_SLA_MINS / 60}h`}</div>}
        {r.status === "approved" && r.approvedAt && <div className="pd-rx-sla ok"><IconCheck size={12} /> Approved {timeAgo(r.approvedAt, now)}{r.reviewedBy ? ` · ${r.reviewedBy}` : ""}</div>}
        {r.status === "dispensed" && <div className="pd-rx-sla ok"><IconCheck size={12} /> Dispensed{rxTurnaroundMins(r) != null ? ` in ${fmtMins(rxTurnaroundMins(r))}` : ""}</div>}
        {r.status === "rejected" && <div className="pd-rx-sla over"><IconX size={12} /> {r.rejectReason || "Rejected"}</div>}

        {/* verified medicines */}
        {meds.length > 0 && <>
          <div className="pd-rx-medlbl">Verified medicines <span>{av.inStock}/{av.total} in stock{scheduled ? ` · ${scheduled} Rx-only` : ""}</span></div>
          {meds.slice(0, 3).map(({ p, stock, price, rx }) => (
            <div className="pd-rx-medrow" key={p.id}>
              <span className="nm"><span className="em">{p.emoji}</span> {p.name}{rx && <span className="pd-schtag">{SCHEDULE_META[p.schedule].label}</span>}</span>
              <span className={`st ${stock > 0 ? "" : "out"}`}>{stock > 0 ? inr(price) : "Out"}</span>
            </div>
          ))}
          {meds.length > 3 && <div className="pd-muted" style={{ fontSize: 11.5, marginTop: 2 }}>+{meds.length - 3} more…</div>}
          <div className="pd-rx-total"><span>Est. bill value</span><b>{inr(av.value)}</b></div>
        </>}
        {av.outOfStock.length > 0 && <div className="pd-rx-oos"><IconAlert size={12} /> {av.outOfStock.map((p) => p.name).join(", ")} out of stock</div>}
        {r.note && meds.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, fontStyle: "italic" }}>“{r.note}”</div>}
      </div>

      <div className="pd-modal-foot" style={{ borderTop: "1px solid var(--line)" }}>
        {r.status === "pending" && <>
          <button className="pd-btn pd-btn-rose pd-btn-sm" onClick={onReject}><IconX size={14} /> Reject</button>
          <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={onApprove}><IconCheck size={14} /> Approve</button>
          <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={onDispense}>Dispense <IconArrowRight size={14} /></button>
        </>}
        {r.status === "approved" && <button className="pd-btn pd-btn-primary pd-btn-sm pd-btn-block" onClick={onDispense}>Dispense → billing <IconArrowRight size={14} /></button>}
        {r.status === "dispensed" && <button className="pd-btn pd-btn-ghost pd-btn-sm pd-btn-block" onClick={onOpen}>View details</button>}
        {r.status === "rejected" && <button className="pd-btn pd-btn-ghost pd-btn-sm pd-btn-block" onClick={onOpen}>View &amp; re-notify</button>}
      </div>
    </div>
  );
}

// ══════════════════ detail modal ══════════════════
function RxDetail({ rx, inventory, now, onClose, onApprove, onReject, onDispense }: {
  rx: Prescription; inventory: InvProduct[]; now: number;
  onClose: () => void; onApprove: () => void; onReject: () => void; onDispense: () => void;
}) {
  const av = rxAvailability(rx, inventory);
  const phone = rx.phone && rx.phone !== "—" ? rx.phone : "";
  const events = [
    { label: "Uploaded", at: rx.uploadedAt, tone: "done" },
    ...(rx.approvedAt ? [{ label: `Approved${rx.reviewedBy ? ` · ${rx.reviewedBy}` : ""}`, at: rx.approvedAt, tone: "done" }] : []),
    ...(rx.rejectedAt ? [{ label: `Rejected${rx.reviewedBy ? ` · ${rx.reviewedBy}` : ""}`, at: rx.rejectedAt, tone: "bad" }] : []),
    ...(rx.dispensedAt ? [{ label: "Dispensed & billed", at: rx.dispensedAt, tone: "done" }] : []),
  ];
  const readyMsg = `Hi ${rx.patient}, your prescription ${rx.id} at our pharmacy is ready. Est. bill ${inr(av.value)}. — Namma MedMate`;
  const rejMsg = `Hi ${rx.patient}, we couldn't process prescription ${rx.id}. Reason: ${rx.rejectReason || "please re-upload a clearer copy"}. — Namma MedMate`;
  const notifyMsg = rx.status === "rejected" ? rejMsg : readyMsg;

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal pd-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head">
          <h3>Prescription {rx.id} <span className={`pd-pill ${RX_PILL[rx.status]}`} style={{ marginLeft: 6 }}>{RX_LABEL[rx.status]}</span>{rx.urgent && <span className="pd-pill pill-rose" style={{ marginLeft: 4 }}><IconBolt size={10} /> Urgent</span>}</h3>
          <button className="pd-x" onClick={onClose}><IconX size={18} /></button>
        </div>
        <div className="pd-modal-body">
          <div className="pd-rx-detail">
            {/* left: the Rx itself */}
            <div><RxView rx={rx} /></div>

            {/* right: patient, timeline, meds */}
            <div className="pd-rx-side">
              <div className="pd-rx-block">
                <div className="pd-rx-blkh"><IconUser size={13} /> Patient</div>
                <div className="pd-rx-kv"><span>Name</span><b>{rx.patient}</b></div>
                <div className="pd-rx-kv"><span>Phone</span><b>{rx.phone || "—"}</b></div>
                <div className="pd-rx-kv"><span>Channel</span><b><ChannelPill channel={rx.channel} /></b></div>
                <div className="pd-rx-kv"><span>Doctor</span><b>{rx.doctor}{rx.regNo ? ` · ${rx.regNo}` : ""}</b></div>
                {phone && <div className="pd-flex pd-gap6" style={{ marginTop: 8 }}>
                  <a className="pd-btn pd-btn-line pd-btn-sm" href={`tel:${phone.replace(/\s/g, "")}`}><IconPhone size={13} /> Call</a>
                  <a className="pd-btn pd-btn-wa pd-btn-sm" href={waLink(phone, notifyMsg)} target="_blank" rel="noreferrer"><IconWhatsApp size={13} /> WhatsApp</a>
                  <a className="pd-btn pd-btn-line pd-btn-sm" href={smsLink(phone, notifyMsg)}>SMS</a>
                </div>}
              </div>

              <div className="pd-rx-block">
                <div className="pd-rx-blkh"><IconClock size={13} /> Timeline</div>
                <div className="pd-rx-tl">
                  {events.map((e, i) => (
                    <div className={`pd-rx-tlrow ${e.tone}`} key={i}>
                      <span className="dot" />
                      <span className="lb">{e.label}</span>
                      <span className="tm">{fmtDateTime(e.at)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {av.total > 0 && (
                <div className="pd-rx-block">
                  <div className="pd-rx-blkh"><IconBox size={13} /> Verified medicines <span className="pd-muted" style={{ fontWeight: 600, marginLeft: "auto", fontSize: 11.5 }}>{av.inStock}/{av.total} in stock</span></div>
                  <table className="pd-tbl pd-rx-mtbl">
                    <tbody>
                      {av.items.map(({ p, stock, price, rx: isRx }) => (
                        <tr key={p.id}>
                          <td><span className="em" style={{ marginRight: 6 }}>{p.emoji}</span>{p.name}{isRx && <span className="pd-schtag">{SCHEDULE_META[p.schedule].label}</span>}</td>
                          <td className={stock > 0 ? "" : "pd-oos-txt"} style={{ textAlign: "right", fontSize: 12 }}>{stock > 0 ? `${stock} in stock` : "Out of stock"}</td>
                          <td style={{ textAlign: "right", fontWeight: 700 }}>{inr(price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr><td colSpan={2}><b>Estimated bill</b></td><td style={{ textAlign: "right", fontWeight: 800 }}>{inr(av.value)}</td></tr></tfoot>
                  </table>
                  {av.outOfStock.length > 0 && <div className="pd-rx-oos" style={{ marginTop: 8 }}><IconAlert size={12} /> {av.outOfStock.map((p) => p.name).join(", ")} out of stock — suggest a substitute or reorder.</div>}
                </div>
              )}
              {rx.note && <div className="pd-rx-block"><div className="pd-rx-blkh"><IconDoc size={13} /> Note</div><p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: 0 }}>{rx.note}</p></div>}
            </div>
          </div>
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Close</button>
          {rx.status === "pending" && <>
            <button className="pd-btn pd-btn-rose" onClick={onReject}><IconX size={14} /> Reject</button>
            <button className="pd-btn pd-btn-line" onClick={onApprove}><IconCheck size={14} /> Approve</button>
            <button className="pd-btn pd-btn-primary" onClick={onDispense}>Dispense → billing <IconArrowRight size={15} /></button>
          </>}
          {rx.status === "approved" && <button className="pd-btn pd-btn-primary" onClick={onDispense}>Dispense → billing <IconArrowRight size={15} /></button>}
          {rx.status === "rejected" && phone && <a className="pd-btn pd-btn-primary" href={waLink(phone, rejMsg)} target="_blank" rel="noreferrer"><IconWhatsApp size={14} /> Notify patient</a>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════ reject modal ══════════════════
function RejectModal({ rx, onClose, onConfirm }: { rx: Prescription; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="pd-modal-head"><h3>Reject {rx.id}</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <p className="pd-muted" style={{ fontSize: 12.5, marginTop: 0 }}>Pick a reason — {rx.patient} will see this so they can fix &amp; re-upload.</p>
          <div className="pd-rx-reasons">
            {REJECT_REASONS.map((rr) => (
              <button key={rr} className={`pd-rx-reason${reason === rr ? " on" : ""}`} onClick={() => setReason(rr)}>{reason === rr && <IconCheck size={13} />}{rr}</button>
            ))}
          </div>
          <label className="pd-field" style={{ marginTop: 10 }}><span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>Or write your own</span>
            <textarea className="pd-input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} style={{ marginTop: 4, resize: "vertical" }} />
          </label>
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-rose" disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}><IconX size={14} /> Reject prescription</button>
        </div>
      </div>
    </div>
  );
}
