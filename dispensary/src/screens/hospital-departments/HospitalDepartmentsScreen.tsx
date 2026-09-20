import { hasHospitalAccess } from '@/libs/hospitalAccess';
import type { RootState } from '@/store';
import {
  createHospitalDepartment,
  getHospitalDepartments,
  getHospitalDoctors,
  isApiError,
  updateHospitalDepartment,
  type HospitalDepartment,
  type HospitalDoctor,
} from '@/services/hospital';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { HospitalDepartmentDialog } from './components/hospital-department-dialog';
import { HospitalDepartmentsHeader } from './components/hospital-departments-header';
import { HospitalDepartmentsList } from './components/hospital-departments-list';
import { HospitalDepartmentsStatusBanner } from './components/hospital-departments-status-banner';
import { HOSPITAL_DEPARTMENTS_CONTENT } from './HospitalDepartmentsScreen.content';
import './HospitalDepartmentsScreen.css';
import {
  emptyDraft,
  mapHttpStatus,
  type DepartmentDraft,
  type PageStatus,
} from './HospitalDepartmentsScreen.utils';

function departmentToDraft(department: HospitalDepartment): DepartmentDraft {
  return {
    id: department.id,
    name: department.name,
    type: department.type,
    headDoctorId: department.headDoctorId ?? '',
    version: department.version,
  };
}

export default function HospitalDepartmentsScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasHospitalAccess(user?.modules);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [departments, setDepartments] = useState<HospitalDepartment[]>([]);
  const [doctors, setDoctors] = useState<HospitalDoctor[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [draft, setDraft] = useState<DepartmentDraft>(emptyDraft());

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('plan_limit');
      return;
    }
    setStatus('loading');
    try {
      const [departmentRows, doctorRows] = await Promise.all([
        getHospitalDepartments(),
        getHospitalDoctors().catch(() => []),
      ]);
      setDepartments(departmentRows);
      setDoctors(doctorRows);
      setStatus(departmentRows.length === 0 ? 'empty' : null);
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapHttpStatus(error.status, error.code));
      } else {
        setStatus('failure');
      }
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dialogOpen && status === 'success') {
      restoreRef.current?.focus();
    }
  }, [dialogOpen, status]);

  const formDisabled =
    !allowed || status === 'loading' || status === 'denied' || status === 'plan_limit';

  function openCreate(trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    setDraft(emptyDraft());
    setDialogMessage(null);
    setDialogOpen(true);
  }

  function openEdit(department: HospitalDepartment, trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    setDraft(departmentToDraft(department));
    setDialogMessage(null);
    setDialogOpen(true);
  }

  async function onSaveDepartment(trigger: HTMLButtonElement) {
    void trigger;
    if (!draft.name.trim() || !draft.type) {
      setDialogMessage(HOSPITAL_DEPARTMENTS_CONTENT.validation);
      return;
    }
    setDialogMessage(null);
    setSaveBusy(true);
    try {
      const payload = {
        name: draft.name.trim(),
        type: draft.type,
        headDoctorId: draft.headDoctorId.trim() || null,
        expectedVersion: draft.id ? draft.version : null,
      };
      if (draft.id) {
        await updateHospitalDepartment(draft.id, payload);
      } else {
        await createHospitalDepartment(payload);
      }
      const departmentRows = await getHospitalDepartments();
      setDepartments(departmentRows);
      setDialogOpen(false);
      setStatus('success');
    } catch (error) {
      if (isApiError(error)) {
        const mapped = mapHttpStatus(error.status, error.code);
        if (mapped === 'duplicate_name') {
          setDialogMessage(HOSPITAL_DEPARTMENTS_CONTENT.duplicateName);
        } else if (mapped === 'conflict') {
          setDialogMessage(HOSPITAL_DEPARTMENTS_CONTENT.conflict);
        } else if (mapped === 'validation') {
          setDialogMessage(HOSPITAL_DEPARTMENTS_CONTENT.validation);
        } else {
          setStatus(mapped);
        }
      } else {
        setStatus('failure');
      }
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="hd" aria-label={HOSPITAL_DEPARTMENTS_CONTENT.regionLabel}>
      <HospitalDepartmentsHeader
        disabled={formDisabled}
        onManage={(trigger) => openCreate(trigger)}
      />

      <HospitalDepartmentsStatusBanner
        status={status}
        onDismiss={() => setStatus(departments.length ? null : 'empty')}
        onRetry={() => void load()}
      />

      {allowed && status !== 'loading' && status !== 'denied' && status !== 'plan_limit' ? (
        departments.length > 0 ? (
          <HospitalDepartmentsList departments={departments} onEdit={openEdit} />
        ) : null
      ) : null}

      <HospitalDepartmentDialog
        open={dialogOpen}
        busy={saveBusy}
        draft={draft}
        doctors={doctors}
        message={dialogMessage}
        onOpenChange={setDialogOpen}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onSave={(trigger) => void onSaveDepartment(trigger)}
      />
    </div>
  );
}
