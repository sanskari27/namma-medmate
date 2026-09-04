import {
  CustomerCreateDialog,
  CustomerFamilyDialog,
  CustomerMergeDialog,
  CreditSettleDialog,
  DoctorReferenceDialog,
} from '@templates';
import {
  getFamilyForCustomer,
  getFamilyHistory,
  isApiError,
  removeFamilyMember,
  type CustomerFamily,
  type FamilyHistoryItem,
} from '@/services/customerFamilies';
import {
  getCustomerHistory,
  listCustomers,
  updateCustomer,
  type Customer,
  type CustomerHistoryItem,
} from '@/services/customers';
import { getCustomerCredit, setCustomerCreditLimit, type CustomerCredit } from '@/services/credit';
import {
  createCustomerRefill,
  createTenantTag,
  deleteCustomerRefill,
  listCustomerRefills,
  listCustomerTags,
  listDueRefills,
  listTenantTags,
  replaceCustomerTags,
  updateCustomerRefill,
  type CustomerRefill,
  type CustomerTag,
  type DueRefill,
} from '@/services/customerRefills';
import {
  listDoctors,
  listTopReferringDoctors,
  type Doctor,
  type TopReferringDoctor,
} from '@/services/doctors';
import type { RootState } from '@/store';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { CustomerCreditSection } from './components/customer-credit-section';
import { CustomerDoctorSection } from './components/customer-doctor-section';
import { CustomerDueRefillsStrip } from './components/customer-due-refills-strip';
import { CustomerFamilyHistory } from './components/customer-family-history';
import { CustomerFamilySection } from './components/customer-family-section';
import { CustomerListPanel } from './components/customer-list-panel';
import { CustomerProfilePanel } from './components/customer-profile-panel';
import { CustomerPurchaseHistory } from './components/customer-purchase-history';
import { CustomerRefillSection } from './components/customer-refill-section';
import { CustomerTagsSection } from './components/customer-tags-section';
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
  const doctorAddRef = useRef<HTMLButtonElement | null>(null);
  const settleRef = useRef<HTMLButtonElement | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [createOpen, setCreateOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [limitBusy, setLimitBusy] = useState(false);
  const [family, setFamily] = useState<CustomerFamily | null>(null);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [unlinkBusy, setUnlinkBusy] = useState(false);
  const [historyItems, setHistoryItems] = useState<FamilyHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [memberFilter, setMemberFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<CustomerHistoryItem[]>([]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseTypeFilter, setPurchaseTypeFilter] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [topReferring, setTopReferring] = useState<TopReferringDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [credit, setCredit] = useState<CustomerCredit | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);
  const [refills, setRefills] = useState<CustomerRefill[]>([]);
  const [refillsLoading, setRefillsLoading] = useState(false);
  const [refillBusy, setRefillBusy] = useState(false);
  const [dueRefills, setDueRefills] = useState<DueRefill[]>([]);
  const [dueLoading, setDueLoading] = useState(false);
  const [tagCatalog, setTagCatalog] = useState<CustomerTag[]>([]);
  const [customerTags, setCustomerTags] = useState<CustomerTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagBusy, setTagBusy] = useState(false);

  const allowed = hasCrmAccess(user?.modules);
  const canSetLimit = user?.role === 'pharmacy_owner';
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

  const loadPurchaseHistory = useCallback(async (customerId: string) => {
    setPurchaseLoading(true);
    try {
      const items = await getCustomerHistory(customerId);
      setPurchaseItems(items);
    } catch {
      setPurchaseItems([]);
      setStatus('failure');
    } finally {
      setPurchaseLoading(false);
    }
  }, []);

  const loadDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    try {
      const [nextDoctors, nextTop] = await Promise.all([listDoctors(), listTopReferringDoctors(5)]);
      setDoctors(nextDoctors);
      setTopReferring(nextTop);
    } catch {
      setDoctors([]);
      setTopReferring([]);
      setStatus('failure');
    } finally {
      setDoctorsLoading(false);
    }
  }, []);

  const loadCredit = useCallback(async (customerId: string) => {
    setCreditLoading(true);
    try {
      const next = await getCustomerCredit(customerId);
      setCredit(next);
    } catch {
      setCredit(null);
      setStatus('failure');
    } finally {
      setCreditLoading(false);
    }
  }, []);

  const loadRefills = useCallback(async (customerId: string) => {
    setRefillsLoading(true);
    try {
      const items = await listCustomerRefills(customerId);
      setRefills(items);
    } catch {
      setRefills([]);
      setStatus('failure');
    } finally {
      setRefillsLoading(false);
    }
  }, []);

  const loadDueRefills = useCallback(async () => {
    setDueLoading(true);
    try {
      const items = await listDueRefills();
      setDueRefills(items);
    } catch {
      setDueRefills([]);
      setStatus('failure');
    } finally {
      setDueLoading(false);
    }
  }, []);

  const loadTagCatalog = useCallback(async () => {
    try {
      const items = await listTenantTags();
      setTagCatalog(items);
    } catch {
      setTagCatalog([]);
      setStatus('failure');
    }
  }, []);

  const loadCustomerTags = useCallback(async (customerId: string) => {
    setTagsLoading(true);
    try {
      const items = await listCustomerTags(customerId);
      setCustomerTags(items);
    } catch {
      setCustomerTags([]);
      setStatus('failure');
    } finally {
      setTagsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    void loadDoctors();
    void loadDueRefills();
    void loadTagCatalog();
  }, [allowed, loadDoctors, loadDueRefills, loadTagCatalog]);

  useEffect(() => {
    if (!selectedId) {
      setFamily(null);
      setHistoryItems([]);
      setMemberFilter('');
      setTypeFilter('');
      setPurchaseItems([]);
      setPurchaseTypeFilter('');
      setCredit(null);
      setRefills([]);
      setCustomerTags([]);
      return;
    }
    void loadFamily(selectedId);
    void loadPurchaseHistory(selectedId);
    void loadCredit(selectedId);
    void loadRefills(selectedId);
    void loadCustomerTags(selectedId);
  }, [selectedId, loadFamily, loadPurchaseHistory, loadCredit, loadRefills, loadCustomerTags]);

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

  async function onSetLimit(limitPaise: number) {
    if (!selectedId || !credit) {
      return;
    }
    setLimitBusy(true);
    try {
      const next = await setCustomerCreditLimit(selectedId, limitPaise, credit.version);
      setCredit(next);
      setStatus('success');
    } catch (error) {
      if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
        setStatus('denied');
      } else if (isApiError(error) && (error.status === 409 || error.code === 'STALE_STATE')) {
        setStatus('conflict');
        void loadCredit(selectedId);
      } else if (isApiError(error) && error.status === 400) {
        setStatus('validation');
      } else {
        setStatus('failure');
      }
    } finally {
      setLimitBusy(false);
    }
  }

  function mapRefillError(error: unknown) {
    if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
      setStatus('denied');
    } else if (
      isApiError(error) &&
      (error.status === 409 ||
        error.code === 'STALE_STATE' ||
        error.code === 'DUPLICATE_REFILL' ||
        error.code === 'DUPLICATE_TAG' ||
        error.code === 'TAG_IN_USE')
    ) {
      setStatus('conflict');
    } else if (isApiError(error) && error.status === 400) {
      setStatus('validation');
    } else {
      setStatus('failure');
    }
  }

  async function onAddRefill(input: {
    medicineName: string;
    intervalDays?: number;
    nextDueOn?: string;
  }) {
    if (!selectedId) {
      return;
    }
    if (!input.medicineName.trim()) {
      setStatus('validation');
      return;
    }
    setRefillBusy(true);
    try {
      await createCustomerRefill(selectedId, input);
      await loadRefills(selectedId);
      await loadDueRefills();
      setStatus('success');
    } catch (error) {
      mapRefillError(error);
      if (isApiError(error) && error.code === 'STALE_STATE') {
        void loadRefills(selectedId);
      }
    } finally {
      setRefillBusy(false);
    }
  }

  async function onUpdateRefill(
    refillId: string,
    input: { intervalDays: number; nextDueOn: string; expectedVersion: number },
  ) {
    if (!selectedId) {
      return;
    }
    setRefillBusy(true);
    try {
      await updateCustomerRefill(selectedId, refillId, input);
      await loadRefills(selectedId);
      await loadDueRefills();
      setStatus('success');
    } catch (error) {
      mapRefillError(error);
      if (isApiError(error) && (error.status === 409 || error.code === 'STALE_STATE')) {
        void loadRefills(selectedId);
      }
    } finally {
      setRefillBusy(false);
    }
  }

  async function onRemoveRefill(refillId: string) {
    if (!selectedId) {
      return;
    }
    setRefillBusy(true);
    try {
      await deleteCustomerRefill(selectedId, refillId);
      await loadRefills(selectedId);
      await loadDueRefills();
      setStatus('success');
    } catch (error) {
      mapRefillError(error);
    } finally {
      setRefillBusy(false);
    }
  }

  async function onCreateTag(name: string) {
    if (!name.trim()) {
      setStatus('validation');
      return;
    }
    setTagBusy(true);
    try {
      const created = await createTenantTag(name.trim());
      setTagCatalog((prev) =>
        [...prev, created].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
        ),
      );
      setStatus('success');
    } catch (error) {
      mapRefillError(error);
    } finally {
      setTagBusy(false);
    }
  }

  async function onReplaceTags(tagIds: string[]) {
    if (!selectedId) {
      return;
    }
    setTagBusy(true);
    try {
      const next = await replaceCustomerTags(selectedId, tagIds);
      setCustomerTags(next);
      setStatus('success');
    } catch (error) {
      mapRefillError(error);
      void loadCustomerTags(selectedId);
    } finally {
      setTagBusy(false);
    }
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

        <CustomerDueRefillsStrip
          items={dueRefills}
          loading={dueLoading}
          onSelectCustomer={(customerId) => {
            const row = customers.find((c) => c.id === customerId);
            if (row) {
              selectCustomer(row);
            } else {
              setSelectedId(customerId);
            }
          }}
        />
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
          creditSection={
            selected ? (
              <CustomerCreditSection
                credit={credit}
                loading={creditLoading}
                canSetLimit={canSetLimit}
                limitBusy={limitBusy}
                settleButtonRef={settleRef}
                onSetLimit={(limitPaise) => {
                  void onSetLimit(limitPaise);
                }}
                onSettle={() => setSettleOpen(true)}
              />
            ) : null
          }
          refillSection={
            selected ? (
              <CustomerRefillSection
                refills={refills}
                loading={refillsLoading}
                busy={refillBusy}
                onAdd={(input) => {
                  void onAddRefill(input);
                }}
                onUpdate={(refillId, input) => {
                  void onUpdateRefill(refillId, input);
                }}
                onRemove={(refillId) => {
                  void onRemoveRefill(refillId);
                }}
              />
            ) : null
          }
          tagsSection={
            selected ? (
              <CustomerTagsSection
                catalog={tagCatalog}
                assigned={customerTags}
                loading={tagsLoading}
                busy={tagBusy}
                onCreateTag={(name) => {
                  void onCreateTag(name);
                }}
                onReplace={(tagIds) => {
                  void onReplaceTags(tagIds);
                }}
              />
            ) : null
          }
          purchaseHistory={
            selected ? (
              <CustomerPurchaseHistory
                items={purchaseItems}
                loading={purchaseLoading}
                typeFilter={purchaseTypeFilter}
                onTypeFilter={setPurchaseTypeFilter}
              />
            ) : null
          }
          doctorSection={
            selected ? (
              <CustomerDoctorSection
                doctors={doctors}
                topReferring={topReferring}
                loading={doctorsLoading}
                addButtonRef={doctorAddRef}
                onAdd={() => setDoctorOpen(true)}
              />
            ) : null
          }
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

      <DoctorReferenceDialog
        open={doctorOpen}
        onOpenChange={setDoctorOpen}
        onCloseFocus={() => doctorAddRef.current?.focus()}
        onSaved={() => {
          void loadDoctors();
          setStatus('success');
        }}
      />

      {selected && credit ? (
        <CreditSettleDialog
          open={settleOpen}
          customerId={selected.id}
          customerName={selected.name}
          balancePaise={credit.balancePaise}
          version={credit.version}
          onOpenChange={setSettleOpen}
          onCloseFocus={() => settleRef.current?.focus()}
          onSettled={() => {
            void loadCredit(selected.id);
            setStatus('success');
          }}
        />
      ) : null}
    </div>
  );
}
