import { isApiError } from '@/services/axios';
import {
  downloadControlledRegisterExport,
  listControlledRegister,
  type ControlledSaleLine,
} from '@/services/controlledRegister';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { FilterOption } from './components/controlled-register-filters/ControlledRegisterFilters';
import {
  canOpenSaleBook,
  emptyFilters,
  filtersValid,
  mapApiStatus,
  toQuery,
  type FilterState,
  type PageStatus,
} from './ControlledRegisterScreen.utils';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function uniqueOptions(
  items: ControlledSaleLine[],
  idOf: (row: ControlledSaleLine) => string,
  labelOf: (row: ControlledSaleLine) => string,
): FilterOption[] {
  const seen = new Map<string, string>();
  for (const row of items) {
    const id = idOf(row);
    if (!seen.has(id)) {
      seen.set(id, labelOf(row));
    }
  }
  return [...seen.entries()].map(([id, label]) => ({ id, label }));
}

export function useControlledRegisterPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = canOpenSaleBook(user?.role, user?.roles);
  const activeBranchId = user?.activeBranchId ?? null;
  const statusId = useId();
  const spreadsheetRef = useRef<HTMLButtonElement | null>(null);
  const ndpsRef = useRef<HTMLButtonElement | null>(null);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [items, setItems] = useState<ControlledSaleLine[]>([]);
  const [filters, setFilters] = useState<FilterState>(emptyFilters());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    if (!filtersValid(filters)) {
      setStatus('validation');
      setStatusHint(null);
      return;
    }
    if (!activeBranchId) {
      setItems([]);
      setStatus('failure');
      setStatusHint('Select an outlet before opening the NDPS sale book.');
      return;
    }
    setStatus('loading');
    setStatusHint(null);
    try {
      const rows = await listControlledRegister(toQuery(filters));
      setItems(rows);
      setStatus(rows.length === 0 ? 'empty' : null);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      setStatusHint(null);
    }
  }, [allowed, activeBranchId, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const onExport = async (format: 'csv' | 'ndps') => {
    if (!filtersValid(filters)) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      const blob = await downloadControlledRegisterExport(format, toQuery(filters));
      downloadBlob(
        blob,
        format === 'ndps' ? 'ndps-sale-register.csv' : 'controlled-sale-register.csv',
      );
      setStatus('success');
      setStatusHint(
        format === 'ndps'
          ? 'NDPS sheet saved for this outlet.'
          : 'Spreadsheet saved for this outlet.',
      );
      const focusTarget = format === 'ndps' ? ndpsRef : spreadsheetRef;
      window.setTimeout(() => focusTarget.current?.focus(), 0);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      setStatusHint(null);
    } finally {
      setBusy(false);
    }
  };

  const products = useMemo(
    () =>
      uniqueOptions(
        items,
        (row) => row.productId,
        (row) => row.productName,
      ),
    [items],
  );
  const patients = useMemo(
    () =>
      uniqueOptions(
        items,
        (row) => row.patientId,
        (row) => row.patientName,
      ),
    [items],
  );
  const pharmacists = useMemo(
    () =>
      uniqueOptions(
        items,
        (row) => row.pharmacistUserId,
        (row) => row.pharmacistName,
      ),
    [items],
  );

  return {
    allowed,
    status,
    statusId,
    statusHint,
    items,
    filters,
    busy,
    spreadsheetRef,
    ndpsRef,
    products,
    patients,
    pharmacists,
    onChangeFilters: setFilters,
    onApplyFilters: () => {
      void load();
    },
    onSpreadsheet: () => {
      void onExport('csv');
    },
    onNdps: () => {
      void onExport('ndps');
    },
  };
}
