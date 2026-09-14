import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { PURCHASES_CONTENT } from '../../PurchasesScreen.content';
import { selectPurchasesStatusHint, selectPurchasesStatus } from '../../store/purchases.selectors';
import { loadPurchases } from '../../store/purchases.thunks';

export function PurchasesStatusBanner() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectPurchasesStatus);
  const hint = useSelector(selectPurchasesStatusHint);

  if (status === 'failure') {
    return (
      <div className="purchases-banner" data-tone="alert" role="alert">
        <strong>{hint ?? PURCHASES_CONTENT.loadFailed}</strong>{' '}
        <button type="button" className="purchases-btn purchases-btn-outline" onClick={() => void dispatch(loadPurchases())}>
          {PURCHASES_CONTENT.retry}
        </button>
      </div>
    );
  }

  if (status === 'success' && hint) {
    return (
      <div className="purchases-banner" data-tone="ok" role="status">
        {hint}
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="purchases-banner" data-tone="alert" role="alert">
        <strong>{PURCHASES_CONTENT.denied}</strong>
      </div>
    );
  }

  if (status === 'no_branch') {
    return (
      <div className="purchases-banner" data-tone="alert" role="alert">
        <strong>{PURCHASES_CONTENT.noBranch}</strong>
      </div>
    );
  }

  return null;
}
