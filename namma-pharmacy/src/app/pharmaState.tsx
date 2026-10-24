"use client";
import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SEED_INVENTORY, SEED_SALES, SEED_RX, SEED_OFFERS, DEFAULT_PROFILE, SEED_PURCHASES,
  InvProduct, Sale, SaleItem, Prescription, Offer, OfferType, directOfferId, PharmacyProfile, Batch, BankAccount,
  Purchase, PurchaseItem, DosageForm, Schedule,
  PayMode, PAY_LABEL, Channel, OrderStatus, ONLINE_FLOW, SaleSource,
  Rider, packComplete,
  computeInvoice, InvoiceTotals, sellPrice, mrpOf, earliestBatch, stockOf, findScan,
  distinctRacks, normalizeRack,
  perUnitPrice, perUnitMrp, unitsPerPack, unitNoun,
  StaffUser, SEED_USERS, Subscription, DEFAULT_SUBSCRIPTION, Plan, BillingCycle, routeLocked,
  InvoiceSettings, DEFAULT_INVOICE_SETTINGS, KioskConfig, DEFAULT_KIOSK,
  Advisor, SEED_ADVISORS, CAShare, SEED_CA_SHARES,
  PurchaseOrder, POItem, SEED_PURCHASE_ORDERS, seedHistory,
  Supplier, SEED_SUPPLIERS,
  Expense, resolveSeedExpenses, EXPENSE_CATEGORIES,
  Employee, SEED_EMPLOYEES,
  CreditPayment, resolveSeedCreditPayments,
} from "./data";
import {
  CrmData, EMPTY_CRM, Campaign, Feedback, ReminderLog, Redemption, PatientMeta,
} from "./lib/crm";
import {
  SupplyEntry, SEED_SUPPLY,
} from "./data";
import {
  Ward, SEED_WARDS, WardIndent, IndentStatus, resolveSeedIndents,
  Department, SEED_DEPARTMENTS, TpaClaim, ClaimStatus, resolveSeedClaims,
  DoctorProfile, SEED_DOCTORS, Admission, resolveSeedAdmissions,
} from "./lib/hospital";
import {
  HospitalAccount, DEFAULT_HOSPITAL_ACCOUNT, WardSupply, WardSupplyItem, HospitalPayment,
  resolveSeedSupplies, resolveSeedHospitalPayments, creditPriceOf, PriceRule, ADMIN_PRICING_OTP,
} from "./lib/hospitalAccount";

// pharmacy = standalone retail pharmacy · hospital = hospital pharmacy (extra IPD/TPA modules)
export type BusinessType = "pharmacy" | "hospital";

export type Route =
  | "dashboard" | "pos" | "orders" | "sales" | "inventory" | "rackmap" | "prescriptions"
  | "purchases" | "reorder" | "distributors" | "online" | "offers" | "kiosk"
  | "reports" | "ca" | "customers" | "expenses" | "employees" | "khata" | "crm"
  | "account" | "users" | "invoicing" | "subscription" | "refer" | "support" | "settings" | "menu"
  | "wards" | "indents" | "departments" | "doctors" | "salesreg" | "ptbills" | "hospbill" // hospital-pharmacy modules
  | "notifications"; // used by the mobile partner app (/namma-pharmacy-app)

export type PosLine = { productId: string; qty: number; loose?: boolean; batchNo?: string };
export type PosCustomer = {
  name: string; phone: string;
  email: string;                 // customer mail ID (optional)
  rxSource: "doctor" | "self";   // prescribed by a doctor, or self purchase
  doctor: string;
};
const BLANK_POS_CUSTOMER: PosCustomer = { name: "", phone: "", email: "", rxSource: "doctor", doctor: "" };

type Ctx = {
  // auth / onboarding
  signedIn: boolean;
  businessType: BusinessType;
  isHospital: boolean;
  signIn: (bt: BusinessType, name?: string) => void;
  signOut: () => void;
  // hospital-pharmacy modules
  wards: Ward[];
  addWard: (w: Omit<Ward, "id">) => void;
  updateWard: (id: string, patch: Partial<Ward>) => void;
  removeWard: (id: string) => void;
  admissions: Admission[];
  admitPatient: (a: Omit<Admission, "id" | "admittedAt" | "status">) => Admission;
  updateAdmission: (id: string, patch: Partial<Admission>) => void;
  dischargePatient: (id: string) => void;
  startWardBilling: (a: Admission) => void;   // open POS pre-filled for this admission
  wardIndents: WardIndent[];
  departments: Department[];
  tpaClaims: TpaClaim[];
  doctors: DoctorProfile[];
  addDoctor: (d: Omit<DoctorProfile, "id">) => void;
  updateDoctor: (id: string, patch: Partial<DoctorProfile>) => void;
  removeDoctor: (id: string) => void;
  setIndentStatus: (id: string, status: IndentStatus) => void;
  setClaimStatus: (id: string, status: ClaimStatus, approvedAmount?: number) => void;
  settleBills: (ids: string[], payMode: PayMode) => void;  // settle in-patient bills together
  // institutional bill-to-hospital model
  hospitalAccount: HospitalAccount;
  updateHospitalAccount: (patch: Partial<HospitalAccount>) => void;
  hospitalPriceRules: Record<string, PriceRule>;    // per-product discount overrides (% or flat ₹)
  setUniformDiscount: (pct: number) => void;        // uniform institutional discount (admin-gated)
  setHospitalPriceRule: (productId: string, rule: PriceRule | null) => void; // per-product (admin-gated)
  pricingUnlocked: boolean;                          // admin has authorised pricing changes this session
  unlockPricing: (otp: string) => boolean;           // verify admin OTP → unlock
  lockPricing: () => void;
  wardSupplies: WardSupply[];
  issueWardSupply: (draft: Omit<WardSupply, "id" | "kind" | "at" | "total">) => WardSupply | null;
  returnWardSupply: (draft: Omit<WardSupply, "id" | "kind" | "at" | "total">) => WardSupply | null;
  hospitalPayments: HospitalPayment[];
  recordHospitalPayment: (p: Omit<HospitalPayment, "id" | "at">) => void;
  billIndentTarget: string | null;                  // indent id to pre-load into Hospital Billing
  openIndentBilling: (indentId: string) => void;    // go to Hospital Billing & bill this indent
  clearBillIndentTarget: () => void;
  issueIndent: (indentId: string) => boolean;       // one-click issue → hospital billing (false ⇒ open modal)
  // navigation
  route: Route;
  go: (r: Route) => void;
  back: () => void;                                        // pop one step (or close an in-screen sub-view)
  canGoBack: boolean;                                      // false only at the root (home) with empty history
  registerBack: (fn: (() => boolean) | null) => void;      // screens with internal sub-views intercept Back
  invFilter: string | null;            // transient: pre-select an Inventory filter on next open
  setInvFilter: (f: string | null) => void;
  reportTarget: string | null;         // transient: open a specific report on next Reports open
  openReport: (id: string) => void;    // go to Reports and open report `id`
  setReportTarget: (id: string | null) => void;
  // data
  inventory: InvProduct[];
  sales: Sale[];
  prescriptions: Prescription[];
  offers: Offer[];
  purchases: Purchase[];
  profile: PharmacyProfile;
  now: number;
  // inventory ops
  addProduct: (p: InvProduct) => void;
  updateProduct: (id: string, patch: Partial<InvProduct>) => void;
  // rack / bin locations
  racks: string[];
  createRack: (rack: string) => boolean;
  removeRack: (rack: string) => void;
  setProductLocation: (id: string, rack: string, rackAlt?: string) => void;
  bulkAssignLocation: (ids: string[], rack: string) => void;
  addBatch: (id: string, batch: InvProduct["batches"][number]) => void;
  setBatchQty: (id: string, batchNo: string, qty: number) => void;
  // purchases / goods-inward — auto-updates stock
  receivePurchase: (draft: { supplierId: string; supplierName: string; invoiceNo: string; invoiceDate: string; items: PurchaseItem[] }) => Purchase | null;
  toggleOnline: (id: string) => void;
  toggleLoose: (id: string) => void;
  setOnlinePrice: (id: string, price: number | undefined) => void;
  setProductOffer: (id: string, offerId: string | undefined) => void;
  // POS / billing
  pos: PosLine[];
  posCustomer: PosCustomer;
  setPosCustomer: (c: Partial<PosCustomer>) => void;
  posDiscount: number;                       // raw value entered (₹ or %)
  setPosDiscount: (n: number) => void;
  posDiscountMode: "flat" | "percent";
  setPosDiscountMode: (m: "flat" | "percent") => void;
  posDiscountFlat: number;                    // effective ₹ discount applied
  posRxImage: string | null;                  // prescription photo attached to the current bill
  setPosRxImage: (img: string | null) => void;
  posPay: PayMode;
  setPosPay: (m: PayMode) => void;
  posSource: SaleSource;            // hospital: where the sale originated
  setPosSource: (s: SaleSource) => void;
  posWard: string;                  // hospital: ward name when source === "ward"
  setPosWard: (w: string) => void;
  posInsurer: string;               // hospital: insurer / TPA when payMode === "insurance"
  setPosInsurer: (i: string) => void;
  posPatientId: string;             // hospital: UHID / IP no. for ward/emergency bills
  setPosPatientId: (p: string) => void;
  posAdd: (id: string, loose?: boolean, batchNo?: string) => void;
  posDec: (id: string, loose?: boolean, batchNo?: string) => void;
  posSetQty: (id: string, qty: number, loose?: boolean, batchNo?: string) => void;
  posRemove: (id: string, loose?: boolean, batchNo?: string) => void;
  posSetBatch: (id: string, batchNo: string | undefined, loose?: boolean) => void;  // pin/override a line's batch
  scanToPos: (code: string) => { name: string; batchNo?: string } | null;          // barcode/batch scan → add to bill
  posClear: () => void;
  posTotals: InvoiceTotals;
  posCount: number;
  checkoutPos: (opts?: { paid?: boolean; ward?: string }) => Sale | null;
  lastInvoice: Sale | null;
  setLastInvoice: (s: Sale | null) => void;
  // orders (online lifecycle)
  advanceOrder: (id: string) => void;
  cancelOrder: (id: string) => void;
  markPaid: (id: string, payMode: PayMode) => void;
  // online-order fulfilment (pick → scan-pack → seal → handover)
  startPacking: (id: string) => void;
  scanPackLine: (id: string, code: string) => { name: string; batchNo: string; scanned: number; qty: number } | null;
  pickPackLine: (id: string, productId: string, delta: number) => void;
  sealPacket: (id: string) => void;
  handToRider: (id: string, rider?: Rider) => void;
  // prescriptions
  approveRx: (id: string) => void;
  rejectRx: (id: string, reason?: string) => void;
  dispenseRx: (id: string) => void;
  // offers
  addOffer: (o: Offer) => void;
  toggleOffer: (id: string) => void;
  removeOffer: (id: string) => void;
  setDirectOffer: (productId: string, type: OfferType, value: number) => void;
  // staff / users
  users: StaffUser[];
  addUser: (u: Omit<StaffUser, "id" | "lastActiveMins">) => void;
  updateUser: (id: string, patch: Partial<StaffUser>) => void;
  toggleUser: (id: string) => void;
  removeUser: (id: string) => void;
  // subscription
  subscription: Subscription;
  renewSubscription: () => void;
  changePlan: (plan: Plan, cycle: BillingCycle) => void;
  toggleAutoRenew: () => void;
  featureLocked: (r: Route) => boolean;    // freemium paywall for premium routes
  // invoice settings
  invoiceSettings: InvoiceSettings;
  updateInvoiceSettings: (patch: Partial<InvoiceSettings>) => void;
  // kiosk
  kiosk: KioskConfig;
  updateKiosk: (patch: Partial<KioskConfig>) => void;
  placeKioskOrder: (lines: { productId: string; qty: number }[], pay: PayMode) => Sale | null;
  // CA / accountant report sharing
  advisors: Advisor[];
  addAdvisor: (a: Omit<Advisor, "id">) => void;
  updateAdvisor: (id: string, patch: Partial<Advisor>) => void;
  removeAdvisor: (id: string) => void;
  caShares: CAShare[];
  shareWithCA: (period: string, reports: string[], advisorId: string) => void;
  // purchase orders (reorder → distributor)
  purchaseOrders: PurchaseOrder[];
  sendPurchaseOrder: (supplierId: string, supplierName: string, items: POItem[], note?: string) => void;
  markPOReceived: (id: string) => void;
  setProductSupplier: (id: string, supplierId: string) => void;
  // distributors / suppliers
  // customer credit (khata)
  creditPayments: CreditPayment[];
  recordCreditPayment: (p: { custKey: string; custName: string; custPhone: string; amount: number; mode: PayMode; note?: string }) => void;
  // CRM
  crm: CrmData;
  setPatientMeta: (key: string, patch: PatientMeta) => void;
  addCampaign: (c: Omit<Campaign, "id" | "sentAt">) => void;
  addFeedback: (f: Omit<Feedback, "id" | "at">) => void;
  logReminder: (r: Omit<ReminderLog, "id" | "at">) => void;
  redeemPoints: (custKey: string, custName: string, points: number) => void;
  // employees (HR records)
  employees: Employee[];
  addEmployee: (e: Omit<Employee, "id">) => void;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  // expenses
  expenses: Expense[];
  expenseCategories: string[];
  addExpense: (e: Omit<Expense, "id" | "number">) => void;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
  addExpenseCategory: (name: string) => void;
  suppliers: Supplier[];
  addSupplier: (s: Omit<Supplier, "id">) => void;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;
  removeSupplier: (id: string) => void;
  // distributor supply list (product ↔ distributor with purchase price)
  supplyList: SupplyEntry[];
  addSupply: (s: Omit<SupplyEntry, "id">) => void;
  updateSupply: (id: string, patch: Partial<SupplyEntry>) => void;
  removeSupply: (id: string) => void;
  setPreferredSupply: (id: string) => void;
  // settings
  updateProfile: (patch: Partial<PharmacyProfile>) => void;
  toggleStoreOpen: () => void;
  // payout bank account
  bankAccount: BankAccount | null;
  saveBankAccount: (b: Omit<BankAccount, "verified" | "addedOn">) => void;
  verifyBankAccount: () => void;
  removeBankAccount: () => void;
  resetDemo: () => void;
  // initial store setup wizard
  setupComplete: boolean;
  startSetup: () => void;
  completeSetup: () => void;
  wipeData: () => void;
  setLooseDefault: (allowed: boolean) => void;
  // ui
  toast: (m: string) => void;
  toastMsg: string | null;
};

