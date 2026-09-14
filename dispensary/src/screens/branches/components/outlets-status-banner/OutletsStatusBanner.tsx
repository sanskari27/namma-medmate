import { ROUTES } from '@/libs/constants/routes.const';
import { AlertCircle, BadgeCheck, Building2, MapPin, Unplug } from 'lucide-react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import type { AppDispatch, RootState } from '@/store';
import {
  accessDenied,
  loadBranches,
  selectOutletsStatus,
  type OutletsStatus,
} from '../../store';

function statusCopy(status: OutletsStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: Building2, text: 'Loading outlets for this counter…' };
    case 'empty':
      return { icon: MapPin, text: 'No outlets yet. Add the first branch for this pharmacy floor.' };
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Name, address, phone, and drug licence are required before saving this outlet.',
      };
    case 'denied':
      return { icon: AlertCircle, text: 'Only the pharmacy owner can manage outlets at this counter.' };
    case 'conflict':
      return { icon: AlertCircle, text: 'This outlet was updated elsewhere. Refresh and try again.' };
    case 'quota':
      return {
        icon: AlertCircle,
        text: 'This pharmacy has used its outlet limit. Upgrade the plan to add another outlet.',
      };
    case 'failure':
      return { icon: Unplug, text: 'Could not reach the server for outlets. Try again.' };
    case 'success':
      return { icon: BadgeCheck, text: 'Outlet saved on this floor.' };
    default:
      return null;
  }
}

export function OutletsStatusBanner() {
  const status = useSelector(selectOutletsStatus);
  const banner = statusCopy(status);
  if (!banner) {
    return null;
  }
  return (
    <p
      role="alert"
      className="ot-alert"
      data-tone={status === 'quota' || status === 'failure' ? 'alert' : status === 'success' ? 'ok' : undefined}
    >
      <banner.icon size={15} aria-hidden />
      <span>
        {banner.text}
        {status === 'quota' ? (
          <>
            {' '}
            <Link to={ROUTES.SUBSCRIPTION}>Open plan for this pharmacy</Link>
          </>
        ) : null}
      </span>
    </p>
  );
}

export function useOutletsAccess() {
  const dispatch = useDispatch<AppDispatch>();
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const allowed = role === 'pharmacy_owner';
  useEffect(() => {
    if (!allowed) {
      dispatch(accessDenied());
      return;
    }
    void dispatch(loadBranches());
  }, [allowed, dispatch]);
  return allowed;
}
