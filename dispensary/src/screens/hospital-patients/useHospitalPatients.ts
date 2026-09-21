import {
  dischargeHospitalAdmission,
  getHospitalActivePatient,
  getHospitalActivePatients,
  getHospitalCasualtyPatient,
  isApiError,
  settleHospitalAdmission,
  settleHospitalCasualty,
  type HospitalActivePatient,
  type HospitalActivePatientDetail,
  type HospitalActivePatientView,
} from '@/services/hospital';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthUser } from '@/store/auth.slice';
import { HOSPITAL_PATIENTS_CONTENT } from './HospitalPatientsScreen.content';
import {
  canDischargeStay,
  emptySettleDraft,
  mapHttpStatus,
  patientRowKey,
  settleValidation,
  type PageStatus,
  type SettleDraft,
} from './HospitalPatientsScreen.utils';

export function useHospitalPatients(
  allowed: boolean,
  user: AuthUser | null,
  admissionIdFromRoute: string | null,
) {
  const restoreRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [view, setView] = useState<HospitalActivePatientView>('unsettled');
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<HospitalActivePatient[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(admissionIdFromRoute);
  const [detail, setDetail] = useState<HospitalActivePatientDetail | null>(null);
  const [draft, setDraft] = useState<SettleDraft>(emptySettleDraft());
  const [busy, setBusy] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const canDischarge = canDischargeStay(user);
  const branchId = user?.activeBranchId ?? null;

  const load = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!allowed) {
        setStatus('plan_limit');
        return;
      }
      if (!branchId) {
        setMessage(HOSPITAL_PATIENTS_CONTENT.noBranch);
        setStatus('no_branch');
        return;
      }
      if (!opts?.quiet) {
        setStatus('loading');
      }
      try {
        const data = await getHospitalActivePatients({
          view,
          q: query.trim() || undefined,
        });
        const nextItems = data.items ?? [];
        setItems(nextItems);
        setSelectedKey((current) => {
          if (current && nextItems.some((row) => patientRowKey(row) === current)) {
            return current;
          }
          if (admissionIdFromRoute && nextItems.some((row) => row.admissionId === admissionIdFromRoute)) {
            return admissionIdFromRoute;
          }
          return null;
        });
        if (!opts?.quiet) {
          setStatus(nextItems.length === 0 ? 'empty' : null);
        }
      } catch (error) {
        if (isApiError(error)) {
          const nextStatus = mapHttpStatus(error.status, error.code);
          setStatus(nextStatus);
          setMessage(
            nextStatus === 'denied' || nextStatus === 'conflict' || nextStatus === 'failure'
              ? null
              : error.message,
          );
        } else {
          setStatus('failure');
        }
      }
    },
    [allowed, branchId, view, query, admissionIdFromRoute],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const row = items.find((item) => patientRowKey(item) === selectedKey);
    if (!row) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    const fetchDetail = async () => {
      try {
        const next =
          row.kind === 'CASUALTY' || !row.admissionId
            ? await getHospitalCasualtyPatient(row.uhid)
            : await getHospitalActivePatient(row.admissionId);
        if (!cancelled) {
          setDetail(next);
          setDraft(emptySettleDraft());
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (isApiError(error)) {
          setStatus(mapHttpStatus(error.status, error.code));
          setMessage(error.message);
        } else {
          setStatus('failure');
        }
      }
    };
    void fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [items, selectedKey]);

  useEffect(() => {
    if (status === 'success' && !dischargeOpen) {
      restoreRef.current?.focus();
    }
  }, [status, dischargeOpen]);

  const selectRow = (row: HospitalActivePatient) => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedKey(patientRowKey(row));
  };

  const applyError = (error: unknown) => {
    if (isApiError(error)) {
      setStatus(mapHttpStatus(error.status, error.code));
      if (error.code === 'OUTSTANDING_BILLS') {
        setMessage(HOSPITAL_PATIENTS_CONTENT.outstanding);
      } else if (error.status === 403 || error.status === 409 || error.status >= 500) {
        setMessage(null);
      } else {
        setMessage(error.message);
      }
    } else {
      setStatus('failure');
    }
  };

  const settle = async () => {
    if (!detail) {
      return;
    }
    const invalid = settleValidation(draft);
    if (invalid || !draft.paymentMode) {
      setMessage(invalid ?? HOSPITAL_PATIENTS_CONTENT.validation);
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      const input = {
        paymentMode: draft.paymentMode,
        idempotencyKey: crypto.randomUUID(),
        insurerName: draft.insurerName.trim() || null,
        policyNumber: draft.policyNumber.trim() || null,
      };
      const next =
        detail.kind === 'CASUALTY' || !detail.admissionId
          ? await settleHospitalCasualty({ ...input, uhid: detail.uhid })
          : await settleHospitalAdmission(detail.admissionId, {
              ...input,
              expectedVersion: detail.version,
            });
      setDetail(next);
      setMessage(HOSPITAL_PATIENTS_CONTENT.settled);
      setStatus('success');
      await load({ quiet: true });
    } catch (error) {
      applyError(error);
    } finally {
      setBusy(false);
    }
  };

  const discharge = async () => {
    if (!detail?.admissionId) {
      return;
    }
    if (detail.unpaidPaise > 0 && draft.paymentMode) {
      const invalid = settleValidation(draft);
      if (invalid) {
        setMessage(invalid);
        setStatus('validation');
        return;
      }
    }
    setBusy(true);
    try {
      const next = await dischargeHospitalAdmission(detail.admissionId, {
        expectedVersion: detail.version,
        idempotencyKey: crypto.randomUUID(),
        paymentMode: draft.paymentMode || null,
        insurerName: draft.insurerName.trim() || null,
        policyNumber: draft.policyNumber.trim() || null,
      });
      setDetail(next);
      setDischargeOpen(false);
      setMessage(HOSPITAL_PATIENTS_CONTENT.discharged);
      setStatus('success');
      await load({ quiet: true });
    } catch (error) {
      applyError(error);
    } finally {
      setBusy(false);
    }
  };

  return {
    status,
    message,
    view,
    query,
    items,
    selectedKey,
    detail,
    draft,
    busy,
    dischargeOpen,
    canDischarge,
    setView,
    setQuery,
    setDraft,
    selectRow,
    settle,
    discharge,
    openDischarge: () => {
      restoreRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : restoreRef.current;
      setDischargeOpen(true);
    },
    closeDischarge: () => setDischargeOpen(false),
    restoreFocus: () => restoreRef.current?.focus(),
    dismiss: () => {
      setStatus(items.length === 0 ? 'empty' : null);
      setMessage(null);
    },
    load,
  };
}
