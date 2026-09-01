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
          { path: ROUTES.POS, element: <StubPage title="POS" /> },
          { path: ROUTES.INVENTORY, element: <StubPage title="Inventory" /> },
          { path: ROUTES.PROCUREMENT, element: <StubPage title="Procurement" /> },
          { path: ROUTES.INVOICES, element: <StubPage title="Invoices & GST" /> },
          { path: ROUTES.CUSTOMERS, element: <StubPage title="Customers (Khata)" /> },
          { path: ROUTES.PRESCRIPTIONS, element: <StubPage title="Prescriptions" /> },
          { path: ROUTES.SETTINGS, element: <StubPage title="Settings" /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
]);

export default router;
