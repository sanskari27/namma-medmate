import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { POS_CONTENT } from '../../PosScreen.content';
import { redeemPointsChanged } from '../../store/pos.slice';
import {
  selectPosBusy,
  selectPosCollected,
  selectPosLoyaltyBalancePoints,
  selectPosLoyaltyEntitled,
  selectPosLoyaltyLoading,
  selectPosRedeemPoints,
  selectPosSelectedCustomer,
  selectPosWalkIn,
} from '../../store/pos.selectors';
import { loadCustomerLoyalty } from '../../store/pos.thunks';

export function PosLoyaltyPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const entitled = useSelector(selectPosLoyaltyEntitled);
  const customer = useSelector(selectPosSelectedCustomer);
  const walkIn = useSelector(selectPosWalkIn);
  const loading = useSelector(selectPosLoyaltyLoading);
  const balance = useSelector(selectPosLoyaltyBalancePoints);
  const points = useSelector(selectPosRedeemPoints);
  const busy = useSelector(selectPosBusy);
  const collected = useSelector(selectPosCollected);
  const customerId = customer?.id ?? null;

  useEffect(() => {
    if (!entitled || !customerId) {
      return;
    }
    void dispatch(loadCustomerLoyalty(customerId));
  }, [dispatch, entitled, customerId]);

  if (!entitled || walkIn || !customer) {
    return null;
  }

  return (
    <section className="pos-points" aria-label={POS_CONTENT.loyalty.panelAria}>
      {loading ? <p>{POS_CONTENT.loyalty.loading}</p> : null}
      {!loading && (balance == null || balance <= 0) ? (
        <p>{POS_CONTENT.loyalty.empty}</p>
      ) : null}
      {!loading && balance != null && balance > 0 ? (
        <>
          <p>{POS_CONTENT.loyalty.balance(balance)}</p>
          <label>
            {POS_CONTENT.loyalty.use}
            <input
              value={points}
              inputMode="numeric"
              disabled={busy || collected}
              onChange={(event) => dispatch(redeemPointsChanged(event.target.value))}
            />
          </label>
        </>
      ) : null}
    </section>
  );
}
