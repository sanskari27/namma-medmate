import { Button } from '@atoms';
import type { CampaignTagOption } from '@/services/campaigns';
import type { FormState } from '../../CampaignsScreen.utils';

export type CampaignsFormPanelProps = {
  form: FormState;
  tags: CampaignTagOption[];
  templateName: string | null;
  creating: boolean;
  canPreview: boolean;
  canReady: boolean;
  busy: boolean;
  onChange: (patch: Partial<FormState>) => void;
  onToggleTag: (tagId: string) => void;
  onSave: () => void;
  onPreview: () => void;
  onReady: () => void;
};

export function CampaignsFormPanel({
  form,
  tags,
  templateName,
  creating,
  canPreview,
  canReady,
  busy,
  onChange,
  onToggleTag,
  onSave,
  onPreview,
  onReady,
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
      <p className="text-sm text-muted">
        {templateName
          ? `Approved shop update slot: ${templateName}.`
          : 'No approved shop update slot yet.'}
      </p>
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
      </div>
    </section>
  );
}
