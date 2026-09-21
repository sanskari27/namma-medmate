import type { RootState } from '@/store';
import {
  downloadHospitalSalesRegister,
  getHospitalSalesRegister,
  isApiError,
  type HospitalSalesRegister,
} from '@/services/hospital';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  emptyFilters,
  hasRegisterAccess,
  isCashierWithoutRegister,
  mapHttpStatus,
  rangeValid,
  saveBlob,
  toQuery,
  wardOptions,
  type PageStatus,
  type RegisterFilters,
} from './HospitalSalesRegisterScreen.utils';

export function useHospitalSalesRegister() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasRegisterAccess(user?.role, user?.modules);
  const cashierDenied = isCashierWithoutRegister(user?.role, user?.modules, user?.roles);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<RegisterFilters>(emptyFilters);
  const [register, setRegister] = useState<HospitalSalesRegister | null>(null);
  const [exportBusy, setExportBusy] = useState(false);

  const load = useCallback(async () => {
    if (cashierDenied) {
      setStatus('denied');
      setMessage(null);
      return;
    }
    if (!allowed) {
      setStatus('plan_limit');
      setMessage(null);
      return;
    }
    if (!user?.activeBranchId) {
      setStatus('no_branch');
      setMessage(null);
      return;
    }
    if (!rangeValid(filters.from, filters.to)) {
      setStatus('validation');
      setMessage(null);
      return;
    }
    setStatus('loading');
    setMessage(null);
    try {
      const next = await getHospitalSalesRegister(toQuery(filters));
      setRegister(next);
      setStatus(next.items.length === 0 ? 'empty' : null);
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapHttpStatus(error.status, error.code));
      } else {
        setStatus('failure');
      }
      setMessage(null);
    }
  }, [allowed, cashierDenied, filters, user?.activeBranchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onExport(format: 'csv' | 'pdf', trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    if (!rangeValid(filters.from, filters.to)) {
      setStatus('validation');
      setMessage(null);
      return;
    }
    setExportBusy(true);
    try {
      const blob = await downloadHospitalSalesRegister(format, toQuery(filters));
      saveBlob(blob, format === 'csv' ? 'patient-sales.csv' : 'patient-sales.pdf');
      setStatus('success');
      setMessage(null);
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapHttpStatus(error.status, error.code));
      } else {
        setStatus('failure');
      }
      setMessage(null);
    } finally {
      setExportBusy(false);
      restoreRef.current?.focus();
    }
  }

  const formDisabled =
    !allowed ||
    cashierDenied ||
    status === 'loading' ||
    status === 'denied' ||
    status === 'plan_limit' ||
    status === 'no_branch';

  const showWorkspace =
    allowed &&
    !cashierDenied &&
    Boolean(user?.activeBranchId) &&
    status !== 'loading' &&
    status !== 'denied' &&
    status !== 'plan_limit' &&
    status !== 'no_branch';

  return {
    status,
    message,
    filters,
    register,
    exportBusy,
    formDisabled,
    showWorkspace,
    wards: wardOptions(register?.items ?? []),
    setFilters,
    load,
    onExport,
    onDismiss: () => setStatus(register?.items.length ? null : 'empty'),
  };
}
