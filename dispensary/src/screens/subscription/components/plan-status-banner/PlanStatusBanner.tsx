import { AlertCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectSubHint, selectSubPaymentNote, selectSubStatus } from '../../store';
import { statusCopy } from '../../SubscriptionScreen.utils';

export function PlanStatusBanner() {
  const status = useSelector(selectSubStatus);
  const hint = useSelector(selectSubHint);
  const paymentNote = useSelector(selectSubPaymentNote);
  const banner = statusCopy(status);
  const text = hint ?? banner?.text ?? paymentNote;
  if (!text) {
    return null;
  }
  const tone =
    status === 'failure' || status === 'conflict' || status === 'quota' || status === 'unavailable'
      ? 'alert'
      : status === 'success'
        ? 'ok'
        : undefined;
  return (
    <p className="sb-alert" data-tone={tone} role={tone === 'alert' ? 'alert' : 'status'}>
      <AlertCircle size={15} aria-hidden />
      <span>{text}</span>
    </p>
  );
}
