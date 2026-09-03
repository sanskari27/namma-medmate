import { CustomerCreateDialog, CustomerFamilyDialog, CustomerMergeDialog } from '@templates';
import {
  getFamilyForCustomer,
  getFamilyHistory,
  isApiError,
  removeFamilyMember,
  type CustomerFamily,
  type FamilyHistoryItem,
} from '@/services/customerFamilies';
import { listCustomers, updateCustomer, type Customer } from '@/services/customers';
import type { RootState } from '@/store';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { CustomerFamilyHistory } from './components/customer-family-history';
import { CustomerFamilySection } from './components/customer-family-section';
import { CustomerListPanel } from './components/customer-list-panel';
import { CustomerProfilePanel } from './components/customer-profile-panel';
import { CustomersHeader } from './components/customers-header';
import { CustomersStatusBanner } from './components/customers-status-banner';
import {
  emptyForm,
  hasCrmAccess,
  hasHealthFlag,
  statusCopy,
  toForm,
  toInput,
  type FormState,
  type PageStatus,
} from './CustomersScreen.utils';

export default function CustomersScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const formId = useId();
  const statusId = useId();
  const addRef = useRef<HTMLButtonElement | null>(null);
  const mergeRef = useRef<HTMLButtonElement | null>(null);
  const familyLinkRef = useRef<HTMLButtonElement | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [createOpen, setCreateOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [family, setFamily] = useState<CustomerFamily | null>(null);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  const [historyItems, setHistoryItems] = useState<FamilyHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [memberFilter, setMemberFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const allowed = hasCrmAccess(user?.modules);
  const selected = customers.find((row) => row.id === selectedId) ?? null;
  const flagged = customers.filter(hasHealthFlag).length;
  const banner = statusCopy(status);

  const load = useCallback(
    async (search?: string) => {
      if (!allowed) {
        setStatus('denied');
        return;
      }
      setStatus('loading');
      try {
        const items = await listCustomers(search);
        setCustomers(items);
        setStatus(items.length === 0 ? 'empty' : null);
      } catch (error) {
        if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
          setStatus('denied');
        } else {
          setStatus('failure');
        }
      }
    },
    [allowed],
  );

  const loadFamily = useCallback(async (customerId: string) => {
    setFamilyLoading(true);
    try {
      const next = await getFamilyForCustomer(customerId);
      setFamily(next);
    } catch {
      setFamily(null);
      setStatus('failure');
    } finally {
      setFamilyLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (familyId: string, memberId?: string, type?: string) => {
    setHistoryLoading(true);
    try {
      const items = await getFamilyHistory(familyId, {
        memberId: memberId || undefined,
        type: type || undefined,
      });
      setHistoryItems(items);
    } catch {
      setHistoryItems([]);
      setStatus('failure');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setFamily(null);
      setHistoryItems([]);
      setMemberFilter('');
      setTypeFilter('');
      return;
    }
    void loadFamily(selectedId);
  }, [selectedId, loadFamily]);

  useEffect(() => {
    if (!family?.id) {
      setHistoryItems([]);
      return;
    }
    void loadHistory(family.id, memberFilter || undefined, typeFilter || undefined);
  }, [family?.id, memberFilter, typeFilter, loadHistory]);

  function selectCustomer(customer: Customer) {
    setSelectedId(customer.id);
    setForm(toForm(customer));
    setStatus(null);
  }

  function clearSelection() {
    setSelectedId(null);
    setForm(emptyForm);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!selectedId) {
      return;
    }
    if (!form.name.trim() || !form.phone.trim()) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      const updated = await updateCustomer(selectedId, toInput(form));
      setCustomers((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setForm(toForm(updated));
      setStatus('success');
    } catch (error) {
      if (isApiError(error) && error.code === 'PHONE_TAKEN') {
        setStatus('conflict');
      } else if (isApiError(error) && error.status === 400) {
        setStatus('validation');
      } else if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
        setStatus('denied');
      } else {
        setStatus('failure');
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    await load(query.trim() || undefined);
  }

  async function onUnlinkMember(customerId: string) {
    if (!family) {
      return;
    }
    setUnlinkBusy(true);
    try {
      const next = await removeFamilyMember(family.id, customerId);
      if (next.members.length === 0) {
        setFamily(null);
        setHistoryItems([]);
      } else {
        setFamily(next);
      }
      setStatus('success');
    } catch (error) {
      if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
        setStatus('denied');
      } else if (isApiError(error) && error.status === 409) {
        setStatus('conflict');
      } else {
        setStatus('failure');
      }
    } finally {
      setUnlinkBusy(false);
    }
  }

  if (!allowed) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col gap-4">
        <CustomersHeader addButtonId={`${formId}-add`} denied onAdd={() => undefined} />
        <CustomersStatusBanner status="denied" statusId={statusId} asAlert />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="shrink-0 space-y-4">
        <CustomersHeader
          addButtonId={`${formId}-add`}
          addButtonRef={addRef}
          onAdd={() => setCreateOpen(true)}
        />

        {status !== 'loading' && status !== 'failure' && status !== 'denied' ? (
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              <span className="font-mono tabular-nums text-ink">{customers.length}</span> on floor
            </span>
            <span>
              <span className="font-mono tabular-nums text-ink">{flagged}</span> with allergy or
              chronic note
            </span>
          </p>
        ) : null}

        <CustomersStatusBanner status={status} statusId={statusId} />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <CustomerListPanel
          formId={formId}
          customers={customers}
          selectedId={selectedId}
          query={query}
          showEmptyHint={customers.length === 0 && status !== 'loading'}
          onQueryChange={setQuery}
          onSearch={onSearch}
          onSelect={selectCustomer}
        />
        <CustomerProfilePanel
          formId={formId}
          statusId={statusId}
          selected={selected}
          form={form}
          busy={busy}
          describedByStatus={Boolean(banner)}
          onChange={updateField}
          onSave={onSave}
          onClose={clearSelection}
          mergeButtonRef={mergeRef}
          onMerge={() => setMergeOpen(true)}
          familySection={
            selected ? (
              <CustomerFamilySection
                family={family}
                familyLoading={familyLoading}
                selectedCustomerId={selected.id}
                linkButtonRef={familyLinkRef}
                unlinkBusy={unlinkBusy}
                onLink={() => setFamilyOpen(true)}
                onUnlink={(id) => {
                  void onUnlinkMember(id);
                }}
              />
            ) : null
          }
          familyHistory={
            selected ? (
              <CustomerFamilyHistory
                familyId={family?.id ?? null}
                members={family?.members ?? []}
                items={historyItems}
                loading={historyLoading}
                memberFilter={memberFilter}
                typeFilter={typeFilter}
                onMemberFilter={setMemberFilter}
                onTypeFilter={setTypeFilter}
              />
            ) : null
          }
        />
      </div>

      <CustomerCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCloseFocus={() => addRef.current?.focus()}
        onPhoneConflict={(phone) => {
          setQuery(phone);
          void load(phone);
          setStatus('conflict');
        }}
        onCreated={(customer) => {
          setCustomers((prev) =>
            [...prev.filter((row) => row.id !== customer.id), customer].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          selectCustomer(customer);
          setStatus('success');
        }}
      />

      <CustomerMergeDialog
        open={mergeOpen}
        survivor={selected}
        candidates={customers}
        onOpenChange={setMergeOpen}
        onCloseFocus={() => mergeRef.current?.focus()}
        onMerged={(merged) => {
          void load(query.trim() || undefined).then(() => {
            selectCustomer(merged);
            setStatus('success');
          });
        }}
      />

      <CustomerFamilyDialog
        open={familyOpen}
        primary={selected}
        candidates={customers}
        existingFamily={family}
        onOpenChange={setFamilyOpen}
        onCloseFocus={() => familyLinkRef.current?.focus()}
        onLinked={(next) => {
          setFamily(next);
          setStatus('success');
        }}
      />
    </div>
  );
}
