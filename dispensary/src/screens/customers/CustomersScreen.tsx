import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CustomerCreateDialog, CreditSettleDialog } from '@templates';
import type { AppDispatch, RootState } from '@/store';
import { listDueRefills, type DueRefill } from '@/services/customerRefills';
import { CustomerDueRefillsStrip } from './components/customer-due-refills-strip';
import { CustomersDetailDialog } from './components/customers-detail-dialog';
import { CustomersStatusBanner } from './components/customers-status-banner';
import { CustomersSummary } from './components/customers-summary';
import { CustomersTable } from './components/customers-table';
import { CustomersToolbar } from './components/customers-toolbar';
import { CUSTOMERS_CONTENT } from './CustomersScreen.content';
import './CustomersScreen.css';
import { hasCrmAccess, rowKey } from './CustomersScreen.utils';
import {
  selectCreateCustomerOpen,
  selectCustomerCredit,
  selectCustomersStatus,
  selectSelectedCustomer,
  selectSettleOpen,
} from './store/customers.selectors';
import {
  closeCreateCustomer,
  closeSettleCredit,
  markCustomerAction,
  openCustomerDetail,
} from './store/customers.slice';
import { loadCustomerDetail, loadCustomers } from './store/customers.thunks';

export default function CustomersScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectCustomersStatus);
  const createOpen = useSelector(selectCreateCustomerOpen);
  const settleOpen = useSelector(selectSettleOpen);
  const selected = useSelector(selectSelectedCustomer);
  const credit = useSelector(selectCustomerCredit);
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasCrmAccess(user?.modules);
  const addRef = useRef<HTMLButtonElement | null>(null);
  const settleRef = useRef<HTMLButtonElement | null>(null);
  const [dueItems, setDueItems] = useState<DueRefill[]>([]);
  const [dueLoading, setDueLoading] = useState(true);

  useEffect(() => {
    if (!allowed) return;
    void dispatch(loadCustomers());
  }, [dispatch, allowed]);

  useEffect(() => {
    if (!allowed) return;
    let dead = false;
    void listDueRefills()
      .then((rows) => {
        if (!dead) setDueItems(rows);
      })
      .catch(() => {
        if (!dead) setDueItems([]);
      })
      .finally(() => {
        if (!dead) setDueLoading(false);
      });
    return () => {
      dead = true;
    };
  }, [allowed]);

  if (!allowed) {
    return (
      <div className="cust" aria-label={CUSTOMERS_CONTENT.regionLabel}>
        <div className="cust-banner" data-tone="alert" role="alert">
          <strong>{CUSTOMERS_CONTENT.denied}</strong>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="cust" aria-label={CUSTOMERS_CONTENT.regionLabel}>
        <CustomersStatusBanner />
      </div>
    );
  }

  return (
    <div className="cust" aria-label={CUSTOMERS_CONTENT.regionLabel}>
      <CustomersStatusBanner />
      {status === 'loading' || status === 'idle' ? (
        <div className="cust-card">
          <div className="cust-loading" role="status">
            {CUSTOMERS_CONTENT.status.loading}
          </div>
        </div>
      ) : (
        <>
          <CustomersSummary />
          <CustomersToolbar />
          <CustomerDueRefillsStrip
            items={dueItems}
            loading={dueLoading}
            onSelectCustomer={(id) => {
              dispatch(openCustomerDetail(id));
              void dispatch(loadCustomerDetail(id));
            }}
          />
          <CustomersTable />
        </>
      )}

      <CustomersDetailDialog />

      <CustomerCreateDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) dispatch(closeCreateCustomer());
        }}
        onCloseFocus={() => addRef.current?.focus()}
        onPhoneConflict={() => {
          dispatch(markCustomerAction('conflict'));
        }}
        onCreated={() => {
          dispatch(closeCreateCustomer());
          dispatch(markCustomerAction('success'));
          void dispatch(loadCustomers());
        }}
      />

      {selected && !selected.walkInAggregate && credit ? (
        <CreditSettleDialog
          open={settleOpen}
          customerId={selected.id!}
          customerName={selected.name}
          balancePaise={credit.balancePaise}
          version={credit.version}
          onOpenChange={(open) => {
            if (!open) dispatch(closeSettleCredit());
          }}
          onCloseFocus={() => settleRef.current?.focus()}
          onSettled={() => {
            dispatch(closeSettleCredit());
            dispatch(markCustomerAction('settled'));
            const key = rowKey(selected);
            void dispatch(loadCustomerDetail(key));
            void dispatch(loadCustomers());
          }}
        />
      ) : null}
    </div>
  );
}
