import { Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@atoms';
import { CounterAlertBell } from '../counter-alert-bell';
import { MODULE_NAV_ITEMS, ROUTES } from '@/libs/constants/routes.const';
import { SHELL } from '@/libs/constants/shell.const';

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
      aria-label={collapsed ? SHELL.expandRailAriaLabel : SHELL.collapseRailAriaLabel}
      onClick={onToggle}
      className="hidden cursor-pointer rounded-md p-1.5 text-muted hover:bg-brand-soft hover:text-ink md:inline-flex"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

export type ShellHeaderProps = {
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
  const title = current?.label ?? SHELL.workspaceFallbackTitle;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 md:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="inline-flex cursor-pointer rounded-md p-1.5 text-ink hover:bg-brand-soft md:hidden"
          aria-label={SHELL.openRailAriaLabel}
          onClick={onOpenMobile}
        >
          <Menu className="size-4" aria-hidden />
        </button>
        <RailCollapseToggle collapsed={collapsed} onToggle={onToggleCollapsed} />
        <h1 className="truncate text-base font-semibold text-ink">{title}</h1>
      </div>

      <label className="ml-auto hidden min-w-[12rem] max-w-md flex-1 items-center gap-2 rounded-lg border border-line bg-canvas px-3 py-2 md:flex">
        <Search className="size-4 shrink-0 text-brand" aria-hidden />
        <input
          type="search"
          readOnly
          placeholder={SHELL.searchPlaceholder}
          className="w-full border-0 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          aria-label={SHELL.searchPlaceholder}
        />
      </label>

      <div className="flex items-center gap-2">
        <Button asChild size="sm" className="shrink-0">
          <Link to={ROUTES.SALES}>{SHELL.newSaleLabel}</Link>
        </Button>
        <CounterAlertBell />
        {trailing}
      </div>
    </header>
  );
}
