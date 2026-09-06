import { CampaignsEmptyState } from './components/campaigns-empty-state';
import { CampaignsFormPanel } from './components/campaigns-form-panel';
import { CampaignsHeader } from './components/campaigns-header';
import { CampaignsListPanel } from './components/campaigns-list-panel';
import { CampaignsPreviewPanel } from './components/campaigns-preview-panel';
import { CampaignsStatusBanner } from './components/campaigns-status-banner';
import { useCampaignsPage } from './useCampaignsPage';

export default function CampaignsScreen() {
  const page = useCampaignsPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <CampaignsHeader
        addButtonRef={page.addRef}
        denied={!page.allowed}
        showCaLink={page.canSeeCa}
        onAdd={page.startCreate}
      />
      <CampaignsStatusBanner
        status={page.status}
        statusId={page.statusId}
        hint={page.statusHint}
      />
      {page.allowed ? (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
          <CampaignsListPanel
            items={page.items}
            selectedId={page.creating ? null : (page.selected?.id ?? null)}
            onSelect={page.selectCampaign}
          />
          {page.creating || page.selected ? (
            <div className="flex min-h-0 flex-col gap-3">
              <CampaignsFormPanel
                form={page.form}
                tags={page.tags}
                templateName={page.templates[0]?.uniqueName ?? null}
                creating={page.creating}
                canPreview={Boolean(page.selected && page.selected.status === 'DRAFT')}
                canReady={Boolean(
                  page.selected &&
                    page.selected.status === 'DRAFT' &&
                    page.selected.previewedAt,
                )}
                canSend={Boolean(
                  page.selected && page.selected.status === 'READY_FOR_DELIVERY',
                )}
                busy={page.busy}
                onChange={page.onChange}
                onToggleTag={page.toggleTag}
                onSave={page.onSave}
                onPreview={page.onPreview}
                onReady={page.onReady}
                onSend={page.onSend}
              />
              <CampaignsPreviewPanel campaign={page.selected} sendHint={page.sendHint} />
            </div>
          ) : page.status === 'empty' ? (
            <CampaignsEmptyState />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
