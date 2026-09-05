import { isApiError } from '@/services/axios';
import {
  archivePrescriptionReference,
  getPrescriptionReference,
  listPrescriptionReferences,
  scanPrescriptionReferences,
  type PrescriptionReference,
} from '@/services/prescriptionReferences';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  canViewRxFile,
  mapApiStatus,
  type PageStatus,
  type RxFilter,
} from './PrescriptionsScreen.utils';

export function usePrescriptionsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const statusId = useId();
  const archiveRef = useRef<HTMLButtonElement | null>(null);
  const allowed = canViewRxFile(user?.role, user?.roles);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [filter, setFilter] = useState<RxFilter>('ACTIVE');
  const [items, setItems] = useState<PrescriptionReference[]>([]);
  const [selected, setSelected] = useState<PrescriptionReference | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (keepId?: string | null) => {
      if (!allowed) {
        setStatus('denied');
        return;
      }
      setStatus('loading');
      setStatusHint(null);
      try {
        const result = await listPrescriptionReferences(filter);
        setItems(result.items);
        const keep =
          keepId == null ? null : (result.items.find((row) => row.id === keepId) ?? null);
        setSelected(keep);
        setStatus(result.items.length === 0 ? 'empty' : null);
      } catch (error) {
        setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
        setStatusHint(isApiError(error) ? apiStatusHint(error.code) : null);
      }
    },
    [allowed, filter],
  );

  useEffect(() => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    void load();
  }, [allowed, load]);

  async function selectReference(id: string) {
    setStatusHint(null);
    const listed = items.find((row) => row.id === id);
    if (listed) {
      setSelected(listed);
    }
    try {
      const detail = await getPrescriptionReference(id);
      setSelected(detail);
      setStatus(null);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      setStatusHint(isApiError(error) ? apiStatusHint(error.code) : null);
    }
  }

  async function onArchive() {
    if (!selected) {
      setStatus('validation');
      setStatusHint(null);
      return;
    }
    setBusy(true);
    try {
      const updated = await archivePrescriptionReference(selected.id, selected.version);
      setSelected(updated);
      await load(filter === 'ARCHIVED' ? updated.id : null);
      setStatus('success');
      setStatusHint('Rx archived. History and source bills stay on file.');
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
        setStatusHint(apiStatusHint(error.code));
      } else {
        setStatus('failure');
        setStatusHint('Could not archive this Rx. Check the connection and try again.');
      }
    } finally {
      setBusy(false);
    }
    archiveRef.current?.focus();
  }

  async function onScan() {
    setBusy(true);
    try {
      const result = await scanPrescriptionReferences();
      await load();
      setStatus('success');
      setStatusHint(
        result.archived === 0
          ? 'No expired Rx to archive.'
          : `${result.archived} expired Rx archived. History stays on file.`,
      );
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
        setStatusHint(apiStatusHint(error.code));
      } else {
        setStatus('failure');
        setStatusHint('Could not scan expired Rx. Check the connection and try again.');
      }
    } finally {
      setBusy(false);
    }
    archiveRef.current?.focus();
  }

  return {
    allowed,
    status,
    statusHint,
    statusId,
    filter,
    setFilter,
    items,
    selected,
    busy,
    archiveRef,
    selectReference,
    onArchive,
    onScan,
  };
}
