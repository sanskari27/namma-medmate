"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import {
  PLANS, PlanInfo, Plan, BillingCycle, inr, planPrice, annualSavings, annualPerMonth,
  cycleNoun, ANNUAL_DISCOUNT, GST_RATE,
} from "../data";
import { IconCheck, IconCrown, IconX, IconStar, IconLock } from "../components/Icon";

type Checkout = { plan: Plan; cycle: BillingCycle; mode: "upgrade" | "switch" | "renew" };

export default function SubscriptionScreen() {
  const { subscription, changePlan, renewSubscription, toggleAutoRenew } = usePharma();
  const current = PLANS.find((p) => p.key === subscription.plan)!;
  const [cycle, setCycle] = useState<BillingCycle>(subscription.cycle);
  const [checkout, setCheckout] = useState<Checkout | null>(null);

  const planIdx = (k: Plan) => PLANS.findIndex((x) => x.key === k);
  const curPrice = planPrice(current, subscription.cycle);

  // synthetic billing history reflecting current plan + cycle
  const histAmt = planPrice(current, subscription.cycle);
  const history = [
    { id: "RCPT-3391", date: "15 Jun 2026", plan: subscription.plan, cycle: subscription.cycle, amt: histAmt, status: "Paid" },
    { id: "RCPT-3290", date: "15 May 2026", plan: subscription.plan, cycle: subscription.cycle, amt: histAmt, status: "Paid" },
    { id: "RCPT-3188", date: "15 Apr 2026", plan: subscription.plan, cycle: subscription.cycle, amt: histAmt, status: "Paid" },
  ];

  const isFree = subscription.plan === "Free";
  return (
    <div className="pd-canvas-wide" style={{ maxWidth: 1120 }}>
      {/* status banner */}
      <div className="pd-card pd-card-pad" style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 16, background: "linear-gradient(100deg,var(--wash),#fff)" }}>
        <span style={{ width: 50, height: 50, borderRadius: 14, background: isFree ? "linear-gradient(135deg,var(--green),var(--mid))" : "linear-gradient(135deg,var(--gold),var(--gold-d))", color: "#fff", display: "grid", placeItems: "center" }}>{isFree ? <IconCheck size={26} /> : <IconCrown size={26} />}</span>
        <div style={{ flex: 1 }}>
          <div className="pd-flex pd-gap6">
            <h3 style={{ fontSize: 17 }}>{current.name} plan</h3>
            <span className="pd-pill pill-green"><i className="d" />{subscription.status}</span>
            {!isFree && <span className="pd-pill pill-gray">{subscription.cycle === "annual" ? "Annual billing" : "Monthly billing"}</span>}
          </div>
          {isFree
            ? <p className="pd-muted" style={{ fontSize: 13 }}>Core billing free forever · {current.seats} · Billing / POS, Inventory &amp; Purchases included. Upgrade to unlock the premium modules below.</p>
            : <p className="pd-muted" style={{ fontSize: 13 }}>{inr(curPrice)}/{cycleNoun(subscription.cycle)} · {current.seats} · renews on <b>{subscription.renewsOn}</b>{subscription.cycle === "annual" && <> · <span style={{ color: "var(--green)", fontWeight: 700 }}>saving {inr(annualSavings(current))}/yr</span></>}</p>}
        </div>
        <div className="pd-flex pd-gap6">
          {isFree
            ? <button className="pd-btn pd-btn-primary" onClick={() => { const el = document.getElementById("pd-plans"); el?.scrollIntoView({ behavior: "smooth" }); }}><IconCrown size={14} /> Upgrade</button>
            : <button className="pd-btn pd-btn-ghost" onClick={() => setCheckout({ plan: subscription.plan, cycle: subscription.cycle, mode: "renew" })}>Renew {subscription.cycle === "annual" ? "+1 year" : "+1 month"}</button>}
        </div>
      </div>

      {!isFree && <div className="pd-flex" style={{ justifyContent: "space-between", marginBottom: 18, padding: "0 4px" }}>
        <div><span style={{ fontWeight: 700, fontSize: 13.5 }}>Auto-renew</span><div className="pd-muted" style={{ fontSize: 12 }}>Automatically charge & extend on the renewal date</div></div>
        <button className={`pd-switch${subscription.autoRenew ? " on" : ""}`} style={{ transform: "scale(1.1)" }} onClick={toggleAutoRenew} />
      </div>}

      {/* plan comparison + cycle toggle */}
      <div className="pd-sec-head"><h2 style={{ fontSize: 16 }}>Plans</h2><span className="sub">switch anytime · prices exclude {Math.round(GST_RATE * 100)}% GST</span></div>
      <div className="pd-flex" style={{ justifyContent: "center", margin: "4px 0 18px" }}>
        <div className="pd-seg">
          <button className={cycle === "monthly" ? "on" : ""} onClick={() => setCycle("monthly")}>Monthly</button>
          <button className={cycle === "annual" ? "on" : ""} onClick={() => setCycle("annual")}>Annual <span className="pd-pill pill-green" style={{ marginLeft: 4 }}>save up to {Math.round(Math.max(...Object.values(ANNUAL_DISCOUNT)) * 100)}%</span></button>
        </div>
      </div>

      <div id="pd-plans" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
        {PLANS.map((p) => {
          const isCurrent = p.key === subscription.plan && (p.key === "Free" || cycle === subscription.cycle);
          const free = p.key === "Free";
          const price = planPrice(p, cycle);
          const up = planIdx(p.key) > planIdx(subscription.plan);
          return (
            <div className="pd-card pd-card-pad" key={p.key} style={{ borderColor: isCurrent ? "var(--mid)" : "var(--line)", borderWidth: isCurrent ? 2 : 1, position: "relative" }}>
              {p.key === "Growth" && <span className="pd-pill pill-gold" style={{ position: "absolute", top: -10, right: 14 }}><IconStar size={13} /> Popular</span>}
              {free && <span className="pd-pill pill-green" style={{ position: "absolute", top: -10, right: 14 }}><IconCheck size={12} /> Free forever</span>}
              <div style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 18, color: "var(--dark)" }}>{p.name}</div>
              <div className="pd-muted" style={{ fontSize: 12 }}>{p.tagline}</div>
              <div style={{ margin: "10px 0 2px" }}>
                <span style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 28, color: "var(--dark)" }}>{free ? "₹0" : inr(price)}</span>
                {!free && <span className="pd-muted" style={{ fontSize: 13 }}>/{cycleNoun(cycle)}</span>}
              </div>
              {free
                ? <div style={{ fontSize: 11.5, marginBottom: 12 }} className="pd-muted">no card · no expiry</div>
                : cycle === "annual"
                  ? <div style={{ fontSize: 11.5, marginBottom: 12 }}><span className="pd-pill pill-green">{Math.round(ANNUAL_DISCOUNT[p.key] * 100)}% off</span> <span className="pd-muted">≈ {inr(annualPerMonth(p))}/mo · save {inr(annualSavings(p))}</span></div>
                  : <div style={{ fontSize: 11.5, marginBottom: 12 }} className="pd-muted">or {inr(planPrice(p, "annual"))}/yr (save {Math.round(ANNUAL_DISCOUNT[p.key] * 100)}%)</div>}
              <div style={{ marginBottom: 14 }}>
                {p.features.map((f) => <div key={f} className="pd-flex pd-gap6" style={{ fontSize: 12.5, padding: "3px 0", alignItems: "flex-start" }}><span style={{ color: "var(--green)", marginTop: 1 }}><IconCheck size={13} /></span><span>{f}</span></div>)}
              </div>
              {isCurrent
                ? <button className="pd-btn pd-btn-ghost pd-btn-block" disabled>Current plan</button>
                : free
                  ? <button className="pd-btn pd-btn-ghost pd-btn-block" onClick={() => changePlan("Free", "monthly")}>Downgrade to Free</button>
                  : <button className="pd-btn pd-btn-primary pd-btn-block" onClick={() => setCheckout({ plan: p.key, cycle, mode: up ? "upgrade" : "switch" })}>
                      {p.key === subscription.plan ? `Switch to ${cycle === "annual" ? "annual" : "monthly"}` : `${up ? "Upgrade" : "Switch"} to ${p.name}`}
                    </button>}
            </div>
          );
        })}
      </div>

      {/* billing history */}
      {!isFree && <div className="pd-card">
        <div className="pd-card-head"><h3>Billing history</h3></div>
        <div className="pd-tbl-wrap">
          <table className="pd-tbl">
            <thead><tr><th>Receipt</th><th>Date</th><th>Plan</th><th>Billing</th><th className="num">Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="pd-mono" style={{ fontWeight: 700 }}>{h.id}</td><td>{h.date}</td><td>{h.plan}</td>
                  <td style={{ textTransform: "capitalize" }}>{h.cycle}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{inr(h.amt)}</td>
                  <td><span className="pd-pill pill-green"><i className="d" />{h.status}</span></td>
                  <td className="num"><button className="pd-btn pd-btn-ghost pd-btn-sm">Invoice</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>}

      {checkout && (
        <CheckoutModal
          checkout={checkout}
          onClose={() => setCheckout(null)}
          onConfirm={() => {
            if (checkout.mode === "renew") renewSubscription();
            else changePlan(checkout.plan, checkout.cycle);
            setCheckout(null);
          }}
        />
      )}
    </div>
  );
}

