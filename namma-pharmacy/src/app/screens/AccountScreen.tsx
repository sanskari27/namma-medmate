"use client";
import { useState } from "react";
import { usePharma } from "../pharmaState";
import { PLANS, planPrice, cycleNoun, inr, computeInvoice, routeLocked, PREMIUM_ROUTES, HOSPITAL_ROUTES, includedSeats, seatCeiling, UserRole, isValidIfsc } from "../data";
import { Route } from "../pharmaState";
import {
  IconUsers, IconReceipt, IconCrown, IconGift, IconShare, IconHelp, IconSettings, IconCheck,
  IconArrowRight, IconRupee, IconShield, IconStore, IconWallet, IconAlert, IconDownload,
  IconLock, IconSparkle, IconBank, IconInventory,
} from "../components/Icon";

const download = (blob: Blob, name: string) => { const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 6000); };
const ROLE_PILL: Record<string, string> = { Owner: "pill-gold", Manager: "pill-blue", Pharmacist: "pill-green", Cashier: "pill-teal" };

export default function AccountScreen() {
  const { profile, subscription, grants, extraSeats, businessType, users, sales, inventory, bankAccount, go, startSetup, signOut } = usePharma();
  const openBank = () => document.getElementById("pd-bank")?.scrollIntoView({ behavior: "smooth", block: "center" });
  const plan = PLANS.find((p) => p.key === subscription.plan)!;
  const isFree = subscription.plan === "Free";

  // ── metrics ──
  const activeUsers = users.filter((u) => u.active).length;
  const included = includedSeats(subscription.plan);
  const seatLimit = seatCeiling(subscription.plan, extraSeats);
  const seatPct = seatLimit == null ? Math.min(100, activeUsers * 10) : Math.min(100, Math.round((activeUsers / Math.max(1, seatLimit)) * 100));
  const invoices = sales.filter((s) => s.status !== "cancelled");
  const revenue = invoices.reduce((a, s) => a + computeInvoice(s.items, s.discount).payable, 0);
  const visiblePremium = PREMIUM_ROUTES.filter((route) => businessType === "hospital" || !HOSPITAL_ROUTES.includes(route));
  const premiumUnlocked = visiblePremium.filter((route) => !routeLocked(route, subscription, { grants, businessType })).length;
  const roleCount = users.reduce<Record<string, number>>((m, u) => { m[u.role] = (m[u.role] || 0) + 1; return m; }, {});
  const roleMax = Math.max(1, ...Object.values(roleCount));

  // ── profile completeness ──
  const checklist = [
    { label: "Brand logo", ok: !!profile.logo, go: () => go("invoicing") },
    { label: "Signature", ok: !!profile.signature, go: () => go("settings") },
    { label: "GSTIN", ok: !!profile.gstin, go: () => go("settings") },
    { label: "PAN", ok: !!profile.pan, go: () => go("settings") },
    { label: "Drug licence", ok: !!profile.dlNo, go: () => go("settings") },
    { label: "FSSAI licence", ok: !!profile.fssai, go: () => go("settings") },
    { label: "Business email", ok: !!profile.email, go: () => go("settings") },
    { label: "Bank account", ok: !!bankAccount, go: openBank },
  ];
  const done = checklist.filter((c) => c.ok).length;
  const pct = Math.round((done / checklist.length) * 100);
  const pending = checklist.filter((c) => !c.ok);

  // ── KYC ──
  const kyc = [
    { label: "GSTIN", val: profile.gstin || "—", ok: !!profile.gstin },
    { label: "PAN", val: profile.pan || "—", ok: !!profile.pan },
    { label: "Drug Licence (D.L.)", val: profile.dlNo || "—", ok: !!profile.dlNo },
    { label: "FSSAI licence", val: profile.fssai || "—", ok: !!profile.fssai },
    { label: "Registered pharmacist", val: profile.pharmacist.split(",")[0], ok: !!profile.pharmacist },
    { label: "e-Invoicing", val: profile.eInvoicing ? "Enabled" : "Not enabled", ok: profile.eInvoicing },
    { label: "Bank account (payouts)", val: bankAccount ? `${bankAccount.bankName} ····${bankAccount.accountNumber.slice(-4)}` : "Add to receive payouts", ok: !!bankAccount, bank: true },
  ];

  const links: { key: Route; label: string; sub: string; Icon: (p: { size?: number }) => React.ReactNode }[] = [
    { key: "users", label: "Manage Users", sub: `${users.length} team members`, Icon: IconUsers },
    { key: "invoicing", label: "Invoice Settings", sub: "Templates, logo & stamp", Icon: IconReceipt },
    { key: "subscription", label: "Subscription", sub: isFree ? "Free · upgrade anytime" : `${subscription.plan} · renews ${subscription.renewsOn}`, Icon: IconCrown },
    { key: "ca", label: "CA / Accountant", sub: "Share reports", Icon: IconShare },
    { key: "refer", label: "Refer & Earn", sub: "Invite & earn ₹500", Icon: IconGift },
    { key: "settings", label: "Pharmacy Profile", sub: "Licences & GSTIN", Icon: IconSettings },
    { key: "support", label: "Help & Support", sub: "FAQs & tickets", Icon: IconHelp },
  ];

  const exportAccount = () => {
    const data = {
      business: { name: profile.name, address: profile.address, gstin: profile.gstin, pan: profile.pan, dlNo: profile.dlNo, fssai: profile.fssai, phone: profile.phone, email: profile.email, pharmacist: profile.pharmacist },
      plan: { plan: subscription.plan, cycle: subscription.cycle, status: subscription.status, since: subscription.since, renewsOn: subscription.renewsOn },
      usage: { teamMembers: users.length, activeUsers, invoices: invoices.length, lifetimeSales: Math.round(revenue), catalogueSkus: inventory.length, profileCompletePct: pct },
      bankAccount: bankAccount ? { bankName: bankAccount.bankName, ifsc: bankAccount.ifsc, verified: bankAccount.verified } : null,
    };
    download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), "account-summary.json");
  };

  return (
    <div className="pd-canvas-wide" style={{ maxWidth: 1080 }}>
      {/* business header */}
      <div className="pd-card pd-card-pad" style={{ marginBottom: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span className="pd-acct-av">{profile.logo ? <img src={profile.logo} alt="" /> : profile.name[0]}</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ fontSize: 20 }}>{profile.name}</h2>
          <p className="pd-muted" style={{ fontSize: 13 }}>{profile.address}</p>
          <div className="pd-flex pd-gap6" style={{ marginTop: 6, flexWrap: "wrap" }}>
            <span className="pd-pill pill-green"><i className="d" />Active</span>
            <span className={`pd-pill ${isFree ? "pill-gray" : "pill-gold"}`}><IconCrown size={12} /> {subscription.plan} plan</span>
            {profile.businessTypes?.[0] && <span className="pd-tag">{profile.businessTypes[0]}</span>}
            <span className="pd-tag">Member since {subscription.since}</span>
          </div>
        </div>
        <div className="pd-flex pd-gap6">
          <button className="pd-btn pd-btn-ghost" onClick={startSetup}><IconSettings size={14} /> Run setup</button>
          <button className="pd-btn pd-btn-primary" onClick={() => go("settings")}>Edit profile</button>
        </div>
      </div>

      {/* KPI overview */}
      <div className="pd-stats" >
        <div className="pd-stat link" role="button" tabIndex={0} onClick={() => go("subscription")}><span className="go"><IconArrowRight size={16} /></span><div className="ic ic-gold"><IconCrown size={18} /></div><div className="lbl">Plan</div><div className="val">{subscription.plan}</div><div className="split">{isFree ? "free forever" : subscription.status}</div></div>
        <div className="pd-stat link" role="button" tabIndex={0} onClick={() => go("users")}><span className="go"><IconArrowRight size={16} /></span><div className="ic ic-green"><IconUsers size={18} /></div><div className="lbl">Team members</div><div className="val">{users.length}</div><div className="split">{activeUsers} active</div></div>
        <div className="pd-stat"><div className="ic ic-blue"><IconWallet size={18} /></div><div className="lbl">Seats used</div><div className="val">{activeUsers} / {seatLimit == null ? "∞" : seatLimit}</div><div className="split">{included == null ? "Unlimited" : `${included} included`}{extraSeats ? ` + ${extraSeats} extra` : ""}</div></div>
        <div className="pd-stat"><div className="ic ic-teal"><IconReceipt size={18} /></div><div className="lbl">Invoices</div><div className="val">{invoices.length}</div><div className="split">all time</div></div>
        <div className="pd-stat"><div className="ic ic-green"><IconRupee size={18} /></div><div className="lbl">Lifetime sales</div><div className="val">{inr(revenue)}</div><div className="split">{inventory.length} SKUs</div></div>
        <div className="pd-stat"><div className="ic ic-gold"><IconShield size={18} /></div><div className="lbl">Profile complete</div><div className="val">{pct}%</div><div className="split">{done}/{checklist.length} done</div></div>
      </div>

      {/* plan + completeness */}
      <div className="pd-grid-2" style={{ marginTop: 16 }}>
        {/* plan & usage */}
        <div className="pd-card" style={{ borderColor: "var(--mint)" }}>
          <div className="pd-card-head"><h3>Plan &amp; usage</h3><span className={`pd-pill ${isFree ? "pill-gray" : "pill-green"}`}><i className="d" />{subscription.status}</span></div>
          <div className="pd-card-pad">
            <div className="pd-flex" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <div><div style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 24, color: "var(--dark)" }}>{plan.name}</div><div className="pd-muted" style={{ fontSize: 12.5 }}>{plan.seats} · {isFree ? "free forever" : `${inr(planPrice(plan, subscription.cycle))}/${cycleNoun(subscription.cycle)}`}</div></div>
              <button className={`pd-btn pd-btn-sm ${isFree ? "pd-btn-primary" : "pd-btn-gold"}`} onClick={() => go("subscription")}>{isFree ? <><IconSparkle size={13} /> Upgrade</> : <>Manage <IconArrowRight size={14} /></>}</button>
            </div>
            {/* seats */}
            <div className="pd-acct-usage">
              <div className="pd-flex" style={{ justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}><span className="pd-muted">Team seats</span><b>{activeUsers} / {seatLimit == null ? "∞" : seatLimit}</b></div>
              <div className="pd-util"><span style={{ width: `${seatPct}%` }} /></div>
            </div>
            {/* premium modules */}
            <div className="pd-acct-usage">
              <div className="pd-flex" style={{ justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}><span className="pd-muted">Premium modules</span><b>{premiumUnlocked} / {visiblePremium.length} unlocked</b></div>
              <div className="pd-util"><span style={{ width: `${visiblePremium.length ? (premiumUnlocked / visiblePremium.length) * 100 : 0}%` }} /></div>
            </div>
            {isFree
              ? <div className="pd-acct-freebar"><IconLock size={13} /> Billing / POS, Inventory &amp; Purchases are free. <b onClick={() => go("subscription")} style={{ cursor: "pointer", color: "var(--gold-d)" }}>Upgrade</b> to unlock the rest.</div>
              : <div className="pd-flex" style={{ justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--line-2)", fontSize: 13 }}><span className="pd-muted">Renews on</span><b>{subscription.renewsOn}</b></div>}
          </div>
        </div>

        {/* profile completeness */}
        <div className="pd-card">
          <div className="pd-card-head"><h3>Profile completeness</h3><span className="pd-muted" style={{ fontSize: 12 }}>{done} of {checklist.length}</span></div>
          <div className="pd-card-pad">
            <div className="pd-acct-complete">
              <Ring pct={pct} />
              <div style={{ flex: 1 }}>
                {pending.length === 0
                  ? <div className="pd-hb-clear"><IconCheck size={14} /> All set — your profile is complete.</div>
                  : <>
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>Finish these to look professional on invoices &amp; get payouts:</div>
                    <div className="pd-acct-todos">
                      {pending.slice(0, 5).map((c) => (
                        <button key={c.label} className="pd-acct-todo" onClick={c.go}><IconAlert size={12} /> {c.label} <IconArrowRight size={12} /></button>
                      ))}
                    </div>
                  </>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KYC + team */}
      <div className="pd-grid-2" style={{ marginTop: 16 }}>
        <div className="pd-card">
          <div className="pd-card-head"><h3>Business verification</h3><button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => go("settings")}>Update</button></div>
          <div className="pd-card-pad" style={{ paddingTop: 4 }}>
            {kyc.map((k) => (
              <div className="pd-flex" key={k.label} style={{ justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{k.label}</div><div className="pd-muted pd-mono" style={{ fontSize: 11 }}>{k.val}</div></div>
                {k.ok ? <span className="pd-pill pill-green"><IconCheck size={12} /> Done</span> : <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => ("bank" in k && k.bank ? openBank() : go("settings"))}>Add</button>}
              </div>
            ))}
          </div>
        </div>

        <div className="pd-card">
          <div className="pd-card-head"><h3>Team</h3><button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => go("users")}>Manage <IconArrowRight size={13} /></button></div>
          <div className="pd-card-pad">
            <div className="pd-flex" style={{ gap: 14, marginBottom: 14 }}>
              <div><div style={{ fontFamily: "Manrope", fontWeight: 800, fontSize: 26, color: "var(--dark)" }}>{users.length}</div><div className="pd-muted" style={{ fontSize: 12 }}>members · {activeUsers} active</div></div>
            </div>
            {(["Owner", "Manager", "Pharmacist", "Cashier"] as UserRole[]).filter((r) => roleCount[r]).map((r) => (
              <div key={r} style={{ marginBottom: 9 }}>
                <div className="pd-flex" style={{ justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}><span className={`pd-pill ${ROLE_PILL[r]}`}>{r}</span><b>{roleCount[r]}</b></div>
                <div className="pd-prog"><i style={{ width: `${(roleCount[r] / roleMax) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BankCard />

      {/* quick links */}
      <div className="pd-sec-head" style={{ margin: "22px 0 12px" }}><h2 style={{ fontSize: 16 }}>Account settings</h2></div>
      <div className="pd-grid-cards" style={{ gap: 14 }}>
        {links.map((l) => (
          <button key={l.key} className="pd-card pd-card-pad" style={{ textAlign: "left", display: "flex", gap: 12, alignItems: "center" }} onClick={() => go(l.key)}>
            <span style={{ width: 40, height: 40, borderRadius: 10, background: "var(--wash)", color: "var(--mid)", display: "grid", placeItems: "center", flexShrink: 0 }}><l.Icon size={20} /></span>
            <span style={{ flex: 1 }}><span style={{ fontWeight: 700, fontSize: 13.5, display: "block" }}>{l.label}</span><span className="pd-muted" style={{ fontSize: 12 }}>{l.sub}</span></span>
            <IconArrowRight size={16} />
          </button>
        ))}
      </div>

      {/* utilities */}
      <div className="pd-acct-utils">
        <button className="pd-btn pd-btn-ghost" onClick={exportAccount}><IconDownload size={14} /> Export account summary</button>
        <button className="pd-btn pd-btn-ghost" onClick={() => go("support")}><IconHelp size={14} /> Contact support</button>
        <div className="pd-spacer" />
        <button className="pd-btn pd-btn-line pd-acct-signout" onClick={signOut}>Sign out</button>
      </div>
    </div>
  );
}

const blankBank = { holderName: "", accountNumber: "", ifsc: "", bankName: "", branch: "", accountType: "Current" as const, upiVpa: "" };
function bankForm(b: { holderName: string; accountNumber: string; ifsc: string; bankName: string; branch?: string; accountType: "Savings" | "Current"; upiVpa?: string } | null) {
  return b ? { holderName: b.holderName, accountNumber: b.accountNumber, ifsc: b.ifsc, bankName: b.bankName, branch: b.branch ?? "", accountType: b.accountType, upiVpa: b.upiVpa ?? "" } : blankBank;
}
function BankCard() {
  const { bankAccount, saveBankAccount, verifyBankAccount, removeBankAccount } = usePharma();
  const [f, setF] = useState(() => bankForm(bankAccount));
  const set = (patch: Partial<typeof f>) => setF((p) => ({ ...p, ...patch }));
  const ifscOk = isValidIfsc(f.ifsc);
  const canSave = !!f.holderName.trim() && !!f.accountNumber.trim() && !!f.bankName.trim() && ifscOk;
  const save = async () => {
    await saveBankAccount({ holderName: f.holderName.trim(), accountNumber: f.accountNumber.replace(/\s/g, ""), ifsc: f.ifsc.trim().toUpperCase(), bankName: f.bankName.trim(), branch: f.branch.trim() || undefined, accountType: f.accountType, upiVpa: f.upiVpa.trim() || undefined });
  };
  return (
    <div className="pd-card" id="pd-bank" style={{ marginTop: 16 }}>
      <div className="pd-card-head">
        <h3><span className="pd-flex pd-gap6"><IconBank size={16} /> Payout bank account</span></h3>
        {bankAccount?.verified ? <span className="pd-pill pill-green"><IconCheck size={12} /> Verified</span> : bankAccount ? <span className="pd-pill pill-gold">Verification pending</span> : null}
      </div>
      <div className="pd-card-pad">
        <div className="pd-form-grid">
          <div className="pd-field"><label>Account holder</label><input className="pd-input" value={f.holderName} onChange={(e) => set({ holderName: e.target.value })} /></div>
          <div className="pd-field"><label>Account number</label><input className="pd-input pd-mono" value={f.accountNumber} onChange={(e) => set({ accountNumber: e.target.value })} /></div>
          <div className="pd-field" data-field="ifsc"><label>IFSC</label><input className="pd-input pd-mono" value={f.ifsc} onChange={(e) => set({ ifsc: e.target.value.toUpperCase() })} placeholder="HDFC0001234" /></div>
          <div className="pd-field"><label>Bank</label><input className="pd-input" value={f.bankName} onChange={(e) => set({ bankName: e.target.value })} /></div>
          <div className="pd-field"><label>Branch</label><input className="pd-input" value={f.branch} onChange={(e) => set({ branch: e.target.value })} /></div>
          <div className="pd-field"><label>Type</label>
            <select className="pd-select" value={f.accountType} onChange={(e) => set({ accountType: e.target.value as "Savings" | "Current" })}><option>Current</option><option>Savings</option></select>
          </div>
          <div className="pd-field pd-span2"><label>UPI (optional)</label><input className="pd-input" value={f.upiVpa} onChange={(e) => set({ upiVpa: e.target.value })} placeholder="name@upi" /></div>
        </div>
        {f.ifsc.trim() && !ifscOk ? <p className="pd-muted" style={{ fontSize: 12, color: "var(--rose)", marginTop: 8 }}>Enter a valid IFSC (4 letters, 0, then 6 characters).</p> : null}
        <div className="pd-flex pd-gap6" style={{ marginTop: 14 }}>
          <button className="pd-btn pd-btn-primary" disabled={!canSave} onClick={save}>Save account</button>
          {bankAccount && !bankAccount.verified ? <button className="pd-btn pd-btn-ghost" onClick={verifyBankAccount}>Mark verified</button> : null}
          {bankAccount ? <button className="pd-btn pd-btn-ghost" style={{ color: "var(--rose)" }} onClick={() => { removeBankAccount(); setF(blankBank); }}>Remove</button> : null}
        </div>
        <p className="pd-muted" style={{ fontSize: 12, marginTop: 8 }}>Verification is stored on this pharmacy. No bank is contacted.</p>
      </div>
    </div>
  );
}

// completeness ring
function Ring({ pct }: { pct: number }) {
  const r = 30, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return (
    <div className="pd-acct-ring">
      <svg width={78} height={78} viewBox="0 0 78 78">
        <circle cx="39" cy="39" r={r} fill="none" stroke="var(--wash)" strokeWidth="8" />
        <circle cx="39" cy="39" r={r} fill="none" stroke="var(--mid)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 39 39)" />
      </svg>
      <span className="pd-acct-ring-val">{pct}%</span>
    </div>
  );
}
