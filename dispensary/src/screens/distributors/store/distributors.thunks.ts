import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  createSupplier,
  getSupplierLedger,
  listSupplierDues,
  listSuppliers,
  recordSupplierPayment,
  updateSupplier,
  type RecordSupplierPaymentInput,
  type Supplier,
  type SupplierDueItem,
  type SupplierInput,
  type SupplierLedger,
} from '@/services/suppliers';
import { DISTRIBUTORS_CONTENT } from '../DistributorsScreen.content';
import { mapApiStatus, type DistributorsPageStatus } from '../DistributorsScreen.utils';
import type { RootState } from '@/store';

type Reject = { message: string; status?: DistributorsPageStatus };

export const loadDistributors = createAsyncThunk<
  { items: Supplier[]; dues: SupplierDueItem[]; duesPlanLimit: boolean },
  string | undefined,
  { rejectValue: Reject }
>('distributors/load', async (query, { rejectWithValue }) => {
  try {
    const items = await listSuppliers(query);
    let dues: SupplierDueItem[] = [];
    let duesPlanLimit = false;
    try {
      dues = await listSupplierDues();
    } catch (error) {
      if (isApiError(error) && error.code === 'PLAN_LIMIT') {
        duesPlanLimit = true;
      }
    }
    return { items, dues, duesPlanLimit };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        message: error.message || DISTRIBUTORS_CONTENT.loadFailed,
        status: mapApiStatus(error),
      });
    }
    return rejectWithValue({ message: DISTRIBUTORS_CONTENT.loadFailed, status: 'failure' });
  }
});

export const saveDistributor = createAsyncThunk<
  Supplier,
  { input: SupplierInput; id?: string },
  { rejectValue: Reject }
>('distributors/save', async ({ input, id }, { rejectWithValue }) => {
  try {
    return id ? await updateSupplier(id, input) : await createSupplier(input);
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        message: error.message || DISTRIBUTORS_CONTENT.status.failure,
        status: mapApiStatus(error),
      });
    }
    return rejectWithValue({ message: DISTRIBUTORS_CONTENT.status.failure, status: 'failure' });
  }
});

export const deactivateDistributor = createAsyncThunk<
  Supplier,
  string,
  { state: RootState; rejectValue: Reject }
>('distributors/deactivate', async (id, { getState, rejectWithValue }) => {
  const row = getState().distributors.items.find((item) => item.id === id);
  if (!row) {
    return rejectWithValue({ message: DISTRIBUTORS_CONTENT.status.failure, status: 'failure' });
  }
  try {
    const input: SupplierInput = {
      supplierCode: row.supplierCode,
      legalName: row.legalName,
      tradeName: row.tradeName ?? undefined,
      supplierType: row.supplierType,
      gstin: row.gstin ?? undefined,
      pan: row.pan ?? undefined,
      drugLicenseNumber: row.drugLicenseNumber ?? undefined,
      drugLicenseType: row.drugLicenseType,
      drugLicenseExpiry: row.drugLicenseExpiry ?? undefined,
      fssaiLicenseNumber: row.fssaiLicenseNumber ?? undefined,
      contactPersonName: row.contactPersonName,
      contactPersonRole: row.contactPersonRole ?? undefined,
      phone: row.phone,
      alternatePhone: row.alternatePhone ?? undefined,
      email: row.email ?? undefined,
      website: row.website ?? undefined,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2 ?? undefined,
      city: row.city,
      state: row.state,
      pincode: row.pincode,
      country: row.country,
      paymentTerms: row.paymentTerms,
      creditPeriodDays: row.creditPeriodDays ?? undefined,
      creditLimitPaise: row.creditLimitPaise ?? undefined,
      bankName: row.bankName ?? undefined,
      accountHolderName: row.accountHolderName ?? undefined,
      accountNumber: row.accountNumber ?? undefined,
      confirmAccountNumber: row.accountNumber ?? undefined,
      ifscCode: row.ifscCode ?? undefined,
      upiId: row.upiId ?? undefined,
      categoryIds: [...row.categoryIds],
      status: 'INACTIVE',
      notes: row.notes ?? undefined,
    };
    return await updateSupplier(id, input);
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        message: error.message || DISTRIBUTORS_CONTENT.status.failure,
        status: mapApiStatus(error),
      });
    }
    return rejectWithValue({ message: DISTRIBUTORS_CONTENT.status.failure, status: 'failure' });
  }
});

export const loadDistributorLedger = createAsyncThunk<
  SupplierLedger,
  string,
  { rejectValue: Reject }
>('distributors/loadLedger', async (id, { rejectWithValue }) => {
  try {
    return await getSupplierLedger(id);
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        message: error.message || DISTRIBUTORS_CONTENT.status.failure,
        status: mapApiStatus(error),
      });
    }
    return rejectWithValue({ message: DISTRIBUTORS_CONTENT.status.failure, status: 'failure' });
  }
});

export const payDistributor = createAsyncThunk<
  SupplierLedger,
  { id: string; input: RecordSupplierPaymentInput },
  { rejectValue: Reject }
>('distributors/pay', async ({ id, input }, { rejectWithValue }) => {
  try {
    return await recordSupplierPayment(id, input);
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        message: error.message || DISTRIBUTORS_CONTENT.status.failure,
        status: mapApiStatus(error),
      });
    }
    return rejectWithValue({ message: DISTRIBUTORS_CONTENT.status.failure, status: 'failure' });
  }
});
