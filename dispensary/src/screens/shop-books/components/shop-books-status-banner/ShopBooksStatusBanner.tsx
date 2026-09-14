import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { statusCopy, statusIcon } from '../../ShopBooksScreen.utils';
import { selectShopBooksPlanGate, selectShopBooksStatus, selectShopBooksStatusHint } from '../../store';

export function ShopBooksStatusBanner() {
  const status = useSelector(selectShopBooksStatus);
  const hint = useSelector(selectShopBooksStatusHint);
  const planGate = useSelector(selectShopBooksPlanGate);
  const copy = statusCopy(status, hint);
  if (!copy || status === 'loading' || status === 'empty' || status === null) {
    return null;
  }
  const Icon = statusIcon(status);
  return (
    <p className="bk-alert" data-tone={status === 'success' ? 'ok' : 'alert'} role={status === 'denied' ? 'alert' : 'status'}>
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
