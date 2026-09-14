import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { TrendsEmptyState } from './components/trends-empty-state';
import { TrendsFilterBar } from './components/trends-filter-bar';
import { TrendsFrequency } from './components/trends-frequency';
import { TrendsHeader } from './components/trends-header';
import { TrendsSalesChart } from './components/trends-sales-chart';
import { TrendsSlowDead } from './components/trends-slow-dead';
import { TrendsStatusBanner } from './components/trends-status-banner';
import { TrendsSummaryStrip } from './components/trends-summary-strip';
import { TrendsTopSellers } from './components/trends-top-sellers';
import { TRENDS_CONTENT } from './TrendsScreen.content';
import { hasReportingAccess } from './TrendsScreen.utils';
import './TrendsScreen.css';
import {
  accessDenied,
  hydrateOwnerScope,
  loadTrends,
  selectTrendsPlanGate,
  selectTrendsStatus,
} from './store';

export default function TrendsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const status = useSelector(selectTrendsStatus);
  const planGate = useSelector(selectTrendsPlanGate);
  const allowed = hasReportingAccess(user?.role, user?.modules);
  const owner = user?.role === 'pharmacy_owner';

  useEffect(() => {
    if (!allowed) {
      dispatch(
        accessDenied(
          'Till staff cannot open compare weeks. Ask the owner for Accounts access.',
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
    void dispatch(loadTrends());
  }, [allowed, dispatch, owner, user?.activeBranchId]);

  return (
    <div className="tr" aria-label={TRENDS_CONTENT.regionLabel}>
      <TrendsHeader />
      <TrendsStatusBanner />

      {allowed && !planGate ? (
        <>
          <TrendsFilterBar owner={owner} />
          {status === 'loading' ? (
            <div className="tr-loading" role="status">
              {TRENDS_CONTENT.loading}
            </div>
          ) : null}
          {status === 'success' ? (
            <>
              <TrendsSummaryStrip />
              <div className="tr-grid">
                <TrendsSalesChart />
                <TrendsTopSellers />
                <TrendsSlowDead />
                <TrendsFrequency />
              </div>
            </>
          ) : null}
          {status === 'empty' ? <TrendsEmptyState /> : null}
        </>
      ) : null}
    </div>
  );
}
