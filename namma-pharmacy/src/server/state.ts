import {
  DEFAULT_INVOICE_SETTINGS, DEFAULT_KIOSK, DEFAULT_PROFILE, DEFAULT_SUBSCRIPTION,
  EXPENSE_CATEGORIES, SEED_ADVISORS, SEED_CA_SHARES, SEED_EMPLOYEES, SEED_INVENTORY,
  SEED_OFFERS, SEED_PURCHASE_ORDERS, SEED_PURCHASES, SEED_RX, SEED_SALES, SEED_SUPPLIERS,
  SEED_SUPPLY, SEED_USERS, Advisor, BankAccount, CAShare, CreditPayment, Employee,
  Expense, InvProduct, InvoiceSettings, KioskConfig, Offer, PharmacyProfile, Purchase, SubRequest,
  PurchaseOrder, Sale, ScreenGrant, StaffUser, Subscription, Supplier,   seedHistory, resolveSeedCreditPayments, resolveSeedExpenses, distinctRacks, SupplyEntry,
} from "../app/data";
import { CrmData, EMPTY_CRM } from "../app/lib/crm";
import {
  Admission, Department, DoctorProfile, SEED_DOCTORS, SEED_WARDS, TpaClaim, Ward, WardIndent,
  resolveSeedAdmissions, resolveSeedClaims, resolveSeedIndents,
} from "../app/lib/hospital";
import {
  DEFAULT_HOSPITAL_ACCOUNT, HospitalAccount, HospitalPayment, PriceRule, WardSupply,
  resolveSeedHospitalPayments, resolveSeedSupplies,
} from "../app/lib/hospitalAccount";
import { Referral } from "../app/lib/referrals";
import type { BusinessType } from "./types";

export type { BusinessType } from "./types";

export type Ticket = { id: string; subject: string; category: string; status: "Open" | "Resolved"; createdAt: number };

export type Seq = {
  inv: number; rx: number; grn: number; prod: number; po: number; ca: number; user: number;
  adv: number; supplier: number; supply: number; exp: number; emp: number; credit: number;
  crm: number; doc: number; ward: number; adm: number; ws: number; wr: number; hp: number; ticket: number;
  dept: number; referral: number; request: number;
};

export type { SubRequest };

export type PharmacyState = {
  profile: PharmacyProfile;
  invoiceSettings: InvoiceSettings;
  kiosk: KioskConfig;
  subscription: Subscription;
  grants: ScreenGrant[];
  extraSeats: number;
  subscriptionRequests: SubRequest[];
  bankAccount: BankAccount | null;
  setupComplete: boolean;
  businessType: BusinessType;
  seq: Seq;
  inventory: InvProduct[];
  racks: string[];
  sales: Sale[];
  prescriptions: import("../app/data").Prescription[];
  offers: Offer[];
  purchases: Purchase[];
  suppliers: Supplier[];
  supplyList: SupplyEntry[];
  purchaseOrders: PurchaseOrder[];
  expenses: Expense[];
  expenseCategories: string[];
  employees: Employee[];
  users: StaffUser[];
  creditPayments: CreditPayment[];
  crm: CrmData;
  advisors: Advisor[];
  caShares: CAShare[];
  wards: Ward[];
  admissions: Admission[];
  wardIndents: WardIndent[];
  tpaClaims: TpaClaim[];
  doctors: DoctorProfile[];
  departments: Department[];
  referrals: Referral[];
  hospitalAccount: HospitalAccount;
  hospitalPriceRules: Record<string, PriceRule>;
  wardSupplies: WardSupply[];
  hospitalPayments: HospitalPayment[];
  tickets: Ticket[];
  couponRedeemed?: boolean;
};

const ZERO_SEQ: Seq = {
  inv: 1000, rx: 1000, grn: 1000, prod: 1000, po: 1000, ca: 1000, user: 1,
  adv: 1000, supplier: 1000, supply: 1000, exp: 1000, emp: 0, credit: 1000,
  crm: 0, doc: 0, ward: 0, adm: 1000, ws: 1000, wr: 1000, hp: 1000, ticket: 1000, dept: 0, referral: 0, request: 0,
};

