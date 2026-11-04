import type { ApiError, ApiResult, PharmacyOffer } from '@/types';

import {
  mockAddresses,
  mockCategories,
  mockOffers,
  mockPharmacies,
  mockPharmacyStrip,
  mockPriceOverrides,
  mockProducts,
  mockTrendingIds,
  mockUser,
} from './data';

/** Artificial latency so loading states are exercised during development. */
const LATENCY_MS = 250;

type MockBody = Record<string, unknown> | undefined;

interface MockContext {
  body: MockBody;
  query: Record<string, string | number | boolean | undefined> | undefined;
}

type MockHandler = (ctx: MockContext) => unknown | Promise<unknown>;

const notFound = (): ApiError => ({
  code: 'not_found',
  message: 'No mock handler is registered for this endpoint.',
  status: 404,
});

/**
 * Route table for the mock API. Keys are `"METHOD /path"`.
 *
 * When the real backend lands, delete this module and flip
 * `EXPO_PUBLIC_USE_MOCK_API=false` — no caller changes.
 */
const routes: Record<string, MockHandler> = {
  'POST /auth/request-otp': ({ body }) => ({
    phone: body?.phone,
    expiresInSeconds: 30,
  }),

  'POST /auth/verify-otp': ({ body }) => {
    const phone = String(body?.phone ?? '');
    const code = String(body?.code ?? '');
    if (code.length !== 4) {
      throw new MockValidationError('Enter the 4-digit code.');
    }
    return {
      token: `mock_token_${phone}_${Date.now()}`,
      user: { ...mockUser, phone },
    };
  },

  'GET /addresses': () => mockAddresses,

  'GET /pharmacies': () =>
    mockPharmacies.map((pharmacy) => ({
      ...pharmacy,
      stripImages: mockPharmacyStrip[pharmacy.id] ?? [],
    })),

  'GET /pharmacy/:id': ({ query }) => {
    const id = query?.id;
    const found = mockPharmacies.find((p) => p.id === id);
    if (!found) throw new MockNotFoundError('Pharmacy not found.');
    return { ...found, stripImages: mockPharmacyStrip[found.id] ?? [] };
  },

  'GET /products': ({ query }) => {
    const category = query?.category;
    const search = String(query?.search ?? '').toLowerCase();
    const pharmacyId = query?.pharmacyId;
    let items = mockProducts;
    if (category) items = items.filter((p) => p.category === category);
    if (pharmacyId) {
      const storeId = String(pharmacyId);
      items = items.filter((p) => p.pharmacyIds.includes(storeId));
    }
    if (search) {
      items = items.filter((p) =>
        `${p.name} ${p.subtitle ?? ''} ${p.manufacturer}`.toLowerCase().includes(search),
      );
    }

    // Without a category filter the catalogue comes back in popularity
    // order — the listing the home and search screens lead with.
    if (!category) {
      const rank = new Map(mockTrendingIds.map((id, index) => [id, index]));
      items = [...items].sort((a, b) => {
        const left = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const right = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return left - right;
      });
    }

    return items;
  },

  'GET /product/:id': ({ query }) => {
    const id = query?.id;
    const found = mockProducts.find((p) => p.id === id);
    if (!found) throw new MockNotFoundError('Product not found.');
    return found;
  },

  'GET /products/:id/offers': ({ query }) => {
    const id = query?.id;
    const product = mockProducts.find((p) => p.id === id);
    if (!product) throw new MockNotFoundError('Product not found.');

    const overrides = mockPriceOverrides[product.id] ?? {};
    const offers: PharmacyOffer[] = product.pharmacyIds.flatMap((pharmacyId) => {
      const pharmacy = mockPharmacies.find((p) => p.id === pharmacyId);
      if (!pharmacy) return [];
      return [
        {
          pharmacyId,
          productId: product.id,
          price: overrides[pharmacyId] ?? product.sellingPrice,
          deliveryMinutes: pharmacy.deliveryMinutes,
          deliveryFee: pharmacy.deliveryFee ?? 0,
        },
      ];
    });

    // Fastest first — the detail screen leads with the quickest delivery.
    return offers.sort((a, b) => a.deliveryMinutes - b.deliveryMinutes);
  },

  'GET /categories': () => mockCategories,

  'GET /offers': () => mockOffers,
};

class MockValidationError extends Error {
  readonly code = 'validation' as const;
}
class MockNotFoundError extends Error {
  readonly code = 'not_found' as const;
}

/** Resolve `:param` placeholders in the route table against the query. */
function matchRoute(
  method: string,
  path: string,
): { handler: MockHandler; params: Record<string, string> } | null {
  const direct = routes[`${method} ${path}`];
  if (direct) return { handler: direct, params: {} };

  for (const [key, handler] of Object.entries(routes)) {
    const [routeMethod, routePath] = key.split(' ');
    if (routeMethod !== method || !routePath) continue;
    if (!routePath.includes(':')) continue;

    const routeParts = routePath.split('/');
    const pathParts = path.split('/');
    if (routeParts.length !== pathParts.length) continue;

    const params: Record<string, string> = {};
    const matched = routeParts.every((part, index) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = pathParts[index] ?? '';
        return true;
      }
      return part === pathParts[index];
    });

    if (matched) return { handler, params };
  }

  return null;
}

export async function mockRequest<T>(
  method: string,
  path: string,
  options: {
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
  } = {},
): Promise<ApiResult<T>> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const match = matchRoute(method, path);
  if (!match) return { ok: false, error: notFound() };

  try {
    const data = await match.handler({
      body: options.body as MockBody,
      query: { ...options.query, ...match.params },
    });
    return { ok: true, data: data as T };
  } catch (error) {
    if (error instanceof MockValidationError || error instanceof MockNotFoundError) {
      return {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          status: error.code === 'validation' ? 422 : 404,
        },
      };
    }
    return {
      ok: false,
      error: { code: 'unknown', message: 'Something went wrong in the mock layer.' },
    };
  }
}
