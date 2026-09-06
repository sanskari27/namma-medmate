import type { WhatsAppTemplate } from '@/services/whatsappTemplates';

export type TemplatePreviewPanelProps = {
  template: WhatsAppTemplate;
  preview: string;
};

export function TemplatePreviewPanel({ template, preview }: TemplatePreviewPanelProps) {
  return (
    <div className="border border-line bg-surface p-3">
      <p className="text-sm font-medium text-ink">How it reads at the counter</p>
      <p className="mt-2 text-sm leading-6 text-ink">{preview}</p>
      {template.runtimeSlots.length > 0 ? (
        <p className="mt-2 text-xs text-muted">
          Patient and medicine names fill when the message is sent.
        </p>
      ) : null}
    </div>
  );
}
