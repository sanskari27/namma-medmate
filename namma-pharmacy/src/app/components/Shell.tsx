"use client";
import { useEffect, useState } from "react";
import { PharmaProvider, usePharma, Route } from "../pharmaState";
import { PLANS, inr, planPrice, canSeeRoute } from "../data";
import {
  IconDashboard, IconPos, IconOrders, IconInventory, IconRx, IconStore,
  IconOffer, IconReports, IconSettings, IconSearch, IconBell, IconTruck,
  IconUsers, IconCustomers, IconSend, IconKiosk, IconShare, IconReceipt,
  IconCrown, IconGift, IconHelp, IconUser, IconRupee, IconCash, IconChevronLeft,
  IconLock, IconCheck, IconSparkle, IconArrowRight,
} from "./Icon";
import DashboardScreen from "../screens/DashboardScreen";
import PosScreen from "../screens/PosScreen";
import OrdersScreen from "../screens/OrdersScreen";
import SalesScreen from "../screens/SalesScreen";
import InventoryScreen from "../screens/InventoryScreen";
import RackMapScreen from "../screens/RackMapScreen";
import PurchasesScreen from "../screens/PurchasesScreen";
import ReorderScreen from "../screens/ReorderScreen";
import DistributorsScreen from "../screens/DistributorsScreen";
import PrescriptionsScreen from "../screens/PrescriptionsScreen";
import OnlineStoreScreen from "../screens/OnlineStoreScreen";
import OffersScreen from "../screens/OffersScreen";
import KioskScreen from "../screens/KioskScreen";
import ReportsScreen from "../screens/ReportsScreen";
import CAReportScreen from "../screens/CAReportScreen";
import CustomersScreen from "../screens/CustomersScreen";
import AccountScreen from "../screens/AccountScreen";
import UsersScreen from "../screens/UsersScreen";
import InvoiceSettingsScreen from "../screens/InvoiceSettingsScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import ReferScreen from "../screens/ReferScreen";
import SupportScreen from "../screens/SupportScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ExpensesScreen from "../screens/ExpensesScreen";
import EmployeesScreen from "../screens/EmployeesScreen";
import KhataScreen from "../screens/KhataScreen";
import CrmScreen from "../screens/CrmScreen";
import WardsScreen from "../screens/WardsScreen";
import IndentsScreen from "../screens/IndentsScreen";
import DepartmentsScreen from "../screens/DepartmentsScreen";
import SalesRegisterScreen from "../screens/SalesRegisterScreen";
import PatientBillsScreen from "../screens/PatientBillsScreen";
import DoctorsScreen from "../screens/DoctorsScreen";
import HospitalBillingScreen from "../screens/HospitalBillingScreen";
import SetupWizard from "./SetupWizard";
import Onboarding from "./Onboarding";

const NAV: { key: Route; label: string; Icon: (p: { size?: number }) => React.ReactNode; group?: string; hospital?: boolean }[] = [
  { key: "dashboard", label: "Dashboard", Icon: IconDashboard },
  { key: "pos", label: "Billing / POS", Icon: IconPos },
  { key: "orders", label: "Orders", Icon: IconOrders },
  { key: "sales", label: "Sales", Icon: IconRupee },
  { key: "prescriptions", label: "Prescriptions", Icon: IconRx },
  { key: "customers", label: "Customers", Icon: IconCustomers },
  { key: "khata", label: "Credit · Khata", Icon: IconReceipt },
  { key: "crm", label: "CRM · Patients", Icon: IconUsers },
  { key: "wards", label: "IPD · Wards", Icon: IconStore, group: "Hospital", hospital: true },
  { key: "hospbill", label: "Hospital Billing", Icon: IconReceipt, hospital: true },
  { key: "ptbills", label: "Active Patients", Icon: IconCustomers, hospital: true },
  { key: "salesreg", label: "Sales Register", Icon: IconRupee, hospital: true },
  { key: "indents", label: "Ward Indents", Icon: IconReceipt, hospital: true },
  { key: "departments", label: "Departments", Icon: IconUsers, hospital: true },
  { key: "doctors", label: "Doctors", Icon: IconRx, hospital: true },
  { key: "inventory", label: "Inventory", Icon: IconInventory, group: "Catalogue" },
  { key: "rackmap", label: "Rack & Locations", Icon: IconStore },
  { key: "purchases", label: "Purchases", Icon: IconTruck },
  { key: "reorder", label: "Reorder · Distributor", Icon: IconSend },
  { key: "distributors", label: "Distributors", Icon: IconTruck },
  { key: "online", label: "Online Store", Icon: IconStore },
  { key: "offers", label: "Offers", Icon: IconOffer },
  { key: "kiosk", label: "Self-Order Kiosk", Icon: IconKiosk },
  { key: "reports", label: "Reports", Icon: IconReports, group: "Business" },
  { key: "expenses", label: "Expenses", Icon: IconCash },
  { key: "ca", label: "CA / Accountant", Icon: IconShare },
  { key: "account", label: "Account", Icon: IconUser, group: "Account" },
  { key: "employees", label: "Employees", Icon: IconUsers },
  { key: "users", label: "Manage Users", Icon: IconUsers },
  { key: "invoicing", label: "Invoice Settings", Icon: IconReceipt },
  { key: "subscription", label: "Subscription", Icon: IconCrown },
  { key: "refer", label: "Refer & Earn", Icon: IconGift },
  { key: "settings", label: "Settings", Icon: IconSettings },
  { key: "support", label: "Help & Support", Icon: IconHelp },
];

