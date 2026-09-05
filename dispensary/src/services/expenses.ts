import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface ExpenseCategory {
  id: string;
  tenantId: string | null;
  code: string;
  label: string;
  system: boolean;
}

export interface ExpenseEvidence {
  id: string;
  contentType: string;
  byteSize: number;
  originalFilename: string;
  uploadedAt: string;
}

export interface ShopExpense {
  id: string;
  tenantId: string;
  branchId: string;
  branchName: string;
  categoryId: string;
  categoryCode: string;
  categoryLabel: string;
  amountPaise: number;
  occurredOn: string;
  notes: string | null;
  currentEvidenceId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  evidence: ExpenseEvidence[];
}

export interface ExpenseTotals {
  totalPaise: number;
  byCategory: Array<{
    categoryId: string;
    code: string;
    label: string;
    totalPaise: number;
  }>;
  byBranch: Array<{ branchId: string; branchName: string; totalPaise: number }>;
}

export interface ExpenseWriteInput {
  categoryId: string;
  amountPaise: number;
  occurredOn: string;
  notes?: string;
  branchId?: string;
  idempotencyKey?: string;
  expectedVersion?: number;
}

export interface ExpenseListQuery {
  scope?: 'tenant';
  branchId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
}

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data } = await apiClient.get<{ items: ExpenseCategory[] }>(API.EXPENSE_CATEGORIES);
  return data.items;
}

export async function createExpenseCategory(input: {
  code: string;
  label: string;
}): Promise<ExpenseCategory> {
  const { data } = await apiClient.post<ExpenseCategory>(API.EXPENSE_CATEGORIES, input);
  return data;
}

export async function listExpenses(query: ExpenseListQuery = {}): Promise<ShopExpense[]> {
  const { data } = await apiClient.get<{ items: ShopExpense[] }>(API.EXPENSES, { params: query });
  return data.items;
}

export async function listExpenseTotals(query: ExpenseListQuery = {}): Promise<ExpenseTotals> {
  const { data } = await apiClient.get<ExpenseTotals>(API.EXPENSES_TOTALS, { params: query });
  return data;
}

export async function createExpense(input: ExpenseWriteInput): Promise<ShopExpense> {
  const { data } = await apiClient.post<ShopExpense>(API.EXPENSES, input);
  return data;
}

export async function updateExpense(id: string, input: ExpenseWriteInput): Promise<ShopExpense> {
  const { data } = await apiClient.patch<ShopExpense>(API.expense(id), input);
  return data;
}

export async function attachExpenseEvidence(id: string, evidence: File): Promise<ShopExpense> {
  const body = new FormData();
  body.append('evidence', evidence);
  const { data } = await apiClient.post<ShopExpense>(`${API.expense(id)}/evidence`, body);
  return data;
}

export function expenseEvidenceUrl(expenseId: string, evidenceId: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${API.expenseEvidence(expenseId, evidenceId)}`;
}
