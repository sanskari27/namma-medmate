import { isApiError } from '@/services/axios';
import {
  downloadComplianceReport,
  getComplianceReport,
  listComplianceReports,
  type ComplianceReportCatalogItem,
  type ComplianceReportTable,
} from '@/services/complianceReports';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  bookEntitled,
  emptyFilters,
  filenameFor,
  filtersValid,
  firstEntitledKey,
  hasRegisterAccess,
  mapApiStatus,
  toQuery,
  type FilterState,
  type PageStatus,
} from './RegistersScreen.utils';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useRegistersPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasRegisterAccess(user?.modules);
  const activeBranchId = user?.activeBranchId ?? null;
  const statusId = useId();
  const spreadsheetRef = useRef<HTMLButtonElement | null>(null);
  const pdfRef = useRef<HTMLButtonElement | null>(null);
  const upgradeRef = useRef<HTMLAnchorElement | null>(null);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [books, setBooks] = useState<ComplianceReportCatalogItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [table, setTable] = useState<ComplianceReportTable | null>(null);
  const [filters, setFilters] = useState<FilterState>(emptyFilters());
  const [busy, setBusy] = useState(false);
  const [planLimit, setPlanLimit] = useState(false);

  const selectedBook = books.find((book) => book.key === selectedKey) ?? null;
  const showBatch = selectedBook?.filters.includes('batchNumber') === true;
  const planGate = (selectedBook != null && !bookEntitled(selectedBook)) || planLimit;

  const loadCatalog = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    if (!activeBranchId) {
      setStatus('failure');
      setStatusHint('Select an outlet before opening the register book.');
      return;
    }
    setStatus('loading');
    setStatusHint(null);
    try {
      const items = await listComplianceReports();
      setBooks(items);
      setSelectedKey((current) => {
        if (current && items.some((item) => item.key === current)) {
          return current;
        }
        return firstEntitledKey(items);
      });
      if (items.length === 0) {
        setStatus('empty');
      }
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      setStatusHint(null);
    }
  }, [allowed, activeBranchId]);

  const loadTable = useCallback(async () => {
    if (!allowed || !selectedKey) {
      return;
    }
    const selected = books.find((book) => book.key === selectedKey);
    if (selected && !bookEntitled(selected)) {
      setTable(null);
      setPlanLimit(false);
      setStatus('denied');
      setStatusHint(
        selected.upgradeHint ?? 'Near-expiry is on Starter. Open the plan to turn it on.',
      );
      window.setTimeout(() => upgradeRef.current?.focus(), 0);
      return;
    }
    if (!filtersValid(filters)) {
      setStatus('validation');
      setStatusHint(null);
      return;
    }
    setStatus('loading');
    setStatusHint(null);
    setPlanLimit(false);
    try {
      const next = await getComplianceReport(selectedKey, toQuery(filters));
      setTable(next);
      setStatus(next.items.length === 0 ? 'empty' : null);
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
        setStatusHint(apiStatusHint(error.code));
        if (error.code === 'PLAN_LIMIT') {
          setTable(null);
          setPlanLimit(true);
          window.setTimeout(() => upgradeRef.current?.focus(), 0);
        }
        return;
      }
      setStatus('failure');
      setStatusHint(null);
    }
  }, [allowed, selectedKey, books, filters]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (selectedKey) {
      void loadTable();
    }
  }, [selectedKey, loadTable]);

  const onExport = async (format: 'csv' | 'pdf') => {
    if (!selectedKey || planGate) {
      return;
    }
    if (!filtersValid(filters)) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      const blob = await downloadComplianceReport(selectedKey, format, toQuery(filters));
      downloadBlob(blob, filenameFor(selectedKey, format));
      setStatus('success');
      setStatusHint(
        format === 'pdf' ? 'PDF saved for this outlet.' : 'Spreadsheet saved for this outlet.',
      );
      const focusTarget = format === 'pdf' ? pdfRef : spreadsheetRef;
      window.setTimeout(() => focusTarget.current?.focus(), 0);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      setStatusHint(null);
    } finally {
      setBusy(false);
    }
  };

  return {
    allowed,
    status,
    statusId,
    statusHint,
    books,
    selectedKey,
    table,
    filters,
    busy,
    showBatch,
    planGate,
    upgradeHint: selectedBook?.upgradeHint ?? null,
    spreadsheetRef,
    pdfRef,
    upgradeRef,
    onSelectBook: setSelectedKey,
    onChangeFilters: setFilters,
    onApplyFilters: () => {
      void loadTable();
    },
    onSpreadsheet: () => {
      void onExport('csv');
    },
    onPdf: () => {
      void onExport('pdf');
    },
  };
}