const PAGE_META: Record<Route, { title: string; sub: string }> = {
  dashboard: { title: "Dashboard", sub: "Today at a glance" },
  pos: { title: "Billing / POS", sub: "Counter sale & GST invoice" },
  orders: { title: "Orders", sub: "Online & counter sales" },
  sales: { title: "Sales", sub: "Every sale, day one to date" },
  prescriptions: { title: "Prescriptions", sub: "Review & dispense" },
  customers: { title: "Customers", sub: "Customer database & history" },
  khata: { title: "Credit · Khata", sub: "Customer credit, dues & repayments" },
  crm: { title: "CRM · Patients", sub: "Segments, reminders, loyalty & campaigns" },
  wards: { title: "IPD · Wards", sub: "In-patient wards, beds & dispensing" },
  hospbill: { title: "Hospital Billing", sub: "Ward supply billed to the hospital credit account" },
  ptbills: { title: "Active Patients", sub: "In-patient bills & settlement" },
  salesreg: { title: "Sales Register", sub: "Sales by source, payment & insurance" },
  indents: { title: "Ward Indents", sub: "Medicine requisitions from wards" },
  departments: { title: "Departments", sub: "Hospital departments & doctors" },
  doctors: { title: "Doctors", sub: "Doctor directory — profiles & details" },
  inventory: { title: "Inventory", sub: "Stock, batches & expiry" },
  rackmap: { title: "Rack & Locations", sub: "Where each medicine is stored on the shelves" },
  purchases: { title: "Purchases", sub: "Distributor billing → auto-stock" },
  reorder: { title: "Reorder · Distributor", sub: "Send required stock to distributors" },
  distributors: { title: "Distributors", sub: "Your distributor & supplier directory" },
  online: { title: "Online Store", sub: "Control what customers see" },
  offers: { title: "Offers", sub: "Discounts & promotions" },
  kiosk: { title: "Self-Order Kiosk", sub: "In-store customer ordering" },
  reports: { title: "Reports", sub: "Sales & GST summary" },
  expenses: { title: "Expenses", sub: "Track business spend & categories" },
  ca: { title: "CA / Accountant", sub: "Share reports with your CA" },
  account: { title: "Account", sub: "Business account & plan" },
  employees: { title: "Employees", sub: "Team records, payroll & bank details" },
  users: { title: "Manage Users", sub: "Staff roles & access" },
  invoicing: { title: "Invoice Settings", sub: "Customise your GST invoice" },
  subscription: { title: "Subscription", sub: "Plan, renewal & billing" },
  refer: { title: "Refer & Earn", sub: "Invite pharmacies, earn rewards" },
  support: { title: "Help & Support", sub: "FAQs, tickets & contact" },
  settings: { title: "Settings", sub: "Pharmacy profile & licences" },
  notifications: { title: "Notifications", sub: "Alerts & updates" },
  menu: { title: "Menu", sub: "All sections" },
};

function BrandMark() {
  return (
    <span className="pd-brand-mark">
      <svg width={24} height={24} viewBox="0 0 40 40" fill="none" aria-hidden>
        <defs>
          <linearGradient id="pdLogo" x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4A9E6E" /><stop offset="1" stopColor="#1B3D29" />
          </linearGradient>
        </defs>
        <path d="M20 3.5C12.5 3.5 6.5 9.3 6.5 17c0 8.6 10.7 17.3 12.7 18.8a1.4 1.4 0 0 0 1.6 0C22.8 34.3 33.5 25.6 33.5 17 33.5 9.3 27.5 3.5 20 3.5Z" fill="url(#pdLogo)" />
        <circle cx="20" cy="16.5" r="8.7" fill="#fff" />
        <path d="M18 10.5h4V14h3.5v4H22v3.5h-4V18h-3.5v-4H18z" fill="#2F7D52" />
        <circle cx="27" cy="9" r="3" fill="#D9A648" stroke="#fff" strokeWidth="1.4" />
      </svg>
    </span>
  );
}

