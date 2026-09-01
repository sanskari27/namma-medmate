import { translate } from '@namma-medmate/i18n';
import { planGatingMessages } from '../i18n/en.ts';
import { NavLockIcon } from './nav-lock-icon.tsx';
import { useGetEntitlementsQuery } from '../store/api/plan-gating-api.ts';
import { useSelector } from 'react-redux';
import type { PlanGatingRootState } from '../store/index.ts';
import { freeModules } from '../packaging.ts';

const ITEMS = [
  { href: '/orders', moduleKey: 'orders', labelKey: 'planGating.nav.orders' },
  { href: '/inventory', moduleKey: 'inventory', labelKey: 'planGating.nav.inventory' },
  { href: '/reports', moduleKey: 'reports', labelKey: 'planGating.nav.reports' },
  { href: '/kiosk', moduleKey: 'kiosk', labelKey: 'planGating.nav.kiosk' },
] as const;

export interface PlanGatingNavProps {
  skipQuery?: boolean;
}

export function PlanGatingNav({ skipQuery = false }: PlanGatingNavProps) {
  const preloaded = useSelector((state: PlanGatingRootState) => state.entitlements.data);
  const query = useGetEntitlementsQuery(undefined, { skip: skipQuery });
  const modules =
    preloaded?.modules ?? query.data?.modules ?? (skipQuery ? freeModules() : undefined);

  return (
    <nav aria-label="Plan modules" className="flex flex-wrap gap-3">
      {ITEMS.map((item) => {
        const locked = modules ? modules[item.moduleKey] === false : false;
        return (
          <a
            key={item.href}
            href={item.href}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted"
          >
            {translate(planGatingMessages, item.labelKey)}
            <NavLockIcon locked={locked} />
          </a>
        );
      })}
    </nav>
  );
}
