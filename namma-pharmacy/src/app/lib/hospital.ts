// ════════════════════════════════════════════════════════════════
// Hospital-pharmacy module — extra data for the "Hospital Pharmacy"
// business type: IPD wards, ward indents (requisitions), departments
// & doctors, insurance / TPA claims, and in-patient bill settlement.
// Shared by desktop + phone.
// ════════════════════════════════════════════════════════════════
import { Sale, SaleSource, computeInvoice, saleSourceOf } from "../data";

// ── IPD wards ───────────────────────────────────────────────────
export type WardType = "General" | "ICU" | "Pediatric" | "Maternity" | "Surgical" | "Private";
export type Ward = {
  id: string;
  name: string;
  code: string;
  floor: string;
  type: WardType;
  beds: number;
  occupied: number;
  sister: string;       // nurse-in-charge
};

export const WARD_TYPES: WardType[] = ["General", "ICU", "Pediatric", "Maternity", "Surgical", "Private"];

export const SEED_WARDS: Ward[] = [
  { id: "W-ICU", name: "Intensive Care Unit", code: "ICU", floor: "2nd floor", type: "ICU", beds: 12, occupied: 9, sister: "Sr. Lalita" },
  { id: "W-GEN", name: "General Ward A", code: "GEN-A", floor: "1st floor", type: "General", beds: 30, occupied: 22, sister: "Sr. Mary" },
  { id: "W-SUR", name: "Surgical Ward", code: "SUR", floor: "3rd floor", type: "Surgical", beds: 18, occupied: 11, sister: "Sr. Anjali" },
  { id: "W-PED", name: "Pediatric Ward", code: "PED", floor: "1st floor", type: "Pediatric", beds: 16, occupied: 7, sister: "Sr. Fatima" },
  { id: "W-MAT", name: "Maternity Ward", code: "MAT", floor: "2nd floor", type: "Maternity", beds: 14, occupied: 10, sister: "Sr. Reena" },
  { id: "W-PVT", name: "Private Rooms", code: "PVT", floor: "4th floor", type: "Private", beds: 20, occupied: 13, sister: "Sr. Grace" },
];

// bed numbers for a ward, generated from its code (e.g. GEN-A-1 … GEN-A-30)
export const wardBedNos = (w: Ward): string[] => Array.from({ length: Math.max(0, w.beds) }, (_, i) => `${w.code}-${i + 1}`);

// ── IPD admissions (patient admitted to a bed) ──────────────────
export type PayerType = "self" | "insurance";
export type Admission = {
  id: string;            // admission no. e.g. ADM-1007
  patientId: string;     // UHID / IP no. (links to that patient's bills)
  name: string;
  age?: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  wardId: string;
  wardName: string;
  bed: string;           // bed number, e.g. "GEN-A-14"
  doctor: string;        // attending doctor
  diagnosis: string;
  payerType: PayerType;
  insurer?: string;      // when payerType === "insurance"
  policyNo?: string;
  admittedAt: number;
  status: "admitted" | "discharged";
  dischargedAt?: number;
};
type SeedAdmission = Omit<Admission, "admittedAt"> & { daysAgo: number };
const SEED_ADMISSIONS: SeedAdmission[] = [
  { id: "ADM-1007", patientId: "UHID-100245", name: "Asha Devi", age: 54, gender: "Female", phone: "+91 90011 22334", wardId: "W-GEN", wardName: "General Ward A", bed: "GEN-A-14", doctor: "Dr. R. Menon", diagnosis: "Community-acquired pneumonia", payerType: "insurance", insurer: "Ayushman Bharat (PM-JAY)", policyNo: "PMJAY-AS-44192", status: "admitted", daysAgo: 2 },
  { id: "ADM-1008", patientId: "UHID-100312", name: "Priya N.", age: 28, gender: "Female", phone: "+91 90022 33445", wardId: "W-MAT", wardName: "Maternity Ward", bed: "MAT-3", doctor: "Dr. P. Sharma", diagnosis: "Post-natal care & observation", payerType: "self", status: "admitted", daysAgo: 1 },
];
export function resolveSeedAdmissions(now: number): Admission[] {
  return SEED_ADMISSIONS.map(({ daysAgo, ...r }) => ({ ...r, admittedAt: now - daysAgo * 86400000 }));
}
export const activeAdmissions = (a: Admission[]) => a.filter((x) => x.status === "admitted");
export const occupiedBedsOf = (a: Admission[], wardId: string) => new Set(activeAdmissions(a).filter((x) => x.wardId === wardId).map((x) => x.bed));
export const admissionAtBed = (a: Admission[], wardId: string, bed: string) => activeAdmissions(a).find((x) => x.wardId === wardId && x.bed === bed) ?? null;
export const admissionOfPatient = (a: Admission[], patientId: string) => activeAdmissions(a).find((x) => x.patientId === patientId) ?? null;
export const hospitalOccupancy = (wards: Ward[], a: Admission[]) => {
  const beds = wards.reduce((s, w) => s + w.beds, 0);
  const occ = activeAdmissions(a).length;
  return { beds, occ, free: beds - occ, pct: beds ? Math.round((occ / beds) * 100) : 0 };
};

