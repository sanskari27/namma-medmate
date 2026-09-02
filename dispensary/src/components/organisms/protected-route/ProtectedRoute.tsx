import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { ROUTES } from '@/libs/constants/routes.const';

export default function ProtectedRoute() {
  const user = useSelector((s: RootState) => s.auth.user);
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  return <Outlet />;
}
