import { TemplateCataloguePanel } from './components/template-catalogue-panel';
import { TemplatePreviewPanel } from './components/template-preview-panel';
import { TemplateVariableForm } from './components/template-variable-form';
import { WhatsappTemplatesEmptyState } from './components/whatsapp-templates-empty-state';
import { WhatsappTemplatesHeader } from './components/whatsapp-templates-header';
import { WhatsappTemplatesStatusBanner } from './components/whatsapp-templates-status-banner';
import { useWhatsappTemplatesPage } from './useWhatsappTemplatesPage';

export default function WhatsappTemplatesScreen() {
  const page = useWhatsappTemplatesPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <WhatsappTemplatesHeader
        saveRef={page.saveRef}
        denied={!page.allowed}
        busy={page.busy}
        displayNumber={page.provider?.displayNumber}
        onSave={page.onSave}
      />
      <WhatsappTemplatesStatusBanner
        status={page.status}
        statusId={page.statusId}
        hint={page.statusHint}
      />
      {page.allowed && page.status !== 'loading' && page.status !== 'denied' ? (
        page.templates.length === 0 ? (
          <WhatsappTemplatesEmptyState />
        ) : (
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
            <TemplateCataloguePanel
              items={page.templates}
              selectedName={page.selected?.uniqueName ?? null}
              onSelect={page.selectTemplate}
            />
            {page.selected ? (
              <div className="flex min-h-0 flex-col gap-3">
                <TemplateVariableForm
                  template={page.selected}
                  values={page.values}
                  onChange={page.onSlotChange}
                />
                <TemplatePreviewPanel template={page.selected} preview={page.preview} />
              </div>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}
