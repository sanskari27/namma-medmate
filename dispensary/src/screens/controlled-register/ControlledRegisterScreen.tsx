import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { ControlledRegisterFilters } from './components/controlled-register-filters';
import { ControlledRegisterHeader } from './components/controlled-register-header';
import { ControlledRegisterList } from './components/controlled-register-list';
import { ControlledRegisterStatusBanner } from './components/controlled-register-status-banner';
import { canOpenSaleBook } from './ControlledRegisterScreen.utils';
import {
  accessDenied,
  exportControlledRegister,
  filtersChanged,
  loadControlledRegister,
  selectNdpsBusy,
  selectNdpsFilters,
  selectNdpsItems,
  selectNdpsPatients,
  selectNdpsPharmacists,
  selectNdpsProducts,
  selectNdpsStatus,
} from './store';
import './ControlledRegisterScreen.css';

export default function ControlledRegisterScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const spreadsheetRef = useRef<HTMLButtonElement | null>(null);
  const ndpsRef = useRef<HTMLButtonElement | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = canOpenSaleBook(user?.role, user?.roles);
  const status = useSelector(selectNdpsStatus);
  const items = useSelector(selectNdpsItems);
  const filters = useSelector(selectNdpsFilters);
  const busy = useSelector(selectNdpsBusy);
  const products = useSelector(selectNdpsProducts);
  const patients = useSelector(selectNdpsPatients);
  const pharmacists = useSelector(selectNdpsPharmacists);

  useEffect(() => {
    if (!allowed) {
      dispatch(accessDenied());
      return;
    }
    void dispatch(loadControlledRegister());
  }, [allowed, dispatch, user?.activeBranchId]);

  return (
    <div className="nd" aria-label="NDPS sale book">
      <ControlledRegisterHeader
        spreadsheetRef={spreadsheetRef}
        ndpsRef={ndpsRef}
        denied={!allowed}
        busy={busy}
        onSpreadsheet={() => {
          void dispatch(exportControlledRegister('csv')).then(() => spreadsheetRef.current?.focus());
        }}
        onNdps={() => {
          void dispatch(exportControlledRegister('ndps')).then(() => ndpsRef.current?.focus());
        }}
      />
      <ControlledRegisterStatusBanner />
      {allowed ? (
        <>
          <ControlledRegisterFilters
            filters={filters}
            products={products}
            patients={patients}
            pharmacists={pharmacists}
            disabled={busy}
            onChange={(next) => dispatch(filtersChanged(next))}
            onApply={() => {
              void dispatch(loadControlledRegister());
            }}
          />
          {status === 'loading' || status === 'denied' ? null : <ControlledRegisterList items={items} />}
        </>
      ) : null}
    </div>
  );
}
