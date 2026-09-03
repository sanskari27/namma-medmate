import { describe, expect, it, vi } from 'vitest';
import { switchSessionBranch } from '@/services/sessionBranch';
import { listUserBranches, replaceUserBranches } from '@/services/userBranches';
import { apiClient } from '@/services/axios';

vi.mock('@/services/axios', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

describe('userBranches service', () => {
  it('lists and replaces user outlets', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { userId: 'u1', branches: [] },
    });
    vi.mocked(apiClient.put).mockResolvedValueOnce({
      data: {
        userId: 'u1',
        branches: [{ id: 'b1', name: 'Main', branchCode: 'BR01', status: 'ACTIVE' }],
      },
    });

    await listUserBranches('u1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/users/u1/branches');

    await replaceUserBranches('u1', ['b1']);
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/users/u1/branches', { branchIds: ['b1'] });
  });
});

describe('sessionBranch service', () => {
  it('posts active outlet switch including consolidated null', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { activeBranchId: null, branches: [] },
    });
    await switchSessionBranch(null);
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/session/branch', { branchId: null });
  });
});
