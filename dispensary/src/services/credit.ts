import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type CreditLedgerType = 'SALE_CHARGE' | 'SETTLEMENT' | 'LIMIT_SET' | 'CREDIT_NOTE';

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
  billCount: number;
  givenPaise: number;
  repaidPaise: number;
  ageDays: number;
}

export interface CreditAgingBand {
  key: string;
  label: string;
  totalPaise: number;
  accountCount: number;
}

export interface CreditDirectorySummary {
  totalOutstandingPaise: number;
  outstandingAccountCount: number;
  overduePaise: number;
  overdueAccountCount: number;
  collectedThisMonthPaise: number;
  collectionRatePercent: number;
  creditGivenAllTimePaise: number;
  khataAccountCount: number;
}

export interface CreditPaymentItem {
  id: string;
  customerId: string;
  customerName: string;
  amountPaise: number;
  mode: string | null;
  reference: string | null;
  receiptLabel: string;
  occurredAt: string;
}

export interface CreditDirectory {
  summary: CreditDirectorySummary;
  aging: CreditAgingBand[];
  items: OutstandingCreditAccount[];
  payments: CreditPaymentItem[];
}

export async function getCustomerCredit(customerId: string): Promise<CustomerCredit> {
  const { data } = await apiClient.get<CustomerCredit>(API.customerCredit(customerId));
  return data;
}

export async function listOutstandingCreditAccounts(): Promise<CreditDirectory> {
  const { data } = await apiClient.get<CreditDirectory>(API.CUSTOMERS_CREDIT_ACCOUNTS);
  return data;
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
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
