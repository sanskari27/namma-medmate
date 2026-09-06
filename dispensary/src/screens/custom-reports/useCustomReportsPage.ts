import { isApiError } from '@/services/axios';
import {
  downloadCustomReport,
  getCustomReportCatalog,
  previewCustomReport,
  type CustomReportCatalog,
  type CustomReportPreview,
  type CustomReportQuery,
} from '@/services/customReports';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  emptyDraft,
  filenameFor,
  filtersValid,
  hasReportingAccess,
  isFutureRange,
  mapApiStatus,
  toApiFilters,
  todayIst,
  type FilterDraft,
  type OutletScope,
  type PageStatus,
} from './CustomReportsScreen.utils';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useCustomReportsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasReportingAccess(user?.role, user?.modules);
  const owner = user?.role === 'pharmacy_owner';
  const activeBranchId = user?.activeBranchId ?? null;
  const statusId = useId();
  const applyRef = useRef<HTMLButtonElement | null>(null);
  const spreadsheetRef = useRef<HTMLButtonElement | null>(null);
  const pdfRef = useRef<HTMLButtonElement | null>(null);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(
    allowed ? null : 'Till staff cannot build a report. Ask the owner for Accounts access.',
  );
  const [planGate, setPlanGate] = useState(false);
  const [catalog, setCatalog] = useState<CustomReportCatalog | null>(null);
  const [preview, setPreview] = useState<CustomReportPreview | null>(null);
  const [dataset, setDataset] = useState('SALES');
  const [columns, setColumns] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterDraft>(emptyDraft());
  const [from, setFrom] = useState(todayIst);
  const [to, setTo] = useState(todayIst);
  const [scope, setScope] = useState<OutletScope>(
    owner && !user?.activeBranchId ? 'tenant' : 'session',
  );
  const [busy, setBusy] = useState(false);

  const selectedDataset =
    catalog?.datasets.find((item) => item.key === dataset) ?? catalog?.datasets[0];
  const fields = selectedDataset?.fields ?? [];

  const query = useCallback((): CustomReportQuery => {
    return {
      dataset: selectedDataset?.key ?? dataset,
      columns,
      filters: toApiFilters(filter),
      from,
      to,
      scope: owner && scope === 'tenant' ? 'tenant' : undefined,
    };
  }, [columns, dataset, filter, from, owner, scope, selectedDataset?.key, to]);

  const applyStatus = useCallback((error: unknown) => {
    if (isApiError(error)) {
      setStatus(mapApiStatus(error));
      setStatusHint(apiStatusHint(error.code));
      setPlanGate(error.code === 'PLAN_LIMIT');
      return;
    }
    setStatus('failure');
    setStatusHint(null);
    setPlanGate(false);
  }, []);

  const loadPreview = useCallback(
    async (restore: HTMLButtonElement | null = null) => {
      if (!allowed || columns.length === 0) {
        return;
      }
      if (!filtersValid(from, to) || isFutureRange(to)) {
        setStatus('validation');
        setStatusHint(
          isFutureRange(to)
            ? 'Report dates must be today or earlier.'
            : 'Choose a period that starts on or before the end date.',
        );
        return;
      }
      if (!activeBranchId && !(owner && scope === 'tenant')) {
        setStatus('failure');
        setStatusHint('Select an outlet before building a report.');
        return;
      }
      setBusy(true);
      setStatus('loading');
      setStatusHint(null);
      try {
        const next = await previewCustomReport(query());
        setPreview(next);
        setStatus(next.items.length === 0 ? 'empty' : 'success');
      } catch (error) {
        setPreview(null);
        applyStatus(error);
      } finally {
        setBusy(false);
        if (restore) {
          queueMicrotask(() => restore.focus());
        }
      }
    },
    [activeBranchId, allowed, applyStatus, columns.length, from, owner, query, scope, to],
  );

  const loadCatalog = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    setStatusHint(null);
    setPlanGate(false);
    try {
      const next = await getCustomReportCatalog();
      setCatalog(next);
      const first = next.datasets[0];
      if (first) {
        setDataset(first.key);
        setColumns(first.fields.map((field) => field.key));
      }
    } catch (error) {
      applyStatus(error);
    }
  }, [allowed, applyStatus]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const readyColumns = columns.length > 0 && catalog !== null;
  useEffect(() => {
    if (!readyColumns || status === 'denied') {
      return;
    }
    void loadPreview();
    // First preview after catalog columns land.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyColumns, dataset]);

  const onSelectDataset = (key: string) => {
    const next = catalog?.datasets.find((item) => item.key === key);
    setDataset(key);
    setColumns(next ? next.fields.map((field) => field.key) : []);
    setFilter(emptyDraft());
    setPreview(null);
  };

  const onToggleColumn = (key: string) => {
    setColumns((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  };

  const exportFile = async (format: 'csv' | 'pdf', restore: HTMLButtonElement | null) => {
    if (!allowed || columns.length === 0) {
      return;
    }
    if (!filtersValid(from, to)) {
      setStatus('validation');
      setStatusHint('Choose a period that starts on or before the end date.');
      return;
    }
    setBusy(true);
    try {
      const blob = await downloadCustomReport(query(), format);
      downloadBlob(blob, filenameFor(selectedDataset?.key ?? dataset, format));
      setStatus('success');
      setStatusHint(
        format === 'pdf'
          ? 'Print file saved for this report.'
          : 'Spreadsheet saved for this report.',
      );
    } catch (error) {
      applyStatus(error);
    } finally {
      setBusy(false);
      queueMicrotask(() => restore?.focus());
    }
  };

  return {
    allowed,
    owner,
    planGate,
    status,
    statusId,
    statusHint,
    catalog,
    preview,
    dataset: selectedDataset?.key ?? dataset,
    fields,
    columns,
    operators: catalog?.operators ?? [],
    filter,
    from,
    to,
    scope,
    busy,
    applyRef,
    spreadsheetRef,
    pdfRef,
    onSelectDataset,
    onToggleColumn,
    onFilter: setFilter,
    onFrom: setFrom,
    onTo: setTo,
    onScope: setScope,
    onApply: () => void loadPreview(applyRef.current),
    onSpreadsheet: () => void exportFile('csv', spreadsheetRef.current),
    onPdf: () => void exportFile('pdf', pdfRef.current),
  };
}
