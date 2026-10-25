"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import {
  PLANS, Plan, BillingCycle, inr, planPrice, annualSavings, annualPerMonth,
  cycleNoun, ANNUAL_DISCOUNT, GST_RATE, subscriptionLapsed,
} from "../data";
import { ApiError, api } from "../lib/api";
import { IconCheck, IconCrown, IconStar } from "../components/Icon";

type CouponOffer = { code: string; plan: Plan; expiresOn: string; validDays: number; expired: boolean; renewsOn: string };

export default function SubscriptionScreen() {
  const { subscription, subscriptionRequests, couponRedeemed, requestPlan, redeemCoupon, toggleAutoRenew } = usePharma();
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

      <div id="pd-plans" className="pd-plans">
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
              {isCurrent && free
                ? <button className="pd-btn pd-btn-ghost pd-btn-block" disabled>Current plan</button>
                : <button className="pd-btn pd-btn-ghost pd-btn-block" onClick={() => requestPlan(p.key, free ? "monthly" : cycle, isCurrent ? "renewal" : "plan")}>{isCurrent ? "Request renewal" : `Request ${p.name}`}</button>}
            </div>
          );
        })}
      </div>
      {!couponRedeemed && <CouponRedeem onRedeem={redeemCoupon} />}
      <p className="pd-muted" style={{ fontSize: 12.5 }}>Online payment is not connected. A request goes to Namma MedMate, who assigns the plan.</p>
      {subscriptionRequests.length > 0 && <div className="pd-card" style={{ marginTop: 16 }}>
        <div className="pd-card-head"><h3>Your requests</h3></div>
        <div className="pd-tbl-wrap"><table className="pd-tbl"><thead><tr><th>Plan</th><th>Cycle</th><th>Kind</th><th>Sent</th><th>Status</th></tr></thead><tbody>
          {subscriptionRequests.map((request) => <tr key={request.id}><td>{request.plan}</td><td>{request.cycle}</td><td>{request.kind}</td><td>{new Date(request.createdAt).toLocaleString()}</td><td>{request.status}</td></tr>)}
        </tbody></table></div>
      </div>}
    </div>
  );
}

function CouponRedeem({ onRedeem }: { onRedeem: (code: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [offer, setOffer] = useState<CouponOffer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setError("");
    setOffer(null);
    setBusy(true);
    try {
      setOffer(await api<CouponOffer>("/subscription/coupons/preview", { method: "POST", body: { code } }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not check that code");
    } finally { setBusy(false); }
  };
  const plan = offer ? PLANS.find((item) => item.key === offer.plan) : undefined;
  return (
    <div style={{ marginTop: 22 }}>
      <div className="pd-flex" style={{ alignItems: "center", gap: 12, margin: "4px 0 14px" }}>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
        <span className="pd-muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".04em" }}>or</span>
        <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>
      {!open ? (
        <p style={{ textAlign: "center", fontSize: 14 }}>Have a coupon code? <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => setOpen(true)}>Redeem now</button></p>
      ) : (
        <div className="pd-card pd-card-pad" style={{ maxWidth: 480, margin: "0 auto" }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Have a coupon code?</h3>
          <p className="pd-muted" style={{ fontSize: 12.5, marginBottom: 12 }}>One coupon per pharmacy. Check it before you redeem.</p>
          <div className="pd-flex pd-gap6" style={{ alignItems: "flex-end" }}>
            <div className="pd-field" style={{ flex: 1 }}>
              <label htmlFor="coupon-code">Coupon code</label>
              <input id="coupon-code" className="pd-input" data-field="code" value={code} autoComplete="off" aria-invalid={Boolean(error)} onChange={(e) => { setCode(e.target.value.toUpperCase()); setOffer(null); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") void check(); }} />
            </div>
            <button className="pd-btn pd-btn-ghost" disabled={busy || code.trim().length < 4} onClick={() => void check()}>Check</button>
          </div>
          {error && <p className="pd-form-alert" role="alert" style={{ marginTop: 12 }}>{error}</p>}
          {offer && plan && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 18 }}>{plan.name} plan</div>
              <p className="pd-muted" style={{ fontSize: 13, margin: "4px 0 10px" }}>Active for {offer.validDays} days, until <b>{offer.renewsOn}</b>. Code expires <b>{offer.expiresOn}</b>.</p>
              {offer.expired
                ? <p className="pd-form-alert" role="alert">This coupon has expired.</p>
                : <button className="pd-btn pd-btn-primary" disabled={busy} onClick={() => { setBusy(true); void onRedeem(offer.code).finally(() => setBusy(false)); }}>Redeem</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
