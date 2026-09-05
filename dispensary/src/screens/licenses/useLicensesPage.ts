import { isApiError } from '@/services/axios';
import { listBranches, type Branch } from '@/services/branches';
import {
  createLicense,
  listLicenses,
  renewLicense,
  type ComplianceLicense,
} from '@/services/licenses';
import { listStaff, type StaffAccount } from '@/services/staff';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  emptyForm,
  formValid,
  isOwner,
  mapApiStatus,
  type FormState,
  type PageStatus,
} from './LicensesScreen.utils';

export function useLicensesPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const statusId = useId();
  const addRef = useRef<HTMLButtonElement | null>(null);
  const allowed = isOwner(user?.role);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [items, setItems] = useState<ComplianceLicense[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busy, setBusy] = useState(false);

  const selected = items.find((row) => row.id === selectedId) ?? null;

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    setStatusHint(null);
    try {
      const [licenses, outlets, people] = await Promise.all([
        listLicenses(),
        listBranches().catch(() => [] as Branch[]),
        listStaff().catch(() => [] as StaffAccount[]),
      ]);
      setItems(licenses.items);
      setBranches(outlets);
      setStaff(people);
      setStatus(licenses.items.length === 0 ? 'empty' : null);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    }
  }, [allowed]);

  useEffect(() => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    void load();
  }, [allowed, load]);

  function onChange(patch: Partial<FormState>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (patch.docType === 'PHARMACIST_REGISTRATION') {
        next.scope = 'STAFF';
        next.branchId = '';
      } else if (patch.docType && prev.docType === 'PHARMACIST_REGISTRATION') {
        next.scope = 'TENANT';
        next.staffUserId = '';
      }
      if (patch.scope === 'TENANT') {
        next.branchId = '';
        next.staffUserId = '';
      }
      if (patch.scope === 'BRANCH') {
        next.staffUserId = '';
      }
      return next;
    });
  }

  function startCreate() {
    setCreating(true);
    setSelectedId(null);
    setForm(emptyForm());
    setStatus(null);
    setStatusHint(null);
  }

  function selectLicense(id: string) {
    const row = items.find((item) => item.id === id);
    if (!row) {
      return;
    }
    setCreating(false);
    setSelectedId(id);
    setForm({
      docType: row.docType,
      scope: row.scope,
      branchId: row.branchId ?? '',
      staffUserId: row.staffUserId ?? '',
      licenseNumber: row.licenseNumber,
      issuedOn: row.issuedOn,
      expiresOn: row.expiresOn,
      evidence: null,
    });
    setStatus(null);
    setStatusHint(null);
  }

  async function onSave() {
    if (!formValid(form, creating || !selected)) {
      setStatus('validation');
      setStatusHint(null);
      return;
    }
    if (!form.evidence) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      if (creating || !selected) {
        await createLicense({
          docType: form.docType,
          scope: form.scope,
          branchId: form.scope === 'BRANCH' ? form.branchId : undefined,
          staffUserId: form.scope === 'STAFF' ? form.staffUserId : undefined,
          licenseNumber: form.licenseNumber.trim(),
          issuedOn: form.issuedOn,
          expiresOn: form.expiresOn,
          evidence: form.evidence,
        });
        setStatus('success');
        setStatusHint('Licence filed.');
      } else {
        await renewLicense(selected.id, {
          licenseNumber: form.licenseNumber.trim(),
          issuedOn: form.issuedOn,
          expiresOn: form.expiresOn,
          evidence: form.evidence,
          expectedVersion: selected.version,
        });
        setStatus('success');
        setStatusHint('Renewal filed. Prior papers stay on this record.');
      }
      setCreating(false);
      await load();
      setStatus('success');
      setStatusHint(
        creating || !selected
          ? 'Licence filed.'
          : 'Renewal filed. Prior papers stay on this record.',
      );
      addRef.current?.focus();
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
        setStatusHint(apiStatusHint(error.code));
      } else {
        setStatus('failure');
        setStatusHint('Could not file this licence. Check the connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return {
    allowed,
    status,
    statusHint,
    statusId,
    items,
    dueItems: items.filter((row) => row.due),
    branches,
    staff,
    selected,
    creating,
    form,
    busy,
    addRef,
    onChange,
    startCreate,
    selectLicense,
    onSave,
  };
}
