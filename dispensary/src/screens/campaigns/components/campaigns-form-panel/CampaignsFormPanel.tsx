import { Button } from '@atoms';
import type { CampaignTagOption, CampaignTemplateOption } from '@/services/campaigns';
import type { FormState } from '../../CampaignsScreen.utils';

export type CampaignsFormPanelProps = {
  form: FormState;
  tags: CampaignTagOption[];
  templates: CampaignTemplateOption[];
  creating: boolean;
  canPreview: boolean;
  canReady: boolean;
  canSend: boolean;
  busy: boolean;
  onChange: (patch: Partial<FormState>) => void;
  onToggleTag: (tagId: string) => void;
  onSave: () => void;
  onPreview: () => void;
  onReady: () => void;
  onSend: () => void;
};

export function CampaignsFormPanel({
  form,
  tags,
  templates,
  creating,
  canPreview,
  canReady,
  canSend,
  busy,
  onChange,
  onToggleTag,
  onSave,
  onPreview,
  onReady,
  onSend,
}: CampaignsFormPanelProps) {
  return (
    <section className="space-y-3 border border-line bg-surface p-3" aria-label="Broadcast form">
      <h2 className="text-sm font-semibold text-ink">
        {creating ? 'New broadcast' : 'This broadcast'}
      </h2>
      <label className="block text-sm text-ink">
        Broadcast name
        <input
          className="mt-1 w-full border border-line bg-canvas px-2 py-1.5 text-sm"
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </label>
      <fieldset className="space-y-1">
        <legend className="text-sm text-ink">Patient tags</legend>
        {tags.length === 0 ? (
          <p className="text-sm text-muted">No saved tags yet. Add tags on Patients first.</p>
        ) : (
          tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.tagIds.includes(tag.id)}
                onChange={() => onToggleTag(tag.id)}
              />
              {tag.name}
            </label>
          ))
        )}
      </fieldset>
      <label className="block text-sm text-ink">
        Approved shop update slot
        <select
          className="mt-1 w-full border border-line bg-canvas px-2 py-1.5 text-sm"
          value={form.templateUniqueName}
          onChange={(event) => onChange({ templateUniqueName: event.target.value })}
          disabled={templates.length === 0}
        >
          <option value="">
            {templates.length === 0 ? 'No approved shop update slot yet' : 'Select a slot…'}
          </option>
          {templates.map((template) => (
            <option key={template.uniqueName} value={template.uniqueName}>
              {template.uniqueName}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={onSave}>
          Save draft
        </Button>
        <Button type="button" variant="outline" disabled={busy || !canPreview} onClick={onPreview}>
          Count this list
        </Button>
        <Button type="button" variant="outline" disabled={busy || !canReady} onClick={onReady}>
          Ready to send
        </Button>
        <Button type="button" disabled={busy || !canSend} onClick={onSend}>
          Send this list
        </Button>
      </div>
    </section>
  );
}
