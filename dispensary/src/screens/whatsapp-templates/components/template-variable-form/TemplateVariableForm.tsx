import { Input, Label } from '@atoms';
import type { WhatsAppTemplate } from '@/services/whatsappTemplates';
import { slotLabel } from '../../WhatsappTemplatesScreen.utils';

export type TemplateVariableFormProps = {
  template: WhatsAppTemplate;
  values: Record<string, string>;
  onChange: (slot: string, value: string) => void;
};

export function TemplateVariableForm({ template, values, onChange }: TemplateVariableFormProps) {
  return (
    <div className="flex flex-col gap-3 border border-line bg-surface p-3">
      <p className="text-sm font-medium text-ink">Slots on this message</p>
      {template.tenantSlots.map((slot) => {
        const id = `slot-${slot}`;
        return (
          <div key={slot} className="space-y-1.5">
            <Label htmlFor={id}>{slotLabel(slot)}</Label>
            <Input
              id={id}
              value={values[slot] ?? ''}
              onChange={(event) => onChange(slot, event.target.value)}
              autoComplete="off"
            />
          </div>
        );
      })}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-ink">Approved wording</p>
        <p className="border border-line bg-canvas px-3 py-2 font-mono text-xs leading-5 text-muted">
          {template.body}
        </p>
      </div>
    </div>
  );
}
