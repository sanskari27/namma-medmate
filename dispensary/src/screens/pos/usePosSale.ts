import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '@/store';
import { getCustomer } from '@/services/customers';
import { getHospitalAdmission } from '@/services/hospital';
import { hasHospitalAccess } from '@/libs/hospitalAccess';
import {
  canDispenseControlled,
  hasLoyaltyAccess,
  hasSalesAccess,
} from './PosScreen.utils';
import {
  accessResolved,
  admissionPrefill,
  continueAsWalkIn,
  selectCustomer,
} from './store/pos.slice';
import {
  selectPosAllowed,
  selectPosStatus,
  selectPosStatusHint,
} from './store/pos.selectors';
import {
  continueInvoice,
  loadBootstrap,
  loadHeldBills,
  loadHospitalSaleRefs,
  loadCustomerCredit,
  searchCatalogue,
  searchCustomers,
} from './store/pos.thunks';
import {
  selectPosCategoryFilterId,
  selectPosCustomerQuery,
  selectPosProductQuery,
} from './store/pos.selectors';

/** Boots Sales POS access and catalogue search debouncers. */
export function usePosSale() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams, setSearchParams] = useSearchParams();
  const continueId = searchParams.get('continue');
  const customerId = searchParams.get('customer');
  const walkInPrefill = searchParams.get('walkIn') === '1';
  const saleSourceParam = searchParams.get('saleSource');
  const admissionId = searchParams.get('admissionId');
  const continueHandled = useRef<string | null>(null);
  const customerPrefillHandled = useRef<string | null>(null);
  const admissionPrefillHandled = useRef<string | null>(null);
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
    if (!storeAllowed || !continueId || continueHandled.current === continueId) {
      return;
    }
    continueHandled.current = continueId;
    void (async () => {
      await dispatch(loadBootstrap());
      void dispatch(loadHeldBills());
      const result = await dispatch(continueInvoice(continueId));
      if (continueInvoice.fulfilled.match(result) && result.payload.customer) {
        void dispatch(loadCustomerCredit(result.payload.customer.id));
      }
      const next = new URLSearchParams(searchParams);
      next.delete('continue');
      setSearchParams(next, { replace: true });
    })();
  }, [dispatch, storeAllowed, continueId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!storeAllowed || continueId) {
      return;
    }
    const prefillKey = walkInPrefill ? 'walkIn' : customerId;
    if (!prefillKey || customerPrefillHandled.current === prefillKey) {
      return;
    }
    customerPrefillHandled.current = prefillKey;
    void (async () => {
      if (walkInPrefill) {
        dispatch(continueAsWalkIn());
      } else if (customerId) {
        try {
          const customer = await getCustomer(customerId);
          dispatch(selectCustomer(customer));
          void dispatch(loadCustomerCredit(customer.id));
        } catch {
          customerPrefillHandled.current = null;
        }
      }
      const next = new URLSearchParams(searchParams);
      next.delete('customer');
      next.delete('walkIn');
      setSearchParams(next, { replace: true });
    })();
  }, [
    dispatch,
    storeAllowed,
    continueId,
    customerId,
    walkInPrefill,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!storeAllowed || continueId || !admissionId) {
      return;
    }
    if (admissionPrefillHandled.current === admissionId) {
      return;
    }
    admissionPrefillHandled.current = admissionId;
    void (async () => {
      try {
        const admission = await getHospitalAdmission(admissionId);
        let customer = null;
        if (admission.customerId) {
          try {
            customer = await getCustomer(admission.customerId);
          } catch {
            customer = null;
          }
        }
        dispatch(
          admissionPrefill({
            saleSource: saleSourceParam === 'EMERGENCY' ? 'EMERGENCY' : 'WARD',
            uhid: admission.uhid,
            wardId: admission.wardId,
            admissionId: admission.id,
            patientName: admission.patientName,
            phone: admission.phone ?? '',
            customer,
          }),
        );
        if (customer) {
          void dispatch(loadCustomerCredit(customer.id));
        }
      } catch {
        admissionPrefillHandled.current = null;
      }
      const next = new URLSearchParams(searchParams);
      next.delete('saleSource');
      next.delete('admissionId');
      setSearchParams(next, { replace: true });
    })();
  }, [
    dispatch,
    storeAllowed,
    continueId,
    admissionId,
    saleSourceParam,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!storeAllowed) {
      return;
    }
    if (continueId) {
      return;
    }
    void dispatch(loadBootstrap());
    void dispatch(loadHeldBills());
    if (hasHospitalAccess(user?.modules)) {
      void dispatch(loadHospitalSaleRefs());
    }
  }, [dispatch, storeAllowed, user?.activeBranchId, user?.modules, continueId]);

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
