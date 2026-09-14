import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { statusCopy } from '../../RegistersScreen.utils';
import { selectRegistersHint, selectRegistersPlanGate, selectRegistersStatus } from '../../store';

export function RegistersStatusBanner() {
  const status = useSelector(selectRegistersStatus);
  const hint = useSelector(selectRegistersHint);
  const planGate = useSelector(selectRegistersPlanGate);
  const text = statusCopy(status, hint);
  if (!text) {
    return <div id="register-book-status" />;
  }
  const tone = status === 'failure' || status === 'conflict' ? 'alert' : status === 'success' ? 'ok' : undefined;
  return (
    <p
      id="register-book-status"
      role={status === 'denied' ? 'alert' : 'status'}
      className="rg-alert"
      data-tone={tone}
    >
      <span>
        {text}
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
