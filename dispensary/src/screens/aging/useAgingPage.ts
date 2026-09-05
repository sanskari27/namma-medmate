import { isApiError } from '@/services/axios';
import {
  getPayables,
  getReceivables,
  type AgingQuery,
  type AgingReport,
} from '@/services/aging';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  hasFinanceAccess,
  isFutureAsOf,
  mapApiStatus,
  todayIst,
  type OutletScope,
  type PageStatus,
} from './AgingScreen.utils';

const emptyReport = (asOf: string): AgingReport => ({
  asOf,
  scope: 'branch',
  branchId: null,
  totalPaise: 0,
  sourceBalancePaise: 0,
  buckets: [
    { key: 'D0_30', label: '0–30', totalPaise: 0 },
    { key: 'D31_60', label: '31–60', totalPaise: 0 },
    { key: 'D61_90', label: '61–90', totalPaise: 0 },
    { key: 'D90_PLUS', label: '90+', totalPaise: 0 },
  ],
  items: [],
});

export function useAgingPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const statusId = useId();
  const applyRef = useRef<HTMLButtonElement | null>(null);
  const allowed = hasFinanceAccess(user?.role, user?.modules);
  const owner = user?.role === 'pharmacy_owner';
  const initialAsOf = todayIst();

  const [asOfDraft, setAsOfDraft] = useState(initialAsOf);
  const [asOf, setAsOf] = useState(initialAsOf);
  const [scope, setScope] = useState<OutletScope>('session');
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [receivables, setReceivables] = useState<AgingReport | null>(null);
  const [payables, setPayables] = useState<AgingReport | null>(null);

  const query = useCallback((): AgingQuery => {
    return {
      asOf,
      scope: scope === 'tenant' ? 'tenant' : undefined,
    };
  }, [asOf, scope]);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    if (isFutureAsOf(asOf)) {
      setStatus('validation');
      setStatusHint('As-of date must be today or earlier.');
      return;
    }
    setStatus('loading');
    setStatusHint(null);
    try {
      const [ar, ap] = await Promise.all([getReceivables(query()), getPayables(query())]);
      setReceivables(ar);
      setPayables(ap);
      if (ar.totalPaise === 0 && ap.totalPaise === 0) {
        setStatus('empty');
      } else {
        setStatus('success');
      }
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
        setStatusHint(apiStatusHint(error.code) ?? error.message);
        return;
      }
      setStatus('failure');
      setStatusHint(null);
    }
  }, [allowed, asOf, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyAsOf = useCallback(() => {
    if (isFutureAsOf(asOfDraft)) {
      setStatus('validation');
      setStatusHint('As-of date must be today or earlier.');
      applyRef.current?.focus();
      return;
    }
    if (asOfDraft === asOf) {
      void load().then(() => {
        applyRef.current?.focus();
      });
      return;
    }
    setAsOf(asOfDraft);
    queueMicrotask(() => applyRef.current?.focus());
  }, [asOf, asOfDraft, load]);

  return {
    allowed,
    owner,
    statusId,
    applyRef,
    asOf: asOfDraft,
    setAsOf: setAsOfDraft,
    scope,
    setScope,
    status,
    statusHint,
    receivables: receivables ?? emptyReport(asOf),
    payables: payables ?? emptyReport(asOf),
    applyAsOf,
  };
}
