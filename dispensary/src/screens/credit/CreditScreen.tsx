import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CreditSettleDialog } from '@templates';
import type { AppDispatch, RootState } from '@/store';
import { CreditAging } from './components/credit-aging';
import { CreditDetailDialog } from './components/credit-detail-dialog';
import { CreditPaymentsTable } from './components/credit-payments-table';
import { CreditStatusBanner } from './components/credit-status-banner';
import { CreditSummary } from './components/credit-summary';
import { CreditTable } from './components/credit-table';
import { CreditToolbar } from './components/credit-toolbar';
import { CREDIT_CONTENT } from './CreditScreen.content';
import './CreditScreen.css';
import { hasCrmAccess } from './CreditScreen.utils';
import {
  selectCreditSettleOpen,
  selectCreditStatus,
  selectCreditTab,
  selectSelectedCreditAccount,
} from './store/credit.selectors';
import {
  closeSettleCredit,
  markCreditSuccess,
} from './store/credit.slice';
import { loadCreditDirectory } from './store/credit.thunks';

export default function CreditScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectCreditStatus);
  const tab = useSelector(selectCreditTab);
  const settleOpen = useSelector(selectCreditSettleOpen);
  const selected = useSelector(selectSelectedCreditAccount);
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasCrmAccess(user?.modules);
  const settleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!allowed) return;
    void dispatch(loadCreditDirectory());
  }, [dispatch, allowed]);

  if (!allowed) {
    return (
      <div className="credit" aria-label={CREDIT_CONTENT.regionLabel}>
        <div className="credit-banner" data-tone="alert" role="alert">
          <strong>{CREDIT_CONTENT.denied}</strong>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="credit" aria-label={CREDIT_CONTENT.regionLabel}>
        <CreditStatusBanner />
      </div>
    );
  }

  return (
    <div className="credit" aria-label={CREDIT_CONTENT.regionLabel}>
      <CreditStatusBanner />

      {status === 'loading' || status === 'idle' ? (
        <div className="credit-card">
          <div className="credit-loading" role="status">
            {CREDIT_CONTENT.status.loading}
          </div>
        </div>
      ) : (
        <>
          <CreditSummary />
          <CreditAging />
          <CreditToolbar />
          {tab === 'outstanding' ? <CreditTable /> : <CreditPaymentsTable />}
        </>
      )}

      <CreditDetailDialog />

      {selected ? (
        <CreditSettleDialog
          open={settleOpen}
          customerId={selected.customerId}
          customerName={selected.customerName}
          balancePaise={selected.balancePaise}
          version={selected.version}
          onOpenChange={(open) => {
            if (!open) dispatch(closeSettleCredit());
          }}
          onCloseFocus={() => settleRef.current?.focus()}
          onSettled={() => {
            dispatch(closeSettleCredit());
            dispatch(markCreditSuccess());
            void dispatch(loadCreditDirectory());
          }}
        />
      ) : null}
    </div>
  );
}
