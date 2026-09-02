import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export interface WorkflowAction {
  actionKey: string;
  moduleCode: string;
  unit: string;
  label: string;
  thresholdUnit: string;
}

export interface WorkflowRule {
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

export interface SignOffRequest {
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

export interface PlatformAuditEvent {
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

export async function listWorkflowActions(): Promise<WorkflowAction[]> {
  const { data } = await apiClient.get<{ actions: WorkflowAction[] }>(API.APPROVAL_ACTIONS);
  return data.actions;
}

export async function listWorkflowRules(): Promise<WorkflowRule[]> {
  const { data } = await apiClient.get<{ rules: WorkflowRule[] }>(API.APPROVAL_RULES);
  return data.rules;
}

export async function createWorkflowRule(body: {
  moduleCode: string;
  actionKey: string;
  thresholdValue: number | null;
  approverType: string;
  approverAccountClass?: string | null;
  approverRoleId?: string | null;
  allowSelfApproval: boolean;
}): Promise<WorkflowRule> {
  const { data } = await apiClient.post<WorkflowRule>(API.APPROVAL_RULES, body);
  return data;
}

export async function listHqSignOffs(): Promise<SignOffRequest[]> {
  const { data } = await apiClient.get<{ requests: SignOffRequest[] }>(API.APPROVAL_PENDING);
  return data.requests;
}

export async function decideHqSignOff(
  id: string,
  outcome: 'APPROVED' | 'REJECTED',
  version: number,
  note?: string,
): Promise<SignOffRequest> {
  const { data } = await apiClient.post<SignOffRequest>(`${API.APPROVAL_REQUESTS}/${id}/decide`, {
    outcome,
    version,
    note,
  });
  return data;
}

export async function listPlatformActivity(): Promise<PlatformAuditEvent[]> {
  const { data } = await apiClient.get<{ events: PlatformAuditEvent[] }>(API.AUDIT);
  return data.events;
}