export function emptyState(input: { name?: string; phone: string; businessType: BusinessType }): PharmacyState {
  const name = input.name?.trim() || (input.businessType === "hospital" ? "Hospital Pharmacy" : "My Pharmacy");
  const profile: PharmacyProfile = {
    ...DEFAULT_PROFILE,
    name,
    tagline: "",
    logo: undefined,
    phone: input.phone,
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gstin: "",
    pan: "",
    dlNo: "",
    fssai: "",
    signature: undefined,
    extraDetails: [],
    pharmacist: "",
  };
  return {
    profile,
    invoiceSettings: { ...DEFAULT_INVOICE_SETTINGS, bankLine: "", stamp: undefined },
    kiosk: { ...DEFAULT_KIOSK, displayName: name, pin: "" },
    subscription: { ...DEFAULT_SUBSCRIPTION, since: new Date().toISOString().slice(0, 10), renewsOn: "—" },
    grants: [],
    extraSeats: 0,
    subscriptionRequests: [],
    bankAccount: null,
    setupComplete: false,
    businessType: input.businessType,
    seq: { ...ZERO_SEQ },
    inventory: [],
    racks: [],
    sales: [],
    prescriptions: [],
    offers: [],
    purchases: [],
    suppliers: [],
    supplyList: [],
    purchaseOrders: [],
    expenses: [],
    expenseCategories: [...EXPENSE_CATEGORIES],
    employees: [],
    users: [],
    creditPayments: [],
    crm: { ...EMPTY_CRM, meta: {}, campaigns: [], feedbacks: [], reminders: [], redemptions: [] },
    advisors: [],
    caShares: [],
    wards: [],
    admissions: [],
    wardIndents: [],
    tpaClaims: [],
    doctors: [],
    departments: [],
    referrals: [],
    hospitalAccount: {
      ...DEFAULT_HOSPITAL_ACCOUNT,
      name: input.businessType === "hospital" ? name : DEFAULT_HOSPITAL_ACCOUNT.name,
      gstin: "",
      contact: "",
      phone: "",
      email: "",
      creditLimit: 0,
      discountPct: 0,
    },
    hospitalPriceRules: {},
    wardSupplies: [],
    hospitalPayments: [],
    tickets: [],
  };
}

const SEED_EXPIRY_ANCHOR = 2026 * 12 + 6;

