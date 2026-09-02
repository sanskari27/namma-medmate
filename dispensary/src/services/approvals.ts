import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export interface ApprovalAction {
  actionKey: string;
  moduleCode: string;
  unit: string;
  label: string;
  thresholdUnit: string;
}

export interface ApprovalRule {
  id: string;
  tenantId: string | null;
  scope: string;
  moduleCode: string;
  actionKey: string;
  thresholdValue: number | null;
  approverType: 'ACCOUNT_CLASS' | 'ACCESS_ROLE';
  approverAccountClass: string | null;
  approverRoleId: string | null;
  allowSelfApproval: boolean;
  version: number;
}

export interface ApprovalRequest {
  id: string;
  tenantId: string;
  branchId: string | null;
  ruleId: string;
  requesterUserId: string;
  moduleCode: string;
  actionKey: string;
  amountValue: number | null;
  thresholdSnapshot: number | null;
  ruleVersionSnapshot: number;
  contextJson: string | null;
  status: string;
  version: number;
  createdAt: string;
  decisionOutcome: string | null;
  decisionActorUserId: string | null;
}

export interface AuditEvent {
  id: string;
  userId: string | null;
  tenantId: string | null;
  branchId: string | null;
  action: string;
  outcome: string;
  attemptedIdentity: string | null;
  sourceIp: string | null;
  userAgent: string | null;
  sessionId: string | null;
  contextJson: string | null;
  createdAt: string;
}

export async function listApprovalActions(): Promise<ApprovalAction[]> {
  const { data } = await apiClient.get<{ actions: ApprovalAction[] }>(API.APPROVAL_ACTIONS);
  return data.actions;
}

export async function listApprovalRules(): Promise<ApprovalRule[]> {
  const { data } = await apiClient.get<{ rules: ApprovalRule[] }>(API.APPROVAL_RULES);
  return data.rules;
}

export async function createApprovalRule(body: {
  moduleCode: string;
  actionKey: string;
  thresholdValue: number | null;
  approverType: string;
  approverAccountClass?: string | null;
  approverRoleId?: string | null;
  allowSelfApproval: boolean;
}): Promise<ApprovalRule> {
  const { data } = await apiClient.post<ApprovalRule>(API.APPROVAL_RULES, body);
  return data;
}

export async function listPendingApprovals(): Promise<ApprovalRequest[]> {
  const { data } = await apiClient.get<{ requests: ApprovalRequest[] }>(API.APPROVAL_PENDING);
  return data.requests;
}

export async function decideApproval(
  id: string,
  outcome: 'APPROVED' | 'REJECTED',
  version: number,
  note?: string,
): Promise<ApprovalRequest> {
  const { data } = await apiClient.post<ApprovalRequest>(`${API.APPROVAL_REQUESTS}/${id}/decide`, {
    outcome,
    version,
    note,
  });
  return data;
}

export async function listAuditEvents(): Promise<AuditEvent[]> {
  const { data } = await apiClient.get<{ events: AuditEvent[] }>(API.AUDIT);
  return data.events;
}
