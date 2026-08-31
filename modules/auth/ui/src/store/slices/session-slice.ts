import { createSlice } from '@reduxjs/toolkit';
import { authApi } from '../api/auth-api.ts';

export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface SessionState {
  status: SessionStatus;
  sub?: string;
  message?: string;
}

const initialState: SessionState = { status: 'idle' };

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    resetSession: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(authApi.endpoints.getSession.matchPending, (state) => {
        state.status = 'loading';
        state.message = undefined;
      })
      .addMatcher(authApi.endpoints.getSession.matchFulfilled, (state, action) => {
        state.status = 'authenticated';
        state.sub = action.payload.sub;
      })
      .addMatcher(authApi.endpoints.getSession.matchRejected, (state, action) => {
        const payload = action.payload as { status?: number } | undefined;
        if (payload?.status === 401) {
          state.status = 'unauthenticated';
          state.sub = undefined;
          state.message = 'Sign in to continue.';
          return;
        }
        state.status = 'error';
        state.message = 'Unable to verify your session.';
      });
  },
});

export const { resetSession } = sessionSlice.actions;
