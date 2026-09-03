import { Button, Input, Label, Reveal } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import {
  copyBranchSettings,
  createBranch,
  isApiError,
  listBranches,
  updateBranch,
  type Branch,
} from '@/services/branches';
import type { RootState } from '@/store';
import { AlertCircle, BadgeCheck, Building2, Copy, MapPin, Unplug } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'quota'
  | null;

type FormState = {
  name: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string;
  contactEmail: string;
  drugLicenseNumber: string;
  gstin: string;
  branchType: 'RETAIL' | 'KIOSK';
  defaultBranch: boolean;
  markupBps: string;
  copyFromId: string;
};

const emptyForm: FormState = {
  name: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  contactPhone: '',
  contactEmail: '',
  drugLicenseNumber: '',
  gstin: '',
  branchType: 'RETAIL',
  defaultBranch: false,
  markupBps: '0',
  copyFromId: '',
};

function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: Building2, text: 'Loading outlets for this counter…' };
    case 'empty':
      return {
        icon: MapPin,
        text: 'No outlets yet. Add the first branch for this pharmacy floor.',
      };
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Name, address, phone, and drug licence are required before saving this outlet.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'Only the pharmacy owner can manage outlets at this counter.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'This outlet was updated elsewhere. Refresh and try again.',
      };
    case 'quota':
      return {
        icon: AlertCircle,
        text: 'This pharmacy has used its outlet limit. Upgrade the plan to add another outlet.',
      };
    case 'failure':
      return { icon: Unplug, text: 'Could not reach the server for outlets. Try again.' };
    case 'success':
      return { icon: BadgeCheck, text: 'Outlet saved on this floor.' };
    default:
      return null;
  }
}

function toForm(branch: Branch): FormState {
  const markup = branch.pricingSettings.defaultMarkupBps;
  return {
    name: branch.name,
    addressLine: branch.addressLine,
    city: branch.city,
    state: branch.state,
    pincode: branch.pincode,
    contactPhone: branch.contactPhone,
    contactEmail: branch.contactEmail ?? '',
    drugLicenseNumber: branch.drugLicenseNumber,
    gstin: branch.gstin ?? '',
    branchType: branch.branchType,
    defaultBranch: branch.defaultBranch,
    markupBps: String(typeof markup === 'number' ? markup : 0),
    copyFromId: '',
  };
}

