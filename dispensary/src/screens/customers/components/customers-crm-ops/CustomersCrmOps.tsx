import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CreditSettleDialog,
  CustomerFamilyDialog,
  CustomerMergeDialog,
  DoctorReferenceDialog,
} from '@templates';
import { isApiError } from '@/services/axios';
import { setCustomerCreditLimit } from '@/services/credit';
import {
  getFamilyCredit,
  getFamilyForCustomer,
  getFamilyHistory,
  removeFamilyMember,
  type CustomerFamily,
  type FamilyCredit,
  type FamilyHistoryItem,
} from '@/services/customerFamilies';
import {
  createCustomerRefill,
  createTenantTag,
  deleteCustomerRefill,
  listCustomerRefills,
  listCustomerTags,
  listTenantTags,
  replaceCustomerTags,
  updateCustomerRefill,
  type CustomerRefill,
  type CustomerTag,
} from '@/services/customerRefills';
import {
  getCustomerHistory,
  type Customer,
  type CustomerDirectoryItem,
  type CustomerHistoryItem,
} from '@/services/customers';
import { listDoctors, listTopReferringDoctors, type Doctor, type TopReferringDoctor } from '@/services/doctors';
import { getCustomerLoyalty, type CustomerLoyalty } from '@/services/loyalty';
import type { AppDispatch, RootState } from '@/store';
import { CUSTOMERS_CONTENT } from '../../CustomersScreen.content';
import { hasLoyaltyAccess } from '../../CustomersScreen.utils';
import {
  selectCustomerCredit,
  selectCustomerProfile,
  selectCustomersItems,
  selectSelectedCustomer,
} from '../../store/customers.selectors';
import {
  customerCreditReceived,
  markCustomerAction,
  openSettleCredit,
} from '../../store/customers.slice';
import { loadCustomerDetail, loadCustomers } from '../../store/customers.thunks';
import { CustomerCreditSection } from '../customer-credit-section';
import { CustomerDoctorSection } from '../customer-doctor-section';
import { CustomerFamilyCreditSection } from '../customer-family-credit-section';
import { CustomerFamilyHistory } from '../customer-family-history';
import { CustomerFamilySection } from '../customer-family-section';
import { CustomerLoyaltySection } from '../customer-loyalty-section';
import { CustomerPurchaseHistory } from '../customer-purchase-history';
import { CustomerRefillSection } from '../customer-refill-section';
import { CustomerTagsSection } from '../customer-tags-section';

function asCustomer(row: CustomerDirectoryItem, profile: Customer | null): Customer | null {
  if (!row.id || row.walkInAggregate) return null;
  if (profile?.id === row.id) return profile;
  return {
    id: row.id,
    tenantId: profile?.tenantId ?? '',
    name: row.name,
    phone: row.phone ?? '',
    email: row.email,
    dateOfBirth: null,
    gender: null,
    address: null,
    bloodGroup: null,
    allergies: null,
    chronicConditions: row.chronicConditions,
    createdAt: row.createdAt ?? '',
    updatedAt: row.updatedAt ?? '',
    familyId: row.familyId ?? null,
  };
}

function isConflict(error: unknown): boolean {
  return (
    isApiError(error) &&
    (error.status === 409 ||
      error.code === 'DUPLICATE_REFILL' ||
      error.code === 'DUPLICATE_TAG' ||
      error.code === 'PHONE_TAKEN')
  );
}

type FamilySettle = {
  customerId: string;
  customerName: string;
  balancePaise: number;
  version: number;
};

