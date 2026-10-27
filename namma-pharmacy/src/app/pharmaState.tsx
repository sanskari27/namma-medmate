"use client";
import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  InvProduct, Sale, SaleItem, Prescription, Offer, OfferType, PharmacyProfile, Batch, BankAccount,
  Purchase, PurchaseItem, DosageForm, Schedule,
  PayMode, PAY_LABEL, Channel, OrderStatus, ONLINE_FLOW, SaleSource,
  Rider, packComplete,
  computeInvoice, InvoiceTotals, billUnit, earliestBatch, stockOf, findScan,
  normalizeRack,
  StaffUser, Subscription, DEFAULT_SUBSCRIPTION, Plan, BillingCycle, ScreenGrant, SubRequest, routeLocked, todayISO,
  InvoiceSettings, DEFAULT_INVOICE_SETTINGS, KioskConfig, DEFAULT_KIOSK,
  Advisor, CAShare, isValidGstin,
  PurchaseOrder, POItem,
  Supplier,
  Expense, EXPENSE_CATEGORIES,
  Employee,
  CreditPayment,
} from "./data";
import {
  CrmData, EMPTY_CRM, Campaign, Feedback, ReminderLog, Redemption, PatientMeta,
} from "./lib/crm";
import { SupplyEntry } from "./data";
import { Referral } from "./lib/referrals";
import {
  Ward, WardIndent, IndentStatus, Department, TpaClaim, ClaimStatus, DoctorProfile, Admission,
} from "./lib/hospital";
import { api, ApiError } from "./lib/api";
import { SaveConfirm, SignOutDialog } from "./components/SignOutDialog";
import { faultOf, SaveFault } from "./lib/formFault";
import {
  HospitalAccount, WardSupply, WardSupplyItem, HospitalPayment, creditPriceOf, PriceRule,
} from "./lib/hospitalAccount";

const BLANK_PROFILE: PharmacyProfile = {
  name: "", tagline: "", phone: "", email: "", address: "", city: "", state: "", pincode: "",
  gstRegistered: false, gstin: "", eInvoicing: false, pan: "", dlNo: "", fssai: "",
  enableTDS: false, enableTCS: false, businessTypes: [], industryType: "Pharmacy & Healthcare",
  registrationType: "Proprietorship", extraDetails: [], storeOpen: false, pharmacist: "",
};
const BLANK_HOSPITAL: HospitalAccount = {
  name: "", gstin: "", contact: "", phone: "", email: "",
  creditTerms: "On demand", creditLimit: 0, discountPct: 0, flagRefills: false,
};

