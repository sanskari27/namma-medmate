import { hasHospitalAccess } from '@/libs/hospitalAccess';
import type { RootState } from '@/store';
import {
  admitHospitalPatient,
  createHospitalWard,
  getHospitalDoctors,
  getHospitalWards,
  getNextHospitalUhid,
  isApiError,
  listHospitalAdmissions,
  updateHospitalWard,
  type HospitalAdmission,
  type HospitalDoctor,
  type HospitalWard,
  type HospitalWardOccupancy,
} from '@/services/hospital';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { HospitalAdmitDialog } from './components/hospital-admit-dialog';
import { HospitalAdmissionsList } from './components/hospital-admissions-list';
import { HospitalBedMap } from './components/hospital-bed-map';
import { HospitalOccupancyStrip } from './components/hospital-occupancy-strip';
import { HospitalOccupiedBedHeader } from './components/hospital-occupied-bed-header';
import { HospitalWardDialog } from './components/hospital-ward-dialog';
import { HospitalWardsHeader } from './components/hospital-wards-header';
import { HospitalWardsStatusBanner } from './components/hospital-wards-status-banner';
import { HOSPITAL_WARDS_CONTENT } from './HospitalWardsScreen.content';
import './HospitalWardsScreen.css';
import {
  admitDraftForBed,
  emptyAdmitDraft,
  emptyDraft,
  mapHttpStatus,
  parseAge,
  parseCapacity,
  type AdmitDraft,
  type PageStatus,
  type WardDraft,
} from './HospitalWardsScreen.utils';

function wardToDraft(ward: HospitalWard): WardDraft {
  return {
    id: ward.id,
    name: ward.name,
    code: ward.code,
    floor: ward.floor ?? '',
    category: ward.category,
    capacity: String(ward.capacity),
    nurseInCharge: ward.nurseInCharge ?? '',
    version: ward.version,
  };
}

