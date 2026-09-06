import {
  BadgePercent,
  Banknote,
  BookOpen,
  Calculator,
  ChartColumn,
  ChevronDown,
  ChevronsUpDown,
  CircleHelp,
  CircleUser,
  ClipboardCheck,
  ClipboardList,
  Contact,
  FileText,
  Gauge,
  Gift,
  HeartPulse,
  History,
  IdCard,
  KeyRound,
  LayoutGrid,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  MessageCircle,
  MessagesSquare,
  MonitorSmartphone,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pill,
  RefreshCw,
  Scale,
  ScanBarcode,
  Settings,
  ShoppingBag,
  Stamp,
  Store,
  Table2,
  Tag,
  Truck,
  UserCog,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@atoms';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@molecules';
import {
  DASHBOARD_NAV,
  MODULE_NAV_ITEMS,
  NAV_SECTIONS,
  ROUTES,
  type NavItem,
} from '@/libs/constants/routes.const';
import { cn } from '@/libs/cn';
import { hasFinanceAccess, isFinanceNavPath } from '@/libs/financeAccess';
import { hasReportingAccess, isReportingNavPath } from '@/libs/reportingAccess';
import { hasCampaignAccess, isCampaignNavPath } from '@/libs/campaignAccess';
import { branchSwitched, logout, type RootState } from '@/store';
import { logoutSession } from '@/services/auth';
import { switchSessionBranch } from '@/services/sessionBranch';

const ALL_OUTLETS_ID = 'all';
const PHARMACY_NAME = 'This pharmacy';

const NAV_ICONS: Record<string, LucideIcon> = {
  [ROUTES.DASHBOARD]: Gauge,
  [ROUTES.ORDERS]: ClipboardList,
  [ROUTES.SALES]: ScanBarcode,
  [ROUTES.PRESCRIPTIONS]: Pill,
  [ROUTES.CUSTOMERS]: Users,
  [ROUTES.CAMPAIGNS]: Megaphone,
  [ROUTES.CREDIT]: Wallet,
  [ROUTES.CRM]: HeartPulse,
  [ROUTES.INVENTORY]: Package,
  [ROUTES.RACKS]: LayoutGrid,
  [ROUTES.PURCHASES]: ShoppingBag,
  [ROUTES.REORDER]: RefreshCw,
  [ROUTES.DISTRIBUTORS]: Truck,
  [ROUTES.ONLINE_STORE]: Store,
  [ROUTES.OFFERS]: Tag,
  [ROUTES.KIOSK]: MonitorSmartphone,
  [ROUTES.REPORTS]: ChartColumn,
  [ROUTES.CUSTOM_REPORTS]: Table2,
  [ROUTES.EXPENSES]: Banknote,
  [ROUTES.AGING]: Scale,
  [ROUTES.BOOKS]: BookOpen,
  [ROUTES.ACCOUNTANT]: Calculator,
  [ROUTES.ACCOUNT]: CircleUser,
  [ROUTES.LICENSES]: FileText,
  [ROUTES.WHATSAPP_TEMPLATES]: MessageCircle,
  [ROUTES.WHATSAPP_SENDS]: MessagesSquare,
  [ROUTES.REGISTERS]: ClipboardList,
  [ROUTES.EMPLOYEES]: IdCard,
  [ROUTES.USERS]: UserCog,
  [ROUTES.ROLES]: KeyRound,
  [ROUTES.APPROVALS]: Stamp,
  [ROUTES.APPROVALS_PENDING]: ClipboardCheck,
  [ROUTES.ACTIVITY]: History,
  [ROUTES.INVOICE_SETTINGS]: FileText,
  [ROUTES.SUBSCRIPTION]: BadgePercent,
  [ROUTES.REFER]: Gift,
  [ROUTES.SETTINGS]: Settings,
  [ROUTES.HELP]: CircleHelp,
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'C';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function sectionIdForPath(pathname: string) {
  return NAV_SECTIONS.find((section) => section.items.some((item) => item.path === pathname))?.id;
}

type AppSidebarProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

export function AppSidebar({ collapsed = false, onNavigate }: AppSidebarProps) {
  const reduceMotion = useReducedMotion();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useSelector((s: RootState) => s.auth.user);
  const displayName = user?.displayName ?? 'Chemist';
  const isOwner = user?.role === 'pharmacy_owner';
  const canSeeFinance = hasFinanceAccess(user?.role, user?.roles);
  const canSeeReporting = hasReportingAccess(user?.role, user?.modules);
  const canSeeCampaigns = hasCampaignAccess(user?.role, user?.modules);
  const branches = user?.branches ?? [];
  const activeBranchId = user?.activeBranchId ?? null;
  const selectedId =
    activeBranchId ?? (isOwner ? ALL_OUTLETS_ID : (branches[0]?.id ?? ALL_OUTLETS_ID));
  const selectedLabel =
    selectedId === ALL_OUTLETS_ID
      ? 'All outlets'
      : (branches.find((branch) => branch.id === selectedId)?.name ?? 'This outlet');
  const selectedCode =
    selectedId === ALL_OUTLETS_ID
      ? 'ALL'
      : (branches.find((branch) => branch.id === selectedId)?.branchCode ?? '—');
  const [switchBusy, setSwitchBusy] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(() =>
    NAV_SECTIONS.map((section) => section.id),
  );

  useEffect(() => {
    const activeSection = sectionIdForPath(pathname);
    if (!activeSection) return;
    setOpenSections((current) =>
      current.includes(activeSection) ? current : [...current, activeSection],
    );
  }, [pathname]);

  const selectOutlet = (id: string) => {
    if (switchBusy) return;
    const nextBranchId = id === ALL_OUTLETS_ID ? null : id;
    if ((activeBranchId ?? null) === nextBranchId) return;
    setSwitchBusy(true);
    setSwitchError(null);
    void switchSessionBranch(nextBranchId)
      .then((result) => {
        dispatch(
          branchSwitched({
            activeBranchId: result.activeBranchId,
            branches: result.branches,
          }),
        );
      })
      .catch(() => {
        setSwitchError('Could not switch outlet. Try again.');
      })
      .finally(() => {
        setSwitchBusy(false);
      });
  };

  const toggleSection = (id: string) => {
    setOpenSections((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const signOut = () => {
    void logoutSession().catch(() => undefined);
    dispatch(logout());
    onNavigate?.();
    navigate(ROUTES.LOGIN);
  };

  return (
    <aside
      aria-label="Counter rail"
      data-collapsed={collapsed ? 'true' : 'false'}
      className={cn(
        'relative flex h-full min-h-0 flex-col overflow-hidden bg-ink text-canvas scheme-dark',
        collapsed ? 'w-[4.25rem]' : 'w-[16.5rem]',
        reduceMotion ? '' : 'transition-[width] duration-200',
      )}
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-brand" aria-hidden />

      <header
        className={cn(
          'shrink-0 border-b border-canvas/12',
          collapsed ? 'px-2 pt-3 pb-2' : 'px-3 pt-4 pb-3',
        )}
      >
        {collapsed ? (
          <p className="text-center font-serif text-lg font-semibold text-canvas">
            M<span className="sr-only">edMate — {PHARMACY_NAME}</span>
          </p>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand font-serif text-base leading-none font-semibold text-canvas">
              M
            </span>
            <div className="min-w-0 leading-tight">
              <p className="font-serif text-lg font-semibold text-canvas">MedMate</p>
              <p className="mt-0.5 font-mono text-[10px] text-line">{PHARMACY_NAME}</p>
            </div>
          </div>
        )}

        <div className={cn(collapsed ? 'mt-2 flex justify-center' : 'mt-3')}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`This outlet: ${selectedLabel}`}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-md bg-canvas text-ink hover:bg-brand-soft"
                  disabled={switchBusy || branches.length === 0}
                >
                  <MapPin className="size-4 text-brand" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">This outlet: {selectedLabel}</TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`This outlet: ${selectedLabel}`}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md bg-canvas px-2.5 py-2 text-left text-ink hover:bg-brand-soft disabled:opacity-60"
                  disabled={switchBusy || (branches.length === 0 && !isOwner)}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-brand-soft text-brand">
                    <MapPin className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] leading-none text-muted">This outlet</span>
                    <span className="mt-0.5 block truncate text-sm leading-tight font-medium">
                      {selectedLabel}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-muted">{selectedCode}</span>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-muted" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <DropdownMenuLabel>This outlet</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={selectedId} onValueChange={selectOutlet}>
                  {isOwner ? (
                    <DropdownMenuRadioItem value={ALL_OUTLETS_ID} aria-label="All outlets">
                      <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                        <span className="truncate">All outlets</span>
                        <span className="font-mono text-[10px] text-muted">ALL</span>
                      </span>
                    </DropdownMenuRadioItem>
                  ) : null}
                  {branches.map((item) => (
                    <DropdownMenuRadioItem key={item.id} value={item.id} aria-label={item.name}>
                      <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                        <span className="truncate">{item.name}</span>
                        <span className="font-mono text-[10px] text-muted">{item.branchCode}</span>
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                {switchError ? (
                  <p role="alert" className="px-2 py-1.5 text-xs text-danger">
                    {switchError}
                  </p>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {switchError && !collapsed ? (
            <p role="alert" className="mt-1.5 px-0.5 text-[11px] text-danger">
              {switchError}
            </p>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="On this floor"
        className="rail-scroll relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-3 pr-1.5 pl-2"
      >
        <ul className="flex flex-col gap-0.5">
          <li>
            <RailLink
              item={DASHBOARD_NAV}
              collapsed={collapsed}
              reduceMotion={Boolean(reduceMotion)}
              onNavigate={onNavigate}
            />
          </li>
        </ul>

        {NAV_SECTIONS.map((section) => {
          const open = collapsed || openSections.includes(section.id);
          return (
            <div key={section.id} className="mt-3">
              {collapsed ? (
                <div className="mx-2 mb-1 border-t border-canvas/15" />
              ) : (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggleSection(section.id)}
                  className="mb-1 flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1 text-left text-[11px] font-medium text-line hover:bg-canvas/10 hover:text-canvas"
                >
                  {section.label}
                  <ChevronDown
                    className={cn(
                      'size-3.5 transition-transform duration-200',
                      open ? 'rotate-0' : '-rotate-90',
                    )}
                    aria-hidden
                  />
                </button>
              )}
              {open ? (
                <ul className="flex flex-col gap-0.5">
                  {section.items
                    .filter((item) => canSeeFinance || !isFinanceNavPath(item.path))
                    .filter((item) => canSeeReporting || !isReportingNavPath(item.path))
                    .filter((item) => canSeeCampaigns || !isCampaignNavPath(item.path))
                    .map((item) => (
                      <li key={item.path}>
                        <RailLink
                          item={item}
                          collapsed={collapsed}
                          reduceMotion={Boolean(reduceMotion)}
                          onNavigate={onNavigate}
                        />
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>

      <footer className={cn('shrink-0 border-t border-canvas/15', collapsed ? 'p-2' : 'p-3 pl-4')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Account for ${displayName}`}
              className={cn(
                'flex w-full cursor-pointer items-center rounded-md text-left hover:bg-canvas/10',
                collapsed ? 'justify-center p-1.5' : 'gap-2.5 px-2 py-2',
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand font-mono text-xs font-medium text-canvas">
                {initials(displayName)}
              </span>
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-canvas">
                      {displayName}
                    </span>
                    <span className="block text-[11px] text-line">at this counter</span>
                  </span>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-line" aria-hidden />
                </>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
              <UserRound className="size-4" aria-hidden />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                onNavigate?.();
                navigate(ROUTES.SETTINGS);
              }}
            >
              <Settings className="size-4" aria-hidden />
              Account settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                onNavigate?.();
                navigate(ROUTES.HELP);
              }}
            >
              <CircleHelp className="size-4" aria-hidden />
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-danger data-[highlighted]:bg-brand-soft data-[highlighted]:text-danger"
              onSelect={signOut}
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </footer>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent aria-describedby="profile-copy">
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription id="profile-copy">
            Signed-in chemist at this counter.
          </DialogDescription>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted">Name</dt>
              <dd className="font-medium text-ink">{displayName}</dd>
            </div>
            <div>
              <dt className="text-muted">Counter</dt>
              <dd className="font-medium text-ink">{selectedLabel}</dd>
            </div>
          </dl>
          <div className="mt-5 flex justify-end">
            <Button type="button" variant="outline" onClick={() => setProfileOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function RailLink({
  item,
  collapsed,
  reduceMotion,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  reduceMotion: boolean;
  onNavigate?: () => void;
}) {
  const Icon = NAV_ICONS[item.path] ?? Contact;
  const link = (
    <NavLink
      to={item.path}
      end={item.path === ROUTES.DASHBOARD}
      title={item.hint}
      aria-label={item.badge ? `${item.label}, ${item.badge.label}` : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-offset-2',
          'transition-colors duration-200',
          collapsed && 'justify-center px-0',
          isActive ? 'font-medium text-ink' : 'text-canvas/80 hover:bg-canvas/10 hover:text-canvas',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            reduceMotion ? (
              <span className="absolute inset-0 rounded-md bg-canvas" aria-hidden />
            ) : (
              <motion.span
                layoutId="rail-active"
                className="absolute inset-0 rounded-md bg-canvas"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                aria-hidden
              />
            )
          ) : null}
          {isActive ? (
            <span
              className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-brand"
              aria-hidden
            />
          ) : null}
          <Icon className="relative z-10 size-4 shrink-0" aria-hidden />
          {!collapsed ? (
            <span className="relative z-10 min-w-0 flex-1 truncate">{item.label}</span>
          ) : (
            <span className="sr-only">{item.label}</span>
          )}
          {item.badge ? (
            <span
              className={cn(
                'relative z-10 min-w-5 rounded-sm px-1 text-center font-mono text-[10px] font-medium',
                isActive ? 'bg-brand text-canvas' : 'bg-canvas text-ink',
                collapsed && 'sr-only',
              )}
              aria-hidden
            >
              {item.badge.count}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">
        {item.label}
        {item.badge ? ` (${item.badge.label})` : ''}
      </TooltipContent>
    </Tooltip>
  );
}

export function RailCollapseToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <button
      type="button"
      aria-pressed={collapsed}
      aria-label={collapsed ? 'Expand module rail' : 'Collapse module rail'}
      onClick={onToggle}
      className="hidden cursor-pointer rounded-md p-1.5 text-muted hover:bg-brand-soft hover:text-ink md:inline-flex"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

type ShellHeaderProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenMobile: () => void;
  trailing?: ReactNode;
};

export function ShellHeader({
  collapsed,
  onToggleCollapsed,
  onOpenMobile,
  trailing,
}: ShellHeaderProps) {
  const { pathname } = useLocation();
  const current = MODULE_NAV_ITEMS.find((item) => item.path === pathname);

  return (
    <header className="flex h-11 items-center justify-between border-b border-line bg-surface px-3 md:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="inline-flex cursor-pointer rounded-md p-1.5 text-ink hover:bg-brand-soft md:hidden"
          aria-label="Open module rail"
          onClick={onOpenMobile}
        >
          <Menu className="size-4" aria-hidden />
        </button>
        <RailCollapseToggle collapsed={collapsed} onToggle={onToggleCollapsed} />
        <p className="truncate text-sm font-medium text-ink">
          {current?.label ?? 'Pharmacy workspace'}
        </p>
      </div>
      {trailing}
    </header>
  );
}