type Snapshot = {
  user?: { id: string; role: string; permissions?: string[] };
  businessType: BusinessType;
  setupComplete: boolean;
  subscription: Subscription;
  grants?: ScreenGrant[];
  extraSeats?: number;
  subscriptionRequests?: SubRequest[];
  couponRedeemed?: boolean;
  creditPayments: CreditPayment[];
  caShares: CAShare[];
  wardSupplies: WardSupply[];
  hospitalPayments: HospitalPayment[];
  tpaClaims: TpaClaim[];
  hospitalPriceRules: Record<string, PriceRule>;
  profile: PharmacyProfile;
  invoiceSettings: InvoiceSettings;
  kiosk: KioskConfig;
  inventory: InvProduct[];
  racks: string[];
  sales: Sale[];
  prescriptions: Prescription[];
  offers: Offer[];
  purchases: Purchase[];
  suppliers: Supplier[];
  supplyList: SupplyEntry[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  expenseCategories: string[];
  employees: Employee[];
  users: StaffUser[];
  bankAccount: BankAccount | null;
  advisors: Advisor[];
  crm: CrmData;
  tickets: { id: string; subject: string; category: string; status: "Open" | "Resolved"; createdAt: number }[];
  referrals: Referral[];
  impersonator?: string | null;
  needsPin?: boolean;
  wards: Ward[];
  admissions: Admission[];
  wardIndents: WardIndent[];
  doctors: DoctorProfile[];
  hospitalAccount: HospitalAccount | null;
  departments: Department[];
};

// Strict mode mounts twice. Share the first /session so boot is one request.
let boot: Promise<Snapshot> | null = null;
function initialSession() {
  if (!boot) boot = api<Snapshot>("/session").finally(() => { boot = null; });
  return boot;
}

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
  signIn: (bt: BusinessType, name?: string, phone?: string, code?: string, purpose?: "reset") => Promise<void>;
  signInWithPin: (phone: string, pin: string) => Promise<void>;
  setLoginPin: (pin: string, confirm: string) => Promise<void>;
  needsPin: boolean;
  pinReset: boolean;
  signOut: () => void;
  impersonator: string | null;
  // hospital-pharmacy modules
  wards: Ward[];
  addWard: (w: Omit<Ward, "id">) => Promise<SaveFault | null>;
  updateWard: (id: string, patch: Partial<Ward>) => void;
  removeWard: (id: string) => void;
  admissions: Admission[];
  admitPatient: (a: Omit<Admission, "id" | "admittedAt" | "status">) => Promise<Admission | null>;
  updateAdmission: (id: string, patch: Partial<Admission>) => void;
  dischargePatient: (id: string) => void;
  startWardBilling: (a: Admission) => void;   // open POS pre-filled for this admission
  wardIndents: WardIndent[];
  departments: Department[];
  addDepartment: (d: { name: string; head: string; type: Department["type"]; emoji?: string }) => Promise<SaveFault | null>;
  updateDepartment: (id: string, patch: Partial<Department>) => Promise<SaveFault | null>;
  removeDepartment: (id: string) => void;
  referrals: Referral[];
  addReferral: (r: { name: string; area?: string }) => Promise<SaveFault | null>;
  updateReferral: (id: string, patch: Partial<Referral>) => void;
  removeReferral: (id: string) => void;
  tpaClaims: TpaClaim[];
  doctors: DoctorProfile[];
  addDoctor: (d: Omit<DoctorProfile, "id">) => Promise<SaveFault | null>;
  updateDoctor: (id: string, patch: Partial<DoctorProfile>) => Promise<SaveFault | null>;
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
  me: { id: string; role: string; permissions: string[] } | null;
  unlockPricing: (otp: string) => Promise<boolean>;           // verify admin OTP → unlock
  lockPricing: () => void;
  wardSupplies: WardSupply[];
  issueWardSupply: (draft: Omit<WardSupply, "id" | "kind" | "at" | "total">) => Promise<WardSupply | null>;
  returnWardSupply: (draft: Omit<WardSupply, "id" | "kind" | "at" | "total">) => Promise<WardSupply | null>;
  hospitalPayments: HospitalPayment[];
  recordHospitalPayment: (p: Omit<HospitalPayment, "id" | "at">) => Promise<SaveFault | null>;
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
  importMedicines: (products: InvProduct[]) => Promise<{ added: number; skipped: string[] } | null>;
  updateProduct: (id: string, patch: Partial<InvProduct>) => Promise<SaveFault | null>;
  // rack / bin locations
  racks: string[];
  createRack: (rack: string) => Promise<"added" | "exists" | "failed">;
  removeRack: (rack: string) => void;
  setProductLocation: (id: string, rack: string, rackAlt?: string) => Promise<SaveFault | null>;
  bulkAssignLocation: (ids: string[], rack: string) => Promise<SaveFault | null>;
  addBatch: (id: string, batch: InvProduct["batches"][number]) => void;
  setBatchQty: (id: string, batchNo: string, qty: number) => void;
  // purchases / goods-inward — auto-updates stock
  receivePurchase: (draft: { supplierId: string; supplierName: string; invoiceNo: string; invoiceDate: string; items: PurchaseItem[] }) => Promise<Purchase | null>;
  toggleOnline: (id: string) => void;
  toggleLoose: (id: string) => void;
  setOnlinePrice: (id: string, price: number | undefined) => Promise<SaveFault | null>;
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
  checkoutPos: (opts?: { paid?: boolean; ward?: string }) => Promise<SaveFault | null>;
  lastInvoice: Sale | null;
  setLastInvoice: (s: Sale | null) => void;
  // orders (online lifecycle)
  advanceOrder: (id: string) => void;
  cancelOrder: (id: string) => void;
  markPaid: (id: string, payMode: PayMode) => void;
  // online-order fulfilment (pick → scan-pack → seal → handover)
  startPacking: (id: string) => void;
  scanPackLine: (id: string, code: string) => Promise<{ name: string; batchNo: string; scanned: number; qty: number } | null>;
  pickPackLine: (id: string, productId: string, delta: number) => void;
  sealPacket: (id: string) => void;
  handToRider: (id: string, rider?: Rider) => void;
  // prescriptions
  approveRx: (id: string) => void;
  rejectRx: (id: string, reason?: string) => void;
  dispenseRx: (id: string) => void;
  // offers
  addOffer: (o: Offer) => Promise<SaveFault | null>;
  toggleOffer: (id: string) => void;
  removeOffer: (id: string) => void;
  setDirectOffer: (productId: string, type: OfferType, value: number) => void;
  // staff / users
  users: StaffUser[];
  addUser: (u: Omit<StaffUser, "id" | "lastActiveMins">) => Promise<SaveFault | null>;
  updateUser: (id: string, patch: Partial<StaffUser>) => Promise<SaveFault | null>;
  toggleUser: (id: string) => void;
  removeUser: (id: string) => void;
  // subscription
  subscription: Subscription;
  grants: ScreenGrant[];
  extraSeats: number;
  subscriptionRequests: SubRequest[];
  couponRedeemed: boolean;
  requestPlan: (plan: Plan, cycle: BillingCycle, kind?: "plan" | "renewal") => Promise<SaveFault | null>;
  redeemCoupon: (code: string) => Promise<SaveFault | null>;
  toggleAutoRenew: () => void;
  featureLocked: (r: Route) => boolean;    // freemium paywall for premium routes
  // invoice settings
  invoiceSettings: InvoiceSettings;
  updateInvoiceSettings: (patch: Partial<InvoiceSettings>) => void;
  // kiosk
  kiosk: KioskConfig;
  updateKiosk: (patch: Partial<KioskConfig>) => void;
  placeKioskOrder: (lines: { productId: string; qty: number; loose?: boolean }[], pay: PayMode) => Promise<Sale | null>;
  // CA / accountant report sharing
  advisors: Advisor[];
  addAdvisor: (a: Omit<Advisor, "id">) => Promise<SaveFault | null>;
  updateAdvisor: (id: string, patch: Partial<Advisor>) => Promise<SaveFault | null>;
  removeAdvisor: (id: string) => void;
  caShares: CAShare[];
  shareWithCA: (period: string, reports: string[], advisorId: string) => void;
  // purchase orders (reorder → distributor)
  purchaseOrders: PurchaseOrder[];
  sendPurchaseOrder: (supplierId: string, supplierName: string, items: POItem[], note?: string) => void;
  importPurchaseOrders: (rows: { supplierName: string; productName: string; qty: number; note?: string }[]) => Promise<{ created: number; skipped: string[] } | null>;
  markPOReceived: (id: string) => void;
  setProductSupplier: (id: string, supplierId: string) => void;
  // distributors / suppliers
  // customer credit (khata)
  creditPayments: CreditPayment[];
  recordCreditPayment: (p: { custKey: string; custName: string; custPhone: string; amount: number; mode: PayMode; note?: string }) => Promise<SaveFault | null>;
  // CRM
  crm: CrmData;
  setPatientMeta: (key: string, patch: PatientMeta) => Promise<SaveFault | null>;
  addCampaign: (c: Omit<Campaign, "id" | "sentAt">) => Promise<SaveFault | null>;
  addFeedback: (f: Omit<Feedback, "id" | "at">) => Promise<SaveFault | null>;
  logReminder: (r: Omit<ReminderLog, "id" | "at">) => void;
  redeemPoints: (custKey: string, custName: string, points: number) => void;
  // employees (HR records)
  employees: Employee[];
  addEmployee: (e: Omit<Employee, "id">) => Promise<SaveFault | null>;
  updateEmployee: (id: string, patch: Partial<Employee>) => Promise<SaveFault | null>;
  removeEmployee: (id: string) => void;
  // expenses
  expenses: Expense[];
  expenseCategories: string[];
  addExpense: (e: Omit<Expense, "id" | "number">) => Promise<SaveFault | null>;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
  addExpenseCategory: (name: string) => void;
  suppliers: Supplier[];
  addSupplier: (s: Omit<Supplier, "id">) => Promise<SaveFault | null>;
  updateSupplier: (id: string, patch: Partial<Supplier>) => Promise<SaveFault | null>;
  removeSupplier: (id: string) => void;
  // distributor supply list (product ↔ distributor with purchase price)
  supplyList: SupplyEntry[];
  addSupply: (s: Omit<SupplyEntry, "id">) => Promise<SaveFault | null>;
  updateSupply: (id: string, patch: Partial<SupplyEntry>) => Promise<SaveFault | null>;
  removeSupply: (id: string) => void;
  setPreferredSupply: (id: string) => void;
  // settings
  updateProfile: (patch: Partial<PharmacyProfile>) => Promise<SaveFault | null>;
  toggleStoreOpen: () => void;
  // payout bank account
  bankAccount: BankAccount | null;
  saveBankAccount: (b: Omit<BankAccount, "verified" | "addedOn">) => Promise<SaveFault | null>;
  verifyBankAccount: () => void;
  removeBankAccount: () => void;
  // initial store setup wizard
  setupComplete: boolean;
  startSetup: () => void;
  completeSetup: () => void;
  wipeData: () => void;
  setLooseDefault: (allowed: boolean) => void;
  // ui
  toast: (m: string) => void;
  toastMsg: string | null;
  formFault: SaveFault | null;
  showFault: (err: unknown, fallback?: string) => void;
  clearFault: () => void;
  tickets: { id: string; subject: string; category: string; status: "Open" | "Resolved"; createdAt: number }[];
  raiseTicket: (subject: string, category: string) => Promise<SaveFault | null>;
};

const PCtx = createContext<Ctx | null>(null);
export const usePharma = () => {
  const c = useContext(PCtx);
  if (!c) throw new Error("usePharma must be inside PharmaProvider");
  return c;
};

