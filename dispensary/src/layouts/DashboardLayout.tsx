import { useCallback, useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  CounterAlertBell,
  AppSidebar,
  ShellHeader,
  CounterPasswordChange,
  CounterPinEnroll,
} from '@organisms';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@atoms';
import { Dialog, DialogDescription, DialogTitle, DrawerContent } from '@molecules';
import { useIdleLock } from '@/hooks/useIdleLock';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ROUTES } from '@/libs/constants/routes.const';
import { logout, passwordChanged, pinEnrolled, type RootState } from '@/store';
import { logoutSession } from '@/services/auth';

export default function DashboardLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const displayName = useSelector((s: RootState) => s.auth.user?.displayName);
  const pinSet = useSelector((s: RootState) => Boolean(s.auth.user?.pinSet));
  const mustChangePassword = useSelector((s: RootState) =>
    Boolean(s.auth.user?.mustChangePassword),
  );
  const tenantStatus = useSelector((s: RootState) => s.auth.user?.tenantStatus);
  const { expired } = useIdleLock(pinSet && !mustChangePassword);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const leaveCounter = useCallback(() => {
    void logoutSession().catch(() => undefined);
    dispatch(logout());
    navigate(ROUTES.LOGIN);
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!expired) {
      return;
    }
    leaveCounter();
  }, [expired, leaveCounter]);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <a
        href="#main"
        className="absolute top-2 left-2 z-50 -translate-y-16 bg-surface px-3 py-2 text-sm text-ink focus:translate-y-0"
      >
        Skip to counter
      </a>

      {isDesktop ? (
        <div className="sticky top-0 h-screen shrink-0">
          <AppSidebar collapsed={collapsed} />
        </div>
      ) : null}

      <Dialog open={!isDesktop && mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerContent className="bg-ink" aria-describedby="rail-drawer-copy">
          <DialogTitle className="sr-only">Branch modules</DialogTitle>
          <DialogDescription id="rail-drawer-copy" className="sr-only">
            Choose a floor module or switch counter.
          </DialogDescription>
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </DrawerContent>
      </Dialog>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ShellHeader
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          onOpenMobile={() => setMobileOpen(true)}
          trailing={
            <div className="flex items-center gap-3">
              <CounterAlertBell />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-medium text-ink">{displayName}</span>
                </TooltipTrigger>
                <TooltipContent>Signed in at this counter</TooltipContent>
              </Tooltip>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={leaveCounter}
              >
                Sign out
              </Button>
            </div>
          }
        />
        <main id="main" className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
          {tenantStatus === 'VERIFICATION_REQUIRED' ? (
            <p
              role="status"
              className="mb-4 shrink-0 border border-warn bg-canvas px-3 py-2 text-sm text-ink"
            >
              This pharmacy is locked until KYC finishes. Floor modules stay closed;{' '}
              <Link className="font-medium text-brand underline" to={ROUTES.ACCOUNT}>
                open pharmacy account / KYC
              </Link>{' '}
              to submit or check the pack.
            </p>
          ) : null}
          {tenantStatus === 'SUSPENDED' ? (
            <p
              role="status"
              className="mb-4 shrink-0 border border-warn bg-canvas px-3 py-2 text-sm text-ink"
            >
              This pharmacy counter is suspended. Floor modules stay closed. Your bills, stock, and
              staff records are kept — contact MedMate support to reopen the floor.
            </p>
          ) : null}
          {tenantStatus === 'EXPIRED' ? (
            <p
              role="status"
              className="mb-4 shrink-0 border border-warn bg-canvas px-3 py-2 text-sm text-ink"
            >
              This pharmacy plan has expired. Floor modules stay closed. Your bills, stock, and
              staff records are kept — renew or contact support to reopen the floor.
            </p>
          ) : null}
          {tenantStatus === 'TERMINATED' ? (
            <p
              role="status"
              className="mb-4 shrink-0 border border-danger bg-canvas px-3 py-2 text-sm text-ink"
            >
              This pharmacy account is closed. Floor modules stay closed. Historical bills and stock
              are not deleted — contact MedMate support if you need help.
            </p>
          ) : null}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <Outlet />
          </div>
        </main>
      </div>
      {mustChangePassword ? (
        <CounterPasswordChange onChanged={() => dispatch(passwordChanged())} />
      ) : !pinSet ? (
        <CounterPinEnroll onEnrolled={() => dispatch(pinEnrolled())} />
      ) : null}
    </div>
  );
}
