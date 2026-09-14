import { AlertCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectLicensesHint, selectLicensesStatus } from '../../store';
import { statusCopy } from '../../LicensesScreen.utils';

export function LicensesStatusBanner() {
  const status = useSelector(selectLicensesStatus);
  const hint = useSelector(selectLicensesHint);
  const text = statusCopy(status, hint);
  if (!text) {
    return null;
  }
  const tone = status === 'failure' || status === 'conflict' ? 'alert' : status === 'success' ? 'ok' : undefined;
  return (
    <p className="lc-alert" data-tone={tone} role="status">
      <AlertCircle size={15} aria-hidden />
      <span>{text}</span>
    </p>
  );
}
