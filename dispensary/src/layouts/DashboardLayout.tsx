import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CounterAlertBell } from '@/components/alerts/CounterAlertBell';
import { AppSidebar, ShellHeader } from '@/components/layout/AppSidebar';
import { CounterPinEnroll } from '@/components/lock/CounterPinEnroll';
import { CounterPinLock } from '@/components/lock/CounterPinLock';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogTitle, DrawerContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIdleLock } from '@/hooks/useIdleLock';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ROUTES } from '@/libs/constants/routes.const';
import { logout, pinEnrolled, type RootState } from '@/store';

export default function DashboardLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const displayName = useSelector((s: RootState) => s.auth.user?.displayName);
  const pinSet = useSelector((s: RootState) => Boolean(s.auth.user?.pinSet));
  const { locked, expired, acknowledgeUnlock } = useIdleLock(pinSet);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!expired) {
      return;
    }
    dispatch(logout());
    navigate(ROUTES.LOGIN);
  }, [expired, dispatch, navigate]);

  return (
    <div className="flex min-h-screen bg-canvas">
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

      <div className="flex min-w-0 flex-1 flex-col">
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
                onClick={() => {
                  dispatch(logout());
                  navigate(ROUTES.LOGIN);
                }}
              >
                Sign out
              </Button>
            </div>
          }
        />
        <main id="main" className="flex-1 p-4 md:p-5">
          <Outlet />
        </main>
      </div>
      {!pinSet ? <CounterPinEnroll onEnrolled={() => dispatch(pinEnrolled())} /> : null}
      {pinSet && locked && !expired ? (
        <CounterPinLock
          staffName={displayName ?? 'staff'}
          onUnlocked={acknowledgeUnlock}
          onSessionRevoked={() => {
            dispatch(logout());
            navigate(ROUTES.LOGIN);
          }}
        />
      ) : null}
    </div>
  );
}
