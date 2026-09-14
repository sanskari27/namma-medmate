import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectStaffBanner, selectStaffStatus } from '../../store';

function copy(status: ReturnType<typeof selectStaffStatus>, banner: string | null) {
  if (banner) {
    return banner;
  }
  switch (status) {
    case 'loading':
      return 'Loading staff accounts';
    case 'empty':
      return 'No additional staff accounts yet. Add a staff member to this pharmacy.';
    case 'denied':
      return 'Only the pharmacy owner can add or remove staff access.';
    case 'failure':
      return 'Could not load staff accounts. Try again.';
    case 'success':
      return 'Staff saved. They cannot sign in until their registration is approved.';
    default:
      return null;
  }
}

export function StaffStatusBanner() {
  const status = useSelector(selectStaffStatus);
  const banner = useSelector(selectStaffBanner);
  const text = copy(status, banner);
  if (!text) {
    return null;
  }
  const Icon = status === 'failure' ? WifiOff : status === 'success' ? CheckCircle2 : AlertCircle;
  const tone = status === 'failure' ? 'alert' : status === 'success' ? 'ok' : undefined;
  return (
    <p className="st-alert" data-tone={tone} role="status">
      <Icon size={15} aria-hidden />
      <span>{text}</span>
    </p>
  );
}
