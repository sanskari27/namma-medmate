import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';
import type { AssignedBranch } from '@/store';

export interface UserBranchesResponse {
  userId: string;
  branches: AssignedBranch[];
}

export async function listUserBranches(userId: string): Promise<UserBranchesResponse> {
  const { data } = await apiClient.get<UserBranchesResponse>(API.userBranches(userId));
  return data;
}

export async function replaceUserBranches(
  userId: string,
  branchIds: string[],
): Promise<UserBranchesResponse> {
  const { data } = await apiClient.put<UserBranchesResponse>(API.userBranches(userId), {
    branchIds,
  });
  return data;
}
