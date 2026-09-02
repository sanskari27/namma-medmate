import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './auth.slice';
import { inboxReducer } from './inbox.slice';

export {
  authReducer,
  logout,
  passwordChanged,
  pinEnrolled,
  sessionStarted,
  type AuthUser,
} from './auth.slice';
export {
  inboxPageLoaded,
  inboxReducer,
  inboxRowFiled,
  unreadLoaded,
  type InboxState,
} from './inbox.slice';

export const store = configureStore({
  reducer: { auth: authReducer, inbox: inboxReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
