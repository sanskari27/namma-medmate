import { CustomerCreateDialog, CustomerMergeDialog } from '@templates';
import { isApiError, listCustomers, updateCustomer, type Customer } from '@/services/customers';
import type { RootState } from '@/store';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
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
  const [status, setStatus] = useState<PageStatus>('loading');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [createOpen, setCreateOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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

  useEffect(() => {
    void load();
  }, [load]);

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
    </div>
  );
}
