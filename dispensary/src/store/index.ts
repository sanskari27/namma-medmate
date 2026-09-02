import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  displayName: string | null;
}

const initialState: AuthState = {
  token: localStorage.getItem('token'),
  displayName: localStorage.getItem('displayName'),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ token: string; displayName: string }>) => {
      state.token = action.payload.token;
      state.displayName = action.payload.displayName;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('displayName', action.payload.displayName);
    },
    logout: (state) => {
      state.token = null;
      state.displayName = null;
      localStorage.removeItem('token');
      localStorage.removeItem('displayName');
    },
  },
});

export const { login, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;

export const store = configureStore({
  reducer: { auth: authSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
