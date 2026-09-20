import { hasHospitalAccess } from '@/libs/hospitalAccess';
import type { RootState } from '@/store';
import {
  createHospitalWard,
  getHospitalWards,
  isApiError,
  updateHospitalWard,
  type HospitalWard,
  type HospitalWardOccupancy,
} from '@/services/hospital';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { HospitalBedMap } from './components/hospital-bed-map';
import { HospitalOccupancyStrip } from './components/hospital-occupancy-strip';
import { HospitalWardDialog } from './components/hospital-ward-dialog';
import { HospitalWardsHeader } from './components/hospital-wards-header';
import { HospitalWardsStatusBanner } from './components/hospital-wards-status-banner';
import { HOSPITAL_WARDS_CONTENT } from './HospitalWardsScreen.content';
import './HospitalWardsScreen.css';
import {
  emptyDraft,
  mapHttpStatus,
  parseCapacity,
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [draft, setDraft] = useState<WardDraft>(emptyDraft());

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('plan_limit');
      return;
    }
    setStatus('loading');
    try {
      const data = await getHospitalWards();
      setOccupancy(data);
      setStatus(data.wardCount === 0 ? 'empty' : null);
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
      const data = await getHospitalWards();
      setOccupancy(data);
      setDialogOpen(false);
      setStatus('success');
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

  return (
    <div className="hw" aria-label={HOSPITAL_WARDS_CONTENT.regionLabel}>
      <HospitalWardsHeader
        disabled={formDisabled}
        onManage={(trigger) => openCreate(trigger)}
      />

      <HospitalWardsStatusBanner
        status={status}
        onDismiss={() => setStatus(occupancy?.wardCount ? null : 'empty')}
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
            {occupancy.wards.length > 0 ? (
              <HospitalBedMap
                wards={occupancy.wards}
                onEditWard={(ward, trigger) => openEdit(ward, trigger)}
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
    </div>
  );
}
