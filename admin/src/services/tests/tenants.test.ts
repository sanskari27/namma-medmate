import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API } from '@/libs/constants/api.const';

vi.mock('@/services/axios', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
  isApiError: (error: unknown) =>
    Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error),
}));

import { apiClient } from '@/services/axios';
import { listTenants, updateTenantStatus } from '@/services/tenants';

const getMock = vi.mocked(apiClient.get);
const postMock = vi.mocked(apiClient.post);

describe('admin tenants service', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it('lists pharmacies from the admin tenants API', async () => {
    getMock.mockResolvedValue({
      data: {
        items: [
          {
            id: 't1',
            name: 'Varshmaan',
            slug: 'varshmaan',
            status: 'ACTIVE',
            updatedAt: '2026-09-03T00:00:00Z',
            allowedTransitions: ['SUSPENDED', 'EXPIRED', 'TERMINATED'],
          },
        ],
      },
    });

    const items = await listTenants();
    expect(getMock).toHaveBeenCalledWith(API.ADMIN_TENANTS);
    expect(items[0]?.name).toBe('Varshmaan');
  });

  it('posts a status transition with expected status and reason', async () => {
    postMock.mockResolvedValue({
      data: {
        id: 't1',
        name: 'Varshmaan',
        slug: 'varshmaan',
        status: 'SUSPENDED',
        updatedAt: '2026-09-03T01:00:00Z',
        allowedTransitions: ['ACTIVE', 'TERMINATED'],
      },
    });

    const next = await updateTenantStatus('t1', 'SUSPENDED', 'ACTIVE', 'Compliance hold');
    expect(postMock).toHaveBeenCalledWith(`${API.ADMIN_TENANTS}/t1/status`, {
      status: 'SUSPENDED',
      expectedStatus: 'ACTIVE',
      reason: 'Compliance hold',
    });
    expect(next.status).toBe('SUSPENDED');
  });
});
