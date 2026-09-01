import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import StubPage from '@/pages/StubPage';
import { ROUTES } from '@/libs/constants/routes.const';

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [{ path: ROUTES.LOGIN, element: <LoginPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: ROUTES.DASHBOARD, element: <DashboardPage /> },
          { path: ROUTES.PHARMACIES, element: <StubPage title="Pharmacies" /> },
          { path: ROUTES.KYC, element: <StubPage title="KYC queue" /> },
          { path: ROUTES.SUBSCRIPTIONS, element: <StubPage title="Subscriptions" /> },
          { path: ROUTES.LEADS, element: <StubPage title="Lead pipeline" /> },
          { path: ROUTES.SUPPORT, element: <StubPage title="Support" /> },
          { path: ROUTES.SETTINGS, element: <StubPage title="Platform settings" /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
]);

export default router;