export default function HospitalWardsScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasHospitalAccess(user?.modules);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [occupancy, setOccupancy] = useState<HospitalWardOccupancy | null>(null);
  const [admissions, setAdmissions] = useState<HospitalAdmission[]>([]);
  const [doctors, setDoctors] = useState<HospitalDoctor[]>([]);
  const [selectedAdmission, setSelectedAdmission] = useState<HospitalAdmission | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [draft, setDraft] = useState<WardDraft>(emptyDraft());
  const [admitOpen, setAdmitOpen] = useState(false);
  const [admitMessage, setAdmitMessage] = useState<string | null>(null);
  const [admitBusy, setAdmitBusy] = useState(false);
  const [admitDraft, setAdmitDraft] = useState<AdmitDraft>(emptyAdmitDraft());

  const admissionByBed = useMemo(() => {
    const map = new Map<string, HospitalAdmission>();
    for (const admission of admissions) {
      map.set(admission.bedId, admission);
    }
    return map;
  }, [admissions]);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('plan_limit');
      return;
    }
    setStatus('loading');
    try {
      const [wardData, admissionRows, doctorRows] = await Promise.all([
        getHospitalWards(),
        listHospitalAdmissions(),
        getHospitalDoctors().catch(() => []),
      ]);
      setOccupancy(wardData);
      setAdmissions(admissionRows);
      setDoctors(doctorRows);
      setStatus(wardData.wardCount === 0 && admissionRows.length === 0 ? 'empty' : null);
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
    if (!dialogOpen && !admitOpen && (status === 'success_ward' || status === 'success_admit')) {
      restoreRef.current?.focus();
    }
  }, [dialogOpen, admitOpen, status]);

  const formDisabled =
    !allowed || status === 'loading' || status === 'denied' || status === 'plan_limit';

  async function openAdmitForBed(ward: HospitalWard, bedId: string, bedLabel: string) {
    restoreRef.current = null;
    setAdmitMessage(null);
    try {
      const nextUhid = await getNextHospitalUhid();
      setAdmitDraft(admitDraftForBed(ward, bedId, bedLabel, nextUhid));
      setAdmitOpen(true);
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapHttpStatus(error.status, error.code));
      } else {
        setStatus('failure');
      }
    }
  }

  async function openAdmitFromHeader(trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    setAdmitMessage(HOSPITAL_WARDS_CONTENT.selectBedHint);
    setAdmitDraft(emptyAdmitDraft());
    setAdmitOpen(true);
    try {
      const nextUhid = await getNextHospitalUhid();
      setAdmitDraft((current) => ({ ...current, uhid: nextUhid }));
    } catch {
      /* header admit still opens; bed must be picked from map */
    }
  }

  function handleBedSelect(
    ward: HospitalWard,
    bedId: string,
    bedLabel: string,
    occupied: boolean,
  ) {
    if (occupied) {
      const admission = admissionByBed.get(bedId) ?? null;
      setSelectedAdmission(admission);
      return;
    }
    setSelectedAdmission(null);
    void openAdmitForBed(ward, bedId, bedLabel);
  }

  function openCreate(trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    setDraft(emptyDraft());
    setDialogMessage(null);
    setDialogOpen(true);
  }

  function openEdit(ward: HospitalWard, trigger?: HTMLElement) {
    restoreRef.current = trigger ?? null;
    setDraft(wardToDraft(ward));
    setDialogMessage(null);
    setDialogOpen(true);
  }

  async function onSaveWard(trigger: HTMLButtonElement) {
    void trigger;
    if (!draft.name.trim() || !draft.code.trim()) {
      setDialogMessage(HOSPITAL_WARDS_CONTENT.validation);
      return;
    }
    const capacity = parseCapacity(draft.capacity);
    if (capacity == null) {
      setDialogMessage(HOSPITAL_WARDS_CONTENT.validation);
      return;
    }
    setDialogMessage(null);
    setSaveBusy(true);
    try {
      const payload = {
        name: draft.name.trim(),
        code: draft.code.trim(),
        floor: draft.floor.trim() || null,
        category: draft.category,
        capacity,
        nurseInCharge: draft.nurseInCharge.trim() || null,
        expectedVersion: draft.id ? draft.version : null,
      };
      if (draft.id) {
        await updateHospitalWard(draft.id, payload);
      } else {
        await createHospitalWard(payload);
      }
      await load();
      setDialogOpen(false);
      setStatus('success_ward');
    } catch (error) {
      if (isApiError(error)) {
        const mapped = mapHttpStatus(error.status, error.code);
        if (mapped === 'duplicate_code') {
          setDialogMessage(HOSPITAL_WARDS_CONTENT.duplicateCode);
        } else if (mapped === 'conflict') {
          setDialogMessage(HOSPITAL_WARDS_CONTENT.conflict);
        } else if (mapped === 'validation') {
          setDialogMessage(HOSPITAL_WARDS_CONTENT.validation);
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

  async function onSaveAdmission(trigger: HTMLButtonElement) {
    restoreRef.current = trigger;
    if (!admitDraft.patientName.trim() || !admitDraft.uhid.trim()) {
      setAdmitMessage(HOSPITAL_WARDS_CONTENT.admitValidation);
      return;
    }
    if (!admitDraft.wardId || !admitDraft.bedId) {
      setAdmitMessage(HOSPITAL_WARDS_CONTENT.selectBedHint);
      return;
    }
    if (admitDraft.payerType === 'INSURANCE_TPA') {
      if (!admitDraft.insurerName.trim() || !admitDraft.policyNumber.trim()) {
        setAdmitMessage(HOSPITAL_WARDS_CONTENT.tpaIncomplete);
        return;
      }
    }
    const age = parseAge(admitDraft.age);
    if (admitDraft.age.trim() && age == null) {
      setAdmitMessage(HOSPITAL_WARDS_CONTENT.admitValidation);
      return;
    }
    setAdmitMessage(null);
    setAdmitBusy(true);
    try {
      const admission = await admitHospitalPatient({
        patientName: admitDraft.patientName.trim(),
        uhid: admitDraft.uhid.trim(),
        wardId: admitDraft.wardId,
        bedId: admitDraft.bedId,
        phone: admitDraft.phone.trim() || null,
        age,
        gender: admitDraft.gender.trim() || null,
        attendingDoctorId: admitDraft.attendingDoctorId || null,
        diagnosis: admitDraft.diagnosis.trim() || null,
        payerType: admitDraft.payerType,
        insurerName:
          admitDraft.payerType === 'INSURANCE_TPA' ? admitDraft.insurerName.trim() : null,
        policyNumber:
          admitDraft.payerType === 'INSURANCE_TPA' ? admitDraft.policyNumber.trim() : null,
      });
      const wardData = await getHospitalWards();
      const admissionRows = await listHospitalAdmissions();
      setOccupancy(wardData);
      setAdmissions(admissionRows);
      setSelectedAdmission(admission);
      setAdmitOpen(false);
      setStatus('success_admit');
    } catch (error) {
      if (isApiError(error)) {
        if (error.code === 'UHID_TAKEN') {
          setAdmitMessage(HOSPITAL_WARDS_CONTENT.uhidTaken);
        } else if (error.code === 'BED_OCCUPIED') {
          setAdmitMessage(HOSPITAL_WARDS_CONTENT.bedOccupiedError);
        } else if (error.code === 'TPA_INCOMPLETE') {
          setAdmitMessage(HOSPITAL_WARDS_CONTENT.tpaIncomplete);
        } else {
          const mapped = mapHttpStatus(error.status, error.code);
          if (mapped === 'validation') {
            setAdmitMessage(HOSPITAL_WARDS_CONTENT.admitValidation);
          } else if (mapped === 'conflict') {
            setAdmitMessage(HOSPITAL_WARDS_CONTENT.uhidTaken);
          } else {
            setStatus(mapped);
          }
        }
      } else {
        setStatus('failure');
      }
    } finally {
      setAdmitBusy(false);
    }
  }

  return (
    <div className="hw" aria-label={HOSPITAL_WARDS_CONTENT.regionLabel}>
      <HospitalWardsHeader
        disabled={formDisabled}
        onManage={(trigger) => openCreate(trigger)}
        onAdmit={(trigger) => void openAdmitFromHeader(trigger)}
      />

      <HospitalWardsStatusBanner
        status={status}
        onDismiss={() =>
          setStatus(occupancy?.wardCount || admissions.length ? null : 'empty')
        }
        onRetry={() => void load()}
      />

      {allowed && status !== 'loading' && status !== 'denied' && status !== 'plan_limit' ? (
        occupancy ? (
          <>
            <HospitalOccupancyStrip
              wardCount={occupancy.wardCount}
              totalBeds={occupancy.totalBeds}
              occupiedBeds={occupancy.occupiedBeds}
              freeBeds={occupancy.freeBeds}
              occupancyPercent={occupancy.occupancyPercent}
              admittedCount={occupancy.admittedCount}
            />
            {selectedAdmission ? (
              <HospitalOccupiedBedHeader
                admission={selectedAdmission}
                onClose={() => setSelectedAdmission(null)}
              />
            ) : null}
            <HospitalAdmissionsList
              admissions={admissions}
              selectedBedId={selectedAdmission?.bedId ?? null}
              onSelect={(admission) => setSelectedAdmission(admission)}
            />
            {occupancy.wards.length > 0 ? (
              <HospitalBedMap
                wards={occupancy.wards}
                onEditWard={(ward, trigger) => openEdit(ward, trigger)}
                onSelectBed={handleBedSelect}
              />
            ) : null}
          </>
        ) : null
      ) : null}

      <HospitalWardDialog
        open={dialogOpen}
        busy={saveBusy}
        draft={draft}
        message={dialogMessage}
        onOpenChange={setDialogOpen}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onSave={(trigger) => void onSaveWard(trigger)}
      />

      <HospitalAdmitDialog
        open={admitOpen}
        busy={admitBusy}
        draft={admitDraft}
        doctors={doctors}
        message={admitMessage}
        onOpenChange={setAdmitOpen}
        onChange={(patch) => setAdmitDraft((current) => ({ ...current, ...patch }))}
        onSave={(trigger) => void onSaveAdmission(trigger)}
      />
    </div>
  );
}
