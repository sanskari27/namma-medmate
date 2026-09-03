import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/axios';

vi.mock('@/services/axios', async () => {
  const actual = await vi.importActual<typeof import('@/services/axios')>('@/services/axios');
  return {
    ...actual,
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    },
  };
});

import { apiClient } from '@/services/axios';
import { listBranches, createBranch, copyBranchSettings } from '@/services/branches';

const getMock = vi.mocked(apiClient.get);
const postMock = vi.mocked(apiClient.post);

describe('branches service', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it('lists branches from /api/v1/branches', async () => {
    getMock.mockResolvedValue({ data: { items: [] } });
    await listBranches();
    expect(getMock).toHaveBeenCalledWith('/api/v1/branches');
  });

  it('creates a branch', async () => {
    postMock.mockResolvedValue({ data: { id: 'b1' } });
    await createBranch({
      name: 'Main',
      addressLine: '1',
      city: 'Bengaluru',
      state: 'KA',
      pincode: '560001',
      contactPhone: '9876543210',
      drugLicenseNumber: 'DL-1',
      branchType: 'RETAIL',
    });
    expect(postMock).toHaveBeenCalled();
  });

  it('copies settings snapshot', async () => {
    postMock.mockResolvedValue({ data: { id: 'b2' } });
    await copyBranchSettings('b2', 'b1');
    expect(postMock).toHaveBeenCalledWith('/api/v1/branches/b2/copy-settings', {
      sourceBranchId: 'b1',
    });
  });

  it('exposes ApiError helper', () => {
    expect(new ApiError('x', 500, 'y')).toBeInstanceOf(Error);
  });
});
