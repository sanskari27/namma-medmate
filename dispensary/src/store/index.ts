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
import { expensesReducer } from '@/screens/expenses/store/expenses.slice';
import { agingReducer } from '@/screens/aging/store/aging.slice';
import { shopBooksReducer } from '@/screens/shop-books/store/shopBooks.slice';
import { caPackReducer } from '@/screens/ca-pack/store/caPack.slice';
import { accountReducer } from '@/screens/account/store/account.slice';
import { subscriptionReducer } from '@/screens/subscription/store/subscription.slice';
import { staffAccountsReducer } from '@/screens/staff-accounts/store/staffAccounts.slice';
import { licensesReducer } from '@/screens/licenses/store/licenses.slice';
import { counterRolesReducer } from '@/screens/counter-roles/store/counterRoles.slice';
import { signOffRulesReducer } from '@/screens/sign-off-rules/store/signOffRules.slice';
import { waitingSignOffReducer } from '@/screens/waiting-sign-off/store/waitingSignOff.slice';
import { floorActivityReducer } from '@/screens/floor-activity/store/floorActivity.slice';
import { privacyDeskReducer } from '@/screens/privacy-desk/store/privacyDesk.slice';
import { branchesReducer } from '@/screens/branches/store/branches.slice';
import { whatsappTemplatesReducer } from '@/screens/whatsapp-templates/store/whatsappTemplates.slice';
import { whatsappSendsReducer } from '@/screens/whatsapp-sends/store/whatsappSends.slice';
import { registersReducer } from '@/screens/registers/store/registers.slice';
import { controlledRegisterReducer } from '@/screens/controlled-register/store/controlledRegister.slice';

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
    expenses: expensesReducer,
    aging: agingReducer,
    shopBooks: shopBooksReducer,
    caPack: caPackReducer,
    account: accountReducer,
    subscription: subscriptionReducer,
    staffAccounts: staffAccountsReducer,
    licenses: licensesReducer,
    counterRoles: counterRolesReducer,
    signOffRules: signOffRulesReducer,
    waitingSignOff: waitingSignOffReducer,
    floorActivity: floorActivityReducer,
    privacyDesk: privacyDeskReducer,
    branches: branchesReducer,
    whatsappTemplates: whatsappTemplatesReducer,
    whatsappSends: whatsappSendsReducer,
    registers: registersReducer,
    controlledRegister: controlledRegisterReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      serializableCheck: {
        ignoredActions: ['licenses/formPatched', 'licenses/save'],
        ignoredPaths: ['licenses.form.evidence'],
      },
    }),
});

export { kioskReducer } from '@/screens/kiosk/store/kiosk.slice';
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
