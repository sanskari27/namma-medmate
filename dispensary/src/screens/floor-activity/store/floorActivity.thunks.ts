import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import { listAuditEvents, type AuditEvent } from '@/services/approvals';
import type { ActivityStatus } from './floorActivity.slice';

export const loadActivity = createAsyncThunk<AuditEvent[], void, { rejectValue: ActivityStatus }>(
  'floorActivity/load',
  async (_, { rejectWithValue }) => {
    try {
      return await listAuditEvents();
    } catch (error) {
      if (isApiError(error) && error.code === 'FORBIDDEN') {
        return rejectWithValue('denied');
      }
      return rejectWithValue('failure');
    }
  },
);
