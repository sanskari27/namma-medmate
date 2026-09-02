import {
  BadgeCheck,
  Briefcase,
  Building2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileClock,
  GitBranch,
  Headset,
  KeyRound,
  LayoutDashboard,
  Settings,
  Funnel,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@atoms';
import { HqInboxBell, HqPasswordChange, HqPinEnroll } from '@organisms';
import { useIdleLock } from '@/hooks/useIdleLock';
import { logout, passwordChanged, pinEnrolled, type RootState } from '@/store';
import { logoutSession } from '@/services/auth';
import { NAV_ITEMS, ROUTES } from '@/libs/constants/routes.const';

const NAV_ICONS: Record<(typeof NAV_ITEMS)[number]['path'], LucideIcon> = {
  [ROUTES.DASHBOARD]: LayoutDashboard,
  [ROUTES.PHARMACIES]: Building2,
  [ROUTES.KYC]: BadgeCheck,
  [ROUTES.SUBSCRIPTIONS]: CreditCard,
  [ROUTES.LEADS]: Funnel,
  [ROUTES.SUPPORT]: Headset,
  [ROUTES.OPERATORS]: UserRound,
  [ROUTES.STAFF_VERIFICATIONS]: ClipboardList,
  [ROUTES.DESKS]: Briefcase,
  [ROUTES.WORKFLOWS]: GitBranch,
  [ROUTES.SIGN_OFFS]: ClipboardCheck,
  [ROUTES.ACTIVITY]: FileClock,
  [ROUTES.SETTINGS]: Settings,
  [ROUTES.OPERATOR_PASSWORD]: KeyRound,
};

export default function DashboardLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const displayName = useSelector((s: RootState) => s.auth.user?.displayName);
  const pinSet = useSelector((s: RootState) => Boolean(s.auth.user?.pinSet));
  const mustChangePassword = useSelector((s: RootState) =>
    Boolean(s.auth.user?.mustChangePassword),
  );
  const { expired } = useIdleLock(pinSet && !mustChangePassword);

  const leaveHq = useCallback(() => {
    void logoutSession().catch(() => undefined);
    dispatch(logout());
    navigate(ROUTES.LOGIN);
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!expired) {
      return;
    }
    leaveHq();
  }, [expired, leaveHq]);

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <a
        href="#main"
        className="absolute top-2 left-2 z-50 -translate-y-16 bg-elevated px-3 py-2 text-sm text-ink focus:translate-y-0"
      >
        Skip to workspace
      </a>
      <aside className="flex w-52 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-4 py-4">
          <p className="font-serif text-lg font-semibold">MedMate HQ</p>
          <p className="font-mono text-[11px] text-muted">Platform ops</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Platform modules">
          {NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.path];
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === ROUTES.DASHBOARD || item.path === ROUTES.OPERATORS}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-sm px-3 py-2 text-sm ${
                    isActive
                      ? 'bg-brand-soft text-brand'
                      : 'text-muted hover:bg-elevated hover:text-ink'
                  }`
                }
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b border-line bg-surface px-6">
          <span className="text-sm text-muted">Platform CRM</span>
          <div className="flex items-center gap-3">
            <HqInboxBell />
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="font-mono text-xs text-ink">{displayName}</span>
              </TooltipTrigger>
              <TooltipContent>HQ session</TooltipContent>
            </Tooltip>
            <Button type="button" variant="outline" size="sm" onClick={leaveHq}>
              Sign out
            </Button>
          </div>
        </header>
        <main id="main" className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      {mustChangePassword ? (
        <HqPasswordChange onChanged={() => dispatch(passwordChanged())} />
      ) : !pinSet ? (
        <HqPinEnroll onEnrolled={() => dispatch(pinEnrolled())} />
      ) : null}
    </div>
  );
}
