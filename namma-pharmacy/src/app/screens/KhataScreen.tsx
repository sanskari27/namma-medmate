"use client";
import { useState, useMemo } from "react";
import { usePharma } from "../pharmaState";
import {
  inr, fmtDateTime, timeAgo, Sale, PayMode, PAY_LABEL, CreditPayment, CreditCustomer,
  creditCustomers, customerLedger, totalCreditOutstanding, SETTLED_MODES, waLink, smsLink, collectMsg,
  creditAging, creditAgingBuckets, CreditAging,
} from "../data";
import { IconSearch, IconX, IconCheck, IconWhatsApp, IconMessage, IconRupee, IconReceipt, IconUsers, IconAlert, IconArrowRight, IconClock, IconPhone } from "../components/Icon";

const BUCKET_TONE: Record<string, string> = { cur: "var(--green)", d60: "var(--gold)", d60p: "var(--rose)" };

export default function KhataScreen() {
  const { sales, creditPayments, recordCreditPayment, profile, now, go } = usePharma();
  const [tab, setTab] = useState<"dues" | "history">("dues");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<CreditCustomer | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sort, setSort] = useState<"out" | "age">("out");

  const rows = useMemo(() => creditCustomers(sales, creditPayments), [sales, creditPayments]);
  const due = useMemo(() => rows.filter((r) => r.outstanding > 0), [rows]);
  const agingByKey = useMemo(() => new Map(due.map((r) => [r.key, creditAging(r.key, sales, creditPayments, now)])), [due, sales, creditPayments, now]);
  const outstanding = totalCreditOutstanding(sales, creditPayments);
  const given = rows.reduce((a, r) => a + r.given, 0);
  const repaid = rows.reduce((a, r) => a + r.repaid, 0);
  const overdue = due.filter((r) => agingByKey.get(r.key)?.overdue);
  const overdueAmt = overdue.reduce((a, r) => a + r.outstanding, 0);
  const buckets = useMemo(() => creditAgingBuckets(due, sales, creditPayments, now), [due, sales, creditPayments, now]);
  const bucketMax = Math.max(1, ...buckets.map((b) => b.amount));
  const monthStart = useMemo(() => { const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); }, [now]);
  const collectedMonth = creditPayments.filter((p) => p.at >= monthStart).reduce((a, p) => a + p.amount, 0);
  const avgOut = due.length ? outstanding / due.length : 0;
  const collectionRate = given > 0 ? Math.round((repaid / given) * 100) : 0;

  const history = useMemo(() => [...creditPayments].sort((a, b) => b.at - a.at), [creditPayments]);
  const filteredDue = useMemo(() => {
    let l = due.filter((r) => (!overdueOnly || agingByKey.get(r.key)?.overdue) && (!q || `${r.name} ${r.phone}`.toLowerCase().includes(q.toLowerCase())));
    l = [...l].sort((a, b) => sort === "age" ? (agingByKey.get(b.key)?.ageDays ?? 0) - (agingByKey.get(a.key)?.ageDays ?? 0) : b.outstanding - a.outstanding);
    return l;
  }, [due, overdueOnly, q, sort, agingByKey]);

  const goDues = (od: boolean) => { setTab("dues"); setOverdueOnly(od); };

  return (
    <div className="pd-canvas-wide">
      {/* clickable KPI cards */}
      <div className="pd-stats" >
        <div className="pd-stat link" role="button" tabIndex={0} onClick={() => goDues(false)} title="See who owes you">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="ic ic-rose"><IconReceipt size={18} /></div><div className="lbl">Total outstanding</div><div className="val">{inr(outstanding)}</div>
          <div className="split">{due.length} account{due.length !== 1 ? "s" : ""} · avg {inr(avgOut)}</div>
        </div>
        <div className="pd-stat link" role="button" tabIndex={0} onClick={() => goDues(true)} title="Overdue > 30 days">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="ic ic-gold"><IconAlert size={18} /></div><div className="lbl">Overdue (30d+)</div><div className="val" style={{ color: overdueAmt > 0 ? "var(--rose)" : undefined }}>{inr(overdueAmt)}</div>
          <div className="split">{overdue.length} account{overdue.length !== 1 ? "s" : ""} to chase</div>
        </div>
        <div className="pd-stat link" role="button" tabIndex={0} onClick={() => setTab("history")} title="View repayments">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="ic ic-green"><IconRupee size={18} /></div><div className="lbl">Collected this month</div><div className="val">{inr(collectedMonth)}</div>
          <div className="split">{repaid > 0 ? `${collectionRate}% collection rate` : "no repayments yet"}</div>
        </div>
        <div className="pd-stat"><div className="ic ic-blue"><IconUsers size={18} /></div><div className="lbl">Credit given (all time)</div><div className="val">{inr(given)}</div><div className="split">{rows.length} khata account{rows.length !== 1 ? "s" : ""}</div></div>
      </div>

      {/* aging analysis */}
      <div className="pd-card" style={{ marginTop: 16 }}>
        <div className="pd-card-head"><h3>Aging of receivables</h3><span className="sub">by oldest unpaid bill · click a band to filter</span></div>
        <div className="pd-card-pad">
          <div className="pd-agebar">
            {buckets.map((b) => b.amount > 0 && (
              <button key={b.key} className="seg" style={{ flexGrow: b.amount, background: BUCKET_TONE[b.key] }} title={`${b.label}: ${inr(b.amount)}`} onClick={() => goDues(b.key !== "cur")} />
            ))}
            {outstanding <= 0 && <div className="seg empty" />}
          </div>
          <div className="pd-agelegend">
            {buckets.map((b) => (
              <button key={b.key} className="it" onClick={() => goDues(b.key !== "cur")}>
                <span className="dot" style={{ background: BUCKET_TONE[b.key] }} />
                <span className="lb">{b.label}</span>
                <b>{inr(b.amount)}</b>
                <span className="pd-muted" style={{ fontSize: 11 }}>{b.count} a/c</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pd-toolbar" style={{ marginTop: 16 }}>
        <div className="pd-seg">
          <button className={tab === "dues" ? "on" : ""} onClick={() => setTab("dues")}>Outstanding{due.length ? ` · ${due.length}` : ""}</button>
          <button className={tab === "history" ? "on" : ""} onClick={() => setTab("history")}>Payment history</button>
        </div>
        <div className="pd-spacer" />
        {tab === "dues" && <>
          <button className={`pd-chip${overdueOnly ? " on" : ""}`} onClick={() => setOverdueOnly((v) => !v)}><IconAlert size={13} /> Overdue only{overdue.length ? ` · ${overdue.length}` : ""}</button>
          <div className="pd-seg" style={{ padding: 2 }}>
            <button className={sort === "out" ? "on" : ""} style={{ padding: "5px 10px" }} onClick={() => setSort("out")}>Amount</button>
            <button className={sort === "age" ? "on" : ""} style={{ padding: "5px 10px" }} onClick={() => setSort("age")}>Oldest</button>
          </div>
          <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Search customer or phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </>}
        <button className="pd-btn pd-btn-primary" onClick={() => go("pos")}><IconReceipt size={15} /> New credit sale</button>
      </div>

      {tab === "dues" ? (
        <div className="pd-card">
          <div className="pd-tbl-wrap">
            <table className="pd-tbl">
              <thead><tr><th>Customer</th><th>Phone</th><th className="num">Bills</th><th className="num">Given</th><th className="num">Repaid</th><th className="num">Outstanding</th><th>Age</th><th>Collect</th></tr></thead>
              <tbody>
                {filteredDue.map((r) => {
                  const ag = agingByKey.get(r.key);
                  return (
                    <tr key={r.key} style={{ cursor: "pointer" }} onClick={() => setOpen(r)}>
                      <td><div className="prod"><span className="em"><IconUsers size={15} /></span><span className="nm">{r.name}</span></div></td>
                      <td className="pd-mono">{r.phone || "—"}</td>
                      <td className="num">{r.bills}</td>
                      <td className="num">{inr(r.given)}</td>
                      <td className="num pd-muted">{inr(r.repaid)}</td>
                      <td className="num" style={{ fontWeight: 800, color: "var(--rose)" }}>{inr(r.outstanding)}</td>
                      <td><span className={`pd-pill ${ag?.overdue ? "pill-rose" : ag && ag.ageDays > 15 ? "pill-gold" : "pill-gray"}`}>{ag?.ageDays ?? 0}d{ag?.overdue ? " · overdue" : ""}</span></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="pd-btn pd-btn-ghost pd-btn-sm" disabled={!r.phone} title="WhatsApp reminder"
                          onClick={() => window.open(waLink(r.phone, collectMsg(r.name, profile.name, r.outstanding, profile.phone)), "_blank")}>
                          <IconWhatsApp size={14} /> Remind
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredDue.length === 0 && <tr><td colSpan={8}><div className="pd-empty"><div className="em"><IconCheck size={28} /></div><p>{overdueOnly ? "No overdue accounts — nicely collected!" : "No outstanding credit — all khata settled."}</p></div></td></tr>}
              </tbody>
              {filteredDue.length > 0 && <tfoot><tr><td colSpan={5}>Total · {filteredDue.length} account{filteredDue.length !== 1 ? "s" : ""}</td><td className="num" style={{ fontWeight: 800 }}>{inr(filteredDue.reduce((a, r) => a + r.outstanding, 0))}</td><td colSpan={2}></td></tr></tfoot>}
            </table>
          </div>
        </div>
      ) : (
        <div className="pd-card">
          <div className="pd-tbl-wrap">
            <table className="pd-tbl">
              <thead><tr><th>Receipt</th><th>Date & time</th><th>Customer</th><th>Mode</th><th>Note</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {history.map((p) => {
                  const c = rows.find((x) => x.key === p.custKey);
                  return (
                    <tr key={p.id} style={{ cursor: c ? "pointer" : "default" }} onClick={() => c && setOpen(c)}>
                      <td className="pd-mono" style={{ fontWeight: 700 }}>{p.id}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(p.at)}</td>
                      <td>{p.custName}</td>
                      <td>{PAY_LABEL[p.mode]}</td>
                      <td className="pd-muted">{p.note || "—"}</td>
                      <td className="num" style={{ fontWeight: 800, color: "var(--green)" }}>+{inr(p.amount)}</td>
                    </tr>
                  );
                })}
                {history.length === 0 && <tr><td colSpan={6}><div className="pd-empty"><div className="em"><IconReceipt size={28} /></div><p>No repayments recorded yet.</p></div></td></tr>}
              </tbody>
              {history.length > 0 && <tfoot><tr><td colSpan={5}>Total collected · {history.length} repayment{history.length !== 1 ? "s" : ""}</td><td className="num" style={{ fontWeight: 800 }}>{inr(history.reduce((a, p) => a + p.amount, 0))}</td></tr></tfoot>}
            </table>
          </div>
        </div>
      )}

      {open && <KhataModal c={open} onClose={() => setOpen(null)} sales={sales} creditPayments={creditPayments} recordCreditPayment={recordCreditPayment} profile={profile} now={now} go={go} />}
    </div>
  );
}

function KhataModal({ c, onClose, sales, creditPayments, recordCreditPayment, profile, now, go }: {
  c: CreditCustomer; onClose: () => void; sales: Sale[]; creditPayments: CreditPayment[];
  recordCreditPayment: (p: { custKey: string; custName: string; custPhone: string; amount: number; mode: PayMode; note?: string }) => Promise<unknown>; profile: any; now: number; go: (r: any) => void;
}) {
  const ledger = customerLedger(c.key, sales, creditPayments);
  const aging: CreditAging = creditAging(c.key, sales, creditPayments, now);
  const [repay, setRepay] = useState(c.outstanding > 0);
  const [amt, setAmt] = useState(c.outstanding);
  const [mode, setMode] = useState<PayMode>("cash");
  const doRepay = async () => { if (amt <= 0) return; const err = await recordCreditPayment({ custKey: c.key, custName: c.name, custPhone: c.phone, amount: Math.min(amt, c.outstanding || amt), mode }); if (!err) setRepay(false); };
  const collectText = collectMsg(c.name, profile.name, c.outstanding, profile.phone);
  const firstBillAt = Math.min(...ledger.filter((r) => r.kind === "debit").map((r) => r.at), now);

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head">
          <div>
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>{c.name} · Khata {aging.overdue && <span className="pd-pill pill-rose">Overdue {aging.ageDays}d</span>}</h3>
            <div className="pd-muted" style={{ fontSize: 12.5, marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span><IconPhone size={11} /> {c.phone || "—"}</span>
              <span><IconClock size={11} /> Credit since {fmtDateTime(firstBillAt).split(",")[0]}</span>
            </div>
          </div>
          <button className="pd-x" onClick={onClose}><IconX size={18} /></button>
        </div>
        <div className="pd-modal-body">
          <div className="pd-summary-chips">
            <div className="pd-schip">Credit given<b>{inr(c.given)}</b></div>
            <div className="pd-schip">Repaid<b style={{ color: "var(--green)" }}>{inr(c.repaid)}</b></div>
            <div className="pd-schip">Outstanding<b style={{ color: c.outstanding > 0 ? "var(--rose)" : "var(--green)", fontSize: 15 }}>{inr(c.outstanding)}</b></div>
            <div className="pd-schip">Unpaid bills<b>{aging.unpaidBills.length}</b></div>
            <div className="pd-schip">Oldest due<b style={{ color: aging.overdue ? "var(--rose)" : undefined }}>{aging.oldestUnpaidAt ? `${aging.ageDays}d` : "—"}</b></div>
          </div>

          {/* actions */}
          <div className="pd-flex" style={{ gap: 8, alignItems: "center", flexWrap: "wrap", margin: "6px 0 12px" }}>
            {c.outstanding > 0 && !repay && <button className="pd-btn pd-btn-primary" onClick={() => { setAmt(c.outstanding); setRepay(true); }}><IconRupee size={15} /> Record repayment</button>}
            <button className="pd-btn pd-btn-ghost" disabled={!c.phone} onClick={() => window.open(waLink(c.phone, collectText), "_blank")}><IconWhatsApp size={15} /> Send reminder</button>
            <button className="pd-btn pd-btn-ghost" disabled={!c.phone} onClick={() => window.open(smsLink(c.phone, collectText), "_blank")}><IconMessage size={15} /> SMS</button>
            <button className="pd-btn pd-btn-ghost" onClick={() => { onClose(); go("pos"); }}><IconReceipt size={15} /> New credit sale</button>
          </div>

          {repay && c.outstanding > 0 && (
            <div className="pd-card pd-card-pad" style={{ background: "var(--wash2)", marginBottom: 14 }}>
              <div className="pd-flex" style={{ gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {[500, 1000, 2000].filter((v) => v < c.outstanding).map((v) => <button key={v} className={`pd-chip${amt === v ? " on" : ""}`} onClick={() => setAmt(v)}>{inr(v)}</button>)}
                <button className={`pd-chip${amt === Math.round(c.outstanding / 2) ? " on" : ""}`} onClick={() => setAmt(Math.round(c.outstanding / 2))}>Half</button>
                <button className={`pd-chip${amt === c.outstanding ? " on" : ""}`} onClick={() => setAmt(c.outstanding)}>Full · {inr(c.outstanding)}</button>
              </div>
              <div className="pd-flex" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input className="pd-input" data-field="amount" type="number" min={0} value={amt || ""} onChange={(e) => setAmt(Number(e.target.value) || 0)} placeholder="Amount ₹" style={{ width: 120 }} autoFocus />
                <select className="pd-select" value={mode} onChange={(e) => setMode(e.target.value as PayMode)} style={{ width: 120 }}>{SETTLED_MODES.filter((m) => m !== "cod").map((m) => <option key={m} value={m}>{PAY_LABEL[m]}</option>)}</select>
                <button className="pd-btn pd-btn-primary" disabled={amt <= 0} onClick={doRepay}><IconCheck size={14} /> Collect {inr(Math.min(amt, c.outstanding || amt))}</button>
                <button className="pd-btn pd-btn-ghost" onClick={() => setRepay(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="pd-grid-2">
            {/* unpaid bills */}
            <div>
              <div className="pd-pl-head" style={{ marginTop: 0 }}>Unpaid bills <span className="pd-muted" style={{ fontWeight: 500, fontSize: 12 }}>· FIFO</span></div>
              <div className="pd-card" style={{ overflow: "hidden" }}>
                {aging.unpaidBills.length === 0 ? <div className="pd-empty" style={{ padding: 16 }}><div className="em"><IconCheck size={24} /></div><p>Fully settled.</p></div> :
                  aging.unpaidBills.map((b) => {
                    const d = Math.floor((now - b.at) / 86400000);
                    return (
                      <div className="pd-medrow" key={b.id}>
                        <span className="em" style={{ color: d > 30 ? "var(--rose)" : "var(--mid)" }}><IconReceipt size={14} /></span>
                        <span className="gw"><div className="t pd-mono">{b.id}</div><div className="s">{fmtDateTime(b.at).split(",")[0]} · {b.items} items · {d}d old</div></span>
                        <span style={{ textAlign: "right" }}><b style={{ color: "var(--rose)", fontSize: 13 }}>{inr(b.remaining)}</b>{b.remaining < b.amount && <div className="pd-muted" style={{ fontSize: 10.5 }}>of {inr(b.amount)}</div>}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* full ledger */}
            <div>
              <div className="pd-pl-head" style={{ marginTop: 0 }}>Account ledger <span className="pd-muted" style={{ fontWeight: 500, fontSize: 12 }}>· {ledger.length}</span></div>
              <div className="pd-card" style={{ overflow: "hidden", maxHeight: 260, overflowY: "auto" }}>
                {ledger.length === 0 ? <div className="pd-empty" style={{ padding: 16 }}><p>No activity.</p></div> :
                  ledger.map((r, i) => (
                    <div className="pd-medrow" key={i}>
                      <span className="em" style={{ color: r.kind === "debit" ? "var(--rose)" : "var(--green)" }}>{r.kind === "debit" ? "−" : "+"}</span>
                      <span className="gw"><div className="t">{r.label}</div><div className="s pd-mono">{r.ref} · {timeAgo(r.at, now)}</div></span>
                      <b style={{ color: r.kind === "debit" ? "var(--rose)" : "var(--green)", fontSize: 13 }}>{r.kind === "debit" ? "−" : "+"}{inr(r.amount)}</b>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
        <div className="pd-modal-foot"><button className="pd-btn pd-btn-ghost" onClick={onClose}>Close</button>{c.outstanding > 0 && <button className="pd-btn pd-btn-primary" disabled={!c.phone} onClick={() => window.open(waLink(c.phone, collectText), "_blank")}><IconWhatsApp size={15} /> Send reminder</button>}</div>
      </div>
    </div>
  );
}
