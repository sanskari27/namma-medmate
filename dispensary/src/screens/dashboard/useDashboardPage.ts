import { isApiError } from '@/services/axios';
import { fetchDashboard, type DashboardQuery, type DashboardView } from '@/services/dashboards';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  clientPermittedDesks,
  defaultDesk,
  isEmptyView,
  mapApiStatus,
  uniqueDesks,
  type DashboardDesk,
  type OutletScope,
  type PageStatus,
} from './DashboardScreen.utils';

export function useDashboardPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const statusId = useId();
  const refreshRef = useRef<HTMLButtonElement | null>(null);
  const clientDesks = clientPermittedDesks(user);
  const allowed = clientDesks.length > 0;
  const owner = user?.role === 'pharmacy_owner';
  const [desk, setDesk] = useState<DashboardDesk | null>(() => defaultDesk(user));
  const [permitted, setPermitted] = useState<DashboardDesk[]>(clientDesks);
  const [scope, setScope] = useState<OutletScope>('session');
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView | null>(null);

  const load = useCallback(async () => {
    if (!allowed || !desk) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    setStatusHint(null);
    try {
      const query: DashboardQuery = {};
      if (desk === 'owner' && scope === 'tenant') {
        query.scope = 'tenant';
      }
      const next = await fetchDashboard(desk, query);
      setView(next);
      const fromServer = uniqueDesks(next.permittedRoles ?? []);
      if (fromServer.length > 0) {
        setPermitted(fromServer);
      }
      setStatus(isEmptyView(desk, next) ? 'empty' : 'success');
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
        setStatusHint(apiStatusHint(error.code) ?? error.message);
        return;
      }
      setStatus('failure');
      setStatusHint(null);
    }
  }, [allowed, desk, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    void load().then(() => {
      refreshRef.current?.focus();
    });
  }, [load]);

  const onDesk = useCallback((next: DashboardDesk) => {
    setDesk(next);
    if (next !== 'owner') {
      setScope('session');
    }
  }, []);

  return {
    allowed,
    owner,
    desk,
    permitted,
    scope,
    status,
    statusHint,
    statusId,
    refreshRef,
    view,
    onDesk,
    onScope: setScope,
    onRefresh,
  };
}
