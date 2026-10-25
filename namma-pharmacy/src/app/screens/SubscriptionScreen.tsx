"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import {
  PLANS, BillingCycle, inr, planPrice, annualSavings, annualPerMonth,
  cycleNoun, ANNUAL_DISCOUNT, GST_RATE, subscriptionLapsed,
} from "../data";
import { IconCheck, IconCrown, IconStar } from "../components/Icon";

export default function SubscriptionScreen() {
  const { subscription, changePlan, toggleAutoRenew } = usePharma();
  const current = PLANS.find((p) => p.key === subscription.plan)!;
  const [cycle, setCycle] = useState<BillingCycle>(subscription.cycle);

  const curPrice = planPrice(current, subscription.cycle);

  const isFree = subscription.plan === "Free";
  const lapsed = subscriptionLapsed(subscription);
  const statusLabel = lapsed ? "expired" : subscription.status;
  return (
    <div className="pd-canvas-wide" style={{ maxWidth: 1120 }}>
      {/* status banner */}
      <div className="pd-card pd-card-pad" style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 16, background: "linear-gradient(100deg,var(--wash),#fff)" }}>
        <span style={{ width: 50, height: 50, borderRadius: 14, background: isFree ? "linear-gradient(135deg,var(--green),var(--mid))" : "linear-gradient(135deg,var(--gold),var(--gold-d))", color: "#fff", display: "grid", placeItems: "center" }}>{isFree ? <IconCheck size={26} /> : <IconCrown size={26} />}</span>
        <div style={{ flex: 1 }}>
          <div className="pd-flex pd-gap6">
            <h3 style={{ fontSize: 17 }}>{current.name} plan</h3>
            <span className={`pd-pill ${lapsed ? "pill-rose" : "pill-green"}`}><i className="d" />{statusLabel}</span>
            {!isFree && <span className="pd-pill pill-gray">{subscription.cycle === "annual" ? "Annual billing" : "Monthly billing"}</span>}
          </div>
          {isFree
            ? <p className="pd-muted" style={{ fontSize: 13 }}>Core billing free forever · {current.seats} · Billing / POS, Inventory &amp; Purchases included. Upgrade to unlock the premium modules below.</p>
            : <p className="pd-muted" style={{ fontSize: 13 }}>{inr(curPrice)}/{cycleNoun(subscription.cycle)} · {current.seats} · renews on <b>{subscription.renewsOn}</b>{subscription.cycle === "annual" && <> · <span style={{ color: "var(--green)", fontWeight: 700 }}>saving {inr(annualSavings(current))}/yr</span></>}</p>}
        </div>
        <div className="pd-flex pd-gap6">
          {isFree
            ? <button className="pd-btn pd-btn-primary" onClick={() => { const el = document.getElementById("pd-plans"); el?.scrollIntoView({ behavior: "smooth" }); }}><IconCrown size={14} /> View plans</button>
            : null}
        </div>
      </div>

      {!isFree && <div className="pd-flex" style={{ justifyContent: "space-between", marginBottom: 18, padding: "0 4px" }}>
        <div><span style={{ fontWeight: 700, fontSize: 13.5 }}>Auto-renew</span><div className="pd-muted" style={{ fontSize: 12 }}>Saved preference only. It does not charge a card or keep paid screens open after the renewal date.</div></div>
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
                  : <button className="pd-btn pd-btn-ghost pd-btn-block" disabled>Payment not available</button>}
            </div>
          );
        })}
      </div>
      <p className="pd-muted" style={{ fontSize: 12.5 }}>Online payment is not connected, so a paid plan cannot be purchased here.</p>
    </div>
  );
}