// ── ward indents (medicine requisitions from a ward → pharmacy) ──
export type IndentStatus = "pending" | "approved" | "issued" | "rejected";
export type IndentItem = { name: string; qty: number; issued?: number };
export type WardIndent = {
  id: string;
  wardId: string;
  wardName: string;
  patient?: string;         // optional patient/bed the indent is for
  bed?: string;
  requestedBy: string;      // nurse / resident
  status: IndentStatus;
  items: IndentItem[];
  note?: string;
  at: number;               // resolved from minsAgo at init
};
type SeedIndent = Omit<WardIndent, "at"> & { minsAgo: number };

const SEED_INDENTS: SeedIndent[] = [
  { id: "IND-4012", wardId: "W-ICU", wardName: "Intensive Care Unit", patient: "Bed 4 · Mohan Das", bed: "ICU-4", requestedBy: "Dr. Saxena (RMO)", status: "pending", minsAgo: 18,
    items: [{ name: "Piptaz 4.5g Injection", qty: 6 }, { name: "Pantop 40 IV", qty: 4 }, { name: "Normal Saline 500ml", qty: 8 }] },
  { id: "IND-4011", wardId: "W-SUR", wardName: "Surgical Ward", patient: "Bed 9 · post-op", bed: "SUR-9", requestedBy: "Sr. Anjali", status: "pending", minsAgo: 47,
    items: [{ name: "Tramadol 50mg Injection", qty: 4 }, { name: "Ondansetron 4mg", qty: 6 }, { name: "Ceftriaxone 1g", qty: 4 }] },
  { id: "IND-4009", wardId: "W-GEN", wardName: "General Ward A", patient: "Bed 14 · Asha Devi", bed: "GEN-14", requestedBy: "Sr. Mary", status: "approved", minsAgo: 95,
    items: [{ name: "Atorvastatin 10mg", qty: 10, issued: 0 }, { name: "Pan-D", qty: 10, issued: 0 }] },
  { id: "IND-4006", wardId: "W-MAT", wardName: "Maternity Ward", patient: "Bed 3 · Priya N.", bed: "MAT-3", requestedBy: "Sr. Reena", status: "issued", minsAgo: 220,
    items: [{ name: "Shelcal 500", qty: 30, issued: 30 }, { name: "Folic Acid 5mg", qty: 30, issued: 30 }, { name: "Iron Sucrose Injection", qty: 3, issued: 3 }] },
  { id: "IND-4002", wardId: "W-PED", wardName: "Pediatric Ward", patient: "Bed 6 · Aarav (peds)", bed: "PED-6", requestedBy: "Dr. Iyer", status: "issued", minsAgo: 320,
    items: [{ name: "Paracetamol Syrup 60ml", qty: 4, issued: 4 }, { name: "Amoxyclav Syrup", qty: 2, issued: 2 }] },
];

