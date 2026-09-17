import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { LAST_ACTIVITY_KEY } from '@/hooks/useIdleLock';
import { AUTH_STORAGE_KEY } from '@/libs/constants/session.const';

export interface ImpersonationState {
  originalUserId: string;
  originalDisplayName: string;
  effectiveUserId: string;
  effectiveDisplayName: string;
  effectiveRole: string;
  tenantId: string;
  tenantName: string;
}

export interface AuthUser {
  userId: string;
  displayName: string;
  role: string;
  tenantId: string | null;
  pinSet: boolean;
  mustChangePassword?: boolean;
  roles?: { id: string; name: string; code: string | null; kind: string }[];
  modules?: string[];
  impersonation?: ImpersonationState | null;
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
    logout: (state) => {
      state.user = null;
      persistSessionHint(null);
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    },
  },
});

export const { sessionStarted, pinEnrolled, passwordChanged, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
