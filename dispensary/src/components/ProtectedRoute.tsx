import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { ROUTES } from '@/libs/constants/routes.const';

export default function ProtectedRoute() {
  const token = useSelector((s: RootState) => s.auth.token);
  if (!token) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  return <Outlet />;
}
