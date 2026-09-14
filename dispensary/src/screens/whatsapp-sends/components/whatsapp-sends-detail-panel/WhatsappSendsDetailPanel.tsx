import type { Ref } from 'react';
import { useSelector } from 'react-redux';
import { kindLabel, outcomeLabel } from '../../WhatsappSendsScreen.utils';
import { selectWhatsappSendsBusy, selectWhatsappSendsSelected } from '../../store';

export type WhatsappSendsDetailPanelProps = {
  retryRef?: Ref<HTMLButtonElement>;
  onRetry: () => void;
};

export function WhatsappSendsDetailPanel({ retryRef, onRetry }: WhatsappSendsDetailPanelProps) {
  const message = useSelector(selectWhatsappSendsSelected);
  const busy = useSelector(selectWhatsappSendsBusy);
  if (!message) {
    return null;
  }
  const failed = message.status === 'FAILED';
  return (
    <section className="wh-card wh-card-pad" aria-label="Send preview">
      <h3 style={{ margin: 0, fontFamily: 'Manrope, Inter, sans-serif', fontSize: 15, fontWeight: 800 }}>
        This send
      </h3>
      <div className="wh-pills" style={{ marginTop: 10 }}>
        <span className="wh-pill" data-tone="tag">
          {kindLabel(message.kind)}
        </span>
        <span
          className="wh-pill"
          data-tone={message.status === 'SENT' ? undefined : message.status === 'FAILED' ? 'rose' : 'gold'}
        >
          {outcomeLabel(message.status)}
        </span>
      </div>
      <p className="wh-muted" style={{ marginTop: 10 }}>
        Approved slot: {message.templateUniqueName}
      </p>
      <blockquote className="wh-quote">{message.preview}</blockquote>
      {message.failureCode ? <p className="wh-mono wh-muted">{message.failureCode}</p> : null}
      {failed ? (
        <button
          ref={retryRef}
          type="button"
          className="wh-btn wh-btn-primary"
          disabled={busy}
          onClick={onRetry}
          style={{ marginTop: 12 }}
        >
          {busy ? 'Sending…' : 'Send again'}
        </button>
      ) : null}
    </section>
  );
}