export function resolveSeedIndents(now: number): WardIndent[] {
  return SEED_INDENTS.map(({ minsAgo, ...rest }) => ({ ...rest, at: now - minsAgo * 60000 }));
}

// ── departments & doctors (OPD) ─────────────────────────────────
export type Doctor = { name: string; specialty: string; opdRoom?: string; phone?: string };
export type Department = {
  id: string;
  name: string;
  head: string;
  type: "OPD" | "IPD" | "Diagnostic" | "Support";
  emoji: string;
  doctors: Doctor[];
};

// ── doctor directory (full profiles, with photo) ────────────────
export type DoctorStatus = "active" | "on-leave" | "visiting";
export type DoctorProfile = {
  id: string;
  name: string;
  photo?: string;          // data URL (uploaded), else emoji avatar
  emoji: string;           // fallback avatar
  gender: "Male" | "Female" | "Other";
  qualification: string;   // MBBS, MD, MS, DM, DNB…
  specialty: string;
  department: string;      // department name
  regNo: string;           // state medical council registration no.
  experience: number;      // years
  phone: string;
  email: string;
  opdRoom: string;
  days: string;            // consulting days, e.g. "Mon–Sat"
  timing: string;          // consulting hours, e.g. "10:00 AM – 1:00 PM"
  fee: number;             // consultation fee ₹
  languages: string;       // comma-separated
  status: DoctorStatus;
  bio: string;
};

export const DOCTOR_STATUS_META: Record<DoctorStatus, { label: string; tone: string }> = {
  active: { label: "Available", tone: "green" },
  "on-leave": { label: "On leave", tone: "rose" },
  visiting: { label: "Visiting", tone: "blue" },
};
export const DOCTOR_SPECIALTIES = [
  "General Physician", "Diabetologist", "Cardiologist", "General Surgeon", "Orthopaedic Surgeon",
  "Pediatrician", "Obstetrician & Gynaecologist", "Dermatologist", "ENT Surgeon", "Ophthalmologist",
  "Neurologist", "Nephrologist", "Urologist", "Pulmonologist", "Psychiatrist", "Radiologist",
  "Pathologist", "Anaesthesiologist", "Dentist", "Physiotherapist",
];

