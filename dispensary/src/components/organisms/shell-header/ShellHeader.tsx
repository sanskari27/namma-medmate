import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@atoms';
import { CounterAlertBell } from '../counter-alert-bell';
import { MODULE_NAV_ITEMS } from '@/libs/constants/routes.const';
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
  onNewSale: () => void;
  trailing?: ReactNode;
};

export function ShellHeader({
  collapsed,
  onToggleCollapsed,
  onOpenMobile,
  onNewSale,
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
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-ink">{title}</h1>
          {current?.hint ? (
            <p className="hidden truncate text-xs font-medium text-muted sm:block">{current.hint}</p>
          ) : null}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button type="button" size="sm" className="shrink-0" onClick={onNewSale}>
          {SHELL.newSaleLabel}
        </Button>
        <CounterAlertBell />
        {trailing}
      </div>
    </header>
  );
}
