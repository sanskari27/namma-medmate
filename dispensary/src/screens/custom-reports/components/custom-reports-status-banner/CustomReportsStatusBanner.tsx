import { useId } from 'react';
import { useSelector } from 'react-redux';
import { statusCopy, statusIcon } from '../../CustomReportsScreen.utils';
import { selectCrStatus, selectCrStatusHint } from '../../store';

export function CustomReportsStatusBanner() {
  const status = useSelector(selectCrStatus);
  const hint = useSelector(selectCrStatusHint);
  const statusId = useId();
  const text = statusCopy(status, hint);

  if (!text) {
    return <div id={statusId} className="min-h-5" />;
  }

  const Icon = statusIcon(status);
  const tone =
    status === 'denied' || status === 'failure' || status === 'conflict' ? 'alert' : 'ok';

  return (
    <p
      id={statusId}
      role={status === 'denied' ? 'alert' : 'status'}
      className="cr-alert"
      data-tone={tone}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
}