function shiftExpiry(value: string, now: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const moved = Number(match[1]) * 12 + Number(match[2]) + (new Date(now).getFullYear() * 12 + new Date(now).getMonth() + 1 - SEED_EXPIRY_ANCHOR);
  const year = Math.floor((moved - 1) / 12);
  const month = ((moved - 1) % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function shiftExpiries<T>(value: T, now: number): T {
  if (Array.isArray(value)) return value.map((item) => shiftExpiries(item, now)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = key === "expiry" && typeof item === "string" ? shiftExpiry(item, now) : shiftExpiries(item, now);
    }
    return out as T;
  }
  return value;
}

export function demoState(now: number, businessType: BusinessType): PharmacyState {
  const sales: Sale[] = SEED_SALES.map((s) => {
    const { minsAgo, ...rest } = s;
    const createdAt = now - minsAgo * 60000;
    return { ...rest, createdAt, history: seedHistory(rest.channel, rest.status, createdAt, now) };
  });
  return shiftExpiries({
    profile: { ...DEFAULT_PROFILE },
    invoiceSettings: { ...DEFAULT_INVOICE_SETTINGS },
    kiosk: { ...DEFAULT_KIOSK },
    subscription: { ...DEFAULT_SUBSCRIPTION },
    bankAccount: null,
    setupComplete: true,
    businessType,
    seq: {
      inv: 2607, rx: 200, grn: 3103, prod: 900, po: 512, ca: 204, user: 4,
      adv: 2, supplier: 3, supply: 22, exp: 1008, emp: 5, credit: 1001,
      crm: 1, doc: 6, ward: 6, adm: 1008, ws: 1007, wr: 300, hp: 501, ticket: 8841, dept: 0, referral: 0, request: 0,
    },
    grants: [],
    extraSeats: 0,
    subscriptionRequests: [],
    inventory: structuredClone(SEED_INVENTORY),
    racks: distinctRacks(SEED_INVENTORY),
    sales,
    prescriptions: SEED_RX.map((r) => {
      const { minsAgo, approvedMinsAgo, dispensedMinsAgo, rejectedMinsAgo, ...rest } = r;
      const at = (m?: number) => (m != null ? now - m * 60000 : undefined);
      return { ...rest, uploadedAt: now - minsAgo * 60000, approvedAt: at(approvedMinsAgo), dispensedAt: at(dispensedMinsAgo), rejectedAt: at(rejectedMinsAgo) };
    }),
    offers: structuredClone(SEED_OFFERS),
    purchases: SEED_PURCHASES.map((p) => { const { minsAgo, ...rest } = p; return { ...rest, createdAt: now - minsAgo * 60000 }; }),
    suppliers: structuredClone(SEED_SUPPLIERS),
    supplyList: structuredClone(SEED_SUPPLY),
    purchaseOrders: SEED_PURCHASE_ORDERS.map((p) => { const { minsAgo, ...rest } = p; return { ...rest, createdAt: now - minsAgo * 60000 }; }),
    expenses: resolveSeedExpenses(now),
    expenseCategories: [...EXPENSE_CATEGORIES],
    employees: structuredClone(SEED_EMPLOYEES),
    users: structuredClone(SEED_USERS),
    creditPayments: resolveSeedCreditPayments(now),
    crm: { ...EMPTY_CRM, meta: {}, campaigns: [], feedbacks: [], reminders: [], redemptions: [] },
    advisors: structuredClone(SEED_ADVISORS),
    caShares: SEED_CA_SHARES.map((s) => { const { minsAgo, ...rest } = s; return { ...rest, createdAt: now - minsAgo * 60000 }; }),
    wards: structuredClone(SEED_WARDS),
    admissions: resolveSeedAdmissions(now),
    wardIndents: resolveSeedIndents(now),
    tpaClaims: resolveSeedClaims(now),
    doctors: structuredClone(SEED_DOCTORS),
    departments: [],
    referrals: [],
    hospitalAccount: { ...DEFAULT_HOSPITAL_ACCOUNT },
    hospitalPriceRules: {},
    wardSupplies: resolveSeedSupplies(now),
    hospitalPayments: resolveSeedHospitalPayments(now),
    tickets: [{ id: "TKT-8841", subject: "GST rate wrong on one product", category: "Billing", status: "Resolved", createdAt: now - 2 * 86400000 }],
  }, now);
}

const PLACEHOLDER_BANK = "HDFC Bank · A/c 50100XXXXXX · IFSC HDFC0000123";

function isDemoStore(state: PharmacyState) {
  const sale = state.sales?.some((s) => s.id === "INV-2601");
  const stock = state.inventory?.some((p) => p.id === "p1" && p.name === "Dolo 650");
  const people = state.users?.some((u) => u.password === "Rajesh@2481") || state.profile?.gstin === "29ABCDE1234F1Z2";
  return Boolean(sale && stock && people);
}

/** Drop an untouched sample store and the placeholder bank line. No-op outside production. */
export function stripDemo(state: PharmacyState, env = process.env.NODE_ENV): boolean {
  if (env !== "production") return false;
  let changed = false;
  if (state.invoiceSettings?.bankLine === PLACEHOLDER_BANK) {
    state.invoiceSettings.bankLine = "";
    changed = true;
  }
  if (!isDemoStore(state)) return changed;
  const owner = state.users.find((u) => u.role === "Owner") ?? state.users[0];
  const phone = owner?.phone || state.profile.phone || "";
  const next = emptyState({ phone, businessType: state.businessType });
  next.users = [{
    id: "u1",
    name: owner && owner.name !== "Rajesh Kumar" ? owner.name : "Owner",
    role: "Owner",
    phone,
    email: "",
    active: true,
    lastActiveMins: 0,
    pin: "",
  }];
  for (const key of Object.keys(state)) delete (state as Record<string, unknown>)[key];
  Object.assign(state, next);
  return true;
}

export function touchAccess(state: PharmacyState) {
  state.grants ||= [];
  state.extraSeats ||= 0;
  state.subscriptionRequests ||= [];
  state.referrals ||= [];
  state.couponRedeemed = state.couponRedeemed === true;
}

export function bump(state: PharmacyState, key: keyof Seq): number {
  state.seq[key] = (state.seq[key] || 0) + 1;
  return state.seq[key];
}
