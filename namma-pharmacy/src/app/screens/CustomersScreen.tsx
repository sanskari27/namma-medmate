"use client";
import { useState, useMemo } from "react";
import { usePharma } from "../pharmaState";
import {
  inr, computeInvoice, fmtDateTime, timeAgo, Sale, PayMode, PAY_LABEL,
  customerCredit, customerLedger, totalCreditOutstanding, SETTLED_MODES, waLink, smsLink, CreditPayment,
} from "../data";
import { IconSearch, IconX, IconUser, IconPrint, IconWhatsApp, IconMessage, IconCheck, IconCart, IconRefresh, IconReceipt, IconDownload, IconGlobe, IconStore, IconUsers } from "../components/Icon";
import { aggregateCustomers, exportCustomersCsv, exportCustomersPdf } from "../lib/customerExport";

type Cust = {
  key: string; name: string; phone: string; orders: Sale[];
  spent: number; units: number; online: number; offline: number; last: number; rx: boolean;
};

export default function CustomersScreen() {
  const { sales, creditPayments, recordCreditPayment, now, go, profile } = usePharma();
  const [q, setQ] = useState("");
  const dbRows = useMemo(() => aggregateCustomers(sales), [sales]);
  const [sort, setSort] = useState<"spent" | "orders" | "recent">("spent");
  const [open, setOpen] = useState<Cust | null>(null);

  const customers = useMemo(() => {
    const m = new Map<string, Cust>();
    sales.filter((s) => s.status !== "cancelled" && s.customer.name && s.customer.name !== "Kiosk (self-order)").forEach((s) => {
      const key = (s.customer.phone || s.customer.name).trim();
      const isWalkin = s.customer.name === "Walk-in" && !s.customer.phone;
      const k = isWalkin ? "walkin" : key;
      const cur = m.get(k) ?? { key: k, name: isWalkin ? "Walk-in customers" : s.customer.name, phone: s.customer.phone || "—", orders: [], spent: 0, units: 0, online: 0, offline: 0, last: 0, rx: false };
      const t = computeInvoice(s.items, s.discount);
      cur.orders.push(s); cur.spent += t.payable; cur.units += s.items.reduce((a, i) => a + i.qty, 0);
      if (s.channel === "online") cur.online++; else cur.offline++;
      cur.last = Math.max(cur.last, s.createdAt); cur.rx = cur.rx || s.rx;
      if (!isWalkin && s.customer.phone) cur.phone = s.customer.phone;
      m.set(k, cur);
    });
    return [...m.values()];
  }, [sales]);

  let list = customers.filter((c) => !q || `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  list = [...list].sort((a, b) => sort === "orders" ? b.orders.length - a.orders.length : sort === "recent" ? b.last - a.last : b.spent - a.spent);

  const totalSpent = customers.reduce((a, c) => a + c.spent, 0);
  const named = customers.filter((c) => c.key !== "walkin").length;
  const creditDue = totalCreditOutstanding(sales, creditPayments);

  return (
    <div className="pd-canvas-wide">
      <div className="pd-stats" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <div className="pd-stat"><div className="ic ic-green"><IconUser size={18} /></div><div className="lbl">Customers</div><div className="val">{named}</div><div className="split">+ walk-ins</div></div>
        <div className="pd-stat"><div className="ic ic-blue"><IconCart size={18} /></div><div className="lbl">Lifetime sales</div><div className="val">{inr(totalSpent)}</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconRefresh size={18} /></div><div className="lbl">Repeat customers</div><div className="val">{customers.filter((c) => c.orders.length > 1 && c.key !== "walkin").length}</div></div>
        <div className="pd-stat"><div className="ic ic-rose">℞</div><div className="lbl">On chronic Rx</div><div className="val">{customers.filter((c) => c.rx && c.key !== "walkin").length}</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconReceipt size={18} /></div><div className="lbl">Credit outstanding</div><div className="val">{inr(creditDue)}</div><div className="split">khata / udhaar</div></div>
      </div>

      <div className="pd-toolbar">
        <div className="pd-search-inline"><span className="ic"><IconSearch size={17} /></span><input placeholder="Search customer name or phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="pd-spacer" />
        <div className="pd-seg">
          <button className={sort === "spent" ? "on" : ""} onClick={() => setSort("spent")}>Top spenders</button>
          <button className={sort === "orders" ? "on" : ""} onClick={() => setSort("orders")}>Most orders</button>
          <button className={sort === "recent" ? "on" : ""} onClick={() => setSort("recent")}>Recent</button>
        </div>
        <button className="pd-btn pd-btn-ghost" disabled={!dbRows.length} title="Download customer database as Excel (CSV)" onClick={() => exportCustomersCsv(dbRows, now)}><IconDownload size={14} /> Excel</button>
        <button className="pd-btn pd-btn-ghost" disabled={!dbRows.length} title="Download customer database as PDF" onClick={() => exportCustomersPdf(dbRows, profile, now)}><IconPrint size={15} /> PDF</button>
      </div>

      <div className="pd-card">
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>Customer</th><th>Phone</th><th className="num">Orders</th><th>Channel</th><th className="num">Units</th><th>Last visit</th><th className="num">Loyalty</th><th className="num">Lifetime value</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.key} style={{ cursor: "pointer" }} onClick={() => setOpen(c)}>
                  <td><div className="prod"><span className="em"><IconUser size={15} /></span><span className="nm">{c.name}{c.rx && <span className="pd-tag rx" style={{ marginLeft: 6 }}>Rx</span>}{c.key !== "walkin" && customerCredit(c.key, sales, creditPayments).outstanding > 0 && <span className="pd-pill pill-rose" style={{ marginLeft: 6 }}>Due {inr(customerCredit(c.key, sales, creditPayments).outstanding)}</span>}</span></div></td>
                  <td className="pd-mono">{c.phone}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{c.orders.length}</td>
                  <td><span className="pd-muted" style={{ fontSize: 12 }}>{c.online}<IconGlobe size={13} /> · {c.offline}<IconStore size={13} /></span></td>
                  <td className="num">{c.units}</td>
                  <td>{timeAgo(c.last, now)}</td>
                  <td className="num"><span className="pd-pill pill-gold">{Math.floor(c.spent / 100)} pts</span></td>
                  <td className="num" style={{ fontWeight: 800 }}>{inr(c.spent)}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8}><div className="pd-empty"><div className="em"><IconUsers size={30} /></div><p>No customers match.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <CustomerModal
          c={open} onClose={() => setOpen(null)} onNewSale={() => { setOpen(null); go("pos"); }}
          sales={sales} creditPayments={creditPayments} recordCreditPayment={recordCreditPayment} profile={profile}
        />
      )}
    </div>
  );
}

function CustomerModal({ c, onClose, onNewSale, sales, creditPayments, recordCreditPayment, profile }: {
  c: Cust; onClose: () => void; onNewSale: () => void; sales: Sale[]; creditPayments: CreditPayment[];
  recordCreditPayment: (p: { custKey: string; custName: string; custPhone: string; amount: number; mode: PayMode; note?: string }) => void; profile: any;
}) {
  const isWalkin = c.key === "walkin";
  const cr = isWalkin ? { given: 0, repaid: 0, outstanding: 0 } : customerCredit(c.key, sales, creditPayments);
  const ledger = isWalkin ? [] : customerLedger(c.key, sales, creditPayments);
  const phone = c.phone && c.phone !== "—" ? c.phone : "";
  const [repay, setRepay] = useState(false);
  const [amt, setAmt] = useState(cr.outstanding);
  const [mode, setMode] = useState<PayMode>("cash");

  const msg = (kind: "remind" | "invite", channel: "wa" | "sms") => {
    if (!phone) return;
    const text = kind === "remind"
      ? `Hi ${c.name}, this is ${profile.name}. Your pending medicine credit (khata) balance is ${inr(cr.outstanding)}. Kindly settle it at your convenience. Thank you!`
      : `Hi ${c.name}, this is ${profile.name}. You can now buy your medicines on credit (khata) and pay later. Just visit us or reply here to place an order.`;
    if (channel === "wa") window.open(waLink(phone, text), "_blank");
    else window.open(smsLink(phone, text), "_blank");
  };
  const doRepay = () => { if (amt <= 0) return; recordCreditPayment({ custKey: c.key, custName: c.name, custPhone: phone, amount: Math.min(amt, cr.outstanding || amt), mode }); setRepay(false); };

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pd-modal-head"><h3>{c.name}</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-summary-chips">
            <div className="pd-schip">Phone<b style={{ fontSize: 13 }}>{c.phone}</b></div>
            <div className="pd-schip">Lifetime<b>{inr(c.spent)}</b></div>
            <div className="pd-schip">Orders<b>{c.orders.length}</b></div>
            <div className="pd-schip">Credit due<b style={{ color: cr.outstanding > 0 ? "var(--rose)" : undefined }}>{inr(cr.outstanding)}</b></div>
          </div>

          {!isWalkin && (
            <>
              <div className="pd-pl-head">Credit account (khata)</div>
              <div className="pd-flex" style={{ gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                <span className="pd-muted" style={{ fontSize: 13, flex: 1 }}>Given {inr(cr.given)} · Repaid {inr(cr.repaid)} · <b style={{ color: cr.outstanding > 0 ? "var(--rose)" : "var(--green)" }}>Outstanding {inr(cr.outstanding)}</b></span>
                {cr.outstanding > 0 && !repay && <button className="pd-btn pd-btn-primary" onClick={() => { setAmt(cr.outstanding); setRepay(true); }}><IconCheck size={15} /> Record repayment</button>}
                <button className="pd-btn pd-btn-ghost" disabled={!phone} onClick={() => msg(cr.outstanding > 0 ? "remind" : "invite", "wa")}><IconWhatsApp size={15} /> {cr.outstanding > 0 ? "Remind" : "Offer credit"}</button>
                <button className="pd-btn pd-btn-ghost" disabled={!phone} onClick={() => msg(cr.outstanding > 0 ? "remind" : "invite", "sms")}><IconMessage size={15} /> SMS</button>
              </div>
              {repay && (
                <div className="pd-flex" style={{ gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                  <input className="pd-input" type="number" min={0} value={amt || ""} onChange={(e) => setAmt(Number(e.target.value) || 0)} placeholder="Amount ₹" style={{ width: 120 }} autoFocus />
                  <select className="pd-select" value={mode} onChange={(e) => setMode(e.target.value as PayMode)} style={{ width: 110 }}>{SETTLED_MODES.filter((m) => m !== "cod").map((m) => <option key={m} value={m}>{PAY_LABEL[m]}</option>)}</select>
                  <button className="pd-btn pd-btn-primary" disabled={amt <= 0} onClick={doRepay}>Save ₹{Math.round(Math.min(amt, cr.outstanding || amt)).toLocaleString("en-IN")}</button>
                  <button className="pd-btn pd-btn-ghost" onClick={() => setRepay(false)}>Cancel</button>
                </div>
              )}
              {ledger.length > 0 && ledger.map((r, i) => (
                <div className="pd-row" key={i}>
                  <span className="em" style={{ color: r.kind === "debit" ? "var(--rose)" : "var(--green)" }}>{r.kind === "debit" ? "−" : "+"}</span>
                  <span className="gw"><div className="t">{r.label}</div><div className="s">{r.ref}</div></span>
                  <span style={{ textAlign: "right", fontSize: 12 }}><b style={{ color: r.kind === "debit" ? "var(--rose)" : "var(--green)" }}>{r.kind === "debit" ? "−" : "+"}{inr(r.amount)}</b><br /><span className="pd-muted" style={{ fontSize: 11 }}>{fmtDateTime(r.at)}</span></span>
                </div>
              ))}
            </>
          )}

          <div className="pd-pl-head">Purchase history</div>
          {[...c.orders].sort((a, b) => b.createdAt - a.createdAt).map((s) => {
            const t = computeInvoice(s.items, s.discount);
            return (
              <div className="pd-row" key={s.id}>
                <span className="em">{s.channel === "online" ? <IconGlobe size={15} /> : <IconStore size={15} />}</span>
                <span className="gw"><div className="t">{s.id} · {inr(t.payable)}</div><div className="s">{s.items.map((i) => i.name).join(", ")}</div></span>
                <span className="pd-muted" style={{ fontSize: 11.5, textAlign: "right" }}>{fmtDateTime(s.createdAt)}<br />{PAY_LABEL[s.payMode]}</span>
              </div>
            );
          })}
        </div>
        <div className="pd-modal-foot"><button className="pd-btn pd-btn-ghost" onClick={onClose}>Close</button><button className="pd-btn pd-btn-primary" onClick={onNewSale}>New sale</button></div>
      </div>
    </div>
  );
}
