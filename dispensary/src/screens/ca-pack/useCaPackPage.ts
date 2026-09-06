import { isApiError } from '@/services/axios';
import { downloadCaPack, getCaPack, type CaPack } from '@/services/caPack';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  emptyFilters,
  filtersValid,
  hasFinanceAccess,
  isFutureRange,
  mapApiStatus,
  packIsEmpty,
  toQuery,
  type FilterState,
  type OutletScope,
  type PageStatus,
} from './CaPackScreen.utils';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useCaPackPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasFinanceAccess(user?.role, user?.roles);
  const owner = user?.role === 'pharmacy_owner';
  const activeBranchId = user?.activeBranchId ?? null;
  const statusId = useId();
  const downloadRef = useRef<HTMLButtonElement | null>(null);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [pack, setPack] = useState<CaPack | null>(null);
  const [filters, setFilters] = useState<FilterState>(emptyFilters());
  const [scope, setScope] = useState<OutletScope>('session');
  const [busy, setBusy] = useState(false);

  const query = useCallback(
    () => toQuery(filters, owner ? scope : 'session'),
    [filters, owner, scope],
  );

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    if (!activeBranchId) {
      setStatus('failure');
      setStatusHint('Select an outlet before opening the CA pack.');
      return;
    }
    if (!filtersValid(filters) || isFutureRange(filters)) {
      setStatus('validation');
      setStatusHint(
        isFutureRange(filters)
          ? 'Report dates must be today or earlier.'
          : 'Choose a period that starts on or before the end date.',
      );
      return;
    }
    setStatus('loading');
    setStatusHint(null);
    try {
      const next = await getCaPack(query());
      setPack(next);
      setStatus(packIsEmpty(next.sections) ? 'empty' : 'success');
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
        setStatusHint(apiStatusHint(error.code) ?? error.message);
        return;
      }
      setStatus('failure');
      setStatusHint(null);
    }
  }, [allowed, activeBranchId, filters, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const onApplyFilters = () => {
    void load();
  };

  const onDownload = async () => {
    if (!filtersValid(filters) || isFutureRange(filters)) {
      setStatus('validation');
      setStatusHint(
        isFutureRange(filters)
          ? 'Report dates must be today or earlier.'
          : 'Choose a period that starts on or before the end date.',
      );
      return;
    }
    setBusy(true);
    try {
      const blob = await downloadCaPack(query());
      downloadBlob(blob, 'ca-pack.pdf');
      setStatus('success');
      setStatusHint('CA pack saved. Hand this file to the CA.');
      window.setTimeout(() => downloadRef.current?.focus(), 0);
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
        setStatusHint(apiStatusHint(error.code) ?? error.message);
      } else {
        setStatus('failure');
        setStatusHint(null);
      }
    } finally {
      setBusy(false);
    }
  };

  return {
    allowed,
    owner,
    status,
    statusId,
    statusHint,
    pack,
    filters,
    scope,
    busy,
    downloadRef,
    onChangeFilters: setFilters,
    onScope: setScope,
    onApplyFilters,
    onDownload,
  };
}
