import { useSelector } from 'react-redux';
import { statusCopy, statusIcon } from '../../OffersScreen.utils';
import {
  selectOffersStatus,
  selectOffersStatusHint,
} from '../../store/offers.selectors';

export function OffersStatusBanner() {
  const status = useSelector(selectOffersStatus);
  const hint = useSelector(selectOffersStatusHint);
  const copy = statusCopy(status, hint);
  if (!copy || status === 'loading' || status === 'idle' || status === 'empty') {
    return null;
  }
  const Icon = statusIcon(status);
  const tone =
    status === 'success' ? 'ok' : status === 'denied' || status === 'failure' || status === 'conflict'
      ? 'alert'
      : undefined;

  return (
    <div className="off-banner" data-tone={tone} role={tone === 'alert' ? 'alert' : 'status'}>
      <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} aria-hidden />
        {copy}
      </strong>
    </div>
  );
}
