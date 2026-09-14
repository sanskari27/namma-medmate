import { AlertCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectAccountStatus, selectAccountStatusHint } from '../../store';
import { statusCopy } from '../../AccountScreen.utils';

export function AccountStatusBanner() {
  const status = useSelector(selectAccountStatus);
  const hint = useSelector(selectAccountStatusHint);
  const text = hint && status === 'rejected' ? `${statusCopy(status)} Reason: ${hint}` : statusCopy(status);
  if (!text) {
    return null;
  }
  const tone = status === 'failure' || status === 'conflict' || status === 'rejected' ? 'alert' : status === 'success' || status === 'approved' ? 'ok' : undefined;
  return (
    <p className="ac-alert" data-tone={tone} role="status">
      <AlertCircle size={15} aria-hidden />
      <span>{text}</span>
    </p>
  );
}
