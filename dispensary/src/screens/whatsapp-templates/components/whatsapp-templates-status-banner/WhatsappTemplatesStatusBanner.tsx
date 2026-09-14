import { useSelector } from 'react-redux';
import { statusCopy } from '../../WhatsappTemplatesScreen.utils';
import { selectWhatsappTemplatesHint, selectWhatsappTemplatesStatus } from '../../store';

export function WhatsappTemplatesStatusBanner() {
  const status = useSelector(selectWhatsappTemplatesStatus);
  const hint = useSelector(selectWhatsappTemplatesHint);
  const text = statusCopy(status, hint);
  if (!text) {
    return <div id="whatsapp-slots-status" />;
  }
  const tone = status === 'failure' || status === 'conflict' ? 'alert' : status === 'success' ? 'ok' : undefined;
  return (
    <p
      id="whatsapp-slots-status"
      role={status === 'denied' ? 'alert' : 'status'}
      className="ws-alert"
      data-tone={tone}
    >
      {text}
    </p>
  );
}