const PCtx = createContext<Ctx | null>(null);
export const usePharma = () => {
  const c = useContext(PCtx);
  if (!c) throw new Error("usePharma must be inside PharmaProvider");
  return c;
};

const STORAGE_KEY = "namma-pharmacy-state";

export function PharmaProvider({ children }: { children: React.ReactNode }) {
  // stamp a single "now" so date maths are stable within a session render
  const nowRef = useRef<number>(0);
  if (nowRef.current === 0) nowRef.current = Date.now();
  const now = nowRef.current;

  const [signedIn, setSignedIn] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>("pharmacy");
  const [wards, setWards] = useState<Ward[]>(SEED_WARDS);
  const [admissions, setAdmissions] = useState<Admission[]>(() => resolveSeedAdmissions(nowRef.current));
  const [wardIndents, setWardIndents] = useState<WardIndent[]>(() => resolveSeedIndents(nowRef.current));
  const [departments] = useState<Department[]>(SEED_DEPARTMENTS);
  const [tpaClaims, setTpaClaims] = useState<TpaClaim[]>(() => resolveSeedClaims(nowRef.current));
  const [doctors, setDoctors] = useState<DoctorProfile[]>(SEED_DOCTORS);
  const [hospitalAccount, setHospitalAccount] = useState<HospitalAccount>(DEFAULT_HOSPITAL_ACCOUNT);
  const [hospitalPriceRules, setHospitalPriceRules] = useState<Record<string, PriceRule>>({});
  const [pricingUnlocked, setPricingUnlocked] = useState(false);
  const [wardSupplies, setWardSupplies] = useState<WardSupply[]>(() => resolveSeedSupplies(nowRef.current));
  const [hospitalPayments, setHospitalPayments] = useState<HospitalPayment[]>(() => resolveSeedHospitalPayments(nowRef.current));
  const [billIndentTarget, setBillIndentTarget] = useState<string | null>(null);

  const [route, setRoute] = useState<Route>("dashboard");
  // ── history-aware navigation (back-stack + in-screen back handlers) ──
  const routeRef = useRef<Route>("dashboard");            // last committed route (kept in sync inline)
  const backStack = useRef<Route[]>([]);                  // routes we can pop back to
  const backHandlerRef = useRef<null | (() => boolean)>(null); // a screen with internal sub-views can intercept back
  const [canGoBack, setCanGoBack] = useState(false);
  const [invFilter, setInvFilter] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InvProduct[]>(SEED_INVENTORY);
  const [racks, setRacks] = useState<string[]>(() => distinctRacks(SEED_INVENTORY)); // manually-managed rack registry
  const [sales, setSales] = useState<Sale[]>(() =>
    SEED_SALES.map((s) => {
      const { minsAgo, ...rest } = s;
      const createdAt = nowRef.current - minsAgo * 60000;
      return { ...rest, createdAt, history: seedHistory(rest.channel, rest.status, createdAt, nowRef.current) };
    })
  );
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() =>
    SEED_RX.map((r) => {
      const { minsAgo, approvedMinsAgo, dispensedMinsAgo, rejectedMinsAgo, ...rest } = r;
      const at = (m?: number) => (m != null ? nowRef.current - m * 60000 : undefined);
      return { ...rest, uploadedAt: nowRef.current - minsAgo * 60000, approvedAt: at(approvedMinsAgo), dispensedAt: at(dispensedMinsAgo), rejectedAt: at(rejectedMinsAgo) };
    })
  );
  const [offers, setOffers] = useState<Offer[]>(SEED_OFFERS);
  const [purchases, setPurchases] = useState<Purchase[]>(() =>
    SEED_PURCHASES.map((p) => { const { minsAgo, ...rest } = p; return { ...rest, createdAt: nowRef.current - minsAgo * 60000 }; })
  );
  const [profile, setProfile] = useState<PharmacyProfile>(DEFAULT_PROFILE);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [users, setUsers] = useState<StaffUser[]>(SEED_USERS);
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUBSCRIPTION);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
  const [kiosk, setKiosk] = useState<KioskConfig>(DEFAULT_KIOSK);
  const [advisors, setAdvisors] = useState<Advisor[]>(SEED_ADVISORS);
  const [caShares, setCaShares] = useState<CAShare[]>(() =>
    SEED_CA_SHARES.map((s) => { const { minsAgo, ...rest } = s; return { ...rest, createdAt: nowRef.current - minsAgo * 60000 }; })
  );
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() =>
    SEED_PURCHASE_ORDERS.map((p) => { const { minsAgo, ...rest } = p; return { ...rest, createdAt: nowRef.current - minsAgo * 60000 }; })
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(SEED_SUPPLIERS);
  const [supplyList, setSupplyList] = useState<SupplyEntry[]>(SEED_SUPPLY);
  const [expenses, setExpenses] = useState<Expense[]>(() => resolveSeedExpenses(nowRef.current));
  const [expenseCategories, setExpenseCategories] = useState<string[]>(EXPENSE_CATEGORIES);
  const [employees, setEmployees] = useState<Employee[]>(SEED_EMPLOYEES);
  const [creditPayments, setCreditPayments] = useState<CreditPayment[]>(() => resolveSeedCreditPayments(nowRef.current));
  const [crm, setCrm] = useState<CrmData>(EMPTY_CRM);

  const [pos, setPos] = useState<PosLine[]>([]);
  const [posCustomer, setPosCustomerState] = useState<PosCustomer>({ ...BLANK_POS_CUSTOMER });
  const [posDiscount, setPosDiscount] = useState(0);
  const [posDiscountMode, setPosDiscountMode] = useState<"flat" | "percent">("flat");
  const [posPay, setPosPay] = useState<PayMode>("cash");
  const [posSource, setPosSource] = useState<SaleSource>("counter");
  const [posWard, setPosWard] = useState("");
  const [posInsurer, setPosInsurer] = useState("");
  const [posPatientId, setPosPatientId] = useState("");
  const [posRxImage, setPosRxImage] = useState<string | null>(null);
  const [lastInvoice, setLastInvoice] = useState<Sale | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const invSeq = useRef(2607);
  const rxSeq = useRef(200);
  const grnSeq = useRef(3103);
  const prodSeq = useRef(900);
  const poSeq = useRef(512);
  const caSeq = useRef(204);
  const userSeq = useRef(4);
  const advSeq = useRef(2);
  const supplierSeq = useRef(3);
  const supplySeq = useRef(22);
  const expSeq = useRef(1008);
  const empSeq = useRef(5);
  const creditSeq = useRef(1001);
  const crmSeq = useRef(1);
  const docSeq = useRef(6);
  const wardSeq = useRef(6);
  const admSeq = useRef(1008);
  const wsSeq = useRef(1007);
  const wrSeq = useRef(300);
  const hpSeq = useRef(501);

  const scrollCanvasTop = () => { if (typeof document !== "undefined") { const c = document.querySelector(".pd-canvas"); if (c) c.scrollTop = 0; } };
  const go = (r: Route) => {
    if (r === routeRef.current) { scrollCanvasTop(); return; }   // same page — just reset scroll
    backStack.current.push(routeRef.current);                    // remember where we came from
    if (backStack.current.length > 60) backStack.current.shift();
    routeRef.current = r;
    backHandlerRef.current = null;                               // leaving a screen retires its in-screen back handler
    setCanGoBack(true);
    setRoute(r);
    scrollCanvasTop();
  };
  // Go back one step: first let the current screen close an internal sub-view, else pop the route stack.
  const back = () => {
    if (backHandlerRef.current && backHandlerRef.current()) return;
    const prev = backStack.current.pop();
    if (prev === undefined) return;                              // at the root — nothing to go back to
    routeRef.current = prev;
    backHandlerRef.current = null;
    setCanGoBack(backStack.current.length > 0);
    setRoute(prev);
    scrollCanvasTop();
  };
  // A screen with full-screen internal sub-views registers a handler; return true = "consumed one in-screen step".
  const registerBack = useCallback((fn: (() => boolean) | null) => { backHandlerRef.current = fn; }, []);
  // Reset the whole nav stack (sign-in / sign-out) so Back can't cross an auth boundary.
  const resetNav = (r: Route) => { backStack.current = []; backHandlerRef.current = null; routeRef.current = r; setCanGoBack(false); setRoute(r); };
  const openReport = (id: string) => { setReportTarget(id); go("reports"); };

  const toast = (m: string) => {
    setToastMsg(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 1800);
  };

  // ── inventory ops ──
  const addProduct = (p: InvProduct) => setInventory((l) => [p, ...l]);
  const updateProduct = (id: string, patch: Partial<InvProduct>) =>
    setInventory((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  // rack / bin location: tied to the medicine (not the batch) — set once, persists across restocks
  const setProductLocation = (id: string, rack: string, rackAlt?: string) => {
    const code = normalizeRack(rack);
    setInventory((l) => l.map((p) => (p.id === id ? { ...p, rack: code, rackAlt: normalizeRack(rackAlt ?? p.rackAlt ?? "") || undefined } : p)));
    if (code) setRacks((r) => (r.includes(code) ? r : [...r, code]));
  };
  const bulkAssignLocation = (ids: string[], rack: string) => {
    const code = normalizeRack(rack);
    setInventory((l) => l.map((p) => (ids.includes(p.id) ? { ...p, rack: code } : p)));
    if (code) setRacks((r) => (r.includes(code) ? r : [...r, code]));
  };
  // manual rack registry — create / remove a rack location (shows even when empty)
  const createRack = (rack: string): boolean => {
    const code = normalizeRack(rack);
    if (!code) return false;
    let added = false;
    setRacks((r) => { if (r.includes(code)) return r; added = true; return [...r, code]; });
    return added;
  };
  const removeRack = (rack: string) => {
    const code = normalizeRack(rack);
    setRacks((r) => r.filter((x) => x !== code));
  };
  const addBatch = (id: string, batch: InvProduct["batches"][number]) =>
    setInventory((l) => l.map((p) => (p.id === id ? { ...p, batches: [...p.batches, batch] } : p)));
  const setBatchQty = (id: string, batchNo: string, qty: number) =>
    setInventory((l) => l.map((p) => (p.id === id ? { ...p, batches: p.batches.map((b) => (b.batchNo === batchNo ? { ...b, qty: Math.max(0, qty) } : b)) } : p)));

  // ── purchases / goods-inward: enter a distributor bill → stock auto-updates ──
  const receivePurchase = (draft: { supplierId: string; supplierName: string; invoiceNo: string; invoiceDate: string; items: PurchaseItem[] }): Purchase | null => {
    const valid = draft.items.filter((it) => (it.qty + (it.freeQty || 0)) > 0 && it.batchNo.trim());
    if (valid.length === 0) return null;

    setInventory((list) => {
      let next = [...list];
      for (const it of valid) {
        const received = it.qty + (it.freeQty || 0);
        if (it.productId) {
          // existing product: top up matching batch, else add a new batch
          next = next.map((p) => {
            if (p.id !== it.productId) return p;
            const hasBatch = p.batches.some((b) => b.batchNo === it.batchNo);
            const batches: Batch[] = hasBatch
              ? p.batches.map((b) => (b.batchNo === it.batchNo ? { ...b, qty: b.qty + received, mrp: it.mrp || b.mrp, ptr: it.ptr || b.ptr } : b))
              : [...p.batches, { batchNo: it.batchNo, expiry: it.expiry, qty: received, mrp: it.mrp, ptr: it.ptr }];
            return { ...p, batches };
          });
        } else {
          // brand-new product → create it with this opening batch
          prodSeq.current += 1;
          const np: InvProduct = {
            id: "p" + prodSeq.current,
            name: it.name || "New product",
            composition: it.composition || "",
            manufacturer: it.manufacturer || "",
            form: (it.form as DosageForm) || "Tablet",
            pack: it.pack || "",
            category: it.category || "fever",
            hsn: it.hsn || "3004",
            gst: it.gst,
            schedule: (it.schedule as Schedule) || "OTC",
            rack: "—",
            reorderLevel: it.reorderLevel ?? 20,
            online: false,
            emoji: it.emoji || "💊",
            batches: [{ batchNo: it.batchNo, expiry: it.expiry, qty: received, mrp: it.mrp, ptr: it.ptr }],
          };
          next = [np, ...next];
        }
      }
      return next;
    });

    grnSeq.current += 1;
    const purchase: Purchase = {
      id: "GRN-" + grnSeq.current,
      supplierId: draft.supplierId,
      supplierName: draft.supplierName,
      invoiceNo: draft.invoiceNo,
      invoiceDate: draft.invoiceDate,
      items: valid,
      createdAt: Date.now(),
    };
    setPurchases((p) => [purchase, ...p]);
    const newCount = valid.filter((it) => !it.productId).length;
    toast(`Stock updated · ${valid.length} item${valid.length !== 1 ? "s" : ""}${newCount ? ` · ${newCount} new product${newCount !== 1 ? "s" : ""}` : ""}`);
    return purchase;
  };
  const toggleOnline = (id: string) =>
    setInventory((l) => l.map((p) => (p.id === id ? { ...p, online: !p.online } : p)));
  const toggleLoose = (id: string) =>
    setInventory((l) => l.map((p) => (p.id === id ? { ...p, looseAllowed: !(p.looseAllowed ?? true) } : p)));
  const setOnlinePrice = (id: string, price: number | undefined) =>
    setInventory((l) => l.map((p) => (p.id === id ? { ...p, onlinePrice: price } : p)));
  const setProductOffer = (id: string, offerId: string | undefined) =>
    setInventory((l) => l.map((p) => (p.id === id ? { ...p, offerId } : p)));

  // ── deduct stock FEFO when a sale is made ──
  const deductStock = (lines: { productId: string; qty: number; batchNo: string }[]) => {
    setInventory((l) => l.map((p) => {
      const line = lines.find((x) => x.productId === p.id);
      if (!line) return p;
      let remaining = line.qty;
      const batches = p.batches.map((b) => {
        if (remaining <= 0 || b.batchNo !== line.batchNo) return b;
        const take = Math.min(b.qty, remaining);
        remaining -= take;
        return { ...b, qty: b.qty - take };
      });
      return { ...p, batches };
    }));
  };

  // ── POS / billing ──
  const setPosCustomer = (c: Partial<PosCustomer>) =>
    setPosCustomerState((s) => ({ ...s, ...c }));
  const sameLine = (x: PosLine, id: string, loose?: boolean, batchNo?: string) => x.productId === id && !!x.loose === !!loose && (x.batchNo ?? "") === (batchNo ?? "");
  const posAdd = (id: string, loose = false, batchNo?: string) =>
    setPos((l) => {
      if (l.some((x) => sameLine(x, id, loose, batchNo))) return l.map((x) => (sameLine(x, id, loose, batchNo) ? { ...x, qty: x.qty + 1 } : x));
      return [...l, { productId: id, qty: 1, loose, batchNo }];
    });
  const posDec = (id: string, loose = false, batchNo?: string) =>
    setPos((l) => l.flatMap((x) => (sameLine(x, id, loose, batchNo) ? (x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []) : [x])));
  const posSetQty = (id: string, qty: number, loose = false, batchNo?: string) =>
    setPos((l) => (qty <= 0 ? l.filter((x) => !sameLine(x, id, loose, batchNo)) : l.map((x) => (sameLine(x, id, loose, batchNo) ? { ...x, qty } : x))));
  const posRemove = (id: string, loose = false, batchNo?: string) => setPos((l) => l.filter((x) => !sameLine(x, id, loose, batchNo)));
  // change which batch a (non-loose) line is pinned to (undefined = auto / FEFO)
  const posSetBatch = (id: string, batchNo: string | undefined, loose = false) =>
    setPos((l) => {
      const target = l.find((x) => x.productId === id && !!x.loose === !!loose);
      if (!target) return l;
      const merged = l.find((x) => x !== target && sameLine(x, id, loose, batchNo));
      if (merged) return l.filter((x) => x !== target).map((x) => (x === merged ? { ...x, qty: x.qty + target.qty } : x));
      return l.map((x) => (x === target ? { ...x, batchNo } : x));
    });
  // barcode / batch-number scan → resolve and add to the bill (returns the hit for a toast)
  const scanToPos = (code: string) => {
    const hit = findScan(inventory, code);
    if (!hit) return null;
    posAdd(hit.product.id, false, hit.batch?.batchNo);
    return { name: hit.product.name, batchNo: hit.batch?.batchNo };
  };
  const posClear = () => { setPos([]); setPosDiscount(0); setPosDiscountMode("flat"); setPosCustomerState({ ...BLANK_POS_CUSTOMER }); setPosPay("cash"); setPosSource("counter"); setPosWard(""); setPosInsurer(""); setPosPatientId(""); setPosRxImage(null); };

  const posItems = useMemo(() =>
    pos.map((line) => {
      const p = inventory.find((x) => x.id === line.productId);
      return p ? { p, qty: line.qty, loose: !!line.loose, batchNo: line.batchNo } : null;
    }).filter(Boolean) as { p: InvProduct; qty: number; loose: boolean; batchNo?: string }[],
    [pos, inventory]
  );
  const posCount = useMemo(() => posItems.reduce((a, b) => a + (b.loose ? 1 : b.qty), 0), [posItems]);
  // pre-discount selling total (GST-inclusive), used to resolve a % discount to ₹
  const posGross = useMemo(() =>
    posItems.reduce((a, { p, qty, loose }) => a + (loose ? perUnitPrice(p) : sellPrice(p)) * qty, 0),
    [posItems]);
  // effective ₹ discount: percent of gross when in % mode, clamped to [0, gross]
  const posDiscountFlat = useMemo(() => {
    const v = posDiscount || 0;
    const eff = posDiscountMode === "percent" ? Math.round((posGross * v) / 100) : v;
    return Math.max(0, Math.min(eff, posGross));
  }, [posDiscount, posDiscountMode, posGross]);
  const posTotals = useMemo(() =>
    computeInvoice(posItems.map(({ p, qty, loose }) => ({
      qty,
      mrp: loose ? perUnitMrp(p) : mrpOf(p),
      price: loose ? perUnitPrice(p) : sellPrice(p),
      gst: p.gst,
    })), posDiscountFlat),
    [posItems, posDiscountFlat]
  );

  const checkoutPos = (opts?: { paid?: boolean; ward?: string }): Sale | null => {
    if (posItems.length === 0) return null;
    const isCredit = posPay === "credit";          // sold on khata → unpaid, on the customer's account
    const paid = isCredit ? false : opts?.paid !== false;
    invSeq.current += 1;
    const items: SaleItem[] = posItems.map(({ p, qty, loose, batchNo }) => {
      // pinned batch (from a scan / manual select) else FEFO earliest
      const b = (batchNo && p.batches.find((x) => x.batchNo === batchNo)) || earliestBatch(p);
      const baseMrp = b?.mrp ?? mrpOf(p);
      return {
        productId: p.id,
        name: loose ? `${p.name} — loose ${unitNoun(p)}s` : p.name,
        batchNo: b?.batchNo ?? "—", expiry: b?.expiry ?? "—", hsn: p.hsn, qty,
        mrp: loose ? perUnitMrp(p) : baseMrp,
        price: loose ? perUnitPrice(p) : (p.onlinePrice ?? baseMrp),
        gst: p.gst, loose,
      };
    });
    const hasRx = posItems.some(({ p }) => p.schedule !== "OTC");
    // an uploaded prescription photo becomes a dispensed prescription record linked to the bill
    let rxRecord: Prescription | null = null;
    if (posRxImage) {
      rxSeq.current += 1;
      rxRecord = {
        id: "RX-" + rxSeq.current,
        patient: posCustomer.name.trim() || "Walk-in",
        phone: posCustomer.phone || "—",
        doctor: posCustomer.doctor || "Counter prescription",
        uploadedAt: Date.now(), channel: "offline", status: "dispensed",
        items: posItems.map(({ p }) => p.id),
        kind: "uploaded", fileType: "image", image: posRxImage,
        note: "Uploaded at billing counter",
      };
    }
    const sale: Sale = {
      id: invoiceSettings.prefix + invSeq.current,
      channel: "offline",
      status: "completed",
      customer: {
        name: posCustomer.name.trim() || "Walk-in",
        phone: posCustomer.phone || undefined,
        email: posCustomer.email || undefined, // customer mail ID (optional)
        // prescriber details only meaningful when the bill carries Rx (Sch H/H1/X) items
        rxSource: hasRx ? posCustomer.rxSource : undefined,
        doctor: hasRx && posCustomer.rxSource === "doctor" ? (posCustomer.doctor || undefined) : undefined,
      },
      items,
      discount: posDiscountFlat,
      payMode: posPay,
      rx: hasRx || !!rxRecord,
      rxId: rxRecord?.id,
      createdAt: Date.now(),
      history: [{ status: "completed", at: Date.now(), note: isCredit ? "On credit (khata) · " + (posCustomer.name.trim() || "customer") : paid ? undefined : "Sent to reception · payment pending" }],
      paid,
      reception: !paid && !isCredit,
      ward: posSource === "ward" ? (posWard || opts?.ward) : opts?.ward,
      source: businessType === "hospital" ? posSource : undefined,
      insurer: posPay === "insurance" ? (posInsurer || undefined) : undefined,
      patientId: businessType === "hospital" && (posSource === "ward" || posSource === "emergency") ? (posPatientId.trim() || undefined) : undefined,
    };
    // ── deduct stock: full strips (FEFO) + loose tablets (open a strip only when needed) ──
    setInventory((list) => list.map((p) => {
      const lines = posItems.filter((it) => it.p.id === p.id);
      if (lines.length === 0) return p;
      const upp = unitsPerPack(p);
      const batches = p.batches.map((b) => ({ ...b }));
      const earliestIdx = () => { let bi = -1; batches.forEach((b, i) => { if (b.qty > 0 && (bi < 0 || b.expiry < batches[bi].expiry)) bi = i; }); return bi; };
      // 1a) batch-pinned full-pack lines (scanned / manually picked) → deduct from that exact batch (FEFO fallback)
      for (const l of lines.filter((x) => !x.loose && x.batchNo)) {
        let need = l.qty; const bi = batches.findIndex((b) => b.batchNo === l.batchNo);
        if (bi >= 0) { const take = Math.min(batches[bi].qty, need); batches[bi].qty -= take; need -= take; }
        while (need > 0) { const fi = earliestIdx(); if (fi < 0) break; const take = Math.min(batches[fi].qty, need); batches[fi].qty -= take; need -= take; }
      }
      // 1b) un-pinned full-pack lines → deduct whole strips FEFO
      let needPacks = lines.filter((l) => !l.loose && !l.batchNo).reduce((a, l) => a + l.qty, 0);
      while (needPacks > 0) { const bi = earliestIdx(); if (bi < 0) break; const take = Math.min(batches[bi].qty, needPacks); batches[bi].qty -= take; needPacks -= take; }
      // 2) loose lines → draw from opened loose units first, then open a fresh strip
      //    (from the line's pinned batch if set, else FEFO) only when needed
      let loose = p.looseUnits ?? 0;
      for (const l of lines.filter((x) => x.loose)) {
        let need = l.qty;
        const fromPool = Math.min(loose, need); loose -= fromPool; need -= fromPool;
        while (need > 0) {
          let bi = l.batchNo ? batches.findIndex((b) => b.batchNo === l.batchNo && b.qty > 0) : -1;
          if (bi < 0) bi = earliestIdx();
          if (bi < 0) break;
          batches[bi].qty -= 1; loose += upp;
          const t = Math.min(loose, need); loose -= t; need -= t;
        }
      }
      return { ...p, batches, looseUnits: loose };
    }));
    if (rxRecord) setPrescriptions((l) => [rxRecord!, ...l]);
    setSales((s) => [sale, ...s]);
    setLastInvoice(sale);
    posClear();
    toast(paid ? "Invoice " + sale.id + " created" : "Bill " + sale.id + " sent to reception · payment pending");
    return sale;
  };

  // ── online order lifecycle ──
  // add one unit back to a product's batch (manual un-pick / cancellation restock)
  const addBackStock = (productId: string, batchNo?: string, qty = 1) =>
    setInventory((l) => l.map((p) => {
      if (p.id !== productId) return p;
      const batches = [...p.batches];
      let bi = batchNo ? batches.findIndex((b) => b.batchNo === batchNo) : 0;
      if (bi < 0) bi = 0;
      if (batches[bi]) batches[bi] = { ...batches[bi], qty: batches[bi].qty + qty };
      return { ...p, batches };
    }));
  // earliest-expiry in-stock batch (FEFO) for manual picking
  const fefoBatch = (p: InvProduct) => p.batches.filter((b) => b.qty > 0).sort((a, b) => a.expiry.localeCompare(b.expiry))[0];

  const advanceOrder = (id: string) =>
    setSales((l) => l.map((s) => {
      if (s.id !== id || s.channel !== "online") return s;
      const i = ONLINE_FLOW.indexOf(s.status as OrderStatus);
      if (i < 0 || i >= ONLINE_FLOW.length - 1) return s;
      // packing (accepted→packed) and handover (packed→out) run through their own
      // scan-driven flows; advanceOrder only handles accept (new→accepted) & delivered.
      if (s.status === "accepted" || s.status === "packed") return s;
      const next = ONLINE_FLOW[i + 1];
      // on accept, seed the picking checklist (stock is deducted later, as each item is scanned)
      const fulfillment = s.status === "new" && !s.fulfillment?.lines
        ? { ...(s.fulfillment ?? {}), lines: s.items.map((it) => ({ productId: it.productId, name: it.name, qty: it.qty, scanned: 0 })) }
        : s.fulfillment;
      return { ...s, status: next, fulfillment, history: [...(s.history ?? []), { status: next, at: Date.now() }] };
    }));
  const cancelOrder = (id: string) => {
    const sale = sales.find((s) => s.id === id);
    // restock anything already scanned/packed for this order
    (sale?.fulfillment?.lines ?? []).forEach((ln) => { if (ln.scanned > 0) addBackStock(ln.productId, ln.batchNo, ln.scanned); });
    setSales((l) => l.map((s) => (s.id === id ? { ...s, status: "cancelled" as OrderStatus, history: [...(s.history ?? []), { status: "cancelled" as OrderStatus, at: Date.now() }] } : s)));
  };

  // ── online-order fulfilment ──
  const startPacking = (id: string) =>
    setSales((l) => l.map((s) => {
      if (s.id !== id || s.channel !== "online" || s.fulfillment?.lines) return s;
      return { ...s, fulfillment: { ...(s.fulfillment ?? {}), lines: s.items.map((it) => ({ productId: it.productId, name: it.name, qty: it.qty, scanned: 0 })) } };
    }));
  // scan a barcode/batch while packing → verify it belongs to the order, deduct that batch, tick the line
  const scanPackLine = (id: string, raw: string) => {
    const code = (raw || "").trim(); if (!code) return null;
    const sale = sales.find((s) => s.id === id); if (!sale) return null;
    const hit = findScan(inventory, code);
    if (!hit) { toast(`No match for "${code}"`); return null; }
    const line = (sale.fulfillment?.lines ?? []).find((l) => l.productId === hit.product.id);
    if (!line) { toast(`${hit.product.name} is not in this order`); return null; }
    if (line.scanned >= line.qty) { toast(`${hit.product.name} already packed (${line.qty}/${line.qty})`); return null; }
    const prod = inventory.find((p) => p.id === hit.product.id)!;
    const batch = hit.batch && hit.batch.qty > 0 ? hit.batch : fefoBatch(prod);
    if (!batch) { toast(`${hit.product.name} is out of stock`); return null; }
    deductStock([{ productId: prod.id, qty: 1, batchNo: batch.batchNo }]);
    setSales((l) => l.map((s) => (s.id === id ? { ...s, fulfillment: { ...s.fulfillment, lines: (s.fulfillment!.lines ?? []).map((x) => (x.productId === line.productId ? { ...x, scanned: x.scanned + 1, batchNo: batch.batchNo } : x)) } } : s)));
    return { name: prod.name, batchNo: batch.batchNo, scanned: line.scanned + 1, qty: line.qty };
  };
  // manual fallback when the scanner can't read (+1 picks FEFO, −1 restocks)
  const pickPackLine = (id: string, productId: string, delta: number) => {
    const sale = sales.find((s) => s.id === id); if (!sale) return;
    const line = sale.fulfillment?.lines?.find((l) => l.productId === productId); if (!line) return;
    const prod = inventory.find((p) => p.id === productId); if (!prod) return;
    if (delta > 0) {
      if (line.scanned >= line.qty) return;
      const batch = fefoBatch(prod);
      if (!batch) { toast(`${prod.name} is out of stock`); return; }
      deductStock([{ productId, qty: 1, batchNo: batch.batchNo }]);
      setSales((l) => l.map((s) => (s.id === id ? { ...s, fulfillment: { ...s.fulfillment, lines: (s.fulfillment!.lines ?? []).map((x) => (x.productId === productId ? { ...x, scanned: x.scanned + 1, batchNo: batch.batchNo } : x)) } } : s)));
    } else {
      if (line.scanned <= 0) return;
      addBackStock(productId, line.batchNo);
      setSales((l) => l.map((s) => (s.id === id ? { ...s, fulfillment: { ...s.fulfillment, lines: (s.fulfillment!.lines ?? []).map((x) => (x.productId === productId ? { ...x, scanned: x.scanned - 1 } : x)) } } : s)));
    }
  };
  // seal: all items scanned → write packed batches onto the invoice, generate it, advance to "packed"
  const sealPacket = (id: string) =>
    setSales((l) => l.map((s) => {
      if (s.id !== id || !packComplete(s)) return s;
      const items = s.items.map((it) => {
        const ln = s.fulfillment!.lines!.find((x) => x.productId === it.productId);
        if (!ln?.batchNo) return it;
        const b = inventory.find((p) => p.id === it.productId)?.batches.find((x) => x.batchNo === ln.batchNo);
        return { ...it, batchNo: ln.batchNo, expiry: b?.expiry ?? it.expiry };
      });
      return { ...s, items, status: "packed" as OrderStatus, fulfillment: { ...s.fulfillment, sealed: true, sealedAt: Date.now() }, history: [...(s.history ?? []), { status: "packed" as OrderStatus, at: Date.now(), note: "Scanned, invoiced & sealed in a Namma MedMate packet" }] };
    }));
  // hand the sealed packet to the delivery partner → dispatched (out for delivery)
  const handToRider = (id: string, rider?: Rider) =>
    setSales((l) => l.map((s) => {
      if (s.id !== id || s.status !== "packed") return s;
      const r = rider ?? s.fulfillment?.rider;
      return { ...s, status: "out" as OrderStatus, fulfillment: { ...(s.fulfillment ?? {}), rider: r, handedAt: Date.now() }, history: [...(s.history ?? []), { status: "out" as OrderStatus, at: Date.now(), note: r?.name ? `Handed to delivery partner ${r.name}${r.phone ? ` · ${r.phone}` : ""}` : "Handed to delivery partner" }] };
    }));
  const markPaid = (id: string, payMode: PayMode) => {
    setSales((l) => l.map((s) => (s.id === id ? { ...s, paid: true, reception: false, payMode, history: [...(s.history ?? []), { status: s.status, at: Date.now(), note: "Payment received at reception · " + PAY_LABEL[payMode] }] } : s)));
    toast("Payment recorded for " + id + " · " + PAY_LABEL[payMode]);
  };

  // ── prescriptions ──
  const rxReviewer = () => profile.pharmacist.split(",")[0].trim();
  const approveRx = (id: string) =>
    setPrescriptions((l) => l.map((r) => (r.id === id ? { ...r, status: "approved", approvedAt: Date.now(), reviewedBy: rxReviewer() } : r)));
  const rejectRx = (id: string, reason?: string) =>
    setPrescriptions((l) => l.map((r) => (r.id === id ? { ...r, status: "rejected", rejectedAt: Date.now(), rejectReason: reason || r.rejectReason, reviewedBy: rxReviewer() } : r)));
  const dispenseRx = (id: string) => {
    const rx = prescriptions.find((r) => r.id === id);
    if (!rx) return;
    setPrescriptions((l) => l.map((r) => (r.id === id ? { ...r, status: "dispensed", dispensedAt: Date.now(), approvedAt: r.approvedAt ?? Date.now(), reviewedBy: rxReviewer() } : r)));
    // load the Rx items into the POS bill so the pharmacist can bill them
    setPos(rx.items.map((pid) => ({ productId: pid, qty: 1 })));
    setPosCustomerState({ ...BLANK_POS_CUSTOMER, name: rx.patient, phone: rx.phone === "—" ? "" : rx.phone, doctor: rx.doctor, rxSource: "doctor" });
    go("pos");
    toast("Loaded " + rx.id + " into billing");
  };

  // ── offers ──
  const addOffer = (o: Offer) => setOffers((l) => [o, ...l]);
  const toggleOffer = (id: string) => setOffers((l) => l.map((o) => (o.id === id ? { ...o, active: !o.active } : o)));
  const removeOffer = (id: string) => setOffers((l) => l.filter((o) => o.id !== id));
  // apply / update / clear a direct per-product offer from the online-store page
  const setDirectOffer = (productId: string, type: OfferType, value: number) => {
    const id = directOfferId(productId);
    if (!value || value <= 0) {
      setOffers((l) => l.filter((o) => o.id !== id));
      setInventory((l) => l.map((p) => (p.id === productId && p.offerId === id ? { ...p, offerId: undefined } : p)));
      return;
    }
    const offer: Offer = { id, title: "Direct offer", code: "DIRECT", type, value, scope: "product", target: productId, online: true, active: true };
    setOffers((l) => (l.some((o) => o.id === id) ? l.map((o) => (o.id === id ? offer : o)) : [offer, ...l]));
    setInventory((l) => l.map((p) => (p.id === productId ? { ...p, offerId: id } : p)));
  };

  // ── staff / users ──
  const addUser = (u: Omit<StaffUser, "id" | "lastActiveMins">) => {
    userSeq.current += 1;
    setUsers((l) => [...l, { ...u, id: "u" + userSeq.current, lastActiveMins: 0 }]);
    toast(u.name + " added");
  };
  const updateUser = (id: string, patch: Partial<StaffUser>) => setUsers((l) => l.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  const toggleUser = (id: string) => setUsers((l) => l.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
  const removeUser = (id: string) => setUsers((l) => l.filter((u) => u.id !== id));

  // ── subscription ──
  const addMonths = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00"); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
  const todayISO = () => new Date(nowRef.current).toISOString().slice(0, 10);
  // renew the CURRENT plan/cycle: extend from the later of renewal date or today
  const renewSubscription = () => setSubscription((s) => {
    const base = s.renewsOn > todayISO() ? s.renewsOn : todayISO();
    return { ...s, status: "active", renewsOn: addMonths(base, s.cycle === "annual" ? 12 : 1) };
  });
  // upgrade / switch to a plan + billing cycle: starts a fresh term from today
  const changePlan = (plan: Plan, cycle: BillingCycle) => {
    setSubscription((s) => ({ ...s, plan, cycle, status: "active", renewsOn: addMonths(todayISO(), cycle === "annual" ? 12 : 1) }));
    toast(`${plan} plan activated (${cycle === "annual" ? "annual" : "monthly"})`);
  };
  const toggleAutoRenew = () => setSubscription((s) => ({ ...s, autoRenew: !s.autoRenew }));
  const featureLocked = (r: Route) => routeLocked(r, subscription);

  // ── invoice settings ──
  const updateInvoiceSettings = (patch: Partial<InvoiceSettings>) => setInvoiceSettings((s) => ({ ...s, ...patch }));

  // ── kiosk ──
  const updateKiosk = (patch: Partial<KioskConfig>) => setKiosk((k) => ({ ...k, ...patch }));
  const placeKioskOrder = (lines: { productId: string; qty: number; loose?: boolean }[], pay: PayMode): Sale | null => {
    const picked = lines.map((l) => ({ p: inventory.find((x) => x.id === l.productId), qty: l.qty, loose: !!l.loose })).filter((x) => x.p) as { p: InvProduct; qty: number; loose: boolean }[];
    if (picked.length === 0) return null;
    invSeq.current += 1;
    const items: SaleItem[] = picked.map(({ p, qty, loose }) => {
      const b = earliestBatch(p);
      return {
        productId: p.id, name: loose ? `${p.name} — loose ${unitNoun(p)}s` : p.name,
        batchNo: b?.batchNo ?? "—", expiry: b?.expiry ?? "—", hsn: p.hsn, qty,
        mrp: loose ? perUnitMrp(p) : mrpOf(p), price: loose ? perUnitPrice(p) : sellPrice(p), gst: p.gst, loose,
      };
    });
    const sale: Sale = { id: invoiceSettings.prefix + invSeq.current, channel: "offline", status: "completed", customer: { name: "Kiosk (self-order)" }, items, discount: 0, payMode: pay, rx: picked.some(({ p }) => p.schedule !== "OTC"), createdAt: Date.now(), history: [{ status: "completed", at: Date.now() }] };
    // deduct stock: whole strips (FEFO) + loose tablets (open a strip only when needed)
    setInventory((list) => list.map((p) => {
      const pl = picked.filter((it) => it.p.id === p.id);
      if (pl.length === 0) return p;
      const upp = unitsPerPack(p);
      const batches = p.batches.map((b) => ({ ...b }));
      const earliestIdx = () => { let bi = -1; batches.forEach((b, i) => { if (b.qty > 0 && (bi < 0 || b.expiry < batches[bi].expiry)) bi = i; }); return bi; };
      let needPacks = pl.filter((l) => !l.loose).reduce((a, l) => a + l.qty, 0);
      while (needPacks > 0) { const bi = earliestIdx(); if (bi < 0) break; const take = Math.min(batches[bi].qty, needPacks); batches[bi].qty -= take; needPacks -= take; }
      let loose = p.looseUnits ?? 0;
      let needTab = pl.filter((l) => l.loose).reduce((a, l) => a + l.qty, 0);
      const fromLoose = Math.min(loose, needTab); loose -= fromLoose; needTab -= fromLoose;
      while (needTab > 0) { const bi = earliestIdx(); if (bi < 0) break; batches[bi].qty -= 1; loose += upp; const t = Math.min(loose, needTab); loose -= t; needTab -= t; }
      return { ...p, batches, looseUnits: loose };
    }));
    setSales((s) => [sale, ...s]);
    toast("Kiosk order " + sale.id + " sent to counter");
    return sale;
  };

  // ── CA report sharing ──
  const addAdvisor = (a: Omit<Advisor, "id">) => { advSeq.current += 1; setAdvisors((l) => [...l, { ...a, id: "adv" + advSeq.current }]); toast(a.type + " " + a.name + " added"); };
  const updateAdvisor = (id: string, patch: Partial<Advisor>) => setAdvisors((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const removeAdvisor = (id: string) => setAdvisors((l) => l.filter((a) => a.id !== id));
  const shareWithCA = (period: string, reports: string[], advisorId: string) => {
    const adv = advisors.find((a) => a.id === advisorId) ?? advisors[0];
    if (!adv) return;
    caSeq.current += 1;
    setCaShares((l) => [{ id: "CA-" + caSeq.current, period, reports, sentTo: adv.email, recipient: adv.name, createdAt: Date.now() }, ...l]);
    toast("Reports shared with " + adv.name);
  };

  // ── purchase orders (reorder → distributor) ──
  const sendPurchaseOrder = (supplierId: string, supplierName: string, items: POItem[], note?: string) => {
    if (items.length === 0) return;
    poSeq.current += 1;
    setPurchaseOrders((l) => [{ id: "PO-" + poSeq.current, supplierId, supplierName, items, status: "sent", note, createdAt: Date.now() }, ...l]);
    toast("Purchase order sent to " + supplierName);
  };
  const markPOReceived = (id: string) => setPurchaseOrders((l) => l.map((p) => (p.id === id ? { ...p, status: "received" } : p)));
  const setProductSupplier = (id: string, supplierId: string) => setInventory((l) => l.map((p) => (p.id === id ? { ...p, supplierId } : p)));
  // ── expenses ──
  const addExpense = (e: Omit<Expense, "id" | "number">) => {
    expSeq.current += 1; const id = "EXP-" + expSeq.current;
    setExpenses((l) => [{ ...e, id, number: id }, ...l]);
    if (e.category && !expenseCategories.includes(e.category)) setExpenseCategories((c) => [...c, e.category]);
    toast("Expense recorded · ₹" + Math.round(e.amount).toLocaleString("en-IN"));
  };
  const updateExpense = (id: string, patch: Partial<Expense>) => setExpenses((l) => l.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeExpense = (id: string) => { setExpenses((l) => l.filter((e) => e.id !== id)); toast("Expense deleted"); };
  const addExpenseCategory = (name: string) => { const n = name.trim(); if (n && !expenseCategories.includes(n)) { setExpenseCategories((c) => [...c, n]); toast("Category added"); } };
  // ── employees (HR records) ──
  const addEmployee = (e: Omit<Employee, "id">) => {
    empSeq.current += 1; const id = "EMP-" + String(empSeq.current).padStart(3, "0");
    setEmployees((l) => [...l, { ...e, id }]); toast(e.name + " added");
  };
  const updateEmployee = (id: string, patch: Partial<Employee>) => setEmployees((l) => l.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeEmployee = (id: string) => { setEmployees((l) => l.filter((e) => e.id !== id)); toast("Employee removed"); };
  // ── customer credit (khata) repayments ──
  const recordCreditPayment = (p: { custKey: string; custName: string; custPhone: string; amount: number; mode: PayMode; note?: string }) => {
    if (p.amount <= 0) return;
    creditSeq.current += 1; const id = "CR-" + creditSeq.current;
    setCreditPayments((l) => [{ ...p, id, at: Date.now() }, ...l]);
    toast("Repayment recorded · ₹" + Math.round(p.amount).toLocaleString("en-IN"));
  };
  // ── CRM ──
  const crmId = (pfx: string) => { crmSeq.current += 1; return pfx + "-" + crmSeq.current; };
  const setPatientMeta = (key: string, patch: PatientMeta) => setCrm((c) => ({ ...c, meta: { ...c.meta, [key]: { ...c.meta[key], ...patch } } }));
  const addCampaign = (c: Omit<Campaign, "id" | "sentAt">) => { setCrm((s) => ({ ...s, campaigns: [{ ...c, id: crmId("CMP"), sentAt: Date.now() }, ...s.campaigns] })); toast(`Campaign sent to ${c.reach} customer${c.reach !== 1 ? "s" : ""}`); };
  const addFeedback = (f: Omit<Feedback, "id" | "at">) => { setCrm((s) => ({ ...s, feedbacks: [{ ...f, id: crmId("FB"), at: Date.now() }, ...s.feedbacks] })); toast("Feedback saved"); };
  const logReminder = (r: Omit<ReminderLog, "id" | "at">) => setCrm((s) => ({ ...s, reminders: [{ ...r, id: crmId("RM"), at: Date.now() }, ...s.reminders] }));
  const redeemPoints = (custKey: string, custName: string, points: number) => { if (points <= 0) return; setCrm((s) => ({ ...s, redemptions: [{ id: crmId("RD"), custKey, custName, points, value: points, at: Date.now() }, ...s.redemptions] })); toast(`Redeemed ${points} pts · ₹${points} off`); };
  // ── distributors / suppliers ──
  const addSupplier = (s: Omit<Supplier, "id">) => { supplierSeq.current += 1; setSuppliers((l) => [...l, { ...s, id: "s" + supplierSeq.current }]); toast(s.name + " added"); };
  const updateSupplier = (id: string, patch: Partial<Supplier>) => setSuppliers((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSupplier = (id: string) => {
    setSuppliers((l) => l.filter((s) => s.id !== id));
    setSupplyList((l) => l.filter((e) => e.supplierId !== id)); // drop its supply rows too
  };
  // ── distributor supply list ──
  const addSupply = (s: Omit<SupplyEntry, "id">) => { supplySeq.current += 1; setSupplyList((l) => [...l, { ...s, id: "sl" + supplySeq.current }]); toast("Supply item added"); };
  const updateSupply = (id: string, patch: Partial<SupplyEntry>) => setSupplyList((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSupply = (id: string) => setSupplyList((l) => l.filter((s) => s.id !== id));
  const setPreferredSupply = (id: string) => setSupplyList((l) => {
    const target = l.find((s) => s.id === id);
    if (!target) return l;
    return l.map((s) => s.productId === target.productId ? { ...s, preferred: s.id === id } : s);
  });

  // ── settings ──
  const updateProfile = (patch: Partial<PharmacyProfile>) => setProfile((p) => ({ ...p, ...patch }));
  // ── payout bank account ──
  const saveBankAccount = (b: Omit<BankAccount, "verified" | "addedOn">) => {
    setBankAccount({ ...b, verified: false, addedOn: todayISO() });
    toast("Bank account saved — verification pending");
  };
  const verifyBankAccount = () => { setBankAccount((b) => (b ? { ...b, verified: true } : b)); toast("Bank account verified"); };
  const removeBankAccount = () => { setBankAccount(null); toast("Bank account removed"); };
  // ── store setup wizard ──
  const startSetup = () => { setSetupComplete(false); go("dashboard"); };
  const completeSetup = () => { setSetupComplete(true); toast("Store setup complete"); };
  const wipeData = () => { setInventory([]); setSales([]); setPrescriptions([]); setPurchases([]); setPurchaseOrders([]); setOffers([]); setCaShares([]); setSupplyList([]); };
  const setLooseDefault = (allowed: boolean) => setInventory((l) => l.map((p) => (p.form === "Tablet" || p.form === "Capsule") ? { ...p, looseAllowed: allowed } : p));
  const toggleStoreOpen = () => setProfile((p) => ({ ...p, storeOpen: !p.storeOpen }));
  const resetDemo = () => { if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY); if (typeof window !== "undefined") window.location.reload(); };

  // ── auth / onboarding ──
  const signIn = (bt: BusinessType, name?: string) => {
    setBusinessType(bt);
    if (name && name.trim()) setProfile((p) => ({ ...p, name: name.trim() }));
    else if (bt === "hospital") setProfile((p) => (p.name === DEFAULT_PROFILE.name ? { ...p, name: "City Care Hospital Pharmacy" } : p));
    setSignedIn(true);
    resetNav("dashboard");
    toast("Welcome back");
  };
  const signOut = () => { setSignedIn(false); resetNav("dashboard"); };

  // ── hospital modules ──
  const setIndentStatus = (id: string, status: IndentStatus) => {
    setWardIndents((l) => l.map((x) => (x.id === id ? { ...x, status, items: status === "issued" ? x.items.map((it) => ({ ...it, issued: it.qty })) : x.items } : x)));
    toast(status === "issued" ? "Indent issued · stock dispatched to ward" : status === "approved" ? "Indent approved" : status === "rejected" ? "Indent rejected" : "Indent updated");
  };
  const setClaimStatus = (id: string, status: ClaimStatus, approvedAmount?: number) => {
    setTpaClaims((l) => l.map((c) => (c.id === id ? { ...c, status, approvedAmount: approvedAmount ?? c.approvedAmount } : c)));
    toast("Claim " + id + " · " + status);
  };
  // ── wards (hospital setup) ──
  const addWard = (w: Omit<Ward, "id">) => { wardSeq.current += 1; setWards((l) => [...l, { ...w, id: "W-" + wardSeq.current }]); toast(w.name + " added"); };
  const updateWard = (id: string, patch: Partial<Ward>) => setWards((l) => l.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  const removeWard = (id: string) => {
    if (admissions.some((a) => a.wardId === id && a.status === "admitted")) { toast("Discharge patients before removing this ward"); return; }
    setWards((l) => l.filter((w) => w.id !== id)); toast("Ward removed");
  };

  // ── IPD admissions ──
  const admitPatient = (a: Omit<Admission, "id" | "admittedAt" | "status">): Admission => {
    admSeq.current += 1;
    const adm: Admission = { ...a, id: "ADM-" + admSeq.current, admittedAt: Date.now(), status: "admitted" };
    setAdmissions((l) => [adm, ...l]);
    toast(`${a.name} admitted · ${a.bed}`);
    return adm;
  };
  const updateAdmission = (id: string, patch: Partial<Admission>) => setAdmissions((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const dischargePatient = (id: string) => {
    setAdmissions((l) => l.map((a) => (a.id === id ? { ...a, status: "discharged", dischargedAt: Date.now() } : a)));
    toast("Patient discharged · bed freed");
  };
  // open the billing counter pre-filled for an admitted patient (ward, bed, UHID, insurer)
  const startWardBilling = (a: Admission) => {
    setPosCustomerState({ ...BLANK_POS_CUSTOMER, name: a.name, phone: a.phone, doctor: a.doctor, rxSource: a.doctor ? "doctor" : "self" });
    setPosSource("ward");
    setPosWard(a.wardName);
    setPosPatientId(a.patientId);
    if (a.payerType === "insurance") { setPosPay("insurance"); setPosInsurer(a.insurer ?? ""); } else { setPosPay("cash"); setPosInsurer(""); }
    go("pos");
    toast(`Billing ${a.name} · ${a.bed}`);
  };

  // ── institutional hospital billing (ward supply → hospital credit) ──
  const updateHospitalAccount = (patch: Partial<HospitalAccount>) => setHospitalAccount((a) => ({ ...a, ...patch }));
  // ── institutional pricing (admin-gated) ──
  const unlockPricing = (otp: string) => { const ok = otp.replace(/\D/g, "") === ADMIN_PRICING_OTP; if (ok) { setPricingUnlocked(true); toast("Pricing unlocked by admin"); } else toast("Incorrect admin OTP"); return ok; };
  const lockPricing = () => { setPricingUnlocked(false); toast("Pricing locked"); };
  const setUniformDiscount = (pct: number) => {
    if (!pricingUnlocked) { toast("Unlock pricing with admin OTP first"); return; }
    setHospitalAccount((a) => ({ ...a, discountPct: Math.max(0, Math.min(95, Math.round(pct))) }));
  };
  const setHospitalPriceRule = (productId: string, rule: PriceRule | null) => {
    if (!pricingUnlocked) { toast("Unlock pricing with admin OTP first"); return; }
    setHospitalPriceRules((m) => { const next = { ...m }; if (!rule || isNaN(rule.value) || rule.value < 0) delete next[productId]; else next[productId] = { mode: rule.mode, value: Math.round(rule.value * 100) / 100 }; return next; });
  };
  // move pharmacy inventory for a ward supply, per item & per chosen batch:
  // dir +1 = issue (deduct from the item's batch, FEFO fallback) · dir −1 = return (add back to that batch)
  const moveInventory = (items: WardSupplyItem[], dir: 1 | -1) => {
    setInventory((list) => list.map((p) => {
      const lines = items.filter((it) => it.productId === p.id);
      if (!lines.length) return p;
      const batches = p.batches.map((b) => ({ ...b }));
      const earliestIdx = () => { let bi = -1; batches.forEach((b, i) => { if (b.qty > 0 && (bi < 0 || b.expiry < batches[bi].expiry)) bi = i; }); return bi; };
      for (const it of lines) {
        if (dir === 1) {
          let need = it.qty; const bi = it.batchNo ? batches.findIndex((b) => b.batchNo === it.batchNo) : -1;
          if (bi >= 0) { const take = Math.min(batches[bi].qty, need); batches[bi].qty -= take; need -= take; }
          while (need > 0) { const fi = earliestIdx(); if (fi < 0) break; const take = Math.min(batches[fi].qty, need); batches[fi].qty -= take; need -= take; }
        } else {
          const bi = it.batchNo ? batches.findIndex((b) => b.batchNo === it.batchNo) : -1;
          if (bi >= 0) batches[bi].qty += it.qty;
          else batches.push({ batchNo: it.batchNo || "RET", expiry: it.expiry || "—", qty: it.qty, mrp: it.mrp ?? it.price, ptr: it.price });
        }
      }
      return { ...p, batches };
    }));
  };
  const supplyTotal = (items: WardSupplyItem[]) => Math.round(items.reduce((a, it) => a + it.amount, 0) * 100) / 100;
  const rupee = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
  const issueWardSupply = (draft: Omit<WardSupply, "id" | "kind" | "at" | "total">): WardSupply | null => {
    if (!draft.items.length) return null;
    wsSeq.current += 1;
    const supply: WardSupply = { ...draft, id: "WS-" + wsSeq.current, kind: "issue", total: supplyTotal(draft.items), at: Date.now() };
    moveInventory(draft.items, 1);
    setWardSupplies((l) => [supply, ...l]);
    // a supply raised against a ward indent marks that indent issued + flows the billing back to it
    if (draft.indentId) setWardIndents((l) => l.map((x) => (x.id === draft.indentId ? { ...x, status: "issued", items: x.items.map((it) => ({ ...it, issued: it.qty })) } : x)));
    toast(`Issued to ${draft.wardName} · ${rupee(supply.total)} to hospital a/c`);
    return supply;
  };
  // open Hospital Billing pre-loaded to bill a specific ward indent
  const openIndentBilling = (indentId: string) => { setBillIndentTarget(indentId); go("hospbill"); };
  const clearBillIndentTarget = () => setBillIndentTarget(null);
  // direct one-click: issue a ward indent → posts a hospital-billing supply (if every requested item is in the catalogue).
  // returns false when an item can't be auto-priced, so the caller falls back to the review modal.
  const issueIndent = (indentId: string): boolean => {
    const ind = wardIndents.find((x) => x.id === indentId);
    if (!ind || ind.items.length === 0) return false;
    const nm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matched = ind.items.map((it) => { const p = inventory.find((pp) => { const a = nm(pp.name), b = nm(it.name); return a === b || b.includes(a) || a.includes(b); }); return p ? { p, qty: it.qty } : null; });
    if (matched.some((m) => !m)) return false;
    const items: WardSupplyItem[] = (matched as { p: InvProduct; qty: number }[]).map(({ p, qty }) => {
      const b = earliestBatch(p); const price = creditPriceOf(p, hospitalAccount, hospitalPriceRules);
      return { productId: p.id, name: p.name, batchNo: b?.batchNo ?? "—", expiry: b?.expiry ?? "—", hsn: p.hsn, gst: p.gst, qty, price, amount: Math.round(qty * price * 100) / 100 };
    });
    issueWardSupply({ wardId: ind.wardId, wardName: ind.wardName, reason: "floor", items, refDoc: ind.id, indentId: ind.id });
    return true;
  };
  const returnWardSupply = (draft: Omit<WardSupply, "id" | "kind" | "at" | "total">): WardSupply | null => {
    if (!draft.items.length) return null;
    wrSeq.current += 1;
    const supply: WardSupply = { ...draft, id: "WR-" + wrSeq.current, kind: "return", total: supplyTotal(draft.items), at: Date.now() };
    moveInventory(draft.items, -1);
    setWardSupplies((l) => [supply, ...l]);
    toast(`Return from ${draft.wardName} · credit note ${rupee(supply.total)}`);
    return supply;
  };
  const recordHospitalPayment = (p: Omit<HospitalPayment, "id" | "at">) => {
    if (p.amount <= 0) return;
    hpSeq.current += 1;
    setHospitalPayments((l) => [{ ...p, id: "HP-" + hpSeq.current, at: Date.now() }, ...l]);
    toast(`Hospital payment ${rupee(p.amount)} recorded`);
  };

  // ── doctor directory ──
  const addDoctor = (d: Omit<DoctorProfile, "id">) => {
    docSeq.current += 1; const id = "DR-" + String(docSeq.current).padStart(3, "0");
    setDoctors((l) => [{ ...d, id }, ...l]); toast(d.name + " added");
  };
  const updateDoctor = (id: string, patch: Partial<DoctorProfile>) => setDoctors((l) => l.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const removeDoctor = (id: string) => { setDoctors((l) => l.filter((d) => d.id !== id)); toast("Doctor removed"); };

  // settle a set of in-patient bills together (e.g. at discharge) with one payment mode
  const settleBills = (ids: string[], payMode: PayMode) => {
    if (ids.length === 0) return;
    const set = new Set(ids);
    setSales((l) => l.map((s) => (set.has(s.id) ? { ...s, paid: true, reception: false, payMode, history: [...(s.history ?? []), { status: s.status, at: Date.now(), note: "Settled · " + PAY_LABEL[payMode] }] } : s)));
    toast(`Settled ${ids.length} bill${ids.length !== 1 ? "s" : ""} · ${PAY_LABEL[payMode]}`);
  };

  // ── hydrate ──
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.inventory)) setInventory(s.inventory);
        if (Array.isArray(s.racks)) setRacks(s.racks);
        if (Array.isArray(s.sales)) setSales(s.sales);
        if (Array.isArray(s.prescriptions)) setPrescriptions(s.prescriptions);
        if (Array.isArray(s.offers)) setOffers(s.offers);
        if (Array.isArray(s.purchases)) setPurchases(s.purchases);
        if (s.profile) setProfile({ ...DEFAULT_PROFILE, ...s.profile });
        if (s.bankAccount) setBankAccount(s.bankAccount);
        if (Array.isArray(s.users)) setUsers(s.users);
        if (s.subscription) setSubscription({ ...DEFAULT_SUBSCRIPTION, ...s.subscription });
        if (s.invoiceSettings) setInvoiceSettings({ ...DEFAULT_INVOICE_SETTINGS, ...s.invoiceSettings });
        if (s.kiosk) setKiosk(s.kiosk);
        if (Array.isArray(s.advisors)) setAdvisors(s.advisors);
        if (Array.isArray(s.caShares)) setCaShares(s.caShares);
        if (Array.isArray(s.suppliers)) setSuppliers(s.suppliers);
        if (Array.isArray(s.supplyList)) setSupplyList(s.supplyList);
        if (Array.isArray(s.expenses)) setExpenses(s.expenses);
        if (Array.isArray(s.expenseCategories)) setExpenseCategories(s.expenseCategories);
        if (typeof s.expSeq === "number") expSeq.current = s.expSeq;
        if (Array.isArray(s.employees)) setEmployees(s.employees);
        if (typeof s.empSeq === "number") empSeq.current = s.empSeq;
        if (Array.isArray(s.creditPayments)) setCreditPayments(s.creditPayments);
        if (typeof s.creditSeq === "number") creditSeq.current = s.creditSeq;
        if (s.crm && typeof s.crm === "object") setCrm({ ...EMPTY_CRM, ...s.crm });
        if (typeof s.crmSeq === "number") crmSeq.current = s.crmSeq;
        if (typeof s.advSeq === "number") advSeq.current = s.advSeq;
        if (typeof s.supplierSeq === "number") supplierSeq.current = s.supplierSeq;
        if (typeof s.supplySeq === "number") supplySeq.current = s.supplySeq;
        if (typeof s.setupComplete === "boolean") setSetupComplete(s.setupComplete);
        if (typeof s.signedIn === "boolean") setSignedIn(s.signedIn);
        if (s.businessType === "hospital" || s.businessType === "pharmacy") setBusinessType(s.businessType);
        if (Array.isArray(s.wardIndents)) setWardIndents(s.wardIndents);
        if (Array.isArray(s.tpaClaims)) setTpaClaims(s.tpaClaims);
        if (Array.isArray(s.doctors)) setDoctors(s.doctors);
        if (typeof s.docSeq === "number") docSeq.current = s.docSeq;
        if (Array.isArray(s.wards)) setWards(s.wards);
        if (typeof s.wardSeq === "number") wardSeq.current = s.wardSeq;
        if (Array.isArray(s.admissions)) setAdmissions(s.admissions);
        if (typeof s.admSeq === "number") admSeq.current = s.admSeq;
        if (s.hospitalAccount) setHospitalAccount({ ...DEFAULT_HOSPITAL_ACCOUNT, ...s.hospitalAccount });
        if (s.hospitalPriceRules && typeof s.hospitalPriceRules === "object") setHospitalPriceRules(s.hospitalPriceRules);
        if (Array.isArray(s.wardSupplies)) setWardSupplies(s.wardSupplies);
        if (Array.isArray(s.hospitalPayments)) setHospitalPayments(s.hospitalPayments);
        if (typeof s.wsSeq === "number") wsSeq.current = s.wsSeq;
        if (typeof s.wrSeq === "number") wrSeq.current = s.wrSeq;
        if (typeof s.hpSeq === "number") hpSeq.current = s.hpSeq;
        if (Array.isArray(s.purchaseOrders)) setPurchaseOrders(s.purchaseOrders);
        if (typeof s.invSeq === "number") invSeq.current = s.invSeq;
        if (typeof s.grnSeq === "number") grnSeq.current = s.grnSeq;
        if (typeof s.prodSeq === "number") prodSeq.current = s.prodSeq;
        if (typeof s.poSeq === "number") poSeq.current = s.poSeq;
        if (typeof s.caSeq === "number") caSeq.current = s.caSeq;
        if (typeof s.userSeq === "number") userSeq.current = s.userSeq;
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // ── persist ──
  const persistSig = JSON.stringify({ inventory, racks, sales, prescriptions, offers, purchases, profile, users, subscription, invoiceSettings, kiosk, advisors, caShares, purchaseOrders, invSeq: invSeq.current, grnSeq: grnSeq.current, prodSeq: prodSeq.current, poSeq: poSeq.current, caSeq: caSeq.current, userSeq: userSeq.current, advSeq: advSeq.current, suppliers, supplierSeq: supplierSeq.current, supplyList, supplySeq: supplySeq.current, expenses, expenseCategories, expSeq: expSeq.current, employees, empSeq: empSeq.current, creditPayments, creditSeq: creditSeq.current, crm, crmSeq: crmSeq.current, bankAccount, setupComplete, signedIn, businessType, wardIndents, tpaClaims, doctors, docSeq: docSeq.current, wards, wardSeq: wardSeq.current, admissions, admSeq: admSeq.current, hospitalAccount, hospitalPriceRules, wardSupplies, hospitalPayments, wsSeq: wsSeq.current, wrSeq: wrSeq.current, hpSeq: hpSeq.current });
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try { localStorage.setItem(STORAGE_KEY, persistSig); } catch { /* quota */ }
  }, [hydrated, persistSig]);

  const value: Ctx = {
    signedIn, businessType, isHospital: businessType === "hospital", signIn, signOut,
    wards, addWard, updateWard, removeWard, admissions, admitPatient, updateAdmission, dischargePatient, startWardBilling,
    wardIndents, departments, tpaClaims, doctors, addDoctor, updateDoctor, removeDoctor, setIndentStatus, setClaimStatus, settleBills,
    hospitalAccount, updateHospitalAccount, hospitalPriceRules, setUniformDiscount, setHospitalPriceRule, pricingUnlocked, unlockPricing, lockPricing, wardSupplies, issueWardSupply, returnWardSupply, hospitalPayments, recordHospitalPayment,
    billIndentTarget, openIndentBilling, clearBillIndentTarget, issueIndent,
    route, go, back, canGoBack, registerBack, invFilter, setInvFilter, reportTarget, openReport, setReportTarget,
    inventory, sales, prescriptions, offers, purchases, profile, now,
    addProduct, updateProduct, racks, createRack, removeRack, setProductLocation, bulkAssignLocation, addBatch, setBatchQty, receivePurchase, toggleOnline, toggleLoose, setOnlinePrice, setProductOffer,
    pos, posCustomer, setPosCustomer, posDiscount, setPosDiscount, posDiscountMode, setPosDiscountMode, posDiscountFlat, posPay, setPosPay, posSource, setPosSource, posWard, setPosWard, posInsurer, setPosInsurer, posPatientId, setPosPatientId, posRxImage, setPosRxImage,
    posAdd, posDec, posSetQty, posRemove, posSetBatch, scanToPos, posClear, posTotals, posCount, checkoutPos, lastInvoice, setLastInvoice,
    advanceOrder, cancelOrder, markPaid, startPacking, scanPackLine, pickPackLine, sealPacket, handToRider,
    approveRx, rejectRx, dispenseRx,
    addOffer, toggleOffer, removeOffer, setDirectOffer,
    users, addUser, updateUser, toggleUser, removeUser,
    subscription, renewSubscription, changePlan, toggleAutoRenew, featureLocked,
    invoiceSettings, updateInvoiceSettings,
    kiosk, updateKiosk, placeKioskOrder,
    advisors, addAdvisor, updateAdvisor, removeAdvisor, caShares, shareWithCA,
    purchaseOrders, sendPurchaseOrder, markPOReceived, setProductSupplier,
    expenses, expenseCategories, addExpense, updateExpense, removeExpense, addExpenseCategory,
    employees, addEmployee, updateEmployee, removeEmployee,
    creditPayments, recordCreditPayment,
    crm, setPatientMeta, addCampaign, addFeedback, logReminder, redeemPoints,
    suppliers, addSupplier, updateSupplier, removeSupplier,
    supplyList, addSupply, updateSupply, removeSupply, setPreferredSupply,
    updateProfile, toggleStoreOpen, resetDemo,
    bankAccount, saveBankAccount, verifyBankAccount, removeBankAccount,
    setupComplete, startSetup, completeSetup, wipeData, setLooseDefault,
    toast, toastMsg,
  };
  return <PCtx.Provider value={value}>{children}</PCtx.Provider>;
}

// helper re-export for screens
export { stockOf };
