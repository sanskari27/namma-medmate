import { request } from './http';
import type {
  ApiResult,
  Category,
  Offer,
  Pharmacy,
  PharmacyOffer,
  Product,
} from '@/types';

export interface ProductQuery {
  category?: string;
  search?: string;
  pharmacyId?: string;
}

/** The catalogue — categories, products, pharmacies and offers. */
export async function fetchProducts(
  query: ProductQuery = {},
): Promise<ApiResult<Product[]>> {
  return request<Product[]>('/products', {
    query: {
      category: query.category,
      search: query.search,
      pharmacyId: query.pharmacyId,
    },
  });
}

export async function fetchProduct(id: string): Promise<ApiResult<Product>> {
  return request<Product>(`/product/${id}`);
}

/**
 * Stores that carry this product, priced per store.
 * Ordered fastest-first by the API; the detail screen shows the first three.
 */
export async function fetchProductOffers(
  id: string,
): Promise<ApiResult<PharmacyOffer[]>> {
  return request<PharmacyOffer[]>(`/products/${id}/offers`);
}

export async function fetchCategories(): Promise<ApiResult<Category[]>> {
  return request<Category[]>('/categories');
}

export async function fetchPharmacies(): Promise<ApiResult<Pharmacy[]>> {
  return request<Pharmacy[]>('/pharmacies');
}

export async function fetchPharmacy(id: string): Promise<ApiResult<Pharmacy>> {
  return request<Pharmacy>(`/pharmacy/${id}`);
}

export async function fetchOffers(): Promise<ApiResult<Offer[]>> {
  return request<Offer[]>('/offers');
}
