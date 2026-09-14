import { useSelector } from 'react-redux';
import { statusCopy } from '../../WhatsappSendsScreen.utils';
import { selectWhatsappSendsHint, selectWhatsappSendsStatus } from '../../store';

export function WhatsappSendsStatusBanner() {
  const status = useSelector(selectWhatsappSendsStatus);
  const hint = useSelector(selectWhatsappSendsHint);
  const text = statusCopy(status, hint);
  if (!text) {
    return <div id="whatsapp-sends-status" />;
  }
  const tone = status === 'failure' || status === 'conflict' ? 'alert' : status === 'success' ? 'ok' : undefined;
  return (
    <p
      id="whatsapp-sends-status"
      role={status === 'denied' ? 'alert' : 'status'}
      className="wh-alert"
      data-tone={tone}
    >
      {text}
    </p>
  );
}
