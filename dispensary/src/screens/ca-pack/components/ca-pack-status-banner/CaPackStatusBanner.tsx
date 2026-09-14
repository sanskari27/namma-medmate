import { useSelector } from 'react-redux';
import { statusCopy, statusIcon } from '../../CaPackScreen.utils';
import { selectCaPackStatus, selectCaPackStatusHint } from '../../store';

export function CaPackStatusBanner() {
  const status = useSelector(selectCaPackStatus);
  const hint = useSelector(selectCaPackStatusHint);
  const copy = statusCopy(status, hint);
  if (!copy || status === 'loading' || status === 'empty' || status === null) {
    return null;
  }
  const Icon = statusIcon(status);
  return (
    <p className="ca-alert" data-tone={status === 'success' ? 'ok' : 'alert'} role={status === 'denied' ? 'alert' : 'status'}>
      <Icon size={16} aria-hidden />
      <span>{copy}</span>
    </p>
  );
}
