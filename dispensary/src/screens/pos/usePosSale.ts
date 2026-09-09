import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import {
  canDispenseControlled,
  hasLoyaltyAccess,
  hasSalesAccess,
} from './PosScreen.utils';
import { accessResolved } from './store/pos.slice';
import {
  selectPosAllowed,
  selectPosStatus,
  selectPosStatusHint,
} from './store/pos.selectors';
import { loadBootstrap, searchCatalogue, searchCustomers } from './store/pos.thunks';
import {
  selectPosCategoryFilterId,
  selectPosCustomerQuery,
  selectPosProductQuery,
} from './store/pos.selectors';

/** Boots Sales POS access and catalogue search debouncers. */
export function usePosSale() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasSalesAccess(user?.modules);
  const storeAllowed = useSelector(selectPosAllowed);
  const productQuery = useSelector(selectPosProductQuery);
  const categoryFilterId = useSelector(selectPosCategoryFilterId);
  const customerQuery = useSelector(selectPosCustomerQuery);
  const status = useSelector(selectPosStatus);
  const statusHint = useSelector(selectPosStatusHint);

  useEffect(() => {
    dispatch(
      accessResolved({
        allowed,
        canDispense: canDispenseControlled(user?.role, user?.roles),
        loyaltyEntitled: hasLoyaltyAccess(user?.modules),
      }),
    );
  }, [dispatch, allowed, user?.role, user?.roles, user?.modules]);

  useEffect(() => {
    if (!storeAllowed) {
      return;
    }
    void dispatch(loadBootstrap());
  }, [dispatch, storeAllowed, user?.activeBranchId]);

  useEffect(() => {
    if (!storeAllowed) {
      return;
    }
    const handle = window.setTimeout(() => {
      void dispatch(searchCatalogue());
    }, 200);
    return () => window.clearTimeout(handle);
  }, [dispatch, storeAllowed, productQuery, categoryFilterId]);

  useEffect(() => {
    if (!storeAllowed) {
      return;
    }
    const handle = window.setTimeout(() => {
      void dispatch(searchCustomers());
    }, 200);
    return () => window.clearTimeout(handle);
  }, [dispatch, storeAllowed, customerQuery]);

  return { allowed: storeAllowed, status, statusHint };
}
