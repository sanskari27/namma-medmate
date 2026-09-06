import { Button } from '@atoms';
import type { WhatsAppMessage } from '@/services/whatsappMessages';
import type { Ref } from 'react';
import { kindLabel, outcomeLabel } from '../../WhatsappSendsScreen.utils';

export type WhatsappSendsDetailPanelProps = {
  message: WhatsAppMessage;
  busy: boolean;
  retryRef?: Ref<HTMLButtonElement>;
  onRetry: () => void;
};

export function WhatsappSendsDetailPanel({
  message,
  busy,
  retryRef,
  onRetry,
}: WhatsappSendsDetailPanelProps) {
  return (
    <section className="space-y-3 border border-line bg-surface p-3" aria-label="Send preview">
      <h2 className="text-sm font-semibold text-ink">This send</h2>
      <p className="text-sm text-ink">
        {kindLabel(message.kind)} · {outcomeLabel(message.status)}
      </p>
      <p className="text-sm text-muted">Approved slot: {message.templateUniqueName}</p>
      <blockquote className="border border-line bg-canvas px-3 py-2 text-sm text-ink">
        {message.preview}
      </blockquote>
      {message.failureCode ? (
        <p className="font-mono text-xs text-muted">{message.failureCode}</p>
      ) : null}
      <Button ref={retryRef} type="button" disabled={busy} onClick={onRetry}>
        {busy ? 'Sending…' : 'Send again'}
      </Button>
    </section>
  );
}
