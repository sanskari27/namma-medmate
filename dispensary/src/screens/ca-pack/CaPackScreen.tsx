import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { CaPackAdvisorDialog } from './components/ca-pack-advisor-dialog';
import { CaPackAdvisors } from './components/ca-pack-advisors';
import { CaPackHistory } from './components/ca-pack-history';
import { CaPackShareCard } from './components/ca-pack-share-card';
import { CaPackSnapshot } from './components/ca-pack-snapshot';
import { CaPackStatusBanner } from './components/ca-pack-status-banner';
import { CA_PACK_CONTENT } from './CaPackScreen.content';
import { hasFinanceAccess } from './CaPackScreen.utils';
import './CaPackScreen.css';
import {
  accessDenied,
  hydrateOwnerScope,
  loadCaPack,
  selectCaPackPeriodKey,
  selectCaPackScope,
} from './store';

export default function CaPackScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const periodKey = useSelector(selectCaPackPeriodKey);
  const scope = useSelector(selectCaPackScope);
  const allowed = hasFinanceAccess(user?.role, user?.roles);
  const owner = user?.role === 'pharmacy_owner';

  useEffect(() => {
    if (!allowed) {
      dispatch(
        accessDenied('Till staff cannot open the CA pack. Ask the owner for the Accountant desk.'),
      );
      return;
    }
    dispatch(hydrateOwnerScope({ owner, hasBranch: Boolean(user?.activeBranchId) }));
  }, [allowed, dispatch, owner, user?.activeBranchId]);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    void dispatch(loadCaPack());
  }, [allowed, dispatch, periodKey, scope]);

  return (
    <div className="ca" aria-label={CA_PACK_CONTENT.regionLabel}>
      <CaPackStatusBanner />
      {allowed ? (
        <>
          <div className="ca-grid">
            <CaPackShareCard />
            <div className="ca-stack">
              <CaPackAdvisors />
              <CaPackSnapshot />
            </div>
          </div>
          <CaPackHistory />
          <CaPackAdvisorDialog />
        </>
      ) : null}
    </div>
  );
}
