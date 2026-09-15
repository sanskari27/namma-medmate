import { useCallback, useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppSidebar,
  ShellHeader,
  CounterPasswordChange,
  CounterPinEnroll,
  CounterPinLock,
} from '@organisms';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@atoms';
import { Dialog, DialogDescription, DialogTitle, DrawerContent } from '@molecules';
import { useIdleLock } from '@/hooks/useIdleLock';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ROUTES } from '@/libs/constants/routes.const';
import { SHELL } from '@/libs/constants/shell.const';
import { SESSION_END_REASON_KEY } from '@/libs/constants/session.const';
import { logout, passwordChanged, pinEnrolled, sessionStarted, type RootState } from '@/store';
import { fetchSession, logoutSession } from '@/services/auth';

export default function DashboardLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const displayName = useSelector((s: RootState) => s.auth.user?.displayName);
  const pinSet = useSelector((s: RootState) => Boolean(s.auth.user?.pinSet));
  const mustChangePassword = useSelector((s: RootState) =>
    Boolean(s.auth.user?.mustChangePassword),
  );
  const tenantStatus = useSelector((s: RootState) => s.auth.user?.tenantStatus);
  const activeBranchId = useSelector((s: RootState) => s.auth.user?.activeBranchId);
  const kioskCustomerMode = useSelector((s: RootState) => s.kiosk?.customerMode);
  const location = useLocation();
  const { locked, abandoned, clearLock } = useIdleLock(pinSet && !mustChangePassword);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const leaveCounter = useCallback(
    (reason?: string) => {
      if (reason) {
        sessionStorage.setItem(SESSION_END_REASON_KEY, reason);
      }
      void logoutSession().catch(() => undefined);
      dispatch(logout());
      navigate(ROUTES.LOGIN);
    },
    [dispatch, navigate],
  );

  useEffect(() => {
    const hydrate = () => {
      void fetchSession()
        .then((user) => dispatch(sessionStarted(user)))
        .catch(() => undefined);
    };
    hydrate();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        hydrate();
      }
    };
    window.addEventListener('focus', hydrate);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', hydrate);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [dispatch]);

  useEffect(() => {
    if (kioskCustomerMode && location.pathname !== ROUTES.KIOSK) {
      navigate(ROUTES.KIOSK, { replace: true });
    }
  }, [kioskCustomerMode, location.pathname, navigate]);

  useEffect(() => {
    if (!abandoned) {
      return;
    }
    leaveCounter('abandoned');
  }, [abandoned, leaveCounter]);

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
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="hidden text-sm font-medium text-ink sm:inline">{displayName}</span>
                </TooltipTrigger>
                <TooltipContent>{SHELL.signedInTooltip}</TooltipContent>
              </Tooltip>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => leaveCounter()}
              >
                {SHELL.signOutLabel}
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
            <Outlet key={activeBranchId ?? 'all'} />
          </div>
        </main>
      </div>
      {mustChangePassword ? (
        <CounterPasswordChange onChanged={() => dispatch(passwordChanged())} />
      ) : !pinSet ? (
        <CounterPinEnroll onEnrolled={() => dispatch(pinEnrolled())} />
      ) : null}
      {locked && pinSet && !mustChangePassword ? (
        <CounterPinLock
          staffName={displayName?.trim() || 'Staff'}
          onUnlocked={clearLock}
          onSessionRevoked={() => leaveCounter('revoked')}
        />
      ) : null}
    </div>
  );
}
