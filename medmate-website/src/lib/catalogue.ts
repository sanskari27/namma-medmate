// Medicine catalogue shared with the app (copied by scripts/sync-from-app.mjs).
import catalogue from "./catalogue.json";
import compliance from "./compliance.json";
import detailsJson from "./details.json";

export type Pack = { label: string; color: string; kind?: "box" | "bottle" | "device" };
export type Product = {
  id: string;
  name: string;
  sub: string;
  comp: string;
  form: string;
  brand: string;
  cat: string;
  price: number;
  mrp: number;
  rx?: boolean;
  img?: string;
  pack?: Pack;
  use?: string;
};
export type Details = {
  kind: "drug" | "otc";
  pack?: string;
  mrp?: number;
  images?: string[];
  intro?: string;
  uses?: string[];
  benefits?: string;
  howToUse?: string;
  howItWorks?: string;
  sideEffects?: string[];
  safety?: Record<string, string>;
  safetyNotes?: Record<string, string>;
  ifMiss?: string;
  storage?: string;
  facts?: Record<string, string>;
  faq?: [string, string][];
  interactions?: string[];
  highlights?: string[];
  ingredients?: string;
  safetyInfo?: string;
  marketer?: string;
  origin?: string;
};

/** Same compliance overrides as the app (compliance.json), and sample-only items (no brand or composition) stay off the website. */
const HIDDEN = new Set(Object.values(compliance.hidden as Record<string, string[]>).flat());
const RX_ONLY = new Set(compliance.rx);
export const PRODUCTS = (catalogue as Product[])
  .filter((p) => !HIDDEN.has(p.id) && !compliance.hiddenCategories.includes(p.cat) && p.brand)
  .map((p) => (RX_ONLY.has(p.id) ? { ...p, rx: true } : p));
const DETAILS = detailsJson as unknown as Record<string, Details>;
export const details = (id: string): Details | undefined => DETAILS[id];

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");

/** Category id (as in the app), display name and a one-line description for its landing page. */
const CATS: [string, string, string][] = [
  ["fever", "Fever & Pain", "Tablets, syrups and gels for fever, headache, body ache, joint and muscle pain."],
  ["cold", "Cough & Cold", "Cough syrups, lozenges, decongestants and allergy relief for the whole family."],
  ["stomach", "Stomach Care", "Antacids, digestives and medicines for acidity, gas, constipation and loose motions."],
  ["antibiotic", "Antibiotics", "Prescription antibiotics and anti-infectives, checked by a pharmacist before dispatch."],
  ["diabetes", "Diabetes Care", "Diabetes medicines, glucometers and test strips, with refill reminders in the app."],
  ["heart", "Heart & BP", "Blood pressure, cholesterol and heart medicines from licensed pharmacies near you."],
  ["vitamins", "Vitamins & Supplements", "Multivitamins, minerals and daily supplements."],
  ["skin", "Skin Care", "Creams, ointments and lotions for skin infections, dryness and irritation."],
  ["baby", "Baby Care", "Baby essentials and paediatric medicines."],
  ["devices", "Health Devices", "BP monitors, glucometers, thermometers and other home health devices."],
  ["personal", "Personal Care", "Everyday personal care and hygiene products."],
  ["wellness", "Sexual Wellness", "Sexual wellness products, delivered discreetly."],
  ["injection", "Injections", "Prescription injections, dispensed against a valid prescription."],
  ["ayush", "Ayurveda", "Ayurvedic medicines and wellness products."],
  ["firstaid", "First Aid", "Antiseptics, bandages and first-aid essentials."],
  ["eye", "Eye Care", "Eye drops and eye care products."],
  ["women", "Women’s Health", "Products for women’s health and hygiene."],
  ["elderly", "Elderly Care", "Medicines and care products for older family members."],
  ["respiratory", "Respiratory Care", "Inhalers, nebuliser solutions and medicines for asthma and breathing problems."],
  ["immunity", "Immunity", "Immunity boosters and supplements."],
  ["hair", "Hair Care", "Hair care and scalp treatments."],
  ["surgical", "Surgical Supplies", "Surgical and medical supplies for home care."],
  ["sports", "Sports Nutrition", "Protein and sports nutrition."],
  ["neuro", "Brain & Nerves", "Prescription medicines for epilepsy, nerve pain, anxiety and other neurological conditions."],
  ["hormones", "Hormones & Steroids", "Prescription hormone and steroid medicines."],
  ["homeopathy", "Homeopathy", "Homeopathic dilutions, mother tinctures and remedies."],
  ["health", "Health & Wellness", "Everyday health and wellness products."],
  ["pet", "Pet Care", "Medicines and care products for pets."],
  ["other", "More Medicines", "More medicines from licensed pharmacies near you."],
];

