import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';
import type { AssignedBranch } from '@/store';

export interface SessionBranchResponse {
  activeBranchId: string | null;
  branches: AssignedBranch[];
}

export async function switchSessionBranch(branchId: string | null): Promise<SessionBranchResponse> {
  const { data } = await apiClient.post<SessionBranchResponse>(API.SESSION_BRANCH, { branchId });
  return data;
}
