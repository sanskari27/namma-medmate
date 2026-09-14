import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { KIOSK_CONTENT } from '../../KioskScreen.content';
import { statusCopy } from '../../KioskScreen.utils';
import { selectKioskStatus, selectKioskStatusHint } from '../../store/kiosk.selectors';

export function KioskStatusBanner() {
  const status = useSelector(selectKioskStatus);
  const hint = useSelector(selectKioskStatusHint);
  const copy = hint || statusCopy(status);
  if (!copy || status === 'loading' || status === 'idle') return null;

  const tone =
    status === 'success'
      ? 'ok'
      : status === 'denied' ||
          status === 'failure' ||
          status === 'conflict' ||
          status === 'validation'
        ? 'alert'
        : undefined;

  return (
    <div className="ko-alert" data-tone={tone} role={tone === 'alert' ? 'alert' : 'status'}>
      <strong>{copy}</strong>
      {status === 'quota' ? (
        <div>
          <Link to={ROUTES.SUBSCRIPTION} className="text-sm font-medium underline">
            Open plan for this pharmacy
          </Link>
        </div>
      ) : null}
      {status === 'empty' ? (
        <div>
          <Link to={ROUTES.BRANCHES} className="text-sm font-medium underline">
            Open outlets
          </Link>
        </div>
      ) : null}
    </div>
  );
}