export function CustomersCrmOps() {
  const dispatch = useDispatch<AppDispatch>();
  const row = useSelector(selectSelectedCustomer);
  const profile = useSelector(selectCustomerProfile);
  const credit = useSelector(selectCustomerCredit);
  const items = useSelector(selectCustomersItems);
  const user = useSelector((state: RootState) => state.auth.user);

  const customerId = row && !row.walkInAggregate ? row.id : null;
  const primary = row ? asCustomer(row, profile) : null;
  const candidates = items
    .map((item) => asCustomer(item, profile))
    .filter((item): item is Customer => item != null);

  const owner = user?.role === 'pharmacy_owner';
  const loyaltyEntitled = hasLoyaltyAccess(user?.modules);

  const [family, setFamily] = useState<CustomerFamily | null>(null);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familyCredit, setFamilyCredit] = useState<FamilyCredit | null>(null);
  const [familyCreditLoading, setFamilyCreditLoading] = useState(false);
  const [familyHistory, setFamilyHistory] = useState<FamilyHistoryItem[]>([]);
  const [familyHistoryLoading, setFamilyHistoryLoading] = useState(false);
  const [memberFilter, setMemberFilter] = useState('');
  const [familyTypeFilter, setFamilyTypeFilter] = useState('');
  const [unlinkBusy, setUnlinkBusy] = useState(false);

  const [history, setHistory] = useState<CustomerHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyType, setHistoryType] = useState('');

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [topReferring, setTopReferring] = useState<TopReferringDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  const [loyalty, setLoyalty] = useState<CustomerLoyalty | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  const [refills, setRefills] = useState<CustomerRefill[]>([]);
  const [refillsLoading, setRefillsLoading] = useState(false);
  const [refillBusy, setRefillBusy] = useState(false);

  const [catalog, setCatalog] = useState<CustomerTag[]>([]);
  const [assigned, setAssigned] = useState<CustomerTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagBusy, setTagBusy] = useState(false);

  const [limitBusy, setLimitBusy] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);
  const [familySettle, setFamilySettle] = useState<FamilySettle | null>(null);

  const mergeRef = useRef<HTMLButtonElement | null>(null);
  const linkRef = useRef<HTMLButtonElement | null>(null);
  const doctorRef = useRef<HTMLButtonElement | null>(null);
  const settleRef = useRef<HTMLButtonElement | null>(null);
  const adjustRef = useRef<HTMLButtonElement | null>(null);

  function fail() {
    dispatch(markCustomerAction('failure'));
  }

  function conflict() {
    dispatch(markCustomerAction('conflict'));
  }

  function loadFamilyCredit(next: CustomerFamily) {
    setFamilyCreditLoading(true);
    void getFamilyCredit(next.id)
      .then(setFamilyCredit)
      .catch(fail)
      .finally(() => setFamilyCreditLoading(false));
  }

  function reloadDoctors() {
    setDoctorsLoading(true);
    void Promise.all([listDoctors(), listTopReferringDoctors()])
      .then(([all, top]) => {
        setDoctors(all);
        setTopReferring(top);
      })
      .catch(fail)
      .finally(() => setDoctorsLoading(false));
  }

  function reloadLoyalty(id: string) {
    setLoyaltyLoading(true);
    void getCustomerLoyalty(id)
      .then(setLoyalty)
      .catch(fail)
      .finally(() => setLoyaltyLoading(false));
  }

  function reloadRefills(id: string) {
    setRefillsLoading(true);
    void listCustomerRefills(id)
      .then(setRefills)
      .catch(fail)
      .finally(() => setRefillsLoading(false));
  }

  useEffect(() => {
    if (!customerId) return;
    let dead = false;

    setFamily(null);
    setFamilyCredit(null);
    setFamilyHistory([]);
    setMemberFilter('');
    setFamilyTypeFilter('');
    setHistory([]);
    setHistoryType('');
    setDoctors([]);
    setTopReferring([]);
    setLoyalty(null);
    setRefills([]);
    setCatalog([]);
    setAssigned([]);

    setFamilyLoading(true);
    setFamilyCreditLoading(true);
    void getFamilyForCustomer(customerId)
      .then((next) => {
        if (dead) return;
        setFamily(next);
        setFamilyLoading(false);
        if (!next) {
          setFamilyCreditLoading(false);
          return;
        }
        loadFamilyCredit(next);
      })
      .catch(() => {
        if (dead) return;
        setFamilyLoading(false);
        setFamilyCreditLoading(false);
        fail();
      });

    setHistoryLoading(true);
    void getCustomerHistory(customerId)
      .then((rows) => {
        if (!dead) setHistory(rows);
      })
      .catch(fail)
      .finally(() => {
        if (!dead) setHistoryLoading(false);
      });

    setDoctorsLoading(true);
    void Promise.all([listDoctors(), listTopReferringDoctors()])
      .then(([all, top]) => {
        if (dead) return;
        setDoctors(all);
        setTopReferring(top);
      })
      .catch(fail)
      .finally(() => {
        if (!dead) setDoctorsLoading(false);
      });

    setLoyaltyLoading(true);
    void getCustomerLoyalty(customerId)
      .then((next) => {
        if (!dead) setLoyalty(next);
      })
      .catch(fail)
      .finally(() => {
        if (!dead) setLoyaltyLoading(false);
      });

    setRefillsLoading(true);
    void listCustomerRefills(customerId)
      .then((rows) => {
        if (!dead) setRefills(rows);
      })
      .catch(fail)
      .finally(() => {
        if (!dead) setRefillsLoading(false);
      });

    setTagsLoading(true);
    void Promise.all([listTenantTags(), listCustomerTags(customerId)])
      .then(([all, on]) => {
        if (dead) return;
        setCatalog(all);
        setAssigned(on);
      })
      .catch(fail)
      .finally(() => {
        if (!dead) setTagsLoading(false);
      });

    return () => {
      dead = true;
    };
    // ponytail: reload extras only when the selected patient changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  useEffect(() => {
    if (!family?.id) return;
    let dead = false;
    setFamilyHistoryLoading(true);
    void getFamilyHistory(family.id, {
      memberId: memberFilter || undefined,
      type: familyTypeFilter || undefined,
    })
      .then((rows) => {
        if (!dead) setFamilyHistory(rows);
      })
      .catch(fail)
      .finally(() => {
        if (!dead) setFamilyHistoryLoading(false);
      });
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id, memberFilter, familyTypeFilter]);

  if (!row || !customerId || row.walkInAggregate) return null;

  return (
    <div className="grid gap-4">
      <div>
        <button
          ref={mergeRef}
          type="button"
          className="cust-btn cust-btn-ghost"
          onClick={() => setMergeOpen(true)}
          aria-haspopup="dialog"
        >
          {CUSTOMERS_CONTENT.mergeDuplicate}
        </button>
      </div>

      <CustomerFamilySection
        family={family}
        familyLoading={familyLoading}
        selectedCustomerId={customerId}
        linkButtonRef={linkRef}
        unlinkBusy={unlinkBusy}
        onLink={() => setFamilyOpen(true)}
        onUnlink={(memberId) => {
          if (!family) return;
          setUnlinkBusy(true);
          void removeFamilyMember(family.id, memberId)
            .then((next) => {
              setFamily(next);
              loadFamilyCredit(next);
            })
            .catch(fail)
            .finally(() => setUnlinkBusy(false));
        }}
      />

      {family ? (
        <>
          <CustomerFamilyHistory
            familyId={family.id}
            members={family.members}
            items={familyHistory}
            loading={familyHistoryLoading}
            memberFilter={memberFilter}
            typeFilter={familyTypeFilter}
            onMemberFilter={setMemberFilter}
            onTypeFilter={setFamilyTypeFilter}
          />
          <CustomerFamilyCreditSection
            credit={familyCredit}
            loading={familyCreditLoading}
            onSettleMember={setFamilySettle}
          />
        </>
      ) : null}

      <CustomerPurchaseHistory items={history} loading={historyLoading} typeFilter={historyType} onTypeFilter={setHistoryType} />

      <CustomerDoctorSection
        doctors={doctors}
        topReferring={topReferring}
        loading={doctorsLoading}
        addButtonRef={doctorRef}
        onAdd={() => setDoctorOpen(true)}
      />

      <CustomerCreditSection
        credit={credit}
        loading={false}
        canSetLimit={owner}
        limitBusy={limitBusy}
        settleButtonRef={settleRef}
        onSetLimit={(limitPaise) => {
          if (!credit) return;
          setLimitBusy(true);
          void setCustomerCreditLimit(customerId, limitPaise, credit.version)
            .then((next) => dispatch(customerCreditReceived(next)))
            .catch((error) => {
              if (isConflict(error)) conflict();
              else fail();
            })
            .finally(() => setLimitBusy(false));
        }}
        onSettle={() => dispatch(openSettleCredit())}
      />

      <CustomerRefillSection
        refills={refills}
        loading={refillsLoading}
        busy={refillBusy}
        onAdd={(input) => {
          setRefillBusy(true);
          void createCustomerRefill(customerId, input)
            .then(() => reloadRefills(customerId))
            .catch((error) => {
              if (isConflict(error)) conflict();
              else fail();
            })
            .finally(() => setRefillBusy(false));
        }}
        onUpdate={(refillId, input) => {
          setRefillBusy(true);
          void updateCustomerRefill(customerId, refillId, input)
            .then(() => reloadRefills(customerId))
            .catch((error) => {
              if (isConflict(error)) conflict();
              else fail();
            })
            .finally(() => setRefillBusy(false));
        }}
        onRemove={(refillId) => {
          setRefillBusy(true);
          void deleteCustomerRefill(customerId, refillId)
            .then(() => reloadRefills(customerId))
            .catch(fail)
            .finally(() => setRefillBusy(false));
        }}
      />

      <CustomerTagsSection
        catalog={catalog}
        assigned={assigned}
        loading={tagsLoading}
        busy={tagBusy}
        onCreateTag={(name) => {
          setTagBusy(true);
          void createTenantTag(name)
            .then((tag) => setCatalog((prev) => [...prev, tag]))
            .catch((error) => {
              if (isConflict(error)) conflict();
              else fail();
            })
            .finally(() => setTagBusy(false));
        }}
        onReplace={(tagIds) => {
          setTagBusy(true);
          void replaceCustomerTags(customerId, tagIds)
            .then(setAssigned)
            .catch((error) => {
              if (isConflict(error)) conflict();
              else fail();
            })
            .finally(() => setTagBusy(false));
        }}
      />

      <CustomerLoyaltySection
        loyalty={loyalty}
        loading={loyaltyLoading}
        entitled={loyaltyEntitled}
        canAdjust={owner && loyaltyEntitled}
        adjustButtonRef={adjustRef}
        onAdjusted={() => reloadLoyalty(customerId)}
      />

      <CustomerMergeDialog
        open={mergeOpen}
        survivor={primary}
        candidates={candidates}
        onOpenChange={setMergeOpen}
        onMerged={() => {
          setMergeOpen(false);
          dispatch(markCustomerAction('success'));
          void dispatch(loadCustomers());
        }}
        onCloseFocus={() => mergeRef.current?.focus()}
      />

      <CustomerFamilyDialog
        open={familyOpen}
        primary={primary}
        candidates={candidates}
        existingFamily={family}
        onOpenChange={setFamilyOpen}
        onLinked={(next) => {
          setFamily(next);
          loadFamilyCredit(next);
        }}
        onCloseFocus={() => linkRef.current?.focus()}
      />

      <DoctorReferenceDialog
        open={doctorOpen}
        onOpenChange={setDoctorOpen}
        onSaved={reloadDoctors}
        onCloseFocus={() => doctorRef.current?.focus()}
      />

      {familySettle ? (
        <CreditSettleDialog
          open
          customerId={familySettle.customerId}
          customerName={familySettle.customerName}
          balancePaise={familySettle.balancePaise}
          version={familySettle.version}
          onOpenChange={(open) => {
            if (!open) setFamilySettle(null);
          }}
          onSettled={() => {
            setFamilySettle(null);
            dispatch(markCustomerAction('settled'));
            if (family) loadFamilyCredit(family);
            void dispatch(loadCustomerDetail(customerId));
          }}
          onCloseFocus={() => undefined}
        />
      ) : null}
    </div>
  );
}
