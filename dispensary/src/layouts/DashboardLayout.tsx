import {
  FileHeart,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { logout, type RootState } from '@/store';
import { NAV_ITEMS, ROUTES } from '@/libs/constants/routes.const';

const NAV_ICONS: Record<(typeof NAV_ITEMS)[number]['path'], LucideIcon> = {
  [ROUTES.DASHBOARD]: LayoutDashboard,
  [ROUTES.POS]: ShoppingCart,
  [ROUTES.INVENTORY]: Package,
  [ROUTES.PROCUREMENT]: Truck,
  [ROUTES.INVOICES]: FileText,
  [ROUTES.CUSTOMERS]: Users,
  [ROUTES.PRESCRIPTIONS]: FileHeart,
  [ROUTES.SETTINGS]: Settings,
};

export default function DashboardLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const displayName = useSelector((s: RootState) => s.auth.displayName);

  return (
    <div className="flex min-h-screen bg-canvas">
      <a
        href="#main"
        className="absolute top-2 left-2 z-50 -translate-y-16 bg-surface px-3 py-2 text-sm text-ink focus:translate-y-0"
      >
        Skip to counter
      </a>
      <aside className="flex w-56 flex-col border-r border-line bg-surface">
        <div className="h-1 bg-brand" />
        <div className="px-4 pt-4 pb-5">
          <p className="font-serif text-xl font-semibold text-brand">MedMate</p>
          <p className="font-mono text-[11px] text-muted">ERP — this branch</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2" aria-label="Branch modules">
          {NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.path];
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === ROUTES.DASHBOARD}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                    isActive ? 'bg-brand-soft font-medium text-brand' : 'text-muted hover:bg-canvas hover:text-ink'
                  }`
                }
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 items-center justify-between border-b border-line bg-surface px-5">
          <span className="text-sm text-muted">Pharmacy workspace</span>
          <div className="flex items-center gap-3">
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
              onClick={() => {
                dispatch(logout());
                navigate(ROUTES.LOGIN);
              }}
            >
              Sign out
            </Button>
          </div>
        </header>
        <main id="main" className="flex-1 p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
