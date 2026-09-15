import { useCallback, useEffect, useId, useMemo } from 'react';
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
  selectDashboardDesk,
  selectDashboardDeskView,
  selectDashboardHint,
  selectDashboardMetric,
  selectDashboardPeriod,
  selectDashboardStatus,
  selectDashboardView,
} from './store/dashboard.selectors';
import { loadDashboard, reloadDashboardPeriod } from './store/dashboard.thunks';
import {
  clientPermittedDesks,
  defaultDesk,
  type DashboardDesk,
} from './DashboardScreen.utils';

export function useDashboardScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const statusId = useId();
  const user = useSelector((state: RootState) => state.auth.user);
  const activeBranchId = user?.activeBranchId ?? null;
  const status = useSelector(selectDashboardStatus);
  const statusHint = useSelector(selectDashboardHint);
  const view = useSelector(selectDashboardView);
  const deskView = useSelector(selectDashboardDeskView);
  const desk = useSelector(selectDashboardDesk);
  const period = useSelector(selectDashboardPeriod);
  const metric = useSelector(selectDashboardMetric);
  const chartType = useSelector(selectDashboardChartType);
  const busy = useSelector(selectDashboardBusy);
  const desks = useMemo(() => clientPermittedDesks(user), [user]);
  const initialDesk = useMemo(() => defaultDesk(user), [user]);

  useEffect(() => {
    void dispatch(loadDashboard(initialDesk));
  }, [dispatch, activeBranchId, initialDesk]);

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
    void dispatch(loadDashboard(desk ?? initialDesk));
  }, [dispatch, desk, initialDesk]);

  const onDesk = useCallback(
    (next: DashboardDesk) => {
      void dispatch(loadDashboard(next));
    },
    [dispatch],
  );

  return {
    statusId,
    displayName: user?.displayName ?? FALLBACK_STAFF_NAME,
    status,
    statusHint,
    view,
    deskView,
    desk,
    desks,
    period,
    metric,
    chartType,
    busy,
    onPeriod,
    onMetric,
    onChartType,
    onRefresh,
    onDesk,
  };
}
