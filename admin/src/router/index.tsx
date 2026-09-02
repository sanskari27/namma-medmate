import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@organisms';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import ForgotPasswordScreen from '@/screens/forgot-password/ForgotPasswordScreen';
import LoginScreen from '@/screens/login/LoginScreen';
import OperatorPasswordScreen from '@/screens/operator-password/OperatorPasswordScreen';
import ResetPasswordScreen from '@/screens/reset-password/ResetPasswordScreen';
import StubScreen from '@/screens/stub/StubScreen';
import { ROUTES } from '@/libs/constants/routes.const';

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginScreen /> },
      { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordScreen /> },
      { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordScreen /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: ROUTES.DASHBOARD, element: <DashboardScreen /> },
          { path: ROUTES.PHARMACIES, element: <StubScreen title="Pharmacies" /> },
          { path: ROUTES.KYC, element: <StubScreen title="KYC queue" /> },
          { path: ROUTES.SUBSCRIPTIONS, element: <StubScreen title="Subscriptions" /> },
          { path: ROUTES.LEADS, element: <StubScreen title="Lead pipeline" /> },
          { path: ROUTES.SUPPORT, element: <StubScreen title="Support" /> },
          { path: ROUTES.SETTINGS, element: <StubScreen title="Platform settings" /> },
          { path: ROUTES.OPERATOR_PASSWORD, element: <OperatorPasswordScreen /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
]);

export default router;
