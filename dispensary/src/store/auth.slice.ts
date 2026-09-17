import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { LAST_ACTIVITY_KEY } from '@/hooks/useIdleLock';
import { AUTH_STORAGE_KEY } from '@/libs/constants/session.const';

export interface AssignedBranch {
  id: string;
  name: string;
  branchCode: string;
  status: string;
}

export interface AuthUser {
  userId: string;
  displayName: string;
  role: string;
  tenantId: string | null;
  pinSet: boolean;
  mustChangePassword?: boolean;
  tenantStatus?: string | null;
  emailVerified?: boolean | null;
  roles?: { id: string; name: string; code: string | null; kind: string }[];
  modules?: string[];
  branches?: AssignedBranch[];
  activeBranchId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
}

function persistSessionHint(userId: string | null) {
  if (!userId) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ userId }));
}

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null } as AuthState,
  reducers: {
    sessionStarted: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
      persistSessionHint(action.payload.userId);
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    },
    pinEnrolled: (state) => {
      if (state.user) {
        state.user.pinSet = true;
        persistSessionHint(state.user.userId);
      }
    },
    passwordChanged: (state) => {
      if (state.user) {
        state.user.mustChangePassword = false;
        persistSessionHint(state.user.userId);
      }
    },
    branchSwitched: (
      state,
      action: PayloadAction<{ activeBranchId: string | null; branches?: AssignedBranch[] }>,
    ) => {
      if (state.user) {
        state.user.activeBranchId = action.payload.activeBranchId;
        if (action.payload.branches) {
          state.user.branches = action.payload.branches;
        }
        persistSessionHint(state.user.userId);
      }
    },
    logout: (state) => {
      state.user = null;
      persistSessionHint(null);
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    },
  },
});

export const { sessionStarted, pinEnrolled, passwordChanged, branchSwitched, logout } =
  authSlice.actions;
export const authReducer = authSlice.reducer;
