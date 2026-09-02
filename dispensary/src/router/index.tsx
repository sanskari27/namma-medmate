import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@organisms';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import ForgotPasswordScreen from '@/screens/forgot-password/ForgotPasswordScreen';
import LoginScreen from '@/screens/login/LoginScreen';
import ResetPasswordScreen from '@/screens/reset-password/ResetPasswordScreen';
import StaffPasswordScreen from '@/screens/staff-password/StaffPasswordScreen';
import StubScreen from '@/screens/stub/StubScreen';
import { ROUTES, STUB_PAGES } from '@/libs/constants/routes.const';

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
          { path: ROUTES.STAFF_PASSWORD, element: <StaffPasswordScreen /> },
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