export default function BranchesScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const allowed = role === 'pharmacy_owner';
  const statusId = useId();
  const [items, setItems] = useState<Branch[]>([]);
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [creating, setCreating] = useState(false);
  const restoreRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const list = await listBranches();
      setItems(list);
      setStatus(list.length === 0 ? 'empty' : null);
    } catch (err) {
      if (isApiError(err) && err.status === 403) {
        setStatus('denied');
        return;
      }
      setStatus('failure');
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate(button: HTMLElement) {
    restoreRef.current = button;
    setCreating(true);
    setSelectedId(null);
    setForm({ ...emptyForm, defaultBranch: items.length === 0 });
    setStatus(null);
  }

  function openEdit(branch: Branch, button: HTMLElement) {
    restoreRef.current = button;
    setCreating(false);
    setSelectedId(branch.id);
    setForm(toForm(branch));
    setStatus(null);
  }

  function closeEditor() {
    setCreating(false);
    setSelectedId(null);
    setForm(emptyForm);
    queueMicrotask(() => restoreRef.current?.focus());
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (
      !form.name.trim() ||
      !form.addressLine.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pincode.trim() ||
      !form.contactPhone.trim() ||
      !form.drugLicenseNumber.trim()
    ) {
      setStatus('validation');
      return;
    }
    const payload = {
      name: form.name.trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim() || undefined,
      drugLicenseNumber: form.drugLicenseNumber.trim(),
      gstin: form.gstin.trim() || undefined,
      branchType: form.branchType,
      defaultBranch: form.defaultBranch,
      operatingHours: {
        mon: { open: '09:00', close: '21:00' },
        sun: { closed: true },
      },
      pricingSettings: {
        defaultMarkupBps: Number(form.markupBps) || 0,
        roundToNearestPaise: 1,
      },
      taxSettings: {
        gstMode: 'CGST_SGST',
        defaultGstRateBps: 1200,
        taxState: form.state.trim(),
      },
    };
    try {
      let saved: Branch;
      if (creating) {
        saved = await createBranch(payload);
      } else if (selectedId) {
        saved = await updateBranch(selectedId, payload);
        if (form.copyFromId) {
          saved = await copyBranchSettings(selectedId, form.copyFromId);
        }
      } else {
        return;
      }
      setItems((prev) => {
        const without = prev.filter((item) => item.id !== saved.id);
        return [...without, saved].sort((a, b) => a.branchCode.localeCompare(b.branchCode));
      });
      setStatus('success');
      closeEditor();
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 403) {
          setStatus('denied');
          return;
        }
        if (err.status === 409) {
          setStatus('conflict');
          return;
        }
        if (err.code === 'PLAN_LIMIT') {
          setStatus('quota');
          return;
        }
        if (err.status === 422 || err.status === 400) {
          setStatus('validation');
          return;
        }
      }
      setStatus('failure');
    }
  }

  const banner = statusCopy(status);
  const editing = creating || selectedId !== null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <Reveal>
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="font-mono text-xs tracking-wide text-muted">Counter outlets</p>
            <h1 className="text-2xl font-semibold text-ink">Outlets</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Keep each floor address, drug licence, and till pricing on this pharmacy. Kiosk is a
              branch type only — it does not turn on self-order.
            </p>
          </div>
          {allowed ? (
            <Button type="button" onClick={(e) => openCreate(e.currentTarget)} disabled={editing}>
              Add outlet
            </Button>
          ) : null}
        </header>
      </Reveal>

      {banner ? (
        <div
          role="alert"
          aria-live="polite"
          id={statusId}
          className="flex items-start gap-2 border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          <banner.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <span>
            {banner.text}
            {status === 'quota' ? (
              <>
                {' '}
                <Link className="text-brand underline" to={ROUTES.SUBSCRIPTION}>
                  Open plan for this pharmacy
                </Link>
              </>
            ) : null}
          </span>
        </div>
      ) : null}

      {!editing && items.length > 0 ? (
        <div className="overflow-x-auto border border-line bg-surface">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead className="border-b border-line bg-brand-soft/40 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Outlet</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Licence</th>
                <th className="px-3 py-2 font-medium">Default</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((branch) => (
                <tr key={branch.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{branch.branchCode}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{branch.name}</div>
                    <div className="text-xs text-muted">
                      {branch.city}, {branch.state} {branch.pincode}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {branch.branchType === 'KIOSK' ? 'Kiosk' : 'Retail'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{branch.drugLicenseNumber}</td>
                  <td className="px-3 py-2">{branch.defaultBranch ? 'Default' : '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={(e) => openEdit(branch, e.currentTarget)}
                    >
                      Edit outlet
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {editing ? (
        <form
          onSubmit={onSubmit}
          aria-describedby={banner ? statusId : undefined}
          className="grid gap-3 border border-line bg-surface p-4"
        >
          <h2 className="text-lg font-semibold text-ink">
            {creating ? 'New outlet' : 'Edit outlet'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="outlet-name">Outlet name</Label>
              <Input
                id="outlet-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoComplete="organization"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="outlet-license">Drug licence number</Label>
              <Input
                id="outlet-license"
                value={form.drugLicenseNumber}
                onChange={(e) => setForm((f) => ({ ...f, drugLicenseNumber: e.target.value }))}
              />
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="outlet-address">Address</Label>
              <Input
                id="outlet-address"
                value={form.addressLine}
                onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="outlet-city">City</Label>
              <Input
                id="outlet-city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="outlet-state">State</Label>
              <Input
                id="outlet-state"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="outlet-pincode">Pincode</Label>
              <Input
                id="outlet-pincode"
                value={form.pincode}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="outlet-phone">Contact phone</Label>
              <Input
                id="outlet-phone"
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="outlet-email">Contact email</Label>
              <Input
                id="outlet-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="outlet-gstin">GSTIN (if this state differs)</Label>
              <Input
                id="outlet-gstin"
                value={form.gstin}
                onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="outlet-type">Branch type</Label>
              <select
                id="outlet-type"
                className="h-9 rounded border border-line bg-canvas px-2 text-sm text-ink"
                value={form.branchType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    branchType: e.target.value as 'RETAIL' | 'KIOSK',
                  }))
                }
              >
                <option value="RETAIL">Retail</option>
                <option value="KIOSK">Kiosk (classification only)</option>
              </select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="outlet-markup">Default markup (basis points)</Label>
              <Input
                id="outlet-markup"
                inputMode="numeric"
                value={form.markupBps}
                onChange={(e) => setForm((f) => ({ ...f, markupBps: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
              <input
                type="checkbox"
                checked={form.defaultBranch}
                onChange={(e) => setForm((f) => ({ ...f, defaultBranch: e.target.checked }))}
              />
              Default outlet for this pharmacy
            </label>
            {!creating && items.filter((b) => b.id !== selectedId).length > 0 ? (
              <div className="grid gap-1 sm:col-span-2">
                <Label htmlFor="outlet-copy">
                  <span className="inline-flex items-center gap-1">
                    <Copy className="size-3.5" aria-hidden />
                    Copy pricing/tax snapshot from
                  </span>
                </Label>
                <select
                  id="outlet-copy"
                  className="h-9 rounded border border-line bg-canvas px-2 text-sm text-ink"
                  value={form.copyFromId}
                  onChange={(e) => setForm((f) => ({ ...f, copyFromId: e.target.value }))}
                >
                  <option value="">Do not copy</option>
                  {items
                    .filter((b) => b.id !== selectedId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branchCode} — {b.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit">Save outlet</Button>
            <Button type="button" variant="ghost" onClick={closeEditor}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
