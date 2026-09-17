import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { logout, sessionStarted } from '@/store';
import { ROUTES } from '@/libs/constants/routes.const';
import { fetchSession } from '@/services/auth';

export default function ProtectedRoute() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSession()
      .then((me) => {
        if (!cancelled) {
          dispatch(sessionStarted(me));
        }
      })
      .catch(() => {
        if (!cancelled) {
          dispatch(logout());
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (!hydrated) {
    return <p role="status">Checking this counter session…</p>;
  }
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }
  return <Outlet />;
}