// ── upgrade / switch / renew checkout ──────────────────────────────
function CheckoutModal({ checkout, onClose, onConfirm }: { checkout: Checkout; onClose: () => void; onConfirm: () => void }) {
  const plan = PLANS.find((p) => p.key === checkout.plan)! as PlanInfo;
  const [pay, setPay] = useState<"upi" | "card" | "netbanking">("upi");
  const term = checkout.cycle === "annual" ? "12 months" : "1 month";
  const listMonthly = plan.price * (checkout.cycle === "annual" ? 12 : 1);
  const subtotal = planPrice(plan, checkout.cycle);
  const discount = listMonthly - subtotal;
  const gst = Math.round(subtotal * GST_RATE);
  const total = subtotal + gst;
  const title = checkout.mode === "renew" ? "Renew subscription" : checkout.mode === "upgrade" ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`;

  return (
    <div className="pd-modal-wrap" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="pd-modal-head"><h3>{title}</h3><button className="pd-x" onClick={onClose}><IconX size={18} /></button></div>
        <div className="pd-modal-body">
          <div className="pd-card pd-card-pad" style={{ background: "var(--wash2)", marginBottom: 14 }}>
            <div className="pd-flex" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <div><div style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 18, color: "var(--dark)" }}>{plan.name}</div><div className="pd-muted" style={{ fontSize: 12 }}>{plan.seats} · {checkout.cycle === "annual" ? "Annual" : "Monthly"} billing · {term}</div></div>
              <span className="pd-pill pill-gold"><IconCrown size={12} /> {checkout.cycle === "annual" ? `${Math.round(ANNUAL_DISCOUNT[plan.key] * 100)}% off` : "Monthly"}</span>
            </div>
          </div>

          {/* price breakdown */}
          <div style={{ fontSize: 13 }}>
            <Row label={`${plan.name} ${checkout.cycle === "annual" ? "× 12 months" : "(monthly)"}`} value={inr(listMonthly)} />
            {discount > 0 && <Row label={`Annual discount (${Math.round(ANNUAL_DISCOUNT[plan.key] * 100)}%)`} value={"− " + inr(discount)} green />}
            <Row label="Subtotal" value={inr(subtotal)} />
            <Row label={`GST (${Math.round(GST_RATE * 100)}%)`} value={inr(gst)} muted />
            <div style={{ borderTop: "1px dashed var(--line-2)", margin: "8px 0" }} />
            <Row label={<b>Total payable</b>} value={<b style={{ fontSize: 16 }}>{inr(total)}</b>} />
          </div>

          {/* payment method */}
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>Payment method</label>
            <div className="pd-seg" style={{ display: "flex", marginTop: 6 }}>
              {(["upi", "card", "netbanking"] as const).map((m) => (
                <button key={m} className={pay === m ? "on" : ""} style={{ flex: 1, textTransform: m === "upi" ? "uppercase" : "capitalize" }} onClick={() => setPay(m)}>{m === "netbanking" ? "Net banking" : m}</button>
              ))}
            </div>
          </div>
          <p className="pd-muted" style={{ fontSize: 11.5, marginTop: 12 }}><IconLock size={13} /> You'll be redirected to your bank / UPI app to authorise the payment securely. Subscription activates instantly on success.</p>
        </div>
        <div className="pd-modal-foot">
          <button className="pd-btn pd-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="pd-btn pd-btn-primary" onClick={onConfirm}>Pay {inr(total)} & {checkout.mode === "renew" ? "renew" : "activate"}</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted, green }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean; green?: boolean }) {
  return (
    <div className="pd-flex" style={{ justifyContent: "space-between", padding: "5px 0" }}>
      <span className={muted ? "pd-muted" : ""} style={green ? { color: "var(--green)", fontWeight: 700 } : undefined}>{label}</span>
      <span style={green ? { color: "var(--green)", fontWeight: 700 } : undefined}>{value}</span>
    </div>
  );
}
