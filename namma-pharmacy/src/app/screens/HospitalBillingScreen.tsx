"use client";
import { useState, useMemo, useEffect } from "react";
import { usePharma } from "../pharmaState";
import { inr, fmtDateTime, mrpOf, stockOf, earliestBatch, PayMode, PAY_LABEL, InvProduct, findScan, hasLocation, waLink, smsLink, timeAgo } from "../data";
import { WardIndent } from "../lib/hospital";
import {
  CreditTerms, CREDIT_TERMS, SUPPLY_REASONS, WardSupplyReason, reasonMeta, WardSupplyItem, WardSupply,
  creditPriceOf, hospitalOutstanding, suppliedTotal, returnedTotal, paidTotal,
  wardOnHand, buildStatement, termDays, PriceMode, ADMIN_PRICING_OTP,
  hospitalAging, wardConsumption, topSuppliedItems, monthlyHospitalFlow,
} from "../lib/hospitalAccount";
import {
  IconSearch, IconPlus, IconX, IconRupee, IconReports, IconPrint, IconTrash, IconLock, IconUnlock,
  IconHospital, IconReceipt, IconTag, IconKey, IconCamera, IconArrowRight, IconAlert, IconChart,
  IconWhatsApp, IconMail, IconSend, IconWallet, IconBox, IconShield, IconCalendar, IconCheck, IconCopy, IconStore,
} from "../components/Icon";
import { buildReportPdf } from "../lib/pdf";
import { useDateRange } from "../components/DateRangeField";
import WardSupplyInvoice, { SupplyInvoiceData } from "../components/WardSupplyInvoice";
import QtyBox from "../components/QtyBox";

type LineType = "all" | "issue" | "return" | "payment";
const LINE_FILTERS: { k: LineType; label: string }[] = [{ k: "all", label: "All" }, { k: "issue", label: "Supplied" }, { k: "return", label: "Returns" }, { k: "payment", label: "Payments" }];

const supplyToInvoice = (s: WardSupply): SupplyInvoiceData => ({ invoiceNo: s.id, at: s.at, wardName: s.wardName, reason: s.reason, patientId: s.patientId, patientName: s.patientName, refDoc: s.refDoc, indentId: s.indentId, items: s.items });

const REASON_TONE: Record<WardSupplyReason, string> = { floor: "pill-blue", consumption: "pill-gold", refill: "pill-teal" };
const download = (blob: Blob, name: string) => { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 6000); };
const fmtDay = (ts: number) => new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

type Tab = "overview" | "issue" | "stock" | "account" | "prices";

// shared hospital-credit-price accessor
function useCreditPrice() {
  const { inventory, hospitalAccount, hospitalPriceRules } = usePharma();
  return useMemo(() => (id: string) => { const p = inventory.find((x) => x.id === id); return p ? creditPriceOf(p, hospitalAccount, hospitalPriceRules) : 0; }, [inventory, hospitalAccount, hospitalPriceRules]);
}

// admin OTP gate — unlock pricing changes
function AdminOtpModal({ onClose }: { onClose: () => void }) {
  const { unlockPricing } = usePharma();
  const [otp, setOtp] = useState("");
  const submit = () => { if (unlockPricing(otp)) onClose(); };
  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3><IconLock size={16} /> Admin approval</h3><button className="pd-iconbtn" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <p className="pd-muted" style={{ fontSize: 13, marginBottom: 12 }}>Institutional pricing is protected. Enter the admin OTP to make changes.</p>
          <div className="pd-field"><label>Admin OTP</label><input className="pd-input pd-mono" style={{ letterSpacing: ".4em", textAlign: "center", fontSize: 18 }} inputMode="numeric" maxLength={6} value={otp} autoFocus onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="••••••" /></div>
          <div className="pd-muted" style={{ fontSize: 12, marginTop: 8, background: "var(--wash2)", border: "1px dashed var(--line-2)", borderRadius: 8, padding: "7px 11px" }}>Demo admin OTP: <b>{ADMIN_PRICING_OTP}</b> <button className="pd-btn pd-btn-ghost pd-btn-sm" style={{ marginLeft: 6 }} onClick={() => setOtp(ADMIN_PRICING_OTP)}>Auto-fill</button></div>
        </div>
        <div className="pd-modal-foot"><button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button><button className="pd-btn pd-btn-primary" disabled={otp.length !== 6} onClick={submit}>Unlock pricing</button></div>
      </div>
    </div>
  );
}

// match a ward-indent's free-text item names to catalogue products → editable bill rows
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
function indentToRows(indent: WardIndent, inventory: InvProduct[], cp: (id: string) => number) {
  return indent.items.map((it) => {
    const p = inventory.find((pp) => { const a = norm(pp.name), b = norm(it.name); return a === b || b.includes(a) || a.includes(b); });
    return p ? { productId: p.id, qty: it.qty, price: cp(p.id) } : null;
  }).filter(Boolean) as { productId: string; qty: number; price: number }[];
}

export default function HospitalBillingScreen() {
  const { hospitalAccount, wardSupplies, hospitalPayments, billIndentTarget, clearBillIndentTarget, now } = usePharma();
  const [tab, setTab] = useState<Tab>("overview");
  const [modal, setModal] = useState<"issue" | "return" | "payment" | "reminder" | null>(null);
  // arriving from Ward Indents ("Bill & issue to hospital") opens the issue modal pre-loaded
  useEffect(() => { if (billIndentTarget) { setTab("issue"); setModal("issue"); } }, [billIndentTarget]);

  const outstanding = hospitalOutstanding(wardSupplies, hospitalPayments);
  const supplied = suppliedTotal(wardSupplies);
  const returns = returnedTotal(wardSupplies);
  const received = paidTotal(hospitalPayments);
  const aging = hospitalAging(wardSupplies, hospitalPayments, now, hospitalAccount.creditTerms);

  const TABS: { k: Tab; label: string }[] = [
    { k: "overview", label: "Overview" },
    { k: "issue", label: "Issue to ward" },
    { k: "stock", label: "Ward stock" },
    { k: "account", label: "Account & statement" },
    { k: "prices", label: "Price list" },
  ];

  return (
    <div className="pd-canvas-wide">
      <div className="pd-hb-banner">
        <span className="ic"><IconHospital size={18} /></span>
        <div>
          <b>Bill-to: {hospitalAccount.name}</b>
          <small>Every ward / emergency / refill issue is billed to the hospital on credit at the institutional price ({hospitalAccount.discountPct}% off MRP) · terms {hospitalAccount.creditTerms}. The hospital settles with patients on its own.</small>
        </div>
        <div className="pd-spacer" />
        {aging.overdue > 0 && <div className="pd-hb-due overdue"><span>Overdue</span><b>{inr(aging.overdue)}</b></div>}
        <div className="pd-hb-due"><span>Hospital owes</span><b>{inr(outstanding)}</b></div>
      </div>

      <div className="pd-toolbar" style={{ marginTop: 16 }}>
        <div className="pd-seg">
          {TABS.map((t) => <button key={t.k} className={tab === t.k ? "on" : ""} onClick={() => setTab(t.k)}>{t.label}</button>)}
        </div>
        <div className="pd-spacer" />
        {(tab === "overview" || tab === "issue") && <>
          {tab === "issue" && <button className="pd-btn pd-btn-ghost" onClick={() => setModal("return")}>↩ Record return</button>}
          <button className="pd-btn pd-btn-primary" onClick={() => setModal("issue")}><IconPlus size={16} /> New ward issue</button>
        </>}
        {tab === "overview" && <button className="pd-btn pd-btn-ghost" onClick={() => setModal("payment")}><IconRupee size={15} /> Record payment</button>}
        {tab === "account" && <button className="pd-btn pd-btn-primary" onClick={() => setModal("payment")}><IconRupee size={15} /> Record payment</button>}
      </div>

      {tab === "overview" && <OverviewTab outstanding={outstanding} supplied={supplied} returns={returns} received={received} aging={aging}
        goTab={setTab} onNewIssue={() => setModal("issue")} onRecordPayment={() => setModal("payment")} onRemind={() => setModal("reminder")} />}
      {tab === "issue" && <IssuesTable />}
      {tab === "stock" && <WardStockTab />}
      {tab === "account" && <AccountTab outstanding={outstanding} supplied={supplied} returns={returns} received={received} aging={aging} onRemind={() => setModal("reminder")} />}
      {tab === "prices" && <PriceListTab />}

      {modal === "issue" && <SupplyModal mode="issue" prefillIndentId={billIndentTarget} onClose={() => { setModal(null); clearBillIndentTarget(); }} />}
      {modal === "return" && <SupplyModal mode="return" onClose={() => setModal(null)} />}
      {modal === "payment" && <PaymentModal onClose={() => setModal(null)} outstanding={outstanding} />}
      {modal === "reminder" && <ReminderModal onClose={() => setModal(null)} outstanding={outstanding} aging={aging} />}
    </div>
  );
}

