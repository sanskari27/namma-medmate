import { createAsyncThunk } from '@reduxjs/toolkit';
import { listStaff, type StaffAccount } from '@/services/staff';

export const loadStaff = createAsyncThunk<StaffAccount[]>('staffAccounts/load', async () => {
  return listStaff();
});