export function PharmaProvider({ children }: { children: React.ReactNode }) {
  // stamp a single "now" so date maths are stable within a session render
  const nowRef = useRef<number>(0);
  if (nowRef.current === 0) nowRef.current = Date.now();
  const now = nowRef.current;

  const [signedIn, setSignedIn] = useState(false);
  const [needsPin, setNeedsPin] = useState(false);
  const [pinReset, setPinReset] = useState(false);
  const [saveAsk, setSaveAsk] = useState<{ title: string; body: string; resolve: (yes: boolean) => void } | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [impersonator, setImpersonator] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>("pharmacy");
  const [wards, setWards] = useState<Ward[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [wardIndents, setWardIndents] = useState<WardIndent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [tpaClaims, setTpaClaims] = useState<TpaClaim[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [hospitalAccount, setHospitalAccount] = useState<HospitalAccount>(BLANK_HOSPITAL);
  const [hospitalPriceRules, setHospitalPriceRules] = useState<Record<string, PriceRule>>({});
  const [pricingUnlocked, setPricingUnlocked] = useState(false);
  const [wardSupplies, setWardSupplies] = useState<WardSupply[]>([]);
  const [hospitalPayments, setHospitalPayments] = useState<HospitalPayment[]>([]);
  const [billIndentTarget, setBillIndentTarget] = useState<string | null>(null);

  const [route, setRoute] = useState<Route>("dashboard");
  // ── history-aware navigation (back-stack + in-screen back handlers) ──
  const routeRef = useRef<Route>("dashboard");            // last committed route (kept in sync inline)
  const backStack = useRef<Route[]>([]);                  // routes we can pop back to
  const backHandlerRef = useRef<null | (() => boolean)>(null); // a screen with internal sub-views can intercept back
  const [canGoBack, setCanGoBack] = useState(false);
  const [invFilter, setInvFilter] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InvProduct[]>([]);
  const [racks, setRacks] = useState<string[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [profile, setProfile] = useState<PharmacyProfile>(BLANK_PROFILE);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [subscription, setSubscription] = useState<Subscription>({ ...DEFAULT_SUBSCRIPTION, since: "" });
  const [grants, setGrants] = useState<ScreenGrant[]>([]);
  const [extraSeats, setExtraSeats] = useState(0);
  const [subscriptionRequests, setSubscriptionRequests] = useState<SubRequest[]>([]);
  const [couponRedeemed, setCouponRedeemed] = useState(false);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({ ...DEFAULT_INVOICE_SETTINGS, bankLine: "" });
  const [kiosk, setKiosk] = useState<KioskConfig>({ ...DEFAULT_KIOSK, enabled: false, displayName: "", pin: "", welcome: "" });
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [caShares, setCaShares] = useState<CAShare[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplyList, setSupplyList] = useState<SupplyEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(EXPENSE_CATEGORIES);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [creditPayments, setCreditPayments] = useState<CreditPayment[]>([]);
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
  const [formFault, setFormFault] = useState<SaveFault | null>(null);
  const faultRef = useRef<SaveFault | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [tickets, setTickets] = useState<{ id: string; subject: string; category: string; status: "Open" | "Resolved"; createdAt: number }[]>([]);
  const [me, setMe] = useState<{ id: string; role: string; permissions: string[] } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const invSeq = useRef(1000);
  const rxSeq = useRef(1000);
  const grnSeq = useRef(1000);
  const prodSeq = useRef(1000);
  const poSeq = useRef(1000);
  const caSeq = useRef(1000);
  const userSeq = useRef(1);
  const advSeq = useRef(1000);
  const supplierSeq = useRef(1000);
  const supplySeq = useRef(1000);
  const expSeq = useRef(1000);
  const empSeq = useRef(0);
  const creditSeq = useRef(1000);
  const crmSeq = useRef(0);
  const docSeq = useRef(0);
  const wardSeq = useRef(0);
  const admSeq = useRef(1000);
  const wsSeq = useRef(1000);
  const wrSeq = useRef(1000);
  const hpSeq = useRef(1000);

  const scrollCanvasTop = () => { if (typeof document !== "undefined") { const c = document.querySelector(".pd-canvas"); if (c) c.scrollTop = 0; } };
  const go = (r: Route) => {
    if (r === routeRef.current) { scrollCanvasTop(); return; }   // same page — just reset scroll
    backStack.current.push(routeRef.current);                    // remember where we came from
    if (backStack.current.length > 60) backStack.current.shift();
    routeRef.current = r;
    backHandlerRef.current = null;                               // leaving a screen retires its in-screen back handler
    setCanGoBack(true);
    faultRef.current = null;
    setFormFault(null);
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
  const signedRef = useRef(false);
  const pricingRef = useRef(false);
  const quiet = useRef(false);
  const holdSetup = useRef(false);
  const profileRef = useRef(profile);
  const invoiceRef = useRef(invoiceSettings);
  const kioskRef = useRef(kiosk);
  const invoiceSaved = useRef(invoiceSettings);
  const kioskSaved = useRef(kiosk);
  const invoiceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kioskTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const saveCancelled = useRef(false);
  pricingRef.current = pricingUnlocked;
  profileRef.current = profile;
  invoiceRef.current = invoiceSettings;
  kioskRef.current = kiosk;
  const refresh = useCallback(async (pending?: Promise<Snapshot>) => {
    try {
      const session = await (pending ?? api<Snapshot>("/session"));
      signedRef.current = true;
      setSignedIn(true);
      setImpersonator(session.impersonator || null);
      setBusinessType(session.businessType);
      if (!holdSetup.current) setSetupComplete(session.setupComplete);
      setSubscription(session.subscription);
      setGrants(session.grants || []);
      setExtraSeats(session.extraSeats || 0);
      setSubscriptionRequests(session.subscriptionRequests || []);
      setCouponRedeemed(session.couponRedeemed === true);
      setMe(session.user ? { id: session.user.id, role: session.user.role, permissions: session.user.permissions ?? [] } : null);
      setCreditPayments(session.creditPayments || []);
      setCaShares(session.caShares || []);
      setWardSupplies(session.wardSupplies || []);
      setHospitalPayments(session.hospitalPayments || []);
      setTpaClaims(session.tpaClaims || []);
      setHospitalPriceRules(session.hospitalPriceRules || {});
      setProfile(session.profile); setInvoiceSettings(session.invoiceSettings); setKiosk(session.kiosk);
      setInventory(session.inventory); setRacks(session.racks); setSales(session.sales);
      setPrescriptions(session.prescriptions); setOffers(session.offers); setPurchases(session.purchases);
      setSuppliers(session.suppliers); setSupplyList(session.supplyList); setPurchaseOrders(session.purchaseOrders);
      setExpenses(session.expenses); setExpenseCategories(session.expenseCategories); setEmployees(session.employees); setUsers(session.users);
      setBankAccount(session.bankAccount); setAdvisors(session.advisors); setCrm(session.crm); setTickets(session.tickets); setReferrals(session.referrals || []);
      invoiceSaved.current = session.invoiceSettings; kioskSaved.current = session.kiosk; setNeedsPin(Boolean(session.needsPin));
      if (session.businessType === "hospital") {
        setWards(session.wards || []); setAdmissions(session.admissions || []); setWardIndents(session.wardIndents || []);
        setDoctors(session.doctors || []); setHospitalAccount(session.hospitalAccount ?? BLANK_HOSPITAL); setDepartments(session.departments || []);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) { signedRef.current = false; setSignedIn(false); setImpersonator(null); return; }
      if (faultRef.current) return;
      const fault = faultOf(err, "Could not load the pharmacy");
      faultRef.current = fault;
      setFormFault(fault);
    } finally { setHydrated(true); }
  }, []);
  useEffect(() => {
    void refresh(initialSession());
    // ponytail: focus refires while the tab stays open (devtools, a click). Reload only after the tab was hidden.
    let hidden = document.visibilityState === "hidden";
    const onVis = () => {
      const isHidden = document.visibilityState === "hidden";
      if (hidden && !isHidden && signedRef.current && !quiet.current) void refresh();
      hidden = isHidden;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);
  const showFault = (err: unknown, fallback = "Save failed") => {
    const fault = typeof err === "string" ? faultOf(new Error(err), fallback) : faultOf(err, fallback);
    faultRef.current = fault;
    setFormFault(fault);
  };
  const clearFault = () => { faultRef.current = null; setFormFault(null); };
  const askSave = (kind: "save" | "edit") => {
    const job = saveQueue.current.then(() => new Promise<boolean>((resolve) => {
      setSaveAsk({
        title: kind === "edit" ? "Save these changes?" : "Save this?",
        body: "Nothing already stored will be deleted.",
        resolve,
      });
    }));
    saveQueue.current = job.then(() => undefined, () => undefined);
    return job;
  };
  const post = (path: string, method: string, body?: unknown, opts?: { idem?: boolean; pull?: boolean }) => {
    if (!signedRef.current) { showFault("Sign in required"); return Promise.resolve(null); }
    const quietWrite = /\/packing\/(scan|pick)$/.test(path) || path === "/crm/reminders";
    return (async () => {
      if (method === "DELETE" || path === "/setup/wipe") { toast("Records cannot be deleted"); return null; }
      if (!quietWrite && (method === "POST" || method === "PATCH" || method === "PUT")) {
        const yes = await askSave(method === "POST" ? "save" : "edit");
        if (!yes) { saveCancelled.current = true; return null; }
      }
      try {
        const result = await api(path, { method, body, idempotency: opts?.idem, pricing: pricingRef.current });
        if (opts?.pull) await refresh();
        clearFault();
        return result;
      } catch (err) {
        showFault(err);
        void refresh();
        return null;
      }
    })();
  };
  const whenSaved = (work: Promise<unknown>, apply: () => void) => { void work.then((res) => { if (res != null) apply(); }); };
  const ok = (res: unknown, done?: () => void): SaveFault | null => {
    if (res == null) {
      if (saveCancelled.current) { saveCancelled.current = false; return { message: "Save cancelled" }; }
      return faultRef.current ?? { message: "Save failed" };
    }
    done?.();
    return null;
  };

  // ── inventory ops ──
  const addProduct = (p: InvProduct) => { void post("/inventory/products", "POST", p, { pull: true }); };
  const importMedicines = async (products: InvProduct[]) => {
    const res = await post("/inventory/import", "POST", { products }, { pull: true }) as { added: number; skipped: string[] } | null;
    if (res) toast(res.added ? `Imported ${res.added} medicine${res.added === 1 ? "" : "s"}` : "Those medicines are already in the catalogue");
    return res;
  };
  const updateProduct = async (id: string, patch: Partial<InvProduct>): Promise<SaveFault | null> => {
    const res = await post(`/inventory/products/${id}`, "PATCH", patch);
    return ok(res, () => setInventory((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p))));
  };
  // rack / bin location: tied to the medicine (not the batch) — set once, persists across restocks
  const setProductLocation = async (id: string, rack: string, rackAlt?: string): Promise<SaveFault | null> =>
    ok(await post(`/inventory/products/${id}/location`, "PATCH", { rack, rackAlt }, { pull: true }));
  const bulkAssignLocation = async (ids: string[], rack: string): Promise<SaveFault | null> =>
    ok(await post("/inventory/location/bulk", "POST", { ids, rack }, { pull: true }));
  const createRack = async (rack: string): Promise<"added" | "exists" | "failed"> => {
    const code = normalizeRack(rack);
    if (!code) { showFault("Rack code is required"); return "failed"; }
    if (racks.includes(code)) return "exists";
    const res = await post("/racks", "POST", { rack: code }, { pull: true });
    return res == null ? "failed" : "added";
  };
  const removeRack = (_rack: string) => { toast("Records cannot be deleted"); };
  const addBatch = (id: string, batch: InvProduct["batches"][number]) => { void post(`/inventory/products/${id}/batches`, "POST", batch, { pull: true }); };
  const setBatchQty = (id: string, batchNo: string, qty: number) => { void post(`/inventory/products/${id}/batches/${encodeURIComponent(batchNo)}`, "PATCH", { qty }, { idem: true, pull: true }); };

  // ── purchases / goods-inward: enter a distributor bill → stock auto-updates ──
  const receivePurchase = async (draft: { supplierId: string; supplierName: string; invoiceNo: string; invoiceDate: string; items: PurchaseItem[] }): Promise<Purchase | null> => {
    const res = await post("/purchases/receive", "POST", draft, { idem: true, pull: true }) as { purchase: Purchase } | null;
    if (!res?.purchase) return null;
    toast("Stock updated");
    return res.purchase;
  };
  const toggleOnline = (id: string) => { void post(`/inventory/products/${id}/online`, "POST", {}, { pull: true }); };
  const toggleLoose = (id: string) => { void post(`/inventory/products/${id}/loose`, "POST", {}, { pull: true }); };
  const setOnlinePrice = async (id: string, price: number | undefined): Promise<SaveFault | null> => {
    const res = await post(`/inventory/products/${id}/online-price`, "PATCH", { price });
    return ok(res, () => setInventory((l) => l.map((p) => (p.id === id ? { ...p, onlinePrice: price } : p))));
  };
  const setProductOffer = (id: string, offerId: string | undefined) => { whenSaved(post(`/inventory/products/${id}/offer`, "PATCH", { offerId }), () => setInventory((l) => l.map((p) => (p.id === id ? { ...p, offerId } : p)))); };

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
    posItems.reduce((a, { p, qty, loose, batchNo }) => a + billUnit(p, { loose, batchNo }).price * qty, 0),
    [posItems]);
  // effective ₹ discount: percent of gross when in % mode, clamped to [0, gross]
  const posDiscountFlat = useMemo(() => {
    const v = posDiscount || 0;
    const eff = posDiscountMode === "percent" ? Math.round((posGross * v) / 100) : v;
    return Math.max(0, Math.min(eff, posGross));
  }, [posDiscount, posDiscountMode, posGross]);
  const posTotals = useMemo(() =>
    computeInvoice(posItems.map(({ p, qty, loose, batchNo }) => {
      const unit = billUnit(p, { loose, batchNo });
      return { qty, mrp: unit.mrp, price: unit.price, gst: p.gst };
    }), posDiscountFlat),
    [posItems, posDiscountFlat]
  );

  const checkoutPos = async (opts?: { paid?: boolean; ward?: string }): Promise<SaveFault | null> => {
    if (posItems.length === 0) { showFault("Nothing to bill"); return faultRef.current; }
    if (!(await askSave("save"))) return { message: "Save cancelled" };
    const payload = {
      lines: pos, customer: posCustomer, discount: posDiscount, discountMode: posDiscountMode, payMode: posPay,
      source: posSource, ward: opts?.ward || posWard, insurer: posInsurer, patientId: posPatientId, rxImage: posRxImage, paid: opts?.paid,
    };
    try {
      const res = await api<{ sale: Sale; prescription: Prescription | null; inventory: InvProduct[] }>("/pos/checkout", { method: "POST", body: payload, idempotency: true });
      setInventory(res.inventory);
      setSales((list) => [res.sale, ...list.filter((s) => s.id !== res.sale.id)]);
      if (res.prescription) setPrescriptions((list) => [res.prescription!, ...list.filter((p) => p.id !== res.prescription!.id)]);
      setLastInvoice(res.sale);
      posClear();
      clearFault();
      toast(res.sale.paid ? "Invoice " + res.sale.id + " created" : "Bill " + res.sale.id + " sent to reception · payment pending");
      return null;
    } catch (err) {
      showFault(err, "Bill failed");
      return faultRef.current;
    }
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

  const advanceOrder = (id: string) => { const sale = sales.find((s) => s.id === id); whenSaved(post(`/sales/${id}/advance`, "POST"), () => { setSales((l) => l.map((s) => {
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
    })); if (sale?.status === "out") toast(sale.id + " marked delivered"); else if (sale?.status === "new") toast(sale.id + " accepted"); });
  };
  const cancelOrder = (id: string) => { void post(`/sales/${id}/cancel`, "POST", {}, { idem: true, pull: true }); };

  // ── online-order fulfilment ──
  const startPacking = (id: string) => { whenSaved(post(`/sales/${id}/packing/start`, "POST"), () => { setSales((l) => l.map((s) => {
      if (s.id !== id || s.channel !== "online" || s.fulfillment?.lines) return s;
      return { ...s, fulfillment: { ...(s.fulfillment ?? {}), lines: s.items.map((it) => ({ productId: it.productId, name: it.name, qty: it.qty, scanned: 0 })) } };
    })); });
  };
  // scan a barcode/batch while packing → verify it belongs to the order, deduct that batch, tick the line
  const scanPackLine = async (id: string, raw: string) => {
    const code = (raw || "").trim();
    if (!code) return null;
    return await post(`/sales/${id}/packing/scan`, "POST", { code }, { idem: true, pull: true }) as { name: string; batchNo: string; scanned: number; qty: number } | null;
  };
  // manual fallback when the scanner can't read (+1 picks FEFO, −1 restocks)
  const pickPackLine = (id: string, productId: string, delta: number) => { void post(`/sales/${id}/packing/pick`, "POST", { productId, delta }, { idem: true, pull: true });
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
  const sealPacket = (id: string) => { whenSaved(post(`/sales/${id}/packing/seal`, "POST"), () => { setSales((l) => l.map((s) => {
      if (s.id !== id || !packComplete(s)) return s;
      const items = s.items.map((it) => {
        const ln = s.fulfillment!.lines!.find((x) => x.productId === it.productId);
        if (!ln?.batchNo) return it;
        const b = inventory.find((p) => p.id === it.productId)?.batches.find((x) => x.batchNo === ln.batchNo);
        return { ...it, batchNo: ln.batchNo, expiry: b?.expiry ?? it.expiry };
      });
      return { ...s, items, status: "packed" as OrderStatus, fulfillment: { ...s.fulfillment, sealed: true, sealedAt: Date.now() }, history: [...(s.history ?? []), { status: "packed" as OrderStatus, at: Date.now(), note: "Scanned, invoiced & sealed in a Namma MedMate packet" }] };
    })); toast(id + " sealed"); });
  };
  // hand the sealed packet to the delivery partner → dispatched (out for delivery)
  const handToRider = (id: string, rider?: Rider) => { whenSaved(post(`/sales/${id}/handover`, "POST", { rider }), () => { setSales((l) => l.map((s) => {
      if (s.id !== id || s.status !== "packed") return s;
      const r = rider ?? s.fulfillment?.rider;
      return { ...s, status: "out" as OrderStatus, fulfillment: { ...(s.fulfillment ?? {}), rider: r, handedAt: Date.now() }, history: [...(s.history ?? []), { status: "out" as OrderStatus, at: Date.now(), note: r?.name ? `Handed to delivery partner ${r.name}${r.phone ? ` · ${r.phone}` : ""}` : "Handed to delivery partner" }] };
    })); toast(id + " handed over"); });
  };
  const markPaid = (id: string, payMode: PayMode) => {
    whenSaved(post(`/sales/${id}/mark-paid`, "POST", { payMode }), () => {
      setSales((l) => l.map((s) => (s.id === id ? { ...s, paid: true, reception: false, payMode, history: [...(s.history ?? []), { status: s.status, at: Date.now(), note: "Payment received at reception · " + PAY_LABEL[payMode] }] } : s)));
      toast("Payment recorded for " + id + " · " + PAY_LABEL[payMode]);
    });
  };

  // ── prescriptions ──
  const rxReviewer = () => profile.pharmacist.split(",")[0].trim();
  const approveRx = (id: string) => { void post(`/prescriptions/${id}/approve`, "POST", {}, { pull: true }); };
  const rejectRx = (id: string, reason?: string) => { void post(`/prescriptions/${id}/reject`, "POST", { reason }, { pull: true }); };
  const dispenseRx = (id: string) => {
    const rx = prescriptions.find((r) => r.id === id);
    if (!rx) return;
    void post(`/prescriptions/${id}/dispense`, "POST", {}, { pull: true }).then((res) => {
      if (res == null) return;
      setPos(rx.items.map((pid) => ({ productId: pid, qty: 1 })));
      setPosCustomerState({ ...BLANK_POS_CUSTOMER, name: rx.patient, phone: rx.phone === "—" ? "" : rx.phone, doctor: rx.doctor, rxSource: "doctor" });
      go("pos");
      toast("Loaded " + rx.id + " into billing");
    });
  };

  // ── offers ──
  const addOffer = async (o: Offer): Promise<SaveFault | null> => ok(await post("/offers", "POST", o, { pull: true }), () => toast(o.title + " launched"));
  const toggleOffer = (id: string) => { void post(`/offers/${id}/toggle`, "POST", {}, { pull: true }); };
  const removeOffer = (_id: string) => { toast("Records cannot be deleted"); };
  const setDirectOffer = (productId: string, type: OfferType, value: number) => {
    if (!value || value <= 0) { toast("Records cannot be deleted"); return; }
    void post(`/inventory/products/${productId}/direct-offer`, "PUT", { type, value }, { pull: true });
  };

  // ── staff / users ──
  const addUser = async (u: Omit<StaffUser, "id" | "lastActiveMins">): Promise<SaveFault | null> => ok(await post("/users", "POST", u, { pull: true }), () => toast(u.name + " added"));
  const updateUser = async (id: string, patch: Partial<StaffUser>): Promise<SaveFault | null> => ok(await post(`/users/${id}`, "PATCH", patch), () => setUsers((l) => l.map((u) => (u.id === id ? { ...u, ...patch } : u))));
  const toggleUser = (id: string) => { const user = users.find((u) => u.id === id); if (user) whenSaved(post(`/users/${id}`, "PATCH", { active: !user.active }), () => setUsers((l) => l.map((u) => (u.id === id ? { ...u, active: !u.active } : u)))); };
  const removeUser = (_id: string) => { toast("Records cannot be deleted"); };

  // ── subscription ──
  const requestPlan = async (plan: Plan, cycle: BillingCycle, kind: "plan" | "renewal" = "plan"): Promise<SaveFault | null> => ok(await post("/subscription/requests", "POST", { plan, cycle, kind }, { pull: true }), () => {
    toast(kind === "renewal" ? "Renewal request sent" : `Request for the ${plan} plan sent`);
  });
  const redeemCoupon = async (code: string): Promise<SaveFault | null> => ok(await post("/subscription/coupons/redeem", "POST", { code }, { pull: true }), () => toast("Coupon applied"));
  const toggleAutoRenew = () => { void post("/subscription", "PATCH", { action: "toggle" }); setSubscription((s) => ({ ...s, autoRenew: !s.autoRenew })); };
  const featureLocked = (r: Route) => routeLocked(r, subscription, { grants, businessType });

  // ── invoice settings ──
  const updateInvoiceSettings = (patch: Partial<InvoiceSettings>) => { setInvoiceSettings((s) => { const next = { ...s, ...patch }; invoiceRef.current = next; return next; }); quiet.current = true; window.setTimeout(() => { quiet.current = false; void post("/settings/invoice", "PATCH", invoiceRef.current); }, 400); };

  // ── kiosk ──
  const updateKiosk = (patch: Partial<KioskConfig>) => {
    setKiosk((k) => { const next = { ...k, ...patch }; kioskRef.current = next; return next; });
    quiet.current = true;
    if (kioskTimer.current) clearTimeout(kioskTimer.current);
    kioskTimer.current = setTimeout(() => {
      quiet.current = false;
      const next = kioskRef.current;
      void post("/settings/kiosk", "PATCH", next).then((res) => {
        if (res == null) { kioskRef.current = kioskSaved.current; setKiosk(kioskSaved.current); return; }
        kioskSaved.current = next;
      });
    }, 400);
  };
  const placeKioskOrder = async (linesIn: { productId: string; qty: number; loose?: boolean }[], pay: PayMode): Promise<Sale | null> => {
    if (!linesIn.length) return null;
    if (!(await askSave("save"))) return null;
    try {
      const res = await api<{ sale: Sale; inventory: InvProduct[] }>("/kiosk/orders", { method: "POST", body: { lines: linesIn, payMode: pay }, idempotency: true });
      setInventory(res.inventory);
      setSales((s) => [res.sale, ...s.filter((x) => x.id !== res.sale.id)]);
      toast("Kiosk order " + res.sale.id + " sent to counter");
      return res.sale;
    } catch (err) {
      showFault(err, "Order failed");
      return null;
    }
  };

  // ── CA report sharing ──
  const addAdvisor = async (a: Omit<Advisor, "id">): Promise<SaveFault | null> => ok(await post("/advisors", "POST", a, { pull: true }), () => toast(a.type + " " + a.name + " added"));
  const updateAdvisor = async (id: string, patch: Partial<Advisor>): Promise<SaveFault | null> => ok(await post(`/advisors/${id}`, "PATCH", patch), () => setAdvisors((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a))));
  const removeAdvisor = (_id: string) => { toast("Records cannot be deleted"); };
  const shareWithCA = (period: string, reports: string[], advisorId: string) => {
    const adv = advisors.find((a) => a.id === advisorId) ?? advisors[0];
    if (!adv) return;
    void post("/ca/shares", "POST", { period, reports, advisorId }, { pull: true }).then((res) => { if (res) toast("Reports shared with " + adv.name); });
  };

  // ── purchase orders (reorder → distributor) ──
  const sendPurchaseOrder = (supplierId: string, supplierName: string, items: POItem[], note?: string) => {
    if (items.length === 0) return;
    void post("/purchase-orders", "POST", { supplierId, supplierName, items, note }, { pull: true }).then((res) => { if (res) toast("Purchase order sent to " + supplierName); });
  };
  const importPurchaseOrders = async (rows: { supplierName: string; productName: string; qty: number; note?: string }[]) => {
    const res = await post("/purchase-orders/import", "POST", { rows }, { pull: true }) as { created: number; skipped: string[] } | null;
    if (res) toast(`Created ${res.created} purchase order${res.created === 1 ? "" : "s"}`);
    return res;
  };
  const markPOReceived = (id: string) => { whenSaved(post(`/purchase-orders/${id}/received`, "POST"), () => setPurchaseOrders((l) => l.map((p) => (p.id === id ? { ...p, status: "received" } : p)))); };
  const setProductSupplier = (id: string, supplierId: string) => { whenSaved(post(`/inventory/products/${id}/supplier`, "PATCH", { supplierId }), () => setInventory((l) => l.map((p) => (p.id === id ? { ...p, supplierId } : p)))); };
  // ── expenses ──
  const addExpense = async (e: Omit<Expense, "id" | "number">): Promise<SaveFault | null> => ok(await post("/expenses", "POST", e, { pull: true }), () => toast("Expense recorded · ₹" + Math.round(e.amount).toLocaleString("en-IN")));
  const updateExpense = (id: string, patch: Partial<Expense>) => { whenSaved(post(`/expenses/${id}`, "PATCH", patch), () => setExpenses((l) => l.map((e) => (e.id === id ? { ...e, ...patch } : e)))); };
  const removeExpense = (_id: string) => { toast("Records cannot be deleted"); };
  const addExpenseCategory = (name: string) => { const n = name.trim(); if (n && !expenseCategories.includes(n)) whenSaved(post("/expense-categories", "POST", { name: n }), () => { setExpenseCategories((c) => [...c, n]); toast("Category added"); }); };
  // ── employees (HR records) ──
  const addEmployee = async (e: Omit<Employee, "id">): Promise<SaveFault | null> => ok(await post("/employees", "POST", e, { pull: true }), () => toast(e.name + " added"));
  const updateEmployee = async (id: string, patch: Partial<Employee>): Promise<SaveFault | null> => ok(await post(`/employees/${id}`, "PATCH", patch), () => setEmployees((l) => l.map((e) => (e.id === id ? { ...e, ...patch } : e))));
  const removeEmployee = (_id: string) => { toast("Records cannot be deleted"); };
  // ── customer credit (khata) repayments ──
  const recordCreditPayment = async (p: { custKey: string; custName: string; custPhone: string; amount: number; mode: PayMode; note?: string }): Promise<SaveFault | null> => {
    if (p.amount <= 0) { showFault("Amount must be positive"); return faultRef.current; }
    return ok(await post("/credit/payments", "POST", p, { pull: true }), () => toast("Repayment recorded · ₹" + Math.round(p.amount).toLocaleString("en-IN")));
  };
  // ── CRM ──
  const crmId = (pfx: string) => { crmSeq.current += 1; return pfx + "-" + crmSeq.current; };
  const setPatientMeta = async (key: string, patch: PatientMeta): Promise<SaveFault | null> => ok(await post(`/crm/patients/${encodeURIComponent(key)}`, "PATCH", patch), () => setCrm((c) => ({ ...c, meta: { ...c.meta, [key]: { ...c.meta[key], ...patch } } })));
  const addCampaign = async (c: Omit<Campaign, "id" | "sentAt">): Promise<SaveFault | null> => ok(await post("/crm/campaigns", "POST", c, { pull: true }), () => toast("Campaign saved"));
  const addFeedback = async (f: Omit<Feedback, "id" | "at">): Promise<SaveFault | null> => ok(await post("/crm/feedback", "POST", f, { pull: true }), () => toast("Feedback saved"));
  const logReminder = (r: Omit<ReminderLog, "id" | "at">) => { void post("/crm/reminders", "POST", r, { pull: true }); setCrm((s) => ({ ...s, reminders: [{ ...r, id: crmId("RM"), at: Date.now() }, ...s.reminders] })); };
  const redeemPoints = (custKey: string, custName: string, points: number) => { if (points <= 0) return; void post("/crm/redemptions", "POST", { custKey, custName, points }, { pull: true }).then((res) => { if (res) toast(`Redeemed ${points} pts · ₹${points} off`); }); };
  // ── distributors / suppliers ──
  const addSupplier = async (s: Omit<Supplier, "id">): Promise<SaveFault | null> => ok(await post("/suppliers", "POST", s, { pull: true }), () => toast(s.name + " added"));
  const updateSupplier = async (id: string, patch: Partial<Supplier>): Promise<SaveFault | null> => ok(await post(`/suppliers/${id}`, "PATCH", patch), () => setSuppliers((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s))));
  const removeSupplier = (_id: string) => { toast("Records cannot be deleted"); };
  // ── distributor supply list ──
  const addSupply = async (s: Omit<SupplyEntry, "id">): Promise<SaveFault | null> => ok(await post("/supply-list", "POST", s, { pull: true }), () => toast("Supply item added"));
  const updateSupply = async (id: string, patch: Partial<SupplyEntry>): Promise<SaveFault | null> => ok(await post(`/supply-list/${id}`, "PATCH", patch), () => setSupplyList((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s))));
  const removeSupply = (_id: string) => { toast("Records cannot be deleted"); };
  const setPreferredSupply = (id: string) => { whenSaved(post(`/supply-list/${id}/preferred`, "POST"), () => setSupplyList((l) => {
    const target = l.find((s) => s.id === id);
    if (!target) return l;
    return l.map((s) => s.productId === target.productId ? { ...s, preferred: s.id === id } : s);
  }));
  };

  // ── settings ──
  const updateProfile = async (patch: Partial<PharmacyProfile>): Promise<SaveFault | null> => {
    const next = { ...profileRef.current, ...patch };
    quiet.current = true;
    const res = await post("/pharmacy/profile", "PATCH", next);
    quiet.current = false;
    return ok(res, () => { profileRef.current = next; setProfile(next); });
  };
  // ── payout bank account ──
  const saveBankAccount = async (b: Omit<BankAccount, "verified" | "addedOn">): Promise<SaveFault | null> => ok(await post("/bank-account", "PUT", b), () => {
    setBankAccount({ ...b, verified: false, addedOn: todayISO() });
    toast("Bank account saved — verification pending");
  });
  const verifyBankAccount = () => { whenSaved(post("/bank-account/verify", "POST"), () => { setBankAccount((b) => (b ? { ...b, verified: true } : b)); toast("Bank account verified"); }); };
  const removeBankAccount = () => { toast("Records cannot be deleted"); };
  // ── store setup wizard ──
  const startSetup = () => { holdSetup.current = true; setSetupComplete(false); go("dashboard"); };
  const completeSetup = () => { whenSaved(post("/setup/complete", "POST"), () => { holdSetup.current = false; setSetupComplete(true); toast("Store setup complete"); }); };
  const wipeData = () => { toast("Records cannot be deleted"); };
  const setLooseDefault = (allowed: boolean) => { void post("/inventory/loose-default", "POST", { allowed }, { pull: true }); };
  const toggleStoreOpen = () => { whenSaved(post("/pharmacy/store-open", "POST"), () => setProfile((p) => ({ ...p, storeOpen: !p.storeOpen }))); };

  // ── auth / onboarding ──
  const signIn = async (bt: BusinessType, name?: string, phone?: string, code?: string, purpose?: "reset") => {
    if (!phone || !code) return;
    await api("/auth/otp/verify", { method: "POST", body: { phone, code, businessType: bt, name, purpose } });
    clearFault();
    if (purpose === "reset") setPinReset(true);
    await refresh();
    resetNav("dashboard");
    if (purpose !== "reset") toast("Welcome back");
  };
  const signInWithPin = async (phone: string, pin: string) => {
    await api("/auth/pin", { method: "POST", body: { phone, pin } });
    clearFault();
    setPinReset(false);
    await refresh();
    resetNav("dashboard");
    toast("Welcome back");
  };
  const setLoginPin = async (pin: string, confirmPin: string) => {
    if (!(await askSave("save"))) return;
    await api("/auth/pin/set", { method: "POST", body: { pin, confirm: confirmPin } });
    setPinReset(false);
    setNeedsPin(false);
    toast("PIN saved");
  };
  const signOut = () => setLeaveOpen(true);
  const finishSignOut = () => {
    setLeaveOpen(false);
    setNeedsPin(false);
    setPinReset(false);
    void api("/auth/sign-out", { method: "POST" }).catch(() => undefined);
    signedRef.current = false; setSignedIn(false); setImpersonator(null); resetNav("dashboard");
  };

  // ── hospital modules ──
  const setIndentStatus = (id: string, status: IndentStatus) => {
    whenSaved(post(`/hospital/indents/${id}`, "PATCH", { status }), () => {
      setWardIndents((l) => l.map((x) => (x.id === id ? { ...x, status, items: status === "issued" ? x.items.map((it) => ({ ...it, issued: it.qty })) : x.items } : x)));
      toast(status === "issued" ? "Indent issued · stock dispatched to ward" : status === "approved" ? "Indent approved" : status === "rejected" ? "Indent rejected" : "Indent updated");
    });
  };
  const setClaimStatus = (id: string, status: ClaimStatus, approvedAmount?: number) => {
    whenSaved(post(`/hospital/tpa-claims/${id}`, "PATCH", { status, approvedAmount }), () => {
      setTpaClaims((l) => l.map((c) => (c.id === id ? { ...c, status, approvedAmount: approvedAmount ?? c.approvedAmount } : c)));
      toast("Claim " + id + " · " + status);
    });
  };
  // ── wards (hospital setup) ──
  const addWard = async (w: Omit<Ward, "id">): Promise<SaveFault | null> => ok(await post("/hospital/wards", "POST", w, { pull: true }), () => toast(w.name + " added"));
  const updateWard = (id: string, patch: Partial<Ward>) => { whenSaved(post(`/hospital/wards/${id}`, "PATCH", patch), () => setWards((l) => l.map((w) => (w.id === id ? { ...w, ...patch } : w)))); };
  const removeWard = (_id: string) => { toast("Records cannot be deleted"); };

  // ── IPD admissions ──
  const admitPatient = async (a: Omit<Admission, "id" | "admittedAt" | "status">): Promise<Admission | null> => {
    const adm = await post("/hospital/admissions", "POST", a, { pull: true }) as Admission | null;
    if (!adm) return null;
    toast(`${a.name} admitted · ${a.bed}`);
    return adm;
  };
  const updateAdmission = (id: string, patch: Partial<Admission>) => { whenSaved(post(`/hospital/admissions/${id}`, "PATCH", patch), () => setAdmissions((l) => l.map((a) => (a.id === id ? { ...a, ...patch } : a)))); };
  const dischargePatient = (id: string) => {
    whenSaved(post(`/hospital/admissions/${id}`, "PATCH", { status: "discharged" }), () => {
      setAdmissions((l) => l.map((a) => (a.id === id ? { ...a, status: "discharged", dischargedAt: Date.now() } : a)));
      toast("Patient discharged · bed freed");
    });
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
  const updateHospitalAccount = (patch: Partial<HospitalAccount>) => {
    if (typeof patch.gstin === "string" && patch.gstin.trim() && !isValidGstin(patch.gstin)) {
      if (patch.gstin.trim().length < 15) setHospitalAccount((a) => ({ ...a, gstin: patch.gstin! }));
      else showFault("Enter a valid GSTIN");
      return;
    }
    whenSaved(post("/hospital/account", "PATCH", patch), () => setHospitalAccount((a) => ({ ...a, ...patch })));
  };
  // ── institutional pricing (admin-gated) ──
  const unlockPricing = async (otp: string) => {
    try {
      await api("/hospital/pricing/unlock", { method: "POST", body: { code: otp } });
      pricingRef.current = true;
      setPricingUnlocked(true);
      clearFault();
      toast("Pricing unlocked by admin");
      return true;
    } catch (err) {
      showFault(err, "Incorrect admin OTP");
      return false;
    }
  };
  const lockPricing = () => { setPricingUnlocked(false); toast("Pricing locked"); };
  const setUniformDiscount = (pct: number) => {
    if (!pricingUnlocked) { toast("Unlock pricing with admin OTP first"); return; }
    const discountPct = Math.max(0, Math.min(95, Math.round(pct)));
    whenSaved(post("/hospital/pricing/rules", "PATCH", { discountPct }), () => setHospitalAccount((a) => ({ ...a, discountPct })));
  };
  const setHospitalPriceRule = (productId: string, rule: PriceRule | null) => {
    if (!pricingUnlocked) { toast("Unlock pricing with admin OTP first"); return; }
    if (!rule || isNaN(rule.value) || rule.value < 0) { toast("Records cannot be deleted"); return; }
    const saved = { mode: rule.mode, value: Math.round(rule.value * 100) / 100 };
    whenSaved(post("/hospital/pricing/rules", "PATCH", { productId, rule: saved }), () => setHospitalPriceRules((m) => ({ ...m, [productId]: saved })));
  };
  const supplyTotal = (items: WardSupplyItem[]) => Math.round(items.reduce((a, it) => a + it.amount, 0) * 100) / 100;
  const rupee = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
  const issueWardSupply = async (draft: Omit<WardSupply, "id" | "kind" | "at" | "total">): Promise<WardSupply | null> => {
    if (!draft.items.length) { showFault("Nothing to issue"); return null; }
    const res = await post("/hospital/ward-supplies/issue", "POST", draft, { idem: true, pull: true });
    if (res == null) return null;
    const supply: WardSupply = { ...draft, id: "WS", kind: "issue", total: supplyTotal(draft.items), at: Date.now() };
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
  const returnWardSupply = async (draft: Omit<WardSupply, "id" | "kind" | "at" | "total">): Promise<WardSupply | null> => {
    if (!draft.items.length) { showFault("Nothing to return"); return null; }
    const res = await post("/hospital/ward-supplies/return", "POST", draft, { idem: true, pull: true });
    if (res == null) return null;
    const supply: WardSupply = { ...draft, id: "WR", kind: "return", total: supplyTotal(draft.items), at: Date.now() };
    toast(`Return from ${draft.wardName} · credit note ${rupee(supply.total)}`);
    return supply;
  };
  const recordHospitalPayment = async (p: Omit<HospitalPayment, "id" | "at">): Promise<SaveFault | null> => {
    if (p.amount <= 0) { showFault("Amount must be positive"); return faultRef.current; }
    return ok(await post("/hospital/payments", "POST", p, { idem: true, pull: true }), () => toast(`Hospital payment ${rupee(p.amount)} recorded`));
  };

  // ── doctor directory ──
  const addDoctor = async (d: Omit<DoctorProfile, "id">): Promise<SaveFault | null> => ok(await post("/hospital/doctors", "POST", d, { pull: true }), () => toast(d.name + " added"));
  const addDepartment = async (d: { name: string; head: string; type: Department["type"]; emoji?: string }): Promise<SaveFault | null> => ok(await post("/hospital/departments", "POST", d, { pull: true }), () => toast(d.name + " added"));
  const updateDepartment = async (id: string, patch: Partial<Department>): Promise<SaveFault | null> => ok(await post(`/hospital/departments/${id}`, "PATCH", patch, { pull: true }));
  const removeDepartment = (_id: string) => { toast("Records cannot be deleted"); };
  const addReferral = async (r: { name: string; area?: string }): Promise<SaveFault | null> => ok(await post("/referrals", "POST", r, { pull: true }), () => toast(r.name + " invited"));
  const updateReferral = (id: string, patch: Partial<Referral>) => { whenSaved(post(`/referrals/${id}`, "PATCH", patch), () => setReferrals((l) => l.map((r) => (r.id === id ? { ...r, ...patch } : r)))); };
  const removeReferral = (_id: string) => { toast("Records cannot be deleted"); };
  const updateDoctor = async (id: string, patch: Partial<DoctorProfile>): Promise<SaveFault | null> => ok(await post(`/hospital/doctors/${id}`, "PATCH", patch), () => setDoctors((l) => l.map((d) => (d.id === id ? { ...d, ...patch } : d))));
  const removeDoctor = (_id: string) => { toast("Records cannot be deleted"); };

  const settleBills = (ids: string[], payMode: PayMode) => {
    if (ids.length === 0) return;
    void post("/sales/settle", "POST", { ids, payMode }, { idem: true, pull: true }).then((res) => {
      if (res) toast(`Settled ${ids.length} bill${ids.length !== 1 ? "s" : ""} · ${PAY_LABEL[payMode]}`);
    });
  };

  const raiseTicket = async (subject: string, category: string): Promise<SaveFault | null> => ok(await post("/support/tickets", "POST", { subject, category }, { pull: true }), () => toast("Ticket raised"));

  const value: Ctx = {
    signedIn, businessType, isHospital: businessType === "hospital", signIn, signInWithPin, setLoginPin, needsPin, pinReset, signOut, impersonator,
    wards, addWard, updateWard, removeWard, admissions, admitPatient, updateAdmission, dischargePatient, startWardBilling,
    wardIndents, departments, addDepartment, updateDepartment, removeDepartment, referrals, addReferral, updateReferral, removeReferral, tpaClaims, doctors, addDoctor, updateDoctor, removeDoctor, setIndentStatus, setClaimStatus, settleBills,
    hospitalAccount, updateHospitalAccount, hospitalPriceRules, setUniformDiscount, setHospitalPriceRule, pricingUnlocked, unlockPricing, lockPricing, wardSupplies, issueWardSupply, returnWardSupply, hospitalPayments, recordHospitalPayment,
    billIndentTarget, openIndentBilling, clearBillIndentTarget, issueIndent,
    route, go, back, canGoBack, registerBack, invFilter, setInvFilter, reportTarget, openReport, setReportTarget,
    inventory, sales, prescriptions, offers, purchases, profile, now,
    addProduct, importMedicines, updateProduct, racks, createRack, removeRack, setProductLocation, bulkAssignLocation, addBatch, setBatchQty, receivePurchase, toggleOnline, toggleLoose, setOnlinePrice, setProductOffer,
    pos, posCustomer, setPosCustomer, posDiscount, setPosDiscount, posDiscountMode, setPosDiscountMode, posDiscountFlat, posPay, setPosPay, posSource, setPosSource, posWard, setPosWard, posInsurer, setPosInsurer, posPatientId, setPosPatientId, posRxImage, setPosRxImage,
    posAdd, posDec, posSetQty, posRemove, posSetBatch, scanToPos, posClear, posTotals, posCount, checkoutPos, lastInvoice, setLastInvoice,
    advanceOrder, cancelOrder, markPaid, startPacking, scanPackLine, pickPackLine, sealPacket, handToRider,
    approveRx, rejectRx, dispenseRx,
    addOffer, toggleOffer, removeOffer, setDirectOffer,
    users, addUser, updateUser, toggleUser, removeUser,
    subscription, grants, extraSeats, subscriptionRequests, couponRedeemed, requestPlan, redeemCoupon, toggleAutoRenew, featureLocked,
    invoiceSettings, updateInvoiceSettings,
    kiosk, updateKiosk, placeKioskOrder,
    advisors, addAdvisor, updateAdvisor, removeAdvisor, caShares, shareWithCA,
    purchaseOrders, sendPurchaseOrder, importPurchaseOrders, markPOReceived, setProductSupplier,
    expenses, expenseCategories, addExpense, updateExpense, removeExpense, addExpenseCategory,
    employees, addEmployee, updateEmployee, removeEmployee,
    creditPayments, recordCreditPayment,
    crm, setPatientMeta, addCampaign, addFeedback, logReminder, redeemPoints,
    suppliers, addSupplier, updateSupplier, removeSupplier,
    supplyList, addSupply, updateSupply, removeSupply, setPreferredSupply,
    updateProfile, toggleStoreOpen,
    bankAccount, saveBankAccount, verifyBankAccount, removeBankAccount,
    setupComplete, startSetup, completeSetup, wipeData, setLooseDefault,
    toast, toastMsg, formFault, showFault, clearFault, tickets, raiseTicket, me,
  };
  if (!hydrated) return <div className="pd-boot">Loading pharmacy…</div>;
  return (
    <PCtx.Provider value={value}>
      {children}
      {leaveOpen && <SignOutDialog onCancel={() => setLeaveOpen(false)} onConfirm={finishSignOut} />}
      {saveAsk && <SaveConfirm title={saveAsk.title} body={saveAsk.body} onCancel={() => { saveAsk.resolve(false); setSaveAsk(null); }} onConfirm={() => { saveAsk.resolve(true); setSaveAsk(null); }} />}
    </PCtx.Provider>
  );
}

// helper re-export for screens
export { stockOf };
