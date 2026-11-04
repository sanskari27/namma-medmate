/**
 * Shared domain types.
 *
 * These mirror the MedMate product domain and are the contract the backend
 * will implement later. Frontend-only work uses the mock service layer, but
 * every screen and store already speaks these shapes.
 */

/* --------------------------------- user --------------------------------- */

export interface User {
  id: string;
  phone: string;
  name?: string;
  isAdultConfirmed: boolean;
  memberSince?: string;
}

/* ------------------------------- address -------------------------------- */

export type AddressLabel = 'home' | 'work' | 'other';

export interface Address {
  id: string;
  label: AddressLabel;
  title: string;
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

/* ------------------------------- pharmacy -------------------------------- */

export interface Pharmacy {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  address: string;
  distanceKm: number;
  deliveryMinutes: number;
  rating: number;
  /** e.g. "2.1K+" — how many customers served. */
  reviewCount?: string;
  /** e.g. "11 pm" — closing time shown on the pharmacy header. */
  openUntil?: string;
  /** Delivery charge in rupees; 0 means free delivery. */
  deliveryFee?: number;
  phone?: string;
  imageUrl?: string;
  /** Store carries a promoted placement in the nearby list. */
  isPromoted?: boolean;
  /** Free delivery with no minimum order value. */
  freeDelivery?: boolean;
  /** Offer codes that apply at this store. */
  offerCodes?: string[];
  /** Photos shown in the pharmacy card's image strip. */
  stripImages?: string[];
}

/* ----------------------------- pharmacy offer ---------------------------- */

/**
 * A product offered by a specific store.
 *
 * Price, delivery time and delivery fee are properties of the *offer*, not of
 * the product — two stores can price the same medicine differently.
 */
export interface PharmacyOffer {
  pharmacyId: string;
  productId: string;
  price: number;
  deliveryMinutes: number;
  deliveryFee: number;
}

/* -------------------------------- category ------------------------------- */

export interface Category {
  id: string;
  label: string;
  /** Remote image the backend serves for the tile. */
  imageUrl?: string;
  /** Number of products in the category, when known. */
  productCount?: number;
}

/* -------------------------------- product -------------------------------- */

/**
 * Category slug.
 *
 * The catalogue carries ~34 categories and grows with the business, so the
 * slug is a plain string rather than a closed union — the category list is
 * data, not code.
 */
export type ProductCategory = string;

export interface Product {
  id: string;
  name: string;
  brand: string;
  manufacturer: string;
  category: ProductCategory;
  /** Composition / pack description shown under the name. */
  packSize: string;
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  requiresPrescription: boolean;
  isGenuine: boolean;
  imageUrl?: string;
  /** Short line under the product name, e.g. "Omeprazole 20mg". */
  subtitle?: string;
  /** Free-form tags rendered as pills ("Pain relief", "Genuine"). */
  tags?: string[];
  /** Pack / form / storage rows shown on the Rx product detail. */
  pack?: string;
  form?: string;
  storage?: string;
  rating?: number;
  reviewCount?: number;
  pharmacyIds: string[];
}

/* ---------------------------------- cart --------------------------------- */

export interface CartLine {
  productId: string;
  quantity: number;
  pharmacyId: string;
}

export interface CartSummary {
  lines: CartLine[];
  itemCount: number;
  mrpTotal: number;
  payableTotal: number;
  savings: number;
}

/* --------------------------------- order --------------------------------- */

export type OrderStatus = 'active' | 'past';

export interface Order {
  id: string;
  placedAt: string;
  pharmacyId: string;
  pharmacyName: string;
  status: OrderStatus;
  itemCount: number;
  total: number;
  etaMinutes?: number;
}

/* ----------------------------- prescription ------------------------------ */

export interface Prescription {
  id: string;
  uploadedAt: string;
  imageCount: number;
  status: 'reviewing' | 'ready' | 'ordered';
  pharmacyId?: string;
}

/* --------------------------------- offer --------------------------------- */

export interface Offer {
  id: string;
  title: string;
  code: string;
  discountPercent: number;
  description: string;
  appliesTo: 'order' | 'delivery';
}

/* ------------------------------- schedule -------------------------------- */

export interface Dose {
  id: string;
  medicineName: string;
  dose: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  taken: boolean;
}
