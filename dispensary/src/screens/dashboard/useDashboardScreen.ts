import { useCallback, useEffect, useId } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FALLBACK_STAFF_NAME } from '@/libs/constants/counters.const';
import type { AppDispatch, RootState } from '@/store';
import type { DashboardPeriod } from '@/services/homeDashboard';
import {
  chartTypeChanged,
  metricChanged,
  periodChanged,
  type DashboardChartType,
  type DashboardMetric,
} from './store/dashboard.slice';
import {
  selectDashboardBusy,
  selectDashboardChartType,
  selectDashboardHint,
  selectDashboardMetric,
  selectDashboardPeriod,
  selectDashboardStatus,
  selectDashboardView,
} from './store/dashboard.selectors';
import { loadDashboard, reloadDashboardPeriod } from './store/dashboard.thunks';

export function useDashboardScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const statusId = useId();
  const user = useSelector((state: RootState) => state.auth.user);
  const activeBranchId = user?.activeBranchId ?? null;
  const status = useSelector(selectDashboardStatus);
  const statusHint = useSelector(selectDashboardHint);
  const view = useSelector(selectDashboardView);
  const period = useSelector(selectDashboardPeriod);
  const metric = useSelector(selectDashboardMetric);
  const chartType = useSelector(selectDashboardChartType);
  const busy = useSelector(selectDashboardBusy);

  useEffect(() => {
    void dispatch(loadDashboard());
  }, [dispatch, activeBranchId]);

  const onPeriod = useCallback(
    (next: DashboardPeriod) => {
      dispatch(periodChanged(next));
      void dispatch(reloadDashboardPeriod(next));
    },
    [dispatch],
  );

  const onMetric = useCallback(
    (next: DashboardMetric) => {
      dispatch(metricChanged(next));
    },
    [dispatch],
  );

  const onChartType = useCallback(
    (next: DashboardChartType) => {
      dispatch(chartTypeChanged(next));
    },
    [dispatch],
  );

  const onRefresh = useCallback(() => {
    void dispatch(loadDashboard());
  }, [dispatch]);

  return {
    statusId,
    displayName: user?.displayName ?? FALLBACK_STAFF_NAME,
    status,
    statusHint,
    view,
    period,
    metric,
    chartType,
    busy,
    onPeriod,
    onMetric,
    onChartType,
    onRefresh,
  };
}
