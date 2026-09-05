import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@organisms';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import ForgotPasswordScreen from '@/screens/forgot-password/ForgotPasswordScreen';
import LoginScreen from '@/screens/login/LoginScreen';
import RegisterScreen from '@/screens/register/RegisterScreen';
import ResetPasswordScreen from '@/screens/reset-password/ResetPasswordScreen';
import VerifyEmailScreen from '@/screens/verify-email/VerifyEmailScreen';
import StaffAccountsScreen from '@/screens/staff-accounts/StaffAccountsScreen';
import CounterRolesScreen from '@/screens/counter-roles/CounterRolesScreen';
import SignOffRulesScreen from '@/screens/sign-off-rules/SignOffRulesScreen';
import WaitingSignOffScreen from '@/screens/waiting-sign-off/WaitingSignOffScreen';
import FloorActivityScreen from '@/screens/floor-activity/FloorActivityScreen';
import AccountScreen from '@/screens/account/AccountScreen';
import BranchesScreen from '@/screens/branches/BranchesScreen';
import SubscriptionScreen from '@/screens/subscription/SubscriptionScreen';
import CustomersScreen from '@/screens/customers/CustomersScreen';
import CreditScreen from '@/screens/credit/CreditScreen';
import InventoryScreen from '@/screens/inventory/InventoryScreen';
import PosScreen from '@/screens/pos/PosScreen';
import DistributorsScreen from '@/screens/distributors/DistributorsScreen';
import PurchasesScreen from '@/screens/purchases/PurchasesScreen';
import OffersScreen from '@/screens/offers/OffersScreen';
import StubScreen from '@/screens/stub/StubScreen';
import KioskScreen from '@/screens/kiosk/KioskScreen';
import { ROUTES, STUB_PAGES } from '@/libs/constants/routes.const';

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginScreen /> },
      { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordScreen /> },
      { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordScreen /> },
      { path: ROUTES.REGISTER, element: <RegisterScreen /> },
      { path: ROUTES.VERIFY_EMAIL, element: <VerifyEmailScreen /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: ROUTES.DASHBOARD, element: <DashboardScreen /> },
          { path: ROUTES.ACCOUNT, element: <AccountScreen /> },
          { path: ROUTES.BRANCHES, element: <BranchesScreen /> },
          { path: ROUTES.CUSTOMERS, element: <CustomersScreen /> },
          { path: ROUTES.CREDIT, element: <CreditScreen /> },
          { path: ROUTES.INVENTORY, element: <InventoryScreen /> },
          { path: ROUTES.SALES, element: <PosScreen /> },
          { path: ROUTES.DISTRIBUTORS, element: <DistributorsScreen /> },
          { path: ROUTES.PURCHASES, element: <PurchasesScreen /> },
          { path: ROUTES.OFFERS, element: <OffersScreen /> },
          { path: ROUTES.SUBSCRIPTION, element: <SubscriptionScreen /> },
          { path: ROUTES.KIOSK, element: <KioskScreen /> },
          { path: ROUTES.USERS, element: <StaffAccountsScreen /> },
          { path: ROUTES.ROLES, element: <CounterRolesScreen /> },
          { path: ROUTES.APPROVALS, element: <SignOffRulesScreen /> },
          { path: ROUTES.APPROVALS_PENDING, element: <WaitingSignOffScreen /> },
          { path: ROUTES.ACTIVITY, element: <FloorActivityScreen /> },
          ...STUB_PAGES.map((page) => ({
            path: page.path,
            element: <StubScreen title={page.title} />,
          })),
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
]);

export default router;
