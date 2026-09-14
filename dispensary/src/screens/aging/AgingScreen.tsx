import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { AgingStatusBanner } from './components/aging-status-banner';
import { AgingTable } from './components/aging-table';
import { AgingToolbar } from './components/aging-toolbar';
import { AGING_CONTENT } from './AgingScreen.content';
import { hasFinanceAccess } from './AgingScreen.utils';
import './AgingScreen.css';
import {
  accessDenied,
  hydrateOwnerScope,
  loadAging,
  selectAgingCustomAsOf,
  selectAgingMonth,
  selectAgingPeriodKind,
  selectAgingScope,
} from './store';

export default function AgingScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const periodKind = useSelector(selectAgingPeriodKind);
  const month = useSelector(selectAgingMonth);
  const customAsOf = useSelector(selectAgingCustomAsOf);
  const scope = useSelector(selectAgingScope);
  const allowed = hasFinanceAccess(user?.role, user?.roles);
  const owner = user?.role === 'pharmacy_owner';

  useEffect(() => {
    if (!allowed) {
      dispatch(accessDenied('Till staff cannot open dues. Ask the owner for Accounts access.'));
      return;
    }
    dispatch(hydrateOwnerScope({ owner, hasBranch: Boolean(user?.activeBranchId) }));
  }, [allowed, dispatch, owner, user?.activeBranchId]);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    void dispatch(loadAging());
  }, [allowed, dispatch, periodKind, month, customAsOf, scope]);

  return (
    <div className="ag" aria-label={AGING_CONTENT.regionLabel}>
      <AgingStatusBanner />
      {allowed ? (
        <>
          <AgingToolbar owner={owner} />
          <AgingTable />
        </>
      ) : null}
    </div>
  );
}
