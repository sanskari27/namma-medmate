import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { HOSPITAL_SALES_REGISTER_CONTENT } from '../../HospitalSalesRegisterScreen.content';
import { statusMessage, type PageStatus } from '../../HospitalSalesRegisterScreen.utils';

type Props = {
  status: PageStatus;
  message: string | null;
  onDismiss: () => void;
  onRetry?: () => void;
};

export function HospitalSalesRegisterStatusBanner({ status, message, onDismiss, onRetry }: Props) {
  if (!status) {
    return null;
  }
  const tone =
    status === 'success'
      ? 'ok'
      : status === 'failure' || status === 'denied'
        ? 'alert'
        : 'warn';
  const copy = statusMessage(status, message);
  const role = status === 'loading' || status === 'empty' || status === 'success' ? 'status' : 'alert';

  return (
    <p className="ps-banner" role={role} data-tone={tone}>
      {copy}
      {status === 'plan_limit' ? (
        <>
          {' '}
          <Link to={ROUTES.SUBSCRIPTION}>{HOSPITAL_SALES_REGISTER_CONTENT.openPlan}</Link>
        </>
      ) : null}
      {status === 'failure' && onRetry ? (
        <>
          {' '}
          <button type="button" onClick={onRetry}>
            {HOSPITAL_SALES_REGISTER_CONTENT.retry}
          </button>
        </>
      ) : null}
      {status !== 'loading' &&
      status !== 'empty' &&
      status !== 'plan_limit' &&
      status !== 'no_branch' ? (
        <>
          {' '}
          <button type="button" onClick={onDismiss}>
            {HOSPITAL_SALES_REGISTER_CONTENT.dismiss}
          </button>
        </>
      ) : null}
    </p>
  );
}
