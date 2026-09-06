import { isApiError } from '@/services/axios';
import {
  downloadFinanceReport,
  getFinanceReport,
  listFinanceReports,
  type FinanceReportCatalogItem,
  type FinanceReportTable,
} from '@/services/financeReports';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  emptyFilters,
  filenameFor,
  filtersValid,
  hasFinanceAccess,
  isFutureRange,
  mapApiStatus,
  toQuery,
  type FilterState,
  type OutletScope,
  type PageStatus,
} from './ShopBooksScreen.utils';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useShopBooksPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasFinanceAccess(user?.role, user?.modules);
  const owner = user?.role === 'pharmacy_owner';
  const activeBranchId = user?.activeBranchId ?? null;
  const statusId = useId();
  const spreadsheetRef = useRef<HTMLButtonElement | null>(null);
  const pdfRef = useRef<HTMLButtonElement | null>(null);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [books, setBooks] = useState<FinanceReportCatalogItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [table, setTable] = useState<FinanceReportTable | null>(null);
  const [filters, setFilters] = useState<FilterState>(emptyFilters());
  const [scope, setScope] = useState<OutletScope>('session');
  const [busy, setBusy] = useState(false);

  const query = useCallback(() => toQuery(filters, owner ? scope : 'session'), [filters, owner, scope]);

  const loadCatalog = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    if (!activeBranchId) {
      setStatus('failure');
      setStatusHint('Select an outlet before opening shop books.');
      return;
    }
    setStatus('loading');
    setStatusHint(null);
    try {
      const items = await listFinanceReports(query());
      setBooks(items);
      setSelectedKey((current) => current ?? items[0]?.key ?? null);
      if (items.length === 0) {
        setStatus('empty');
      }
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
        setStatusHint(apiStatusHint(error.code));
        return;
      }
      setStatus('failure');
      setStatusHint(null);
    }
  }, [allowed, activeBranchId, query]);

  const loadTable = useCallback(async () => {
    if (!allowed || !selectedKey) {
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
      const next = await getFinanceReport(selectedKey, query());
      setTable(next);
      setStatus(next.items.length === 0 ? 'empty' : null);
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
        setStatusHint(apiStatusHint(error.code) ?? error.message);
        return;
      }
      setStatus('failure');
      setStatusHint(null);
    }
  }, [allowed, selectedKey, filters, query]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (selectedKey) {
      void loadTable();
    }
  }, [selectedKey, loadTable]);

  const onApplyFilters = () => {
    if (!filtersValid(filters) || isFutureRange(filters)) {
      setStatus('validation');
      setStatusHint(
        isFutureRange(filters)
          ? 'Report dates must be today or earlier.'
          : 'Choose a period that starts on or before the end date.',
      );
      return;
    }
    void loadTable();
  };

  const onExport = async (format: 'csv' | 'pdf') => {
    if (!selectedKey) {
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
    setBusy(true);
    try {
      const blob = await downloadFinanceReport(selectedKey, format, query());
      downloadBlob(blob, filenameFor(selectedKey, format));
      setStatus('success');
      setStatusHint(
        format === 'pdf'
          ? 'Print file saved for this shop book.'
          : 'Spreadsheet saved for this shop book.',
      );
      const focusTarget = format === 'pdf' ? pdfRef : spreadsheetRef;
      window.setTimeout(() => focusTarget.current?.focus(), 0);
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
    books,
    selectedKey,
    table,
    filters,
    scope,
    busy,
    spreadsheetRef,
    pdfRef,
    onSelectBook: setSelectedKey,
    onChangeFilters: setFilters,
    onScope: setScope,
    onApplyFilters,
    onSpreadsheet: () => {
      void onExport('csv');
    },
    onPdf: () => {
      void onExport('pdf');
    },
  };
}