/** Pack shown on a category tile when the first photo is not the most recognisable one. */
const COVERS: Record<string, string> = { fever: "ab73", stomach: "ab78", devices: "DR059078" };

export type Category = { id: string; slug: string; name: string; blurb: string; products: Product[]; cover: Product };
export const CATEGORIES: Category[] = CATS.map(([id, name, blurb]) => {
  const products = PRODUCTS.filter((p) => p.cat === id).sort((a, b) => Number(!!b.img) - Number(!!a.img) || a.name.localeCompare(b.name));
  const cover = products.find((p) => p.id === COVERS[id]) ?? products[0];
  return { id, slug: slugify(name), name, blurb, products, cover };
}).filter((c) => c.products.length > 0);
export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);
export const categoryOf = (p: Product) => CATEGORIES.find((c) => c.id === p.cat)!;

/** Readable product URLs; a duplicate name gets its id appended. */
const SLUGS = new Map<string, string>();
const seen = new Set<string>();
for (const p of PRODUCTS) {
  let s = slugify(p.name) || p.id.toLowerCase();
  if (seen.has(s)) s = `${s}-${p.id.toLowerCase()}`;
  seen.add(s);
  SLUGS.set(p.id, s);
}
export const productSlug = (p: Product) => SLUGS.get(p.id)!;
export const productHref = (p: Product) => `/medicine/${productSlug(p)}`;
export const productBySlug = (slug: string) => PRODUCTS.find((p) => SLUGS.get(p.id) === slug);

/** Early sample items (ids p*, w*) have only a name, a short line and an MRP: no brand, form or composition.
 *  Their pages stay reachable but are kept out of search results until the full listing exists. */
export const isThin = (p: Product) => !p.brand;

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

/** Same active ingredients and strength: the usual substitutes a pharmacist can offer (with consent). */
export const sameSalt = (p: Product) =>
  isThin(p) ? [] : PRODUCTS.filter((x) => x.id !== p.id && !isThin(x) && x.comp && x.comp.toLowerCase() === p.comp.toLowerCase());

/** Products shown on Home: everyday, non-prescription items with real photos. */
const POPULAR_IDS = ["ab73", "ab72", "ab62", "ab78", "DR071919", "ab117", "DR059078", "DR106559", "DR070551", "ab63", "DR132564", "DR125501"];
export const POPULAR = POPULAR_IDS.map((id) => PRODUCTS.find((p) => p.id === id)).filter((p): p is Product => !!p);

const plain = (s: string) => s.replace(/\s+/g, " ").trim();
/** Short description for meta tags and cards. */
export function summary(p: Product, max = 155) {
  const d = details(p.id);
  const parts = [
    isThin(p) ? `${p.name}, ${p.sub.toLowerCase()}.` : `${p.name}${p.comp && p.comp !== p.name ? ` (${p.comp})` : ""} by ${p.brand}.`,
    p.use ? `Used for ${p.use.replace(/^Treatment of /i, "").toLowerCase()}.` : "",
    `MRP ${inr(d?.mrp ? Math.round(d.mrp) : p.mrp)}${d?.pack ? ` for ${d.pack}` : ""}.`,
    p.rx ? "Prescription required." : "",
    "Medicine information from MedMate, Bengaluru.",
  ];
  let out = "";
  for (const s of parts.filter(Boolean)) {
    if ((out + " " + s).trim().length > max) break;
    out = (out + " " + s).trim();
  }
  return plain(out);
}
