"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { BillingCycle, HOSPITAL_ROUTES, Plan, PREMIUM_ROUTES, subscriptionLapsed, todayISO } from "../data";
import {
  IconChevronLeft, IconCrown, IconDashboard, IconGift, IconHelp, IconReports, IconRx, IconSend, IconStore, IconUser,
} from "../components/Icon";
import { SignOutDialog } from "../components/SignOutDialog";

type Desk = "dashboard" | "pharmacies" | "kyc" | "subscriptions" | "requests" | "support" | "consultations" | "referrals" | "activity";
type Booking = { id: number; name: string; phone: string; area: string; note: string; status: string; at: string };
type Seats = { included: number | null; extra: number; inUse: number; limit: number | null };
type Kyc = { gstin: string; pan: string; dlNo: string; fssai: string; pharmacist?: string; bank?: { bankName?: string; accountNumber?: string; ifsc?: string } | null };
type Row = { id: string; phone: string; name: string; city: string; plan: string; cycle: string; status: string; renewsOn: string; businessType: string; seats: Seats; kyc: Kyc };
type Grant = { route: string; until?: string };
type RequestRow = { id: string; pharmacyId: string; pharmacyName: string; phone: string; plan: Plan; cycle: BillingCycle; kind: string; createdAt: number; status: string };
type Ticket = { id: string; subject: string; status: string; pharmacyId?: string; pharmacyName?: string; category?: string };
type Referral = { id: string; name: string; status: string; reward: number; paidAt?: number; paidBy?: string; pharmacyId?: string; pharmacyName?: string };
type Profile = Row & { tickets: Ticket[]; referrals: Referral[]; grants: Grant[]; requests: { id: string; plan: string; cycle: string; kind: string; createdAt: number; status: string }[] };
type AuditRow = { phone: string; pharmacyId: string; pharmacyName: string; action: string; before: unknown; after: unknown; reason: string; at: string };

const LABELS: Record<string, string> = {
  orders: "Orders", sales: "Sales", prescriptions: "Prescriptions", customers: "Customers", khata: "Credit · Khata",
  crm: "CRM", rackmap: "Rack map", reorder: "Reorder", distributors: "Distributors", online: "Online store",
  offers: "Offers", kiosk: "Kiosk", reports: "Reports", expenses: "Expenses", ca: "CA", employees: "Employees",
  wards: "IPD · Wards", hospbill: "Hospital Billing", ptbills: "Active Patients", salesreg: "Sales Register",
  indents: "Ward Indents", departments: "Departments", doctors: "Doctors",
};
const PLANS: Plan[] = ["Free", "Starter", "Growth", "Pro"];
const NAV: { key: Desk; label: string; group?: string; Icon: (p: { size?: number }) => React.ReactNode }[] = [
  { key: "dashboard", label: "Dashboard", Icon: IconDashboard },
  { key: "pharmacies", label: "Pharmacies", Icon: IconStore, group: "Tenants" },
  { key: "kyc", label: "KYC", Icon: IconUser },
  { key: "subscriptions", label: "Subscriptions", Icon: IconCrown },
  { key: "requests", label: "Plan requests", Icon: IconSend },
  { key: "support", label: "Support", Icon: IconHelp, group: "Operations" },
  { key: "consultations", label: "Consultations", Icon: IconRx },
  { key: "referrals", label: "Referrals", Icon: IconGift },
  { key: "activity", label: "Platform activity", Icon: IconReports },
];
const META: Record<Desk, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Pharmacies, KYC, and renewals" },
  pharmacies: { title: "Pharmacies", sub: "Search and open a pharmacy file" },
  kyc: { title: "KYC", sub: "GSTIN, PAN, or drug licence still blank" },
  subscriptions: { title: "Subscriptions", sub: "Plan, cycle, and renewal" },
  requests: { title: "Plan requests", sub: "What pharmacies asked for" },
  support: { title: "Support", sub: "Open tickets" },
  consultations: { title: "Consultations", sub: "Bookings from the public site" },
  referrals: { title: "Referrals", sub: "Earn, then pay ₹500 once" },
  activity: { title: "Platform activity", sub: "Master changes, newest first" },
};

