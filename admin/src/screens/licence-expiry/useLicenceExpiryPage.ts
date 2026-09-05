import { isApiError } from '@/services/axios';
import { listPlatformDueLicenses, type AdminDueLicense } from '@/services/licenses';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { isMaster, matchesTenant, type PageStatus } from './LicenceExpiryScreen.utils';

export function useLicenceExpiryPage() {
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const allowed = isMaster(role);
  const statusId = useId();
  const rescanRef = useRef<HTMLButtonElement | null>(null);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [items, setItems] = useState<AdminDueLicense[]>([]);
  const [tenantQuery, setTenantQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'rescan') => {
      if (!allowed) {
        setStatus('denied');
        return;
      }
      if (mode === 'initial') {
        setStatus('loading');
      }
      try {
        const next = await listPlatformDueLicenses();
        setItems(next);
        if (mode === 'rescan') {
          setStatus('success');
          rescanRef.current?.focus();
          return;
        }
        setStatus(next.length === 0 ? 'empty' : null);
      } catch (error) {
        if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
          setStatus('denied');
          return;
        }
        if (isApiError(error) && error.status === 409) {
          setStatus('conflict');
          return;
        }
        setStatus('failure');
      }
    },
    [allowed],
  );

  useEffect(() => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    void load('initial');
  }, [allowed, load]);

  function onIsolate() {
    if (!tenantQuery.trim()) {
      setStatus('validation');
      return;
    }
    setAppliedQuery(tenantQuery.trim());
    setStatus(null);
  }

  async function onRescan() {
    setBusy(true);
    try {
      await load('rescan');
    } finally {
      setBusy(false);
    }
  }

  const visible = items.filter((row) => matchesTenant(row, appliedQuery));

  return {
    allowed,
    status,
    statusId,
    items: visible,
    tenantQuery,
    busy,
    rescanRef,
    setTenantQuery,
    onIsolate,
    onRescan,
  };
}
