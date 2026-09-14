import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { CustomReportsCatalog } from './components/custom-reports-catalog';
import { CustomReportsBuilder } from './components/custom-reports-builder';
import { CustomReportsHeader } from './components/custom-reports-header';
import { CustomReportsStatusBanner } from './components/custom-reports-status-banner';
import { CUSTOM_REPORTS_CONTENT } from './CustomReportsScreen.content';
import { hasReportingAccess } from './CustomReportsScreen.utils';
import './CustomReportsScreen.css';
import {
  accessDenied,
  hydrateOwnerScope,
  loadCustomReportCatalog,
  selectCrMode,
  selectCrPlanGate,
  selectCrStatus,
} from './store';

export default function CustomReportsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const mode = useSelector(selectCrMode);
  const status = useSelector(selectCrStatus);
  const planGate = useSelector(selectCrPlanGate);
  const allowed = hasReportingAccess(user?.role, user?.modules);
  const owner = user?.role === 'pharmacy_owner';
  const showBuilder = allowed && !planGate;

  useEffect(() => {
    if (!allowed) {
      dispatch(
        accessDenied(
          'Till staff cannot build a report. Ask the owner for Accounts access.',
        ),
      );
      return;
    }
    dispatch(
      hydrateOwnerScope({
        owner,
        hasBranch: Boolean(user?.activeBranchId),
      }),
    );
    void dispatch(loadCustomReportCatalog());
  }, [allowed, dispatch, owner, user?.activeBranchId]);

  return (
    <div className="cr" aria-label={CUSTOM_REPORTS_CONTENT.regionLabel}>
      <CustomReportsHeader />
      <CustomReportsStatusBanner />

      {showBuilder ? (
        <>
          {status === 'loading' && mode === 'catalog' ? (
            <div className="cr-loading" role="status">
              {CUSTOM_REPORTS_CONTENT.loading}
            </div>
          ) : null}
          {mode === 'catalog' && status !== 'loading' ? <CustomReportsCatalog /> : null}
          {mode === 'builder' ? <CustomReportsBuilder owner={owner} /> : null}
        </>
      ) : null}
    </div>
  );
}
