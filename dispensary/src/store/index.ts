import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './auth.slice';
import { notificationsReducer } from './notifications.slice';

export {
  authReducer,
  logout,
  passwordChanged,
  pinEnrolled,
  sessionStarted,
  type AuthUser,
} from './auth.slice';
export {
  inboxReceived,
  notificationRead,
  notificationsReducer,
  unreadReceived,
  type NotificationsState,
} from './notifications.slice';

export const store = configureStore({
  reducer: { auth: authReducer, notifications: notificationsReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
