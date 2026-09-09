import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './auth.slice';
import { notificationsReducer } from './notifications.slice';
import { dashboardReducer } from '@/screens/dashboard/store/dashboard.slice';

export {
  authReducer,
  branchSwitched,
  logout,
  passwordChanged,
  pinEnrolled,
  sessionStarted,
  type AssignedBranch,
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
  reducer: { auth: authReducer, notifications: notificationsReducer, dashboard: dashboardReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