export const SEED_DOCTORS: DoctorProfile[] = [
  { id: "DR-001", name: "Dr. R. Menon", emoji: "👨‍⚕️", gender: "Male", qualification: "MBBS, MD (General Medicine)", specialty: "General Physician", department: "General Medicine", regNo: "KMC-58820", experience: 18, phone: "+91 98450 11223", email: "r.menon@citycare.in", opdRoom: "OPD-1", days: "Mon–Sat", timing: "9:30 AM – 1:00 PM", fee: 600, languages: "English, Hindi, Kannada", status: "active", bio: "Senior physician — internal medicine, diabetes & hypertension." },
  { id: "DR-002", name: "Dr. S. Banerjee", emoji: "👩‍⚕️", gender: "Female", qualification: "MBBS, MD, DM (Endocrinology)", specialty: "Diabetologist", department: "General Medicine", regNo: "KMC-61190", experience: 12, phone: "+91 98451 22330", email: "s.banerjee@citycare.in", opdRoom: "OPD-2", days: "Mon, Wed, Fri", timing: "11:00 AM – 2:00 PM", fee: 700, languages: "English, Hindi, Bengali", status: "active", bio: "Diabetes, thyroid & hormonal disorders." },
  { id: "DR-003", name: "Dr. A. Kapoor", emoji: "👨‍⚕️", gender: "Male", qualification: "MBBS, MS (General Surgery)", specialty: "General Surgeon", department: "General Surgery", regNo: "KMC-49021", experience: 22, phone: "+91 98452 33441", email: "a.kapoor@citycare.in", opdRoom: "OPD-5", days: "Tue, Thu, Sat", timing: "10:00 AM – 12:30 PM", fee: 800, languages: "English, Hindi", status: "active", bio: "Laparoscopic & general surgery, 5000+ procedures." },
  { id: "DR-004", name: "Dr. M. Iyer", emoji: "👨‍⚕️", gender: "Male", qualification: "MBBS, DCH, MD (Pediatrics)", specialty: "Pediatrician", department: "Pediatrics", regNo: "KMC-55712", experience: 15, phone: "+91 98860 33445", email: "m.iyer@citycare.in", opdRoom: "OPD-3", days: "Mon–Sat", timing: "5:00 PM – 8:00 PM", fee: 550, languages: "English, Tamil, Kannada", status: "active", bio: "Child health, vaccination & neonatal care." },
  { id: "DR-005", name: "Dr. P. Sharma", emoji: "👩‍⚕️", gender: "Female", qualification: "MBBS, MS (OBG)", specialty: "Obstetrician & Gynaecologist", department: "Obstetrics & Gynaecology", regNo: "KMC-60044", experience: 14, phone: "+91 98453 55667", email: "p.sharma@citycare.in", opdRoom: "OPD-4", days: "Mon–Fri", timing: "10:00 AM – 1:00 PM", fee: 700, languages: "English, Hindi", status: "on-leave", bio: "High-risk pregnancy, laparoscopy & infertility." },
  { id: "DR-006", name: "Dr. V. Desai", emoji: "👨‍⚕️", gender: "Male", qualification: "MBBS, MD, DM (Cardiology)", specialty: "Cardiologist", department: "Cardiology", regNo: "KMC-47780", experience: 20, phone: "+91 98454 77889", email: "v.desai@citycare.in", opdRoom: "OPD-6", days: "Wed, Sat", timing: "2:00 PM – 5:00 PM", fee: 900, languages: "English, Hindi, Marathi", status: "visiting", bio: "Interventional cardiology, angioplasty & echo." },
];

export const blankDoctor = (): Omit<DoctorProfile, "id"> => ({
  name: "", photo: undefined, emoji: "👨‍⚕️", gender: "Male", qualification: "", specialty: DOCTOR_SPECIALTIES[0],
  department: "", regNo: "", experience: 0, phone: "", email: "", opdRoom: "", days: "Mon–Sat",
  timing: "10:00 AM – 1:00 PM", fee: 500, languages: "English", status: "active", bio: "",
});

// ── insurance / TPA claims ──────────────────────────────────────
export type ClaimType = "Cashless" | "Reimbursement";
export type ClaimStatus = "submitted" | "query" | "approved" | "settled" | "rejected";
export type TpaClaim = {
  id: string;
  patient: string;
  billId?: string;
  payer: string;            // insurer / TPA name
  policyNo: string;
  claimType: ClaimType;
  amount: number;           // claimed ₹
  approvedAmount?: number;  // sanctioned ₹
  status: ClaimStatus;
  at: number;
};
type SeedClaim = Omit<TpaClaim, "at"> & { minsAgo: number };

