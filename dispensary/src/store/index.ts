import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './auth.slice';
import { notificationsReducer } from './notifications.slice';
import { dashboardReducer } from '@/screens/dashboard/store/dashboard.slice';
import { posReducer } from '@/screens/pos/store/pos.slice';
import { ordersReducer } from '@/screens/orders/store/orders.slice';
import { prescriptionsReducer } from '@/screens/prescriptions/store/prescriptions.slice';
import { returnsReducer } from '@/screens/returns/store/returns.slice';
import { customersReducer } from '@/screens/customers/store/customers.slice';
import { creditReducer } from '@/screens/credit/store/credit.slice';
import { inventoryReducer } from '@/screens/inventory/store/inventory.slice';
import { purchasesReducer } from '@/screens/purchases/store/purchases.slice';
import { distributorsReducer } from '@/screens/distributors/store/distributors.slice';
import { offersReducer } from '@/screens/offers/store/offers.slice';
import { kioskReducer } from '@/screens/kiosk/store/kiosk.slice';
import { trendsReducer } from '@/screens/trends/store/trends.slice';
import { customReportsReducer } from '@/screens/custom-reports/store/customReports.slice';

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
  reducer: {
    auth: authReducer,
    notifications: notificationsReducer,
    dashboard: dashboardReducer,
    pos: posReducer,
    orders: ordersReducer,
    returns: returnsReducer,
    prescriptions: prescriptionsReducer,
    customers: customersReducer,
    credit: creditReducer,
    inventory: inventoryReducer,
    purchases: purchasesReducer,
    distributors: distributorsReducer,
    offers: offersReducer,
    kiosk: kioskReducer,
    trends: trendsReducer,
    customReports: customReportsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
