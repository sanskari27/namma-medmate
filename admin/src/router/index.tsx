import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@organisms';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import ForgotPasswordScreen from '@/screens/forgot-password/ForgotPasswordScreen';
import LoginScreen from '@/screens/login/LoginScreen';
import OperatorPasswordScreen from '@/screens/operator-password/OperatorPasswordScreen';
import OperatorsScreen from '@/screens/operators/OperatorsScreen';
import ResetPasswordScreen from '@/screens/reset-password/ResetPasswordScreen';
import HqDesksScreen from '@/screens/hq-desks/HqDesksScreen';
import WorkflowDesksScreen from '@/screens/workflow-desks/WorkflowDesksScreen';
import HqSignOffsScreen from '@/screens/hq-sign-offs/HqSignOffsScreen';
import PlatformActivityScreen from '@/screens/platform-activity/PlatformActivityScreen';
import StaffVerificationScreen from '@/screens/staff-verifications/StaffVerificationScreen';
import SupportSessionScreen from '@/screens/support-session/SupportSessionScreen';
import KycQueueScreen from '@/screens/kyc-queue/KycQueueScreen';
import LicenceExpiryScreen from '@/screens/licence-expiry/LicenceExpiryScreen';
import WhatsappProviderScreen from '@/screens/whatsapp-provider/WhatsappProviderScreen';
import PharmaciesScreen from '@/screens/pharmacies/PharmaciesScreen';
import SubscriptionsScreen from '@/screens/subscriptions/SubscriptionsScreen';
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
          { path: ROUTES.PHARMACIES, element: <PharmaciesScreen /> },
          { path: ROUTES.KYC, element: <KycQueueScreen /> },
          { path: ROUTES.LICENCE_EXPIRY, element: <LicenceExpiryScreen /> },
          { path: ROUTES.WHATSAPP_TEMPLATES, element: <WhatsappProviderScreen /> },
          { path: ROUTES.SUBSCRIPTIONS, element: <SubscriptionsScreen /> },
          { path: ROUTES.LEADS, element: <StubScreen title="Lead pipeline" /> },
          { path: ROUTES.SUPPORT, element: <SupportSessionScreen /> },
          { path: ROUTES.OPERATOR_PASSWORD, element: <OperatorPasswordScreen /> },
          { path: ROUTES.OPERATORS, element: <OperatorsScreen /> },
          { path: ROUTES.STAFF_VERIFICATIONS, element: <StaffVerificationScreen /> },
          { path: ROUTES.DESKS, element: <HqDesksScreen /> },
          { path: ROUTES.WORKFLOWS, element: <WorkflowDesksScreen /> },
          { path: ROUTES.SIGN_OFFS, element: <HqSignOffsScreen /> },
          { path: ROUTES.ACTIVITY, element: <PlatformActivityScreen /> },
          { path: ROUTES.SETTINGS, element: <StubScreen title="Platform settings" /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
]);

export default router;