export const CLAIM_STATUS_META: Record<ClaimStatus, { label: string; tone: string }> = {
  submitted: { label: "Submitted", tone: "blue" },
  query: { label: "Query raised", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  settled: { label: "Settled", tone: "green" },
  rejected: { label: "Rejected", tone: "rose" },
};

const SEED_CLAIMS: SeedClaim[] = [
  { id: "CLM-7781", patient: "Mohan Das", billId: "INV-2601", payer: "Star Health (Medi Assist)", policyNo: "STAR/2024/889120", claimType: "Cashless", amount: 84500, status: "submitted", minsAgo: 90 },
  { id: "CLM-7779", patient: "Asha Devi", billId: "INV-2598", payer: "Ayushman Bharat (PM-JAY)", policyNo: "PMJAY-AS-44192", claimType: "Cashless", amount: 21800, approvedAmount: 21800, status: "approved", minsAgo: 240 },
  { id: "CLM-7775", patient: "Priya N.", billId: "INV-2590", payer: "ICICI Lombard", policyNo: "ILOM/77/210034", claimType: "Reimbursement", amount: 39400, status: "query", minsAgo: 1440 },
  { id: "CLM-7770", patient: "Rakesh K.", billId: "INV-2581", payer: "Niva Bupa (Vidal)", policyNo: "NB/HE/5521903", claimType: "Cashless", amount: 56200, approvedAmount: 51000, status: "settled", minsAgo: 4320 },
  { id: "CLM-7762", patient: "Sunita M.", billId: "INV-2566", payer: "HDFC Ergo", policyNo: "HDFC/OPD/889", claimType: "Reimbursement", amount: 12300, status: "rejected", minsAgo: 7200 },
];

export function resolveSeedClaims(now: number): TpaClaim[] {
  return SEED_CLAIMS.map(({ minsAgo, ...rest }) => ({ ...rest, at: now - minsAgo * 60000 }));
}

export const INSURERS = [
  "Star Health (Medi Assist)", "Ayushman Bharat (PM-JAY)", "ICICI Lombard", "Niva Bupa (Vidal)",
  "HDFC Ergo", "Care Health", "New India Assurance", "Aditya Birla Health", "Tata AIG", "Other / Self-pay",
];

// ── in-patient bill settlement (Active Patients / Unsettled bills) ──
// Sources that belong to an admitted patient — these bills can carry a
// Patient ID (UHID/IP no.) and are settled together (e.g. at discharge).
export const IN_PATIENT_SOURCES: SaleSource[] = ["ward", "emergency"];
export const isInPatientSale = (s: Sale) => !!s.patientId || IN_PATIENT_SOURCES.includes(saleSourceOf(s));
const billTotal = (s: Sale) => computeInvoice(s.items, s.discount).payable;

export type PatientGroup = {
  key: string;
  patientId: string;       // UHID/IP no., or "" if none recorded
  name: string;
  ward: string;
  source: SaleSource;
  bills: Sale[];
  total: number;           // sum of all bills
  paid: number;            // already-settled amount
  outstanding: number;     // unsettled amount
  unsettled: number;       // count of unpaid bills
  lastAt: number;
};

// Group in-patient bills by patient (by Patient ID when present, else name+ward).
export function buildPatientLedger(sales: Sale[]): PatientGroup[] {
  const map = new Map<string, PatientGroup>();
  for (const s of sales) {
    if (s.status === "cancelled" || !isInPatientSale(s)) continue;
    const key = s.patientId?.trim() || `${s.customer.name}|${s.ward ?? ""}`;
    const amt = billTotal(s);
    const unpaid = s.paid === false;
    let g = map.get(key);
    if (!g) {
      g = { key, patientId: s.patientId ?? "", name: s.customer.name, ward: s.ward ?? "—", source: saleSourceOf(s), bills: [], total: 0, paid: 0, outstanding: 0, unsettled: 0, lastAt: 0 };
      map.set(key, g);
    }
    g.bills.push(s);
    g.total += amt;
    if (unpaid) { g.outstanding += amt; g.unsettled += 1; } else g.paid += amt;
    if (s.createdAt > g.lastAt) { g.lastAt = s.createdAt; g.name = s.customer.name; g.ward = s.ward ?? g.ward; }
  }
  return Array.from(map.values())
    .map((g) => ({ ...g, bills: g.bills.sort((a, b) => b.createdAt - a.createdAt) }))
    .sort((a, b) => (b.outstanding - a.outstanding) || (b.lastAt - a.lastAt));
}

// ── small shared helpers ────────────────────────────────────────
export const bedOccupancy = (wards: Ward[]) => {
  const beds = wards.reduce((a, w) => a + w.beds, 0);
  const occ = wards.reduce((a, w) => a + w.occupied, 0);
  return { beds, occ, free: beds - occ, pct: beds ? Math.round((occ / beds) * 100) : 0 };
};
