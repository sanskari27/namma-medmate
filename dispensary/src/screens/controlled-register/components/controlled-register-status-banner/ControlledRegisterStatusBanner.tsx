import { useSelector } from 'react-redux';
import { statusCopy } from '../../ControlledRegisterScreen.utils';
import { selectNdpsHint, selectNdpsStatus } from '../../store';

export function ControlledRegisterStatusBanner() {
  const status = useSelector(selectNdpsStatus);
  const hint = useSelector(selectNdpsHint);
  const text = statusCopy(status, hint);
  if (!text) {
    return <div id="ndps-sale-book-status" />;
  }
  const tone = status === 'failure' || status === 'conflict' ? 'alert' : status === 'success' ? 'ok' : undefined;
  return (
    <p
      id="ndps-sale-book-status"
      role={status === 'denied' ? 'alert' : 'status'}
      className="nd-alert"
      data-tone={tone}
    >
      {text}
    </p>
  );
}
