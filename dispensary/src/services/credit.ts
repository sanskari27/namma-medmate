import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type CreditLedgerType = 'SALE_CHARGE' | 'SETTLEMENT' | 'LIMIT_SET';

export interface CreditLedgerEntry {
  id: string;
  type: CreditLedgerType;
  amountPaise: number;
  balanceAfterPaise: number;
  invoiceId: string | null;
  settlementMode: string | null;
  settlementReference: string | null;
  occurredAt: string;
}

export interface CustomerCredit {
  customerId: string;
  limitPaise: number;
  balancePaise: number;
  availablePaise: number;
  version: number;
  entries: CreditLedgerEntry[];
}

export interface OutstandingCreditAccount {
  customerId: string;
  customerName: string;
  customerPhone: string;
  limitPaise: number;
  balancePaise: number;
  availablePaise: number;
  version: number;
}

export async function getCustomerCredit(customerId: string): Promise<CustomerCredit> {
  const { data } = await apiClient.get<CustomerCredit>(API.customerCredit(customerId));
  return data;
}

export async function listOutstandingCreditAccounts(): Promise<OutstandingCreditAccount[]> {
  const { data } = await apiClient.get<{ items: OutstandingCreditAccount[] }>(
    API.CUSTOMERS_CREDIT_ACCOUNTS,
  );
  return data.items;
}

export async function setCustomerCreditLimit(
  customerId: string,
  limitPaise: number,
  expectedVersion: number,
): Promise<CustomerCredit> {
  const { data } = await apiClient.put<CustomerCredit>(API.customerCreditLimit(customerId), {
    limitPaise,
    expectedVersion,
  });
  return data;
}

export async function settleCustomerCredit(
  customerId: string,
  input: {
    amountPaise: number;
    mode: string;
    reference?: string;
    idempotencyKey: string;
    expectedVersion: number;
  },
): Promise<CustomerCredit> {
  const { data } = await apiClient.post<CustomerCredit>(
    API.customerCreditSettlements(customerId),
    input,
  );
  return data;
}

export async function chargeCustomerCredit(
  customerId: string,
  input: {
    amountPaise: number;
    invoiceId?: string;
    idempotencyKey: string;
    expectedVersion: number;
  },
): Promise<CustomerCredit> {
  const { data } = await apiClient.post<CustomerCredit>(
    API.customerCreditCharges(customerId),
    input,
  );
  return data;
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}