function plusDays(days: number) {
  const date = new Date(todayISO() + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function subOf(row: Row) {
  return { plan: row.plan as Plan, cycle: (row.cycle === "annual" ? "annual" : "monthly") as BillingCycle, status: (row.status === "expired" ? "expired" : "active") as "active" | "expired", renewsOn: row.renewsOn, since: "", autoRenew: false };
}
function renewalDue(row: Row) {
  if (row.plan === "Free") return false;
  if (subscriptionLapsed(subOf(row))) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(row.renewsOn) && row.renewsOn <= plusDays(30);
}
function kycGaps(row: { kyc: Kyc }) {
  return [!row.kyc.gstin && "GSTIN", !row.kyc.pan && "PAN", !row.kyc.dlNo && "Drug licence"].filter(Boolean) as string[];
}
function seatText(seats: Seats) {
  return `${seats.inUse} in use · ${seats.included == null ? "unlimited" : seats.included} included · ${seats.extra} extra`;
}
function when(value: string | number) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function MasterPortal({ phone, onPharmacy, pharmacyLabel, onSignedOut }: { phone: string; onPharmacy: () => void; pharmacyLabel: string; onSignedOut: () => void }) {
  const [desk, setDesk] = useState<Desk>("dashboard");
  const [menu, setMenu] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [window, setWindow] = useState("");
  const [reason, setReason] = useState("");
  const [renewsOn, setRenewsOn] = useState(plusDays(30));
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [nextPlan, setNextPlan] = useState<Plan>("Starter");
  const [extra, setExtra] = useState(0);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [error, setError] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);

  const load = async () => {
    const [list, inbox, work, booked] = await Promise.all([
      api<Row[]>("/master/pharmacies"),
      api<RequestRow[]>("/master/requests"),
      api<{ tickets: Ticket[]; referrals: Referral[] }>("/master/work"),
      api<Booking[]>("/master/consultations"),
    ]);
    setRows(list);
    setRequests(inbox);
    setTickets(work.tickets);
    setReferrals(work.referrals);
    setBookings(booked);
  };
  useEffect(() => { void load().catch((err) => setError(err.message)); }, []);
  useEffect(() => {
    if (desk !== "activity") return;
    void api<AuditRow[]>("/master/audit").then(setAudit).catch((err) => setError(err.message));
  }, [desk]);

  const choose = (key: Desk) => { setDesk(key); setProfile(null); setMenu(false); };
  const open = async (id: string, patch?: { plan?: Plan; cycle?: BillingCycle }) => {
    const next = await api<Profile>("/master/pharmacies/" + id);
    setProfile(next);
    setNextPlan(patch?.plan || next.plan as Plan);
    setCycle(patch?.cycle || (next.cycle === "annual" ? "annual" : "monthly"));
    setRenewsOn(/^\d{4}-\d{2}-\d{2}$/.test(next.renewsOn) ? next.renewsOn : plusDays(30));
    setExtra(next.seats.extra);
    setGrants(next.grants || []);
    setError("");
    setMenu(false);
  };
  const save = async (path: string, method: string, body: unknown, reopen = true) => {
    try {
      await api(path, { method, body: { ...(body as object), reason } });
      await load();
      if (reopen && profile) await open(profile.id);
      if (desk === "activity") setAudit(await api<AuditRow[]>("/master/audit"));
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
  };
  const signOut = () => setLeaveOpen(true);
  const finishSignOut = async () => {
    setLeaveOpen(false);
    await api("/master/sign-out", { method: "POST" }).catch(() => undefined);
    onSignedOut();
  };

  const filtered = rows.filter((row) => {
    const query = q.trim().toLowerCase();
    const digits = query.replace(/\D/g, "");
    if (query && !row.name.toLowerCase().includes(query) && !row.city.toLowerCase().includes(query) && !(digits.length >= 4 && row.phone.replace(/\D/g, "").includes(digits))) return false;
    if (plan && row.plan !== plan) return false;
    if (businessType && row.businessType !== businessType) return false;
    const sub = subOf(row);
    if (window === "expired") return subscriptionLapsed(sub);
    if (window === "7" || window === "15" || window === "30") {
      if (subscriptionLapsed(sub) || !/^\d{4}-\d{2}-\d{2}$/.test(row.renewsOn)) return false;
      return row.renewsOn >= todayISO() && row.renewsOn <= plusDays(Number(window));
    }
    return true;
  });
  const kycQueue = rows.filter((row) => kycGaps(row).length > 0);
  const due = rows.filter(renewalDue);
  const openRequests = requests.filter((request) => request.status === "open");
  const meta = META[desk];
  const openBookings = bookings.filter((row) => row.status === "open").length;
  const badge = (key: Desk) => key === "kyc" ? kycQueue.length : key === "subscriptions" ? due.length : key === "requests" ? openRequests.length : key === "support" ? tickets.length : key === "consultations" ? openBookings : 0;
  const markBooking = async (id: number) => {
    try {
      await api(`/master/consultations/${id}`, { method: "PATCH", body: { status: "handled" } });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
  };
  const impersonate = async (id: string) => {
    try {
      await api(`/master/pharmacies/${id}/impersonate`, { method: "POST", body: {} });
      globalThis.location.assign("/");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not open the pharmacy"); }
  };

  return (
    <div className="pd-shell">
      {menu && <button className="pd-nav-backdrop" aria-label="Close menu" onClick={() => setMenu(false)} />}
      <aside className={`pd-sidebar${menu ? " open" : ""}`}>
        <div className="pd-brand">
          <span className="pd-brand-mark" aria-hidden>
            <svg width={24} height={24} viewBox="0 0 40 40" fill="none">
              <path d="M20 3.5C12.5 3.5 6.5 9.3 6.5 17c0 8.6 10.7 17.3 12.7 18.8a1.4 1.4 0 0 0 1.6 0C22.8 34.3 33.5 25.6 33.5 17 33.5 9.3 27.5 3.5 20 3.5Z" fill="#2F7D52" />
              <circle cx="20" cy="16.5" r="8.7" fill="#fff" />
              <path d="M18 10.5h4V14h3.5v4H22v3.5h-4V18h-3.5v-4H18z" fill="#2F7D52" />
            </svg>
          </span>
          <span className="pd-brand-tx"><b><em>Namma</em> MedMate</b><small>Master</small></span>
        </div>
        <div className="pd-storechip">
          <span style={{ fontSize: 18 }}><IconUser size={18} /></span>
          <span className="nm">{phone}<small>Allowlisted staff</small></span>
        </div>
        <nav className="pd-nav">
          {NAV.map((item) => (
            <div key={item.key}>
              {item.group && <div className="pd-nav-label">{item.group}</div>}
              <button className={`pd-navitem${desk === item.key && !profile ? " on" : ""}`} onClick={() => choose(item.key)}>
                <span className="ic"><item.Icon size={19} /></span>
                {item.label}
                {badge(item.key) > 0 && <span className="badge">{badge(item.key)}</span>}
              </button>
            </div>
          ))}
        </nav>
        <div className="pd-sidefoot">
          <button className="pd-navitem" onClick={onPharmacy}><span className="ic"><IconStore size={19} /></span>{pharmacyLabel}</button>
          <div className="pd-userrow">
            <span className="pd-userav">M</span>
            <span className="nm">Master<small>{phone}</small></span>
            <button className="pd-signout" title="Log out" onClick={signOut} aria-label="Log out">
              <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>
          <p className="pd-copyright">© 2026 Medmate India Technology Private Limited</p>
        </div>
      </aside>
      <div className="pd-main">
        <header className="pd-topbar">
          <button className="pd-menu-btn pd-topbtn" onClick={() => setMenu((open) => !open)} aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          {profile && <button className="pd-backbtn" onClick={() => setProfile(null)} aria-label="Go back"><IconChevronLeft size={19} /></button>}
          <div className="pd-pagetitle">
            <h1>{profile ? profile.name : meta.title}</h1>
            <small>{profile ? `${profile.phone} · ${profile.city || "No city"}` : meta.sub}</small>
          </div>
        </header>
        <div className="pd-canvas">
          <div className="pd-canvas-wide">
            {error && <p className="pd-form-alert" role="alert">{error}</p>}
            {profile ? <PharmacyFile profile={profile} reason={reason} setReason={setReason} nextPlan={nextPlan} setNextPlan={setNextPlan} cycle={cycle} setCycle={setCycle} renewsOn={renewsOn} setRenewsOn={setRenewsOn} extra={extra} setExtra={setExtra} grants={grants} setGrants={setGrants} save={save} onImpersonate={() => void impersonate(profile.id)} /> : (
              <>
                {desk === "dashboard" && <Dashboard counts={{ pharmacies: rows.length, kyc: kycQueue.length, due: due.length, requests: openRequests.length, tickets: tickets.length }} onOpen={choose} />}
                {desk === "pharmacies" && <PharmacyList rows={filtered} q={q} setQ={setQ} plan={plan} setPlan={setPlan} businessType={businessType} setBusinessType={setBusinessType} window={window} setWindow={setWindow} onOpen={(id) => void open(id)} />}
                {desk === "kyc" && <Queue rows={kycQueue} empty="Every pharmacy has a GSTIN, PAN, and drug licence." columns={["Pharmacy", "Phone", "Missing"]} cells={(row) => [row.name, row.phone, kycGaps(row).join(", ")]} onOpen={(id) => void open(id)} />}
                {desk === "subscriptions" && <Queue rows={rows} empty="No pharmacies yet." columns={["Pharmacy", "Plan", "Renews", "Seats"]} cells={(row) => [row.name, `${row.plan} · ${row.cycle}${renewalDue(row) ? " · due" : ""}`, row.renewsOn || "—", seatText(row.seats)]} onOpen={(id) => void open(id)} />}
                {desk === "requests" && <RequestTable requests={requests} onOpen={(request) => void open(request.pharmacyId, { plan: request.plan, cycle: request.cycle })} />}
                {desk === "support" && <TicketTable tickets={tickets} onResolve={(ticket) => void save(`/master/pharmacies/${ticket.pharmacyId}/tickets/${ticket.id}`, "PATCH", { status: "Resolved" }, false)} />}
                {desk === "consultations" && <ConsultationTable rows={bookings} onHandled={(id) => void markBooking(id)} />}
                {desk === "referrals" && <ReferralTable referrals={referrals} onEarn={(row) => void save(`/master/pharmacies/${row.pharmacyId}/referrals/${row.id}/earn`, "POST", {}, false)} onPay={(row) => void save(`/master/pharmacies/${row.pharmacyId}/referrals/${row.id}/pay`, "POST", {}, false)} />}
                {desk === "activity" && <AuditTable rows={audit} />}
              </>
            )}
          </div>
        </div>
      </div>
      {leaveOpen && <SignOutDialog onCancel={() => setLeaveOpen(false)} onConfirm={() => void finishSignOut()} />}
    </div>
  );
}

function Dashboard({ counts, onOpen }: { counts: Record<string, number>; onOpen: (desk: Desk) => void }) {
  const cards: { key: Desk; label: string; hint: string; accent: string }[] = [
    { key: "pharmacies", label: "Pharmacies", hint: "On this server", accent: "accent-green" },
    { key: "kyc", label: "KYC incomplete", hint: "GSTIN, PAN, or drug licence", accent: "accent-gold" },
    { key: "subscriptions", label: "Subscriptions due", hint: "Expired or renewing in 30 days", accent: "accent-rose" },
    { key: "requests", label: "Plan requests", hint: "Waiting to be handled", accent: "accent-blue" },
    { key: "support", label: "Open tickets", hint: "Support inbox", accent: "accent-green" },
  ];
  return (
    <div className="pd-stats">
      {cards.map((card) => (
        <div key={card.key} className={`pd-stat link kpi ${card.accent}`} role="button" tabIndex={0} onClick={() => onOpen(card.key)} onKeyDown={(event) => { if (event.key === "Enter") onOpen(card.key); }}>
          <div className="lbl">{card.label}</div>
          <div className="val">{counts[card.key === "pharmacies" ? "pharmacies" : card.key === "kyc" ? "kyc" : card.key === "subscriptions" ? "due" : card.key === "requests" ? "requests" : "tickets"]}</div>
          <div className="split">{card.hint}</div>
        </div>
      ))}
    </div>
  );
}

function PharmacyList({ rows, q, setQ, plan, setPlan, businessType, setBusinessType, window, setWindow, onOpen }: {
  rows: Row[]; q: string; setQ: (value: string) => void; plan: string; setPlan: (value: string) => void;
  businessType: string; setBusinessType: (value: string) => void; window: string; setWindow: (value: string) => void; onOpen: (id: string) => void;
}) {
  return (
    <>
      <div className="pd-card pd-card-pad" style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="pd-input" placeholder="Name, phone, or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search pharmacies" />
        <select className="pd-select" value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan filter"><option value="">Any plan</option>{PLANS.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="pd-select" value={businessType} onChange={(e) => setBusinessType(e.target.value)} aria-label="Business type filter"><option value="">Any type</option><option value="pharmacy">Retail</option><option value="hospital">Hospital</option></select>
        <select className="pd-select" value={window} onChange={(e) => setWindow(e.target.value)} aria-label="Renewal window"><option value="">Any renewal</option><option value="7">Expiring in 7 days</option><option value="15">Expiring in 15 days</option><option value="30">Expiring in 30 days</option><option value="expired">Expired</option></select>
      </div>
      <Table columns={["Pharmacy", "Phone", "City", "Plan", "Type", "Renews", "Seats"]} empty="No pharmacies match.">
        {rows.map((row) => <tr key={row.id} onClick={() => onOpen(row.id)} style={{ cursor: "pointer" }}><td>{row.name}</td><td>{row.phone}</td><td>{row.city || "—"}</td><td>{row.plan} · {row.cycle}</td><td>{row.businessType}</td><td>{row.renewsOn || "—"}</td><td>{seatText(row.seats)}</td></tr>)}
      </Table>
    </>
  );
}

function Queue({ rows, empty, columns, cells, onOpen }: { rows: Row[]; empty: string; columns: string[]; cells: (row: Row) => string[]; onOpen: (id: string) => void }) {
  return <Table columns={columns} empty={empty}>{rows.map((row) => <tr key={row.id} onClick={() => onOpen(row.id)} style={{ cursor: "pointer" }}>{cells(row).map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</Table>;
}

function RequestTable({ requests, onOpen }: { requests: RequestRow[]; onOpen: (request: RequestRow) => void }) {
  return (
    <Table columns={["Pharmacy", "Plan", "Cycle", "Kind", "Sent", "Status", ""]} empty="No requests.">
      {requests.map((request) => (
        <tr key={request.pharmacyId + request.id}>
          <td>{request.pharmacyName || request.phone}</td><td>{request.plan}</td><td>{request.cycle}</td><td>{request.kind}</td>
          <td>{when(request.createdAt)}</td><td>{request.status}</td>
          <td>{request.status === "open" && <button className="pd-btn pd-btn-sm pd-btn-primary" onClick={() => onOpen(request)}>Open</button>}</td>
        </tr>
      ))}
    </Table>
  );
}

function ConsultationTable({ rows, onHandled }: { rows: Booking[]; onHandled: (id: number) => void }) {
  return (
    <Table columns={["When", "Name", "Phone", "Area", "Note", "Status", ""]} empty="No consultation bookings yet.">
      {rows.map((row) => (
        <tr key={row.id}>
          <td>{when(row.at)}</td><td>{row.name}</td><td>{row.phone}</td><td>{row.area || "—"}</td><td>{row.note || "—"}</td>
          <td><span className="pd-pill">{row.status}</span></td>
          <td>{row.status === "open" && <button className="pd-btn pd-btn-sm" onClick={() => onHandled(row.id)}>Mark handled</button>}</td>
        </tr>
      ))}
    </Table>
  );
}

function TicketTable({ tickets, onResolve }: { tickets: Ticket[]; onResolve: (ticket: Ticket) => void }) {
  return (
    <Table columns={["Pharmacy", "Ticket", "Status", ""]} empty="No open tickets.">
      {tickets.map((ticket) => (
        <tr key={ticket.pharmacyId + ticket.id}>
          <td>{ticket.pharmacyName}</td><td>{ticket.subject}</td><td><span className="pd-pill">{ticket.status}</span></td>
          <td><button className="pd-btn pd-btn-sm" onClick={() => onResolve(ticket)}>Resolve</button></td>
        </tr>
      ))}
    </Table>
  );
}

function ReferralTable({ referrals, onEarn, onPay }: { referrals: Referral[]; onEarn: (row: Referral) => void; onPay: (row: Referral) => void }) {
  return (
    <Table columns={["Pharmacy", "Referral", "Status", "Reward", ""]} empty="No referrals.">
      {referrals.map((referral) => (
        <tr key={(referral.pharmacyId || "") + referral.id}>
          <td>{referral.pharmacyName}</td><td>{referral.name}</td><td><span className="pd-pill">{referral.status}</span></td><td>₹{referral.reward}</td>
          <td>
            {referral.status !== "Paid" && referral.status !== "Earned" && <button className="pd-btn pd-btn-sm" onClick={() => onEarn(referral)}>Mark earned</button>}
            {referral.status === "Earned" && <button className="pd-btn pd-btn-sm pd-btn-primary" onClick={() => onPay(referral)}>Mark paid</button>}
            {referral.paidBy && <span className="pd-muted">Paid by {referral.paidBy}</span>}
          </td>
        </tr>
      ))}
    </Table>
  );
}

function AuditTable({ rows }: { rows: AuditRow[] }) {
  return (
    <Table columns={["When", "Pharmacy", "Action", "Reason", "By"]} empty="No master changes yet.">
      {rows.map((row, index) => <tr key={row.at + index}><td>{when(row.at)}</td><td>{row.pharmacyName || row.pharmacyId}</td><td>{row.action}</td><td>{row.reason || "—"}</td><td>{row.phone}</td></tr>)}
    </Table>
  );
}

function Table({ columns, empty, children }: { columns: string[]; empty: string; children: React.ReactNode }) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <div className="pd-card"><div className="pd-tbl-wrap"><table className="pd-tbl"><thead><tr>{columns.map((column) => <th key={column || "action"}>{column}</th>)}</tr></thead>
      <tbody>{count === 0 ? <tr><td colSpan={columns.length} className="pd-muted">{empty}</td></tr> : children}</tbody>
    </table></div></div>
  );
}

function PharmacyFile({ profile, reason, setReason, nextPlan, setNextPlan, cycle, setCycle, renewsOn, setRenewsOn, extra, setExtra, grants, setGrants, save, onImpersonate }: {
  profile: Profile; reason: string; setReason: (value: string) => void; nextPlan: Plan; setNextPlan: (value: Plan) => void;
  cycle: BillingCycle; setCycle: (value: BillingCycle) => void; renewsOn: string; setRenewsOn: (value: string) => void;
  extra: number; setExtra: (value: number) => void; grants: Grant[]; setGrants: (value: Grant[] | ((list: Grant[]) => Grant[])) => void;
  save: (path: string, method: string, body: unknown) => Promise<void>;
  onImpersonate: () => void;
}) {
  const gaps = kycGaps(profile);
  return (
    <div className="pd-card pd-card-pad">
      <p className="pd-muted">{profile.businessType} · {profile.plan} {profile.cycle} · renews {profile.renewsOn} · {seatText(profile.seats)}</p>
      <button className="pd-btn pd-btn-primary" style={{ margin: "8px 0" }} onClick={onImpersonate}>Open this pharmacy</button>
      <p>KYC: GSTIN {profile.kyc.gstin || "—"} · PAN {profile.kyc.pan || "—"} · Drug licence {profile.kyc.dlNo || "—"} · FSSAI {profile.kyc.fssai || "—"} · Pharmacist {profile.kyc.pharmacist || "—"} · Bank {profile.kyc.bank ? `${profile.kyc.bank.bankName || ""} ${profile.kyc.bank.accountNumber || ""} ${profile.kyc.bank.ifsc || ""}` : "—"}</p>
      {gaps.length > 0 && <p className="pd-form-alert">Missing {gaps.join(", ")}. The pharmacy fills these in Settings. This desk does not approve them.</p>}
      <div className="pd-field" style={{ margin: "12px 0" }}><label>Reason</label><input className="pd-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this change" /></div>
      <div className="pd-flex pd-gap6" style={{ flexWrap: "wrap", marginBottom: 12 }}>
        <select className="pd-select" value={nextPlan} onChange={(e) => setNextPlan(e.target.value as Plan)} aria-label="Plan">{PLANS.map((item) => <option key={item}>{item}</option>)}</select>
        <select className="pd-select" value={cycle} onChange={(e) => setCycle(e.target.value as BillingCycle)} aria-label="Billing cycle"><option value="monthly">Monthly</option><option value="annual">Annual</option></select>
        <input className="pd-input" type="date" value={renewsOn} onChange={(e) => setRenewsOn(e.target.value)} aria-label="Renewal date" />
        <button className="pd-btn pd-btn-primary" onClick={() => save(`/master/pharmacies/${profile.id}/plan`, "PATCH", { plan: nextPlan, cycle, renewsOn: nextPlan === "Free" ? "—" : renewsOn })}>Save plan</button>
      </div>
      <div className="pd-flex pd-gap6" style={{ flexWrap: "wrap", marginBottom: 12 }}>
        <input className="pd-input" type="number" min={0} max={50} value={extra} onChange={(e) => setExtra(Number(e.target.value))} aria-label="Extra seats" />
        <button className="pd-btn pd-btn-primary" onClick={() => save(`/master/pharmacies/${profile.id}/seats`, "PATCH", { extraSeats: extra })}>Save seats</button>
        <button className="pd-btn pd-btn-ghost" onClick={() => {
          const next = profile.businessType === "hospital" ? "pharmacy" : "hospital";
          if (!confirm(`Change this pharmacy to ${next === "hospital" ? "hospital" : "retail"}? Hospital screens follow this choice.`)) return;
          void save(`/master/pharmacies/${profile.id}/business-type`, "PATCH", { businessType: next });
        }}>Set {profile.businessType === "hospital" ? "retail" : "hospital"}</button>
      </div>
      <h4>Screen access</h4>
      <p className="pd-muted">Grants open a screen on Free and after a paid plan lapses. An active paid plan ignores them. Hospital screens also need the hospital business type.</p>
      {PREMIUM_ROUTES.map((route) => {
        const grant = grants.find((item) => item.route === route);
        return <label key={route} className="pd-flex pd-gap6" style={{ margin: "4px 0" }}>
          <input type="checkbox" checked={Boolean(grant)} onChange={(e) => setGrants((list) => e.target.checked ? [...list, { route }] : list.filter((item) => item.route !== route))} />
          <span>{LABELS[route] || route}{HOSPITAL_ROUTES.includes(route) ? " · hospital" : ""}</span>
          {grant && <input className="pd-input" type="date" value={grant.until || ""} onChange={(e) => setGrants((list) => list.map((item) => item.route === route ? { route, until: e.target.value || undefined } : item))} aria-label={`${LABELS[route] || route} expiry`} />}
        </label>;
      })}
      <button className="pd-btn pd-btn-primary" style={{ marginTop: 8 }} onClick={() => save(`/master/pharmacies/${profile.id}/grants`, "PUT", { grants })}>Save screen access</button>
      <h4 style={{ marginTop: 16 }}>Open tickets</h4>
      {profile.tickets.length === 0 ? <p className="pd-muted">No open tickets.</p> : profile.tickets.map((ticket) => (
        <div key={ticket.id} className="pd-flex pd-gap6" style={{ margin: "6px 0" }}>
          <span>{ticket.subject}</span><span className="pd-pill">{ticket.status}</span>
          {ticket.status !== "Resolved" && <button className="pd-btn pd-btn-sm" onClick={() => save(`/master/pharmacies/${profile.id}/tickets/${ticket.id}`, "PATCH", { status: "Resolved" })}>Resolve</button>}
        </div>
      ))}
      <h4>Referrals</h4>
      {profile.referrals.length === 0 ? <p className="pd-muted">No referrals.</p> : profile.referrals.map((referral) => (
        <div key={referral.id} className="pd-flex pd-gap6" style={{ margin: "6px 0" }}>
          <span>{referral.name}</span><span className="pd-pill">{referral.status}</span><span>₹{referral.reward}</span>
          {referral.status !== "Paid" && referral.status !== "Earned" && <button className="pd-btn pd-btn-sm" onClick={() => save(`/master/pharmacies/${profile.id}/referrals/${referral.id}/earn`, "POST", {})}>Mark earned</button>}
          {referral.status === "Earned" && <button className="pd-btn pd-btn-sm pd-btn-primary" onClick={() => save(`/master/pharmacies/${profile.id}/referrals/${referral.id}/pay`, "POST", {})}>Mark paid</button>}
          {referral.paidBy && <span className="pd-muted">Paid by {referral.paidBy}</span>}
        </div>
      ))}
    </div>
  );
}
