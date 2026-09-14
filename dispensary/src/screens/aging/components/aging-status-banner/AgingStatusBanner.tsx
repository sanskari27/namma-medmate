import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { statusCopy, statusIcon } from '../../AgingScreen.utils';
import { selectAgingPlanGate, selectAgingStatus, selectAgingStatusHint } from '../../store';

export function AgingStatusBanner() {
  const status = useSelector(selectAgingStatus);
  const hint = useSelector(selectAgingStatusHint);
  const planGate = useSelector(selectAgingPlanGate);
  const copy = statusCopy(status, hint);
  if (!copy || status === 'loading' || status === 'empty' || status === null) {
    return null;
  }
  const Icon = statusIcon(status);
  const tone = status === 'success' ? 'ok' : 'alert';
  return (
    <p className="ag-alert" data-tone={tone} role={status === 'denied' ? 'alert' : 'status'}>
      <Icon size={16} aria-hidden />
      <span>
        {copy}
        {planGate ? (
          <>
            {' '}
            <Link to={ROUTES.SUBSCRIPTION}>Open the plan</Link>
          </>
        ) : null}
      </span>
    </p>
  );
}
