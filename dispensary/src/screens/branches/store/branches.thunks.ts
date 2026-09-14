import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  copyBranchSettings,
  createBranch,
  isApiError,
  listBranches,
  updateBranch,
  type Branch,
} from '@/services/branches';
import type { RootState } from '@/store';
import type { OutletsStatus } from './branches.slice';

export const loadBranches = createAsyncThunk<Branch[], void, { rejectValue: OutletsStatus }>(
  'branches/load',
  async (_, { rejectWithValue }) => {
    try {
      return await listBranches();
    } catch (error) {
      if (isApiError(error) && error.status === 403) {
        return rejectWithValue('denied');
      }
      return rejectWithValue('failure');
    }
  },
);

export const saveBranch = createAsyncThunk<Branch, void, { state: RootState; rejectValue: OutletsStatus }>(
  'branches/save',
  async (_, { getState, rejectWithValue }) => {
    const screen = getState().branches;
    const form = screen.form;
    if (
      !form.name.trim() ||
      !form.addressLine.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pincode.trim() ||
      !form.contactPhone.trim() ||
      !form.drugLicenseNumber.trim()
    ) {
      return rejectWithValue('validation');
    }
    const payload = {
      name: form.name.trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim() || undefined,
      drugLicenseNumber: form.drugLicenseNumber.trim(),
      gstin: form.gstin.trim() || undefined,
      branchType: form.branchType,
      defaultBranch: form.defaultBranch,
      operatingHours: {
        mon: { open: '09:00', close: '21:00' },
        sun: { closed: true },
      },
      pricingSettings: {
        defaultMarkupBps: Number(form.markupBps) || 0,
        roundToNearestPaise: 1,
      },
      taxSettings: {
        gstMode: 'CGST_SGST',
        defaultGstRateBps: 1200,
        taxState: form.state.trim(),
      },
    };
    try {
      if (screen.creating) {
        return await createBranch(payload);
      }
      if (!screen.selectedId) {
        return rejectWithValue('validation');
      }
      let saved = await updateBranch(screen.selectedId, payload);
      if (form.copyFromId) {
        saved = await copyBranchSettings(screen.selectedId, form.copyFromId);
      }
      return saved;
    } catch (error) {
      if (isApiError(error)) {
        if (error.status === 403) {
          return rejectWithValue('denied');
        }
        if (error.status === 409) {
          return rejectWithValue('conflict');
        }
        if (error.code === 'PLAN_LIMIT') {
          return rejectWithValue('quota');
        }
        if (error.status === 422 || error.status === 400) {
          return rejectWithValue('validation');
        }
      }
      return rejectWithValue('failure');
    }
  },
);