function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { route, go, profile, prescriptions, sales, isHospital, wardIndents, signOut, featureLocked, me } = usePharma();
  const newOrders = sales.filter((s) => s.channel === "online" && s.status === "new").length;
  const pendingRx = prescriptions.filter((r) => r.status === "pending").length;
  const pendingIndents = wardIndents.filter((x) => x.status === "pending").length;
  const badgeFor = (k: Route) => (k === "orders" ? newOrders : k === "prescriptions" ? pendingRx : k === "indents" ? pendingIndents : 0);
  const nav = NAV.filter((n) => (isHospital || !n.hospital) && canSeeRoute(n.key, me?.role, me?.permissions));
  const choose = (key: Route) => { go(key); onNavigate(); };
  return (
    <aside className={`pd-sidebar${open ? " open" : ""}`}>
      <div className="pd-brand">
        <BrandMark />
        <span className="pd-brand-tx">
          <b><em>Namma</em> MedMate</b>
          <small>Partner Console</small>
        </span>
      </div>
      <div className="pd-storechip">
        <span style={{ fontSize: 18 }}><IconStore size={18} /></span>
        <span className="nm">{profile.name}<small>{profile.storeOpen ? "● Online · accepting orders" : "○ Online store paused"}</small></span>
      </div>
      <nav className="pd-nav">
        {nav.map((n) => {
          const b = badgeFor(n.key);
          const locked = featureLocked(n.key);
          return (
            <div key={n.key}>
              {n.group && <div className="pd-nav-label">{n.group}</div>}
              <button className={`pd-navitem${route === n.key ? " on" : ""}${locked ? " locked" : ""}`} onClick={() => choose(n.key)} title={locked ? "Premium feature — upgrade to unlock" : undefined}>
                <span className="ic"><n.Icon size={19} /></span>
                {n.label}
                {locked ? <span className="pd-navlock"><IconLock size={12} /></span> : b > 0 && <span className="badge">{b}</span>}
              </button>
            </div>
          );
        })}
      </nav>
      <div className="pd-sidefoot">
        <div className="pd-userrow">
          <span className="pd-userav">{profile.pharmacist[0]}</span>
          <span className="nm">{profile.pharmacist.split(",")[0]}<small>Registered Pharmacist</small></span>
          <button className="pd-signout" title="Log out" onClick={signOut} aria-label="Log out">
            <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
        </div>
        <p className="pd-copyright">© 2026 Medmate India Technology Private Limited</p>
      </div>
    </aside>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { route, go, back, canGoBack, prescriptions, subscription, me } = usePharma();
  const meta = PAGE_META[route];
  const pendingRx = prescriptions.filter((r) => r.status === "pending").length;
  const allow = (key: Route) => canSeeRoute(key, me?.role, me?.permissions);
  return (
    <header className="pd-topbar">
      <button className="pd-menu-btn pd-topbtn pd-no-print" onClick={onMenu} aria-label="Menu">Menu</button>
      {canGoBack && (
        <button className="pd-backbtn pd-no-print" onClick={back} aria-label="Go back" title="Back to previous page">
          <IconChevronLeft size={19} />
        </button>
      )}
      <div className="pd-pagetitle">
        <h1>{meta.title}</h1>
        <small>{meta.sub}</small>
      </div>
      {allow("inventory") && <div className="pd-topsearch pd-no-print">
        <span className="ic"><IconSearch size={17} /></span>
        <input placeholder="Search medicines, orders, invoices…" onFocus={() => go("inventory")} readOnly />
      </div>}
      {subscription.plan === "Free" && <button className="pd-upgradechip pd-no-print" onClick={() => go("subscription")} title="Unlock premium features"><IconCrown size={14} /> Free plan · Upgrade</button>}
      {allow("pos") && <button className="pd-btn pd-btn-primary pd-no-print" onClick={() => go("pos")}>+ New sale</button>}
      {allow("prescriptions") && <button className="pd-topbtn pd-no-print" onClick={() => go("prescriptions")} aria-label="Notifications">
        <IconBell size={19} />
        {pendingRx > 0 && <span className="dot" />}
      </button>}
    </header>
  );
}

