import { AlertCircle, BadgeCheck, Wallet } from 'lucide-react';
import { useSelector } from 'react-redux';
import { CREDIT_CONTENT } from '../../CreditScreen.content';
import { statusCopy } from '../../CreditScreen.utils';
import { selectCreditStatus } from '../../store/credit.selectors';

export function CreditStatusBanner() {
  const status = useSelector(selectCreditStatus);
  const text = statusCopy(status);
  if (!text || status === 'loading' || status === 'empty' || status === 'idle') {
    return null;
  }
  const alert = status === 'denied' || status === 'failure';
  const Icon = status === 'success' ? BadgeCheck : status === 'empty' ? Wallet : AlertCircle;
  return (
    <div
      className="credit-banner"
      data-tone={alert ? 'alert' : status === 'success' ? 'ok' : undefined}
      role={alert ? 'alert' : 'status'}
    >
      <strong>{text}</strong>
      {status === 'failure' ? ` ${CREDIT_CONTENT.retry}` : null}
    </div>
  );
}
