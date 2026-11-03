import type { Address, Category, Pharmacy, PharmacyOffer } from '@/types';

import { mockRequest } from './mocks';

/**
 * The mock layer stands in for the API until the backend lands. These tests
 * keep its contract honest, so swapping it for the real service is a
 * no-op for callers.
 */
describe('mock API', () => {
  it('serves the saved addresses', async () => {
    const result = await mockRequest<Address[]>('GET', '/addresses');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
    }
  });

  it('resolves a path parameter', async () => {
    const result = await mockRequest<Pharmacy>('GET', '/pharmacy/hf');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe('hf');
    }
  });

  it('reports a not-found error for an unknown pharmacy', async () => {
    const result = await mockRequest('GET', '/pharmacy/nope');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_found');
    }
  });

  it('rejects a code that is not four digits', async () => {
    const result = await mockRequest('POST', '/auth/verify-otp', {
      body: { phone: '9876543210', code: '12' },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('validation');
    }
  });

  it('issues a session for a four-digit code', async () => {
    const result = await mockRequest<{ token: string }>('POST', '/auth/verify-otp', {
      body: { phone: '9876543210', code: '1234' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.token).toContain('mock_token');
    }
  });

  it('filters the catalogue by category', async () => {
    const result = await mockRequest<{ category: string }[]>('GET', '/products', {
      query: { category: 'fever' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.every((product) => product.category === 'fever')).toBe(true);
    }
  });

  it('filters the catalogue by store', async () => {
    const result = await mockRequest<{ pharmacyIds: string[] }[]>('GET', '/products', {
      query: { pharmacyId: 'hf' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((product) => product.pharmacyIds.includes('hf'))).toBe(
        true,
      );
    }
  });

  it('serves the stores that carry a product, fastest first', async () => {
    const result = await mockRequest<PharmacyOffer[]>(
      'GET',
      '/products/DRS003256/offers',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((offer) => offer.productId === 'DRS003256')).toBe(true);

      const minutes = result.data.map((offer) => offer.deliveryMinutes);
      expect([...minutes].sort((a, b) => a - b)).toEqual(minutes);
    }
  });

  it('applies the per-store price override', async () => {
    const result = await mockRequest<PharmacyOffer[]>(
      'GET',
      '/products/DRS003256/offers',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      const healthFirst = result.data.find((offer) => offer.pharmacyId === 'hf');
      expect(healthFirst?.price).toBe(48);
    }
  });

  it('serves the category list', async () => {
    const result = await mockRequest<Category[]>('GET', '/categories');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThan(8);
      expect(result.data[0]?.id).toBe('fever');
    }
  });
});