/* ── overview dashboard ──────────────────────────────────────── */
function OverviewTab({ outstanding, supplied, returns, received, aging, goTab, onNewIssue, onRecordPayment, onRemind }: {
  outstanding: number; supplied: number; returns: number; received: number; aging: ReturnType<typeof hospitalAging>;
  goTab: (t: Tab) => void; onNewIssue: () => void; onRecordPayment: () => void; onRemind: () => void;
}) {
  const { wardSupplies, hospitalPayments, hospitalAccount: a, wards, now } = usePharma();
  const kpiKey = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } };
  const issues = wardSupplies.filter((s) => s.kind === "issue");
  const wardCons = useMemo(() => wardConsumption(wardSupplies), [wardSupplies]);
  const topItems = useMemo(() => topSuppliedItems(wardSupplies, 6), [wardSupplies]);
  const flow = useMemo(() => monthlyHospitalFlow(wardSupplies, hospitalPayments, now, 6), [wardSupplies, hospitalPayments, now]);
  const flowMax = Math.max(1, ...flow.map((f) => Math.max(f.supplied, f.received)));
  const avgIssue = issues.length ? supplied / issues.length : 0;
  const limit = a.creditLimit || 0;
  const util = limit > 0 ? Math.min(100, Math.round((outstanding / limit) * 100)) : 0;
  const available = Math.max(0, limit - outstanding);
  const near = limit > 0 && util >= 85;
  const activeWards = new Set(issues.map((s) => s.wardId)).size;
  const agingMax = Math.max(1, ...aging.buckets.map((b) => b.amount));
  const activity = useMemo(() => [
    ...wardSupplies.map((s) => ({ at: s.at, kind: s.kind as string, label: `${s.kind === "return" ? "Return from" : "Issued to"} ${s.wardName}`, amount: s.total, sign: s.kind === "return" ? -1 : 1, ref: s.id })),
    ...hospitalPayments.map((p) => ({ at: p.at, kind: "payment", label: `Payment received${p.ref ? " · " + p.ref : ""}`, amount: p.amount, sign: -1, ref: p.id })),
  ].sort((x, y) => y.at - x.at).slice(0, 6), [wardSupplies, hospitalPayments]);

  return (
    <>
      {/* credit position + aging */}
      <div className="pd-hb-grid2" style={{ marginBottom: 16 }}>
        <div className="pd-card pd-card-pad">
          <div className="pd-hb-cardh"><IconWallet size={15} /> Credit position</div>
          <div className="pd-hb-owe"><span>Hospital owes</span><b style={{ color: outstanding > 0 ? "var(--rose)" : "var(--mid)" }}>{inr(outstanding)}</b></div>
          {limit > 0 ? <>
            <div className={`pd-util${near ? " near" : ""}`}><span style={{ width: `${util}%` }} /></div>
            <div className="pd-hb-utilrow"><span>{inr(outstanding)} of {inr(limit)} limit</span><b>{util}% used</b></div>
            <div className="pd-hb-utilrow"><span>Available credit</span><b style={{ color: "var(--mid)" }}>{inr(available)}</b></div>
            {near && <div className="pd-rx-oos" style={{ marginTop: 8 }}><IconAlert size={12} /> Credit limit almost reached — collect a payment before issuing more.</div>}
          </> : <p className="pd-muted" style={{ fontSize: 12.5 }}>No credit limit set — add one in Account &amp; statement.</p>}
          <div className="pd-hb-mini">
            <div><span>Supplied</span><b>{inr(supplied)}</b></div>
            <div><span>Returns</span><b>{inr(returns)}</b></div>
            <div><span>Received</span><b>{inr(received)}</b></div>
          </div>
        </div>

        <div className="pd-card pd-card-pad">
          <div className="pd-hb-cardh"><IconCalendar size={15} /> Ageing of outstanding
            <button className="pd-btn pd-btn-line pd-btn-sm" style={{ marginLeft: "auto" }} onClick={onRemind}><IconSend size={13} /> Send reminder</button>
          </div>
          {aging.overdue > 0
            ? <div className="pd-hb-overdue"><IconAlert size={14} /> <b>{inr(aging.overdue)}</b> overdue{aging.overdueDays > 0 ? ` · oldest ${aging.overdueDays} days past due` : ""}{aging.dueDate ? ` (due ${fmtDay(aging.dueDate)})` : ""}</div>
            : <div className="pd-hb-clear"><IconCheck size={14} /> Nothing overdue — all within {a.creditTerms === "On demand" ? "terms" : a.creditTerms}</div>}
          <div className="pd-agebars">
            {aging.buckets.map((b) => (
              <div className="pd-agebar" key={b.key}>
                <div className="pd-agebar-top"><span>{b.label}</span><b>{inr(b.amount)}</b></div>
                <div className="pd-prog"><i className={b.key === "0-30" ? "" : "over"} style={{ width: `${(b.amount / agingMax) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="pd-stats" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        <div className="pd-stat link" role="button" tabIndex={0} onClick={() => goTab("issue")} onKeyDown={kpiKey(() => goTab("issue"))} title="Ward issues log">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="ic ic-green"><IconReceipt size={18} /></div><div className="lbl">Ward issues</div><div className="val">{issues.length}</div><div className="split">billed to hospital</div>
        </div>
        <div className="pd-stat"><div className="ic ic-blue"><IconRupee size={18} /></div><div className="lbl">Supplied value</div><div className="val">{inr(supplied)}</div><div className="split">gross, all time</div></div>
        <div className="pd-stat link" role="button" tabIndex={0} onClick={onRecordPayment} onKeyDown={kpiKey(onRecordPayment)} title="Record a payment">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="ic ic-green"><IconWallet size={18} /></div><div className="lbl">Payments received</div><div className="val">{inr(received)}</div><div className="split">click to record</div>
        </div>
        <div className="pd-stat"><div className="ic ic-gold"><IconArrowRight size={18} /></div><div className="lbl">Avg issue value</div><div className="val">{inr(avgIssue)}</div><div className="split">per ward issue</div></div>
        <div className="pd-stat link" role="button" tabIndex={0} onClick={() => goTab("stock")} onKeyDown={kpiKey(() => goTab("stock"))} title="Ward stock on hand">
          <span className="go"><IconArrowRight size={16} /></span>
          <div className="ic ic-teal"><IconStore size={18} /></div><div className="lbl">Active wards</div><div className="val">{activeWards}</div><div className="split">of {wards.length} total</div>
        </div>
        <div className="pd-stat"><div className="ic ic-rose"><IconAlert size={18} /></div><div className="lbl">Overdue</div><div className="val" style={{ color: aging.overdue > 0 ? "var(--rose)" : undefined }}>{inr(aging.overdue)}</div><div className="split">{aging.overdueDays > 0 ? `${aging.overdueDays} days past due` : "on track"}</div></div>
      </div>

      {/* leaderboards */}
      <div className="pd-hb-grid2" style={{ marginTop: 16 }}>
        <div className="pd-card pd-card-pad">
          <div className="pd-hb-cardh"><IconHospital size={15} /> Consumption by ward
            <button className="pd-btn pd-btn-line pd-btn-sm" style={{ marginLeft: "auto" }} onClick={() => goTab("stock")}>Ward stock <IconArrowRight size={13} /></button>
          </div>
          {wardCons.length === 0 ? <p className="pd-muted" style={{ fontSize: 12.5 }}>No ward issues yet.</p> : wardCons.slice(0, 5).map((w) => {
            const max = wardCons[0].net || 1;
            return (
              <div key={w.wardId} style={{ marginBottom: 10 }}>
                <div className="pd-flex" style={{ justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}><span>{w.wardName}<span className="pd-muted"> · {w.issues} issue{w.issues !== 1 ? "s" : ""}</span></span><b>{inr(w.net)}</b></div>
                <div className="pd-prog"><i style={{ width: `${(w.net / max) * 100}%` }} /></div>
              </div>
            );
          })}
        </div>
        <div className="pd-card pd-card-pad">
          <div className="pd-hb-cardh"><IconBox size={15} /> Top medicines supplied</div>
          {topItems.length === 0 ? <p className="pd-muted" style={{ fontSize: 12.5 }}>No data yet.</p> : (
            <table className="pd-tbl pd-hb-mtbl"><tbody>
              {topItems.map((it) => (
                <tr key={it.productId || it.name}><td>{it.name}</td><td className="num pd-muted" style={{ fontSize: 12 }}>×{it.qty}</td><td className="num" style={{ fontWeight: 700 }}>{inr(it.amount)}</td></tr>
              ))}
            </tbody></table>
          )}
        </div>
      </div>

      {/* monthly flow + recent activity */}
      <div className="pd-hb-grid2" style={{ marginTop: 16 }}>
        <div className="pd-card pd-card-pad">
          <div className="pd-hb-cardh"><IconChart size={15} /> Supplied vs received · 6 months</div>
          <div className="pd-hb-flow">
            {flow.map((f, i) => (
              <div className="pd-hb-flowcol" key={i}>
                <div className="pd-hb-bars">
                  <span className="sup" style={{ height: `${(f.supplied / flowMax) * 100}%` }} title={`Supplied ${inr(f.supplied)}`} />
                  <span className="rec" style={{ height: `${(f.received / flowMax) * 100}%` }} title={`Received ${inr(f.received)}`} />
                </div>
                <small>{f.label}</small>
              </div>
            ))}
          </div>
          <div className="pd-rx-legend" style={{ marginTop: 4 }}><span><i style={{ background: "var(--mid)" }} /> Supplied</span><span><i style={{ background: "#8a6ee0" }} /> Received</span></div>
        </div>
        <div className="pd-card pd-card-pad">
          <div className="pd-hb-cardh"><IconClockLite /> Recent activity
            <button className="pd-btn pd-btn-line pd-btn-sm" style={{ marginLeft: "auto" }} onClick={() => goTab("account")}>Statement <IconArrowRight size={13} /></button>
          </div>
          <div className="pd-hb-acts">
            {activity.map((e, i) => (
              <div className="pd-hb-act" key={i}>
                <span className={`dot ${e.kind}`} />
                <span className="lb">{e.label}<small>{e.ref} · {timeAgo(e.at, now)}</small></span>
                <b style={{ color: e.sign < 0 ? "var(--mid)" : "var(--ink)" }}>{e.sign < 0 ? "−" : ""}{inr(e.amount)}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
const IconClockLite = () => <IconCalendar size={15} />;

/* ── payment reminder (compose links — pharmacist sends) ─────── */
function ReminderModal({ onClose, outstanding, aging }: { onClose: () => void; outstanding: number; aging: ReturnType<typeof hospitalAging> }) {
  const { hospitalAccount: a, profile } = usePharma();
  const [copied, setCopied] = useState(false);
  const msg = [
    `Dear ${a.name},`,
    ``,
    `This is a payment reminder from ${profile.name}.`,
    `Outstanding on your credit account: ${inr(outstanding)}.`,
    ...(aging.overdue > 0 ? [`Overdue (past ${a.creditTerms}): ${inr(aging.overdue)}${aging.dueDate ? `, due ${fmtDay(aging.dueDate)}` : ""}.`] : []),
    ``,
    `Kindly arrange settlement at your earliest. Thank you.`,
  ].join("\n");
  const phone = a.phone || "";
  const mail = `mailto:${a.email || ""}?subject=${encodeURIComponent(`Payment reminder — ${inr(outstanding)} outstanding`)}&body=${encodeURIComponent(msg)}`;

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>Send payment reminder</h3><button className="pd-iconbtn" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-summary-chips" style={{ marginBottom: 12 }}>
            <div className="pd-schip">Outstanding<b style={{ color: "var(--rose)" }}>{inr(outstanding)}</b></div>
            {aging.overdue > 0 && <div className="pd-schip">Overdue<b style={{ color: "var(--rose)" }}>{inr(aging.overdue)}</b></div>}
            <div className="pd-schip">Terms<b>{a.creditTerms}</b></div>
          </div>
          <div className="pd-msgbox">{msg}</div>
          <div className="pd-share-row">
            <button className="pd-btn pd-btn-line" onClick={() => { navigator.clipboard?.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <IconCheck size={15} /> : <IconCopy size={15} />} {copied ? "Copied" : "Copy"}</button>
            <a className="pd-btn pd-btn-wa" href={phone ? waLink(phone, msg) : undefined} target="_blank" rel="noreferrer" aria-disabled={!phone}><IconWhatsApp size={15} /> WhatsApp</a>
            <a className="pd-btn pd-btn-line" href={phone ? smsLink(phone, msg) : undefined} aria-disabled={!phone}>SMS</a>
            <a className="pd-btn pd-btn-line" href={mail}><IconMail size={15} /> Email</a>
          </div>
          <p className="pd-hint"><IconAlert size={12} /> Opens WhatsApp / SMS / email prefilled to the hospital's billing contact — you press send.</p>
        </div>
        <div className="pd-modal-foot"><button className="pd-btn pd-btn-primary" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

/* ── issues / returns log ────────────────────────────────────── */
function IssuesTable() {
  const { wardSupplies, wards, profile, hospitalAccount } = usePharma();
  const [inv, setInv] = useState<WardSupply | null>(null);
  const [q, setQ] = useState("");
  const [wardId, setWardId] = useState("all");
  const [kind, setKind] = useState<"all" | "issue" | "return" | "refill">("all");
  const ql = q.trim().toLowerCase();
  const rows = [...wardSupplies].filter((s) => {
    if (wardId !== "all" && s.wardId !== wardId) return false;
    if (kind === "issue" && s.kind !== "issue") return false;
    if (kind === "return" && s.kind !== "return") return false;
    if (kind === "refill" && !(s.kind === "issue" && s.reason === "refill")) return false;
    if (ql && !(`${s.id} ${s.wardName} ${s.patientId ?? ""} ${s.patientName ?? ""} ${s.refDoc ?? ""} ${s.items.map((i) => i.name).join(" ")}`.toLowerCase().includes(ql))) return false;
    return true;
  }).sort((a, b) => b.at - a.at);
  const shownTotal = rows.filter((s) => s.kind === "issue").reduce((a, s) => a + s.total, 0) - rows.filter((s) => s.kind === "return").reduce((a, s) => a + s.total, 0);
  return (
    <>
    <div className="pd-toolbar" style={{ marginBottom: 12 }}>
      <div className="pd-search-inline"><span className="ic"><IconSearch size={16} /></span><input placeholder="Search ref, ward, patient, medicine…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <select className="pd-select" value={wardId} onChange={(e) => setWardId(e.target.value)}><option value="all">All wards</option>{wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
      <div className="pd-seg">
        {(["all", "issue", "refill", "return"] as const).map((k) => <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{k === "all" ? "All" : k === "issue" ? "Issues" : k === "refill" ? "Refills" : "Returns"}</button>)}
      </div>
      <div className="pd-spacer" />
      <span className="pd-muted" style={{ fontSize: 12.5 }}>{rows.length} row{rows.length !== 1 ? "s" : ""} · net {inr(shownTotal)}</span>
    </div>
    <div className="pd-card"><div className="pd-tbl-wrap">
      <table className="pd-tbl">
        <thead><tr><th>Ref</th><th>Date</th><th>Ward</th><th>Reason</th><th>Patient (refill)</th><th>Items</th><th className="num">Amount</th><th>Invoice</th></tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td className="pd-mono" style={{ fontWeight: 700 }}>{s.id}{s.refDoc ? <div className="pd-muted" style={{ fontSize: 11 }}>{s.refDoc}</div> : null}</td>
              <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(s.at)}</td>
              <td>{s.wardName}</td>
              <td>{s.kind === "return" ? <span className="pd-pill pill-gray">Return</span> : <span className={`pd-pill ${REASON_TONE[s.reason]}`}>{reasonMeta(s.reason).tag}</span>}</td>
              <td>{s.patientId ? <span className="pd-mono" style={{ fontSize: 12 }}>{s.patientId}<div className="pd-muted" style={{ fontWeight: 500 }}>{s.patientName}</div></span> : <span className="pd-muted">—</span>}</td>
              <td>{s.items.length}<div className="pd-muted" style={{ fontSize: 11 }}>{s.items.map((i) => `${i.name}×${i.qty}`).join(", ").slice(0, 40)}</div></td>
              <td className="num" style={{ fontWeight: 800, color: s.kind === "return" ? "var(--mid)" : "var(--ink)" }}>{s.kind === "return" ? "−" : ""}{inr(s.total)}</td>
              <td>{s.kind === "issue" ? <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => setInv(s)}><IconReceipt size={13} /> View</button> : <span className="pd-muted">—</span>}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8}><div className="pd-empty"><div className="em"><IconHospital size={28} /></div><p>No ward issues yet — create one with “New ward issue”.</p></div></td></tr>}
        </tbody>
      </table>
      {inv && <WardSupplyInvoice data={supplyToInvoice(inv)} profile={profile} account={hospitalAccount} onClose={() => setInv(null)} />}
    </div></div>
    </>
  );
}

/* ── ward stock on hand ──────────────────────────────────────── */
function WardStockTab() {
  const { wardSupplies, wards } = usePharma();
  const cp = useCreditPrice();
  const [w, setW] = useState("all");
  const rows = wardOnHand(wardSupplies, cp, w === "all" ? undefined : w);
  const totalVal = rows.reduce((a, r) => a + r.value, 0);
  return (
    <>
      <div className="pd-toolbar" style={{ marginBottom: 14 }}>
        <select className="pd-select" value={w} onChange={(e) => setW(e.target.value)}>
          <option value="all">All wards</option>
          {wards.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <div className="pd-spacer" />
        <span className="pd-muted" style={{ fontSize: 13 }}>Stock currently held in wards (valued at credit price)</span>
      </div>
      <div className="pd-card"><div className="pd-tbl-wrap">
        <table className="pd-tbl">
          <thead><tr><th>Ward</th><th>Medicine</th><th className="num">On hand</th><th className="num">Credit price</th><th className="num">Value</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.wardId + r.productId}>
                <td>{r.wardName}</td><td>{r.name}</td>
                <td className="num" style={{ fontWeight: 700 }}>{r.qty}</td>
                <td className="num">{inr(r.price)}</td>
                <td className="num" style={{ fontWeight: 800 }}>{inr(r.value)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5}><div className="pd-empty">No ward stock on hand.</div></td></tr>}
          </tbody>
          {rows.length > 0 && <tfoot><tr><td colSpan={4} style={{ textAlign: "right", fontWeight: 700 }}>Total ward stock value</td><td className="num" style={{ fontWeight: 800 }}>{inr(totalVal)}</td></tr></tfoot>}
        </table>
      </div></div>
    </>
  );
}

/* ── hospital account + credit statement ─────────────────────── */
function AccountTab({ outstanding, supplied, returns, received, aging, onRemind }: { outstanding: number; supplied: number; returns: number; received: number; aging: ReturnType<typeof hospitalAging>; onRemind: () => void }) {
  const { hospitalAccount: a, updateHospitalAccount, wardSupplies, hospitalPayments, profile, now } = usePharma();
  const limit = a.creditLimit || 0;
  const util = limit > 0 ? Math.min(100, Math.round((outstanding / limit) * 100)) : 0;
  const lines = useMemo(() => buildStatement(wardSupplies, hospitalPayments), [wardSupplies, hospitalPayments]);
  const dueDays = termDays(a.creditTerms);

  // standard date-range filter (+ entry-type filter) over the statement
  const period = useDateRange(now, "last-365");
  const [tf, setTf] = useState<LineType>("all");
  const shown = useMemo(() => lines.filter((l) => period.inWindow(l.at) && (tf === "all" || l.type === tf)), [lines, period, tf]);
  const prior = lines.filter((l) => !period.inWindow(l.at) && l.at < (shown[0]?.at ?? Infinity));
  const opening = prior.length ? prior[prior.length - 1].balance : 0;
  const periodDebit = shown.reduce((s, l) => s + l.debit, 0);
  const periodCredit = shown.reduce((s, l) => s + l.credit, 0);
  const closing = shown.length ? shown[shown.length - 1].balance : opening;

  const exportCsv = () => {
    const head = ["Date", "Ref", "Particulars", "Patient ref", "Debit", "Credit", "Balance"];
    const body = shown.map((l) => [fmtDateTime(l.at), l.ref, l.label, a.flagRefills && l.patientId ? `${l.patientId} ${l.patientName ?? ""}` : "", l.debit || "", l.credit || "", l.balance]);
    const rows = [["", "", `Opening balance · ${period.label}`, "", "", "", opening], ...body, ["", "", "Closing balance", "", periodDebit, periodCredit, closing]];
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }), "hospital-credit-statement.csv");
  };
  const exportPdf = () => {
    const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n));
    const headerLine = "Date              Ref       Particulars                    Debit      Credit     Balance";
    const rowLines = [`${pad("Opening balance", 57)}${("Rs " + Math.round(opening)).padStart(11)}`, ...shown.map((l) => `${pad(fmtDateTime(l.at), 17)} ${pad(l.ref, 9)} ${pad(l.label + (a.flagRefills && l.patientId ? ` [${l.patientId}]` : ""), 30)} ${(l.debit ? "Rs " + Math.round(l.debit) : "").padStart(10)} ${(l.credit ? "Rs " + Math.round(l.credit) : "").padStart(10)} ${("Rs " + Math.round(l.balance)).padStart(11)}`)];
    download(buildReportPdf({ title: "Hospital Credit Statement", subtitle: `${a.name} · ${period.label}${tf !== "all" ? " · " + LINE_FILTERS.find((x) => x.k === tf)!.label : ""} · terms ${a.creditTerms}`, generatedAt: fmtDateTime(now), profile, headerLine, rowLines, totalsLine: `Period debit Rs ${Math.round(periodDebit)}   credit Rs ${Math.round(periodCredit)}   ·   CLOSING BALANCE Rs ${Math.round(closing)}` }), "hospital-credit-statement.pdf");
  };

  return (
    <div className="pd-grid-2">
      <div className="pd-card pd-card-pad">
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Hospital account</h3>
        <div className="pd-form-grid">
          <div className="pd-field pd-span2"><label>Hospital / institution name</label><input className="pd-input" value={a.name} onChange={(e) => updateHospitalAccount({ name: e.target.value })} /></div>
          <div className="pd-field"><label>GSTIN</label><input className="pd-input pd-mono" value={a.gstin} onChange={(e) => updateHospitalAccount({ gstin: e.target.value.toUpperCase() })} /></div>
          <div className="pd-field"><label>Stores contact</label><input className="pd-input" value={a.contact} onChange={(e) => updateHospitalAccount({ contact: e.target.value })} /></div>
          <div className="pd-field"><label>Billing phone</label><input className="pd-input" value={a.phone ?? ""} onChange={(e) => updateHospitalAccount({ phone: e.target.value })} placeholder="+91 " /></div>
          <div className="pd-field"><label>Billing email</label><input className="pd-input" value={a.email ?? ""} onChange={(e) => updateHospitalAccount({ email: e.target.value })} /></div>
          <div className="pd-field"><label>Credit terms</label><select className="pd-select" value={a.creditTerms} onChange={(e) => updateHospitalAccount({ creditTerms: e.target.value as CreditTerms })}>{CREDIT_TERMS.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="pd-field"><label>Credit limit ₹</label><input className="pd-input" type="number" min={0} value={a.creditLimit} onChange={(e) => updateHospitalAccount({ creditLimit: Math.max(0, Number(e.target.value) || 0) })} /></div>
          <div className="pd-field pd-span2"><label>Institutional discount</label><input className="pd-input" value={`${a.discountPct}% off MRP · managed in Price list`} readOnly style={{ background: "var(--wash2)", color: "var(--muted)" }} /></div>
        </div>
        {/* credit-limit utilisation + aging */}
        {limit > 0 && <>
          <div className={`pd-util${util >= 85 ? " near" : ""}`} style={{ marginTop: 14 }}><span style={{ width: `${util}%` }} /></div>
          <div className="pd-hb-utilrow"><span>{inr(outstanding)} of {inr(limit)} limit</span><b>{util}% used · {inr(Math.max(0, limit - outstanding))} free</b></div>
        </>}
        <div className="pd-hb-agingline">
          {aging.overdue > 0
            ? <span className="over"><IconAlert size={13} /> {inr(aging.overdue)} overdue{aging.overdueDays > 0 ? ` · ${aging.overdueDays}d past due` : ""}</span>
            : <span className="ok"><IconCheck size={13} /> Nothing overdue</span>}
          <button className="pd-btn pd-btn-line pd-btn-sm" onClick={onRemind}><IconSend size={13} /> Send reminder</button>
        </div>
        <div className="pd-feat" style={{ marginTop: 12 }}>
          <span className="ico"><IconTag size={16} /></span>
          <div className="gw"><div className="t">Flag refill lines on statement</div><div className="s">Show the patient ID/name on PATIENT_REFILL lines so the hospital can recover from the patient</div></div>
          <button className={`pd-switch${a.flagRefills ? " on" : ""}`} onClick={() => updateHospitalAccount({ flagRefills: !a.flagRefills })} />
        </div>
      </div>

      <div className="pd-card">
        <div className="pd-card-head" style={{ flexWrap: "wrap", gap: 8 }}>
          <div><h3>Credit statement</h3><span className="pd-muted" style={{ fontSize: 12 }}>{dueDays ? `Net ${dueDays} days` : "Due on demand"} · {shown.length} entr{shown.length === 1 ? "y" : "ies"}</span></div>
          <div className="pd-flex pd-gap6">
            <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={exportCsv}><IconReports size={14} /> Excel</button>
            <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={exportPdf}><IconPrint size={14} /> PDF</button>
          </div>
        </div>
        {/* standard filter */}
        <div className="pd-card-pad" style={{ paddingTop: 12, paddingBottom: 0, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {period.node}
          <div className="pd-seg">{LINE_FILTERS.map((x) => <button key={x.k} className={tf === x.k ? "on" : ""} onClick={() => setTf(x.k)}>{x.label}</button>)}</div>
        </div>
        {/* period summary */}
        <div className="pd-card-pad" style={{ paddingTop: 12, paddingBottom: 8 }}>
          <div className="pd-summary-chips">
            <div className="pd-schip">Opening<b>{inr(opening)}</b></div>
            <div className="pd-schip">Supplied (debit)<b>{inr(periodDebit)}</b></div>
            <div className="pd-schip">Returns + paid (credit)<b>{inr(periodCredit)}</b></div>
            <div className="pd-schip">Closing<b style={{ color: closing > 0 ? "var(--rose)" : "var(--mid)" }}>{inr(closing)}</b></div>
          </div>
        </div>
        <div className="pd-tbl-wrap" style={{ maxHeight: 320, overflowY: "auto" }}>
          <table className="pd-tbl">
            <thead><tr><th>Date</th><th>Particulars</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead>
            <tbody>
              {[...shown].reverse().map((l, i) => (
                <tr key={l.ref + i}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(l.at)}<div className="pd-muted pd-mono" style={{ fontSize: 10.5 }}>{l.ref}</div></td>
                  <td>{l.label}{a.flagRefills && l.patientId && <div className="pd-pill pill-teal" style={{ marginTop: 3, fontSize: 10 }}>recover from {l.patientId} · {l.patientName}</div>}</td>
                  <td className="num">{l.debit ? inr(l.debit) : "—"}</td>
                  <td className="num" style={{ color: "var(--mid)" }}>{l.credit ? inr(l.credit) : "—"}</td>
                  <td className="num" style={{ fontWeight: 800 }}>{inr(l.balance)}</td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={5}><div className="pd-empty">No transactions in this period.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── hospital price list & discount control (admin-gated) ────── */
function PriceListTab() {
  const { inventory, hospitalPriceRules, hospitalAccount, setUniformDiscount, setHospitalPriceRule, pricingUnlocked, lockPricing } = usePharma();
  const cp = useCreditPrice();
  const [q, setQ] = useState("");
  const [otp, setOtp] = useState(false);
  const locked = !pricingUnlocked;
  const list = inventory.filter((p) => !q.trim() || `${p.name} ${p.composition} ${p.manufacturer}`.toLowerCase().includes(q.toLowerCase()));
  const custom = Object.keys(hospitalPriceRules).length;

  return (
    <>
      {/* lock banner */}
      <div className={`pd-lockbar${locked ? " locked" : ""}`}>
        <span className="ic">{locked ? <IconLock size={16} /> : <IconUnlock size={16} />}</span>
        <div className="gw">
          <b>{locked ? "Pricing is locked" : "Pricing unlocked by admin"}</b>
          <small>{locked ? "Changing the institutional discount or any product price needs admin OTP approval." : "You can change the uniform discount and per-product prices. Lock when done."}</small>
        </div>
        {locked ? <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={() => setOtp(true)}><IconKey size={13} /> Unlock with admin OTP</button>
          : <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={lockPricing}>Lock pricing</button>}
      </div>

      {/* uniform discount */}
      <div className="pd-card pd-card-pad" style={{ marginTop: 14 }}>
        <div className="pd-flex" style={{ gap: 14, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 14 }}>Uniform institutional discount</div>
            <div className="pd-muted" style={{ fontSize: 12.5 }}>Applies to every product without its own rule · {custom} product{custom !== 1 ? "s" : ""} customised</div>
          </div>
          <div className="pd-spacer" />
          <div className="pd-flex pd-gap6">
            <input className="pd-input" type="number" min={0} max={95} disabled={locked} value={hospitalAccount.discountPct} onChange={(e) => setUniformDiscount(Number(e.target.value) || 0)} style={{ width: 90, textAlign: "right", opacity: locked ? .55 : 1 }} />
            <span style={{ fontWeight: 800, alignSelf: "center" }}>% off MRP</span>
          </div>
        </div>
      </div>

      <div className="pd-toolbar" style={{ margin: "14px 0" }}>
        <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Search medicine…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="pd-spacer" />
        <span className="pd-muted" style={{ fontSize: 13 }}>Per-product: set a % or flat ₹ discount off MRP. Credit price = what the hospital is billed.</span>
      </div>

      <div className="pd-card"><div className="pd-tbl-wrap">
        <table className="pd-tbl">
          <thead><tr><th>Medicine</th><th className="num">MRP</th><th>Discount type</th><th className="num">Value</th><th className="num">Credit price</th><th className="num">Eff. disc</th><th>Pricing</th></tr></thead>
          <tbody>
            {list.map((p) => {
              const mrp = mrpOf(p); const price = cp(p.id); const rule = hospitalPriceRules[p.id];
              const mode: PriceMode = rule?.mode ?? "percent";
              const off = mrp > 0 ? Math.round((1 - price / mrp) * 100) : 0;
              const setMode = (m: PriceMode) => setHospitalPriceRule(p.id, { mode: m, value: rule?.value ?? (m === "percent" ? hospitalAccount.discountPct : 0) });
              return (
                <tr key={p.id}>
                  <td><div className="prod"><span className="em">{p.emoji}</span><span className="nm">{p.name}</span></div></td>
                  <td className="num">{inr(mrp)}</td>
                  <td>
                    <div className="pd-seg" style={{ display: "inline-flex", opacity: locked ? .55 : 1 }}>
                      <button className={mode === "percent" ? "on" : ""} disabled={locked} style={{ padding: "4px 10px" }} onClick={() => setMode("percent")}>%</button>
                      <button className={mode === "flat" ? "on" : ""} disabled={locked} style={{ padding: "4px 10px" }} onClick={() => setMode("flat")}>₹</button>
                    </div>
                  </td>
                  <td className="num"><input className="pd-input pd-mono" disabled={locked} type="number" min={0} value={rule ? rule.value : ""} placeholder={mode === "percent" ? String(hospitalAccount.discountPct) : "—"} onChange={(e) => setHospitalPriceRule(p.id, e.target.value === "" ? null : { mode, value: Number(e.target.value) })} style={{ width: 74, textAlign: "right", padding: "5px 8px", opacity: locked ? .55 : 1 }} /></td>
                  <td className="num" style={{ fontWeight: 800 }}>{inr(price)}</td>
                  <td className="num">{off}%</td>
                  <td>{rule
                    ? <span className="pd-flex pd-gap6"><span className="pd-pill pill-gold">Custom {rule.mode === "percent" ? rule.value + "%" : "₹" + rule.value}</span><button className="pd-iconbtn" disabled={locked} title="Reset to uniform" onClick={() => setHospitalPriceRule(p.id, null)}><IconX size={13} /></button></span>
                    : <span className="pd-pill pill-gray">Uniform −{hospitalAccount.discountPct}%</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div></div>

      {otp && <AdminOtpModal onClose={() => setOtp(false)} />}
    </>
  );
}

/* ── new ward issue / return ─────────────────────────────────── */
function SupplyModal({ mode, onClose, prefillIndentId }: { mode: "issue" | "return"; onClose: () => void; prefillIndentId?: string | null }) {
  const { inventory, wards, issueWardSupply, returnWardSupply, wardIndents, profile, hospitalAccount, toast } = usePharma();
  const cp = useCreditPrice();
  const stocked = inventory.filter((p) => stockOf(p) > 0);
  const openIndents = wardIndents.filter((i) => i.status === "pending" || i.status === "approved");
  const prefill = prefillIndentId ? wardIndents.find((i) => i.id === prefillIndentId) : null;
  const prefillRows = prefill ? indentToRows(prefill, inventory, cp) : [];
  const [wardId, setWardId] = useState(prefill?.wardId ?? wards[0]?.id ?? "");
  const [indentId, setIndentId] = useState(prefill?.id ?? "");
  const [reason, setReason] = useState<WardSupplyReason>("floor");
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [refDoc, setRefDoc] = useState("");
  type Row = { productId: string; qty: number; price: number; batchNo?: string };
  const defBatch = (id: string) => { const p = inventory.find((x) => x.id === id); return earliestBatch(p!)?.batchNo; };
  const [rows, setRows] = useState<Row[]>(() => prefillRows.map((r) => ({ ...r, batchNo: defBatch(r.productId) })));
  const [scan, setScan] = useState("");
  const [picking, setPicking] = useState(false);
  const [pq, setPq] = useState("");
  const pickResults = stocked.filter((p) => !pq.trim() || `${p.name} ${p.composition} ${p.manufacturer}`.toLowerCase().includes(pq.toLowerCase())).slice(0, 9);
  const addRowFor = (id: string) => { setRows((r) => [...r, { productId: id, qty: 1, price: cp(id), batchNo: defBatch(id) }]); setPicking(false); setPq(""); };
  // a fully-matched indent jumps straight to the invoice preview
  const [view, setView] = useState<"edit" | "invoice">(mode === "issue" && !!prefill && prefillRows.length > 0 && prefillRows.length === prefill!.items.length ? "invoice" : "edit");
  const ward = wards.find((w) => w.id === wardId);

  const pickIndent = (id: string) => {
    setIndentId(id);
    const ind = wardIndents.find((i) => i.id === id);
    if (ind) { setWardId(ind.wardId); setRows(indentToRows(ind, inventory, cp).map((r) => ({ ...r, batchNo: defBatch(r.productId) }))); }
  };
  const addRow = () => { const p = stocked[0]; if (!p) return; setRows((r) => [...r, { productId: p.id, qty: 1, price: cp(p.id), batchNo: defBatch(p.id) }]); };
  const setRow = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch, ...(patch.productId ? { price: cp(patch.productId), batchNo: defBatch(patch.productId) } : {}) } : x)));
  const delRow = (i: number) => setRows((r) => r.filter((_, j) => j !== i));
  const onScan = () => {
    const code = scan.trim(); if (!code) { return; }
    const hit = findScan(inventory, code);
    if (!hit) { toast(`No match for “${code}”`); setScan(""); return; }
    setRows((r) => [...r, { productId: hit.product.id, qty: 1, price: cp(hit.product.id), batchNo: hit.batch?.batchNo ?? defBatch(hit.product.id) }]);
    toast(`${hit.product.name}${hit.batch ? " · Batch " + hit.batch.batchNo : ""}`);
    setScan("");
  };
  const total = rows.reduce((a, x) => a + x.qty * x.price, 0);
  const refillNeedsPatient = mode === "issue" && reason === "refill" && !patientId.trim();
  const valid = !!ward && rows.length > 0 && rows.every((x) => x.qty > 0 && x.price >= 0) && !refillNeedsPatient;

  const buildItems = (): WardSupplyItem[] => rows.map((x) => { const p = inventory.find((y) => y.id === x.productId)!; const b = (x.batchNo && p.batches.find((z) => z.batchNo === x.batchNo)) || earliestBatch(p); return { productId: p.id, name: p.name, batchNo: b?.batchNo ?? "—", expiry: b?.expiry ?? "—", hsn: p.hsn, gst: p.gst, qty: x.qty, price: x.price, amount: Math.round(x.qty * x.price * 100) / 100, mrp: b?.mrp ?? mrpOf(p) }; });
  const save = () => {
    if (!valid || !ward) return;
    const draft = { wardId: ward.id, wardName: ward.name, reason: mode === "return" ? "floor" as WardSupplyReason : reason, patientId: reason === "refill" ? patientId.trim() : undefined, patientName: reason === "refill" ? patientName.trim() : undefined, items: buildItems(), refDoc: refDoc.trim() || (indentId || undefined), indentId: mode === "issue" && indentId ? indentId : undefined };
    if (mode === "return") returnWardSupply(draft); else issueWardSupply(draft);
    onClose();
  };

  // invoice preview before sending to the hospital
  if (mode === "issue" && view === "invoice" && ward && valid) {
    return <WardSupplyInvoice
      data={{ invoiceNo: "DRAFT", at: Date.now(), wardName: ward.name, reason, patientId: reason === "refill" ? patientId.trim() : undefined, patientName: reason === "refill" ? patientName.trim() : undefined, refDoc: refDoc.trim() || undefined, indentId: indentId || undefined, items: buildItems() }}
      profile={profile} account={hospitalAccount} onClose={onClose} onEdit={() => setView("edit")} onConfirm={save} />;
  }

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal lg" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>{mode === "return" ? "Record return from ward" : "Issue stock to ward"}</h3><button className="pd-iconbtn" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          {mode === "issue" && (
            <div className="pd-field" style={{ marginBottom: 12 }}><label>Link a ward indent (optional — bills & closes the requisition)</label>
              <select className="pd-select" value={indentId} onChange={(e) => pickIndent(e.target.value)}>
                <option value="">— None · ad-hoc issue —</option>
                {openIndents.map((i) => <option key={i.id} value={i.id}>{i.id} · {i.wardName} · {i.items.length} item{i.items.length !== 1 ? "s" : ""}{i.patient ? " · " + i.patient : ""}</option>)}
              </select>
            </div>
          )}
          <div className="pd-form-grid">
            <div className="pd-field"><label>Ward</label><select className="pd-select" value={wardId} onChange={(e) => setWardId(e.target.value)}>{wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            <div className="pd-field"><label>Reference (indent / doc)</label><input className="pd-input" value={refDoc} onChange={(e) => setRefDoc(e.target.value)} placeholder="e.g. IND-4012" /></div>
          </div>

          {mode === "issue" && (
            <div className="pd-field" style={{ marginTop: 12 }}><label>Reason (informational — bill always goes to the hospital)</label>
              <div className="pd-flex pd-gap6" style={{ marginTop: 4, flexWrap: "wrap" }}>
                {SUPPLY_REASONS.map((r) => <button key={r.key} className={`pd-chip${reason === r.key ? " on" : ""}`} onClick={() => setReason(r.key)}>{r.emoji} {r.label}</button>)}
              </div>
            </div>
          )}
          {mode === "issue" && reason === "refill" && (
            <div className="pd-form-grid" style={{ marginTop: 12, background: "var(--wash2)", padding: 12, borderRadius: 10 }}>
              <div className="pd-field"><label>Patient ID / MRN *</label><input className="pd-input pd-mono" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="Hospital MRN" /></div>
              <div className="pd-field"><label>Patient name</label><input className="pd-input" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="For traceability" /></div>
              <p className="pd-muted pd-span2" style={{ fontSize: 11.5, gridColumn: "1/-1" }}><IconTag size={12} /> Recorded only as a breadcrumb — the bill still goes to the hospital, which recovers this from the patient.</p>
            </div>
          )}

          <div className="pd-flex" style={{ justifyContent: "space-between", margin: "16px 0 8px" }}>
            <b>Medicines</b>
            <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => { setPicking((v) => !v); setPq(""); }}><IconPlus size={13} /> Add medicine</button>
          </div>
          <div className="pd-scanbar" style={{ marginBottom: 10 }}>
            <span className="ic"><IconCamera size={16} /></span>
            <input placeholder="Scan barcode / type batch no. + Enter" value={scan} onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onScan(); } }} />
            <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={onScan} disabled={!scan.trim()}>Add</button>
          </div>
          {picking && (
            <div className="pd-pickbox">
              <div className="pd-search-inline" style={{ flex: 1 }}><span className="ic"><IconSearch size={16} /></span><input autoFocus placeholder="Search medicine by name, salt, brand…" value={pq} onChange={(e) => setPq(e.target.value)} /></div>
              <div className="pd-picklist">
                {pickResults.map((p) => <button key={p.id} className="pd-pickitem" onClick={() => addRowFor(p.id)}><b>{p.name}</b><span className="pd-muted"> · {p.composition || p.manufacturer} · {stockOf(p)} in stock · MRP {inr(mrpOf(p))}{hasLocation(p) ? ` · ${p.rack}` : ""}</span></button>)}
                {pickResults.length === 0 && <div className="pd-muted" style={{ padding: "10px 12px", fontSize: 12.5 }}>No medicine matches “{pq}”.</div>}
              </div>
            </div>
          )}
          {rows.length === 0 && <div className="pd-empty" style={{ padding: "18px" }}>Add medicines to {mode === "return" ? "return" : "issue"} — scan, or “Add medicine”.</div>}
          {rows.map((x, i) => {
            const p = inventory.find((y) => y.id === x.productId);
            return (
              <div key={i} className="pd-flex pd-gap6" style={{ marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select className="pd-select" style={{ flex: "2 1 180px" }} value={x.productId} onChange={(e) => setRow(i, { productId: e.target.value })}>
                  {stocked.map((pp) => <option key={pp.id} value={pp.id}>{pp.name} ({stockOf(pp)} in stock)</option>)}
                </select>
                <select className="pd-select pd-mono" style={{ flex: "1 1 150px", fontSize: 12 }} value={x.batchNo ?? ""} onChange={(e) => setRow(i, { batchNo: e.target.value || undefined })} title="Batch">
                  {(p?.batches ?? []).map((bb) => <option key={bb.batchNo} value={bb.batchNo}>Batch {bb.batchNo} · {bb.expiry} · {bb.qty}</option>)}
                </select>
                <QtyBox
                  qty={x.qty} max={p ? stockOf(p) : undefined}
                  onDec={() => setRow(i, { qty: Math.max(1, x.qty - 1) })}
                  onInc={() => setRow(i, { qty: x.qty + 1 })}
                  onSet={(n) => setRow(i, { qty: Math.max(1, n) })}
                  onRemove={() => delRow(i)}
                />
                <span className="pd-muted" style={{ fontSize: 12 }}>×</span>
                <input className="pd-input pd-mono" type="number" min={0} value={x.price} onChange={(e) => setRow(i, { price: Math.max(0, Number(e.target.value) || 0) })} style={{ width: 78, textAlign: "right" }} title="Credit price" />
                <span style={{ width: 82, textAlign: "right", fontWeight: 800 }}>{inr(x.qty * x.price)}</span>
              </div>
            );
          })}

          <div className="pd-billrow tot" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <span>{mode === "return" ? "Credit note to hospital" : "Billed to hospital a/c"}</span><span>{inr(total)}</span>
          </div>
        </div>
        <div className="pd-modal-foot">
          {refillNeedsPatient && <span style={{ color: "var(--rose)", fontSize: 12, marginRight: "auto" }}>Patient MRN required for a refill</span>}
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          {mode === "return"
            ? <button className="pd-btn pd-btn-primary" disabled={!valid} onClick={save}>Record return · {inr(total)}</button>
            : <button className="pd-btn pd-btn-primary" disabled={!valid} onClick={() => setView("invoice")}>Preview invoice · {inr(total)} →</button>}
        </div>
      </div>
    </div>
  );
}

/* ── record a hospital payment ───────────────────────────────── */
function PaymentModal({ onClose, outstanding }: { onClose: () => void; outstanding: number }) {
  const { recordHospitalPayment } = usePharma();
  const [amount, setAmount] = useState(outstanding > 0 ? String(Math.round(outstanding)) : "");
  const [mode, setMode] = useState<PayMode>("upi");
  const [ref, setRef] = useState("");
  const amt = Number(amount) || 0;
  const MODES: PayMode[] = ["upi", "card", "cash"];
  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>Record hospital payment</h3><button className="pd-iconbtn" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <p className="pd-muted" style={{ fontSize: 12.5, marginBottom: 12 }}>Outstanding: <b style={{ color: "var(--rose)" }}>{inr(outstanding)}</b></p>
          <div className="pd-field"><label>Amount received ₹</label><input className="pd-input" autoFocus type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="pd-field" style={{ marginTop: 12 }}><label>Mode</label>
            <div className="pd-flex pd-gap6" style={{ marginTop: 4 }}>{MODES.map((m) => <button key={m} className={`pd-chip${mode === m ? " on" : ""}`} onClick={() => setMode(m)}>{PAY_LABEL[m]}</button>)}</div>
          </div>
          <div className="pd-field" style={{ marginTop: 12 }}><label>Reference (NEFT / UTR / cheque no.)</label><input className="pd-input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Optional" /></div>
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-primary" disabled={amt <= 0} onClick={() => { recordHospitalPayment({ amount: amt, mode, ref: ref.trim() || undefined }); onClose(); }}>Record {inr(amt)}</button>
        </div>
      </div>
    </div>
  );
}