function LockedFeature({ route }: { route: Route }) {
  const { go, subscription } = usePharma();
  const meta = PAGE_META[route];
  const starter = PLANS.find((p) => p.key === "Starter")!;
  const price = planPrice(starter, "monthly");
  return (
    <div className="pd-canvas-wide">
      <div className="pd-paywall">
        <span className="pd-paywall-ic"><IconLock size={30} /></span>
        <span className="pd-pill pill-gold" style={{ marginBottom: 10 }}><IconCrown size={12} /> Paid plan</span>
        <h2>{meta.title} is a premium feature</h2>
        <p>You're on the <b>{subscription.plan}</b> plan. Billing / POS, Inventory and Purchases stay open — {meta.title} unlocks with any active paid plan from <b>{inr(price)}/mo</b>.</p>
        <div className="pd-paywall-feats">
          {starter.features.map((f) => <div key={f}><IconCheck size={14} /> {f}</div>)}
        </div>
        <div className="pd-paywall-cta">
          <button className="pd-btn pd-btn-primary" onClick={() => go("subscription")}><IconSparkle size={15} /> Upgrade to unlock</button>
          <button className="pd-btn pd-btn-ghost" onClick={() => go("subscription")}>See all plans <IconArrowRight size={14} /></button>
        </div>
        <p className="pd-paywall-free"><IconCheck size={13} /> Free forever: Billing / POS · Inventory · Purchases</p>
      </div>
    </div>
  );
}

function Canvas() {
  const { route, featureLocked } = usePharma();
  if (featureLocked(route)) return <LockedFeature route={route} />;
  switch (route) {
    case "pos": return <PosScreen />;
    case "orders": return <OrdersScreen />;
    case "sales": return <SalesScreen />;
    case "inventory": return <InventoryScreen />;
    case "rackmap": return <RackMapScreen />;
    case "purchases": return <PurchasesScreen />;
    case "reorder": return <ReorderScreen />;
    case "distributors": return <DistributorsScreen />;
    case "prescriptions": return <PrescriptionsScreen />;
    case "customers": return <CustomersScreen />;
    case "khata": return <KhataScreen />;
    case "crm": return <CrmScreen />;
    case "wards": return <WardsScreen />;
    case "hospbill": return <HospitalBillingScreen />;
    case "ptbills": return <PatientBillsScreen />;
    case "salesreg": return <SalesRegisterScreen />;
    case "indents": return <IndentsScreen />;
    case "departments": return <DepartmentsScreen />;
    case "doctors": return <DoctorsScreen />;
    case "online": return <OnlineStoreScreen />;
    case "offers": return <OffersScreen />;
    case "kiosk": return <KioskScreen />;
    case "reports": return <ReportsScreen />;
    case "expenses": return <ExpensesScreen />;
    case "ca": return <CAReportScreen />;
    case "account": return <AccountScreen />;
    case "employees": return <EmployeesScreen />;
    case "users": return <UsersScreen />;
    case "invoicing": return <InvoiceSettingsScreen />;
    case "subscription": return <SubscriptionScreen />;
    case "refer": return <ReferScreen />;
    case "support": return <SupportScreen />;
    case "settings": return <SettingsScreen />;
    default: return <DashboardScreen />;
  }
}

function Toast() {
  const { toastMsg } = usePharma();
  return <div className={`pd-toast${toastMsg ? " show" : ""}`}>{toastMsg}</div>;
}

function Inner() {
  const { setupComplete, signedIn, route, go, me, isHospital } = usePharma();
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!me || canSeeRoute(route, me.role, me.permissions)) return;
    const next = NAV.find((n) => (isHospital || !n.hospital) && canSeeRoute(n.key, me.role, me.permissions));
    if (next) go(next.key);
  }, [me, route, isHospital, go]);
  if (!signedIn) return <Onboarding />;
  if (!setupComplete) return <SetupWizard />;
  return (
    <div className="pd-shell">
      {menu && <button className="pd-nav-backdrop" aria-label="Close menu" onClick={() => setMenu(false)} />}
      <Sidebar open={menu} onNavigate={() => setMenu(false)} />
      <div className="pd-main">
        <TopBar onMenu={() => setMenu((v) => !v)} />
        <div className="pd-canvas">
          <Canvas />
        </div>
      </div>
      <Toast />
    </div>
  );
}

export default function Shell() {
  return (
    <PharmaProvider>
      <Inner />
    </PharmaProvider>
  );
}
