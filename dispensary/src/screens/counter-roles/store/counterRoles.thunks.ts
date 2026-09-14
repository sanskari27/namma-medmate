import { createAsyncThunk } from '@reduxjs/toolkit';
import { listRoles, type RoleCatalog } from '@/services/roles';

export const loadRoles = createAsyncThunk<RoleCatalog>('counterRoles/load', async () => listRoles());
