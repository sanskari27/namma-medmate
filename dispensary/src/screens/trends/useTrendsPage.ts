import { isApiError } from '@/services/axios';
import { getAnalytics, type AnalyticsView } from '@/services/analytics';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  hasReportingAccess,
  isEmptyWindow,
  mapApiStatus,
  type CompareKind,
  type OutletScope,
  type PageStatus,
} from './TrendsScreen.utils';

export function useTrendsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasReportingAccess(user?.role, user?.modules);
  const owner = user?.role === 'pharmacy_owner';
  const activeBranchId = user?.activeBranchId ?? null;
  const statusId = useId();
  const applyRef = useRef<HTMLButtonElement | null>(null);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(
    allowed ? null : 'Till staff cannot open compare weeks. Ask the owner for Accounts access.',
  );
  const [planGate, setPlanGate] = useState(false);
  const [view, setView] = useState<AnalyticsView | null>(null);
  const [compare, setCompare] = useState<CompareKind>('WOW');
  const [scope, setScope] = useState<OutletScope>(
    owner && !user?.activeBranchId ? 'tenant' : 'session',
  );
  const [busy, setBusy] = useState(false);
  const compareRef = useRef(compare);
  const scopeRef = useRef(scope);
  compareRef.current = compare;
  scopeRef.current = scope;

  const load = useCallback(
    async (restoreFocus = false) => {
      if (!allowed) {
        setStatus('denied');
        return;
      }
      if (!activeBranchId && !(owner && scopeRef.current === 'tenant')) {
        setStatus('failure');
        setStatusHint('Select an outlet before comparing weeks.');
        return;
      }
      setBusy(true);
      setStatus('loading');
      setStatusHint(null);
      setPlanGate(false);
      try {
        const next = await getAnalytics({
          compare: compareRef.current,
          scope: owner && scopeRef.current === 'tenant' ? 'tenant' : undefined,
        });
        setView(next);
        if (isEmptyWindow(next.current.salesPaise, next.prior.salesPaise)) {
          setStatus('empty');
        } else {
          setStatus('success');
        }
      } catch (error) {
        if (isApiError(error)) {
          setStatus(mapApiStatus(error));
          setStatusHint(apiStatusHint(error.code));
          setPlanGate(error.code === 'PLAN_LIMIT');
          setView(null);
          return;
        }
        setStatus('failure');
        setStatusHint(null);
        setView(null);
      } finally {
        setBusy(false);
        if (restoreFocus) {
          queueMicrotask(() => applyRef.current?.focus());
        }
      }
    },
    [allowed, activeBranchId, owner],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  return {
    allowed,
    owner,
    status,
    statusHint,
    statusId,
    planGate,
    view,
    compare,
    scope,
    busy,
    applyRef,
    onCompare: setCompare,
    onScope: setScope,
    onApply: () => {
      void load(true);
    },
  };
}
