import { hasHospitalAccess } from '@/libs/hospitalAccess';
import type { RootState } from '@/store';
import {
  createHospitalDoctor,
  getHospitalDepartments,
  getHospitalDoctors,
  isApiError,
  updateHospitalDoctor,
  type HospitalDepartment,
  type HospitalDoctor,
} from '@/services/hospital';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { HospitalDoctorDialog } from './components/hospital-doctor-dialog';
import { HospitalDoctorsHeader } from './components/hospital-doctors-header';
import { HospitalDoctorsList } from './components/hospital-doctors-list';
import { HospitalDoctorsStatusBanner } from './components/hospital-doctors-status-banner';
import { HOSPITAL_DOCTORS_CONTENT } from './HospitalDoctorsScreen.content';
import './HospitalDoctorsScreen.css';
import {
  doctorToDraft,
  emptyDraft,
  mapHttpStatus,
  parseExperience,
  parseFeePaise,
  type DoctorDraft,
  type PageStatus,
} from './HospitalDoctorsScreen.utils';

export default function HospitalDoctorsScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasHospitalAccess(user?.modules);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [doctors, setDoctors] = useState<HospitalDoctor[]>([]);
  const [departments, setDepartments] = useState<HospitalDepartment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [draft, setDraft] = useState<DoctorDraft>(emptyDraft());

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('plan_limit');
      return;
    }
    setStatus('loading');
    try {
      const [doctorRows, departmentRows] = await Promise.all([
        getHospitalDoctors(),
        getHospitalDepartments().catch(() => []),
      ]);
      setDoctors(doctorRows);
      setDepartments(departmentRows);
      setStatus(doctorRows.length === 0 ? 'empty' : null);
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

  function openEdit(doctor: HospitalDoctor, trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    setDraft(doctorToDraft(doctor));
    setDialogMessage(null);
    setDialogOpen(true);
  }

  async function onSaveDoctor(trigger: HTMLButtonElement) {
    void trigger;
    if (!draft.name.trim() || !draft.status) {
      setDialogMessage(HOSPITAL_DOCTORS_CONTENT.validation);
      return;
    }
    const feePaise = parseFeePaise(draft.consultationFeeRupees);
    if (feePaise == null) {
      setDialogMessage(HOSPITAL_DOCTORS_CONTENT.validation);
      return;
    }
    const experienceYears = parseExperience(draft.experienceYears);
    if (draft.experienceYears.trim() && experienceYears == null) {
      setDialogMessage(HOSPITAL_DOCTORS_CONTENT.validation);
      return;
    }
    setDialogMessage(null);
    setSaveBusy(true);
    try {
      const payload = {
        name: draft.name.trim(),
        registrationNumber: draft.registrationNumber.trim() || null,
        phone: draft.phone.trim() || null,
        departmentId: draft.departmentId.trim() || null,
        qualification: draft.qualification.trim() || null,
        specialty: draft.specialty.trim() || null,
        gender: draft.gender.trim() || null,
        experienceYears,
        email: draft.email.trim() || null,
        opdRoom: draft.opdRoom.trim() || null,
        consultingDays: draft.consultingDays.trim() || null,
        consultingHours: draft.consultingHours.trim() || null,
        consultationFeePaise: feePaise,
        status: draft.status,
        languages: draft.languages.trim() || null,
        notes: draft.notes.trim() || null,
        expectedVersion: draft.doctorId ? draft.version : null,
      };
      if (draft.doctorId) {
        await updateHospitalDoctor(draft.doctorId, payload);
      } else {
        await createHospitalDoctor(payload);
      }
      const doctorRows = await getHospitalDoctors();
      setDoctors(doctorRows);
      setDialogOpen(false);
      setStatus('success');
    } catch (error) {
      if (isApiError(error)) {
        const mapped = mapHttpStatus(error.status, error.code);
        if (mapped === 'registration_taken') {
          setDialogMessage(HOSPITAL_DOCTORS_CONTENT.registrationTaken);
        } else if (mapped === 'conflict') {
          setDialogMessage(HOSPITAL_DOCTORS_CONTENT.conflict);
        } else if (mapped === 'validation') {
          setDialogMessage(HOSPITAL_DOCTORS_CONTENT.validation);
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
    <div className="hdoc" aria-label={HOSPITAL_DOCTORS_CONTENT.regionLabel}>
      <HospitalDoctorsHeader disabled={formDisabled} onManage={(trigger) => openCreate(trigger)} />

      <HospitalDoctorsStatusBanner
        status={status}
        onDismiss={() => setStatus(doctors.length ? null : 'empty')}
        onRetry={() => void load()}
      />

      {allowed && status !== 'loading' && status !== 'denied' && status !== 'plan_limit' ? (
        doctors.length > 0 ? (
          <HospitalDoctorsList doctors={doctors} onEdit={openEdit} />
        ) : null
      ) : null}

      <HospitalDoctorDialog
        open={dialogOpen}
        busy={saveBusy}
        draft={draft}
        departments={departments}
        message={dialogMessage}
        onOpenChange={setDialogOpen}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onSave={(trigger) => void onSaveDoctor(trigger)}
      />
    </div>
  );
}
