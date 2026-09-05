import { OffersFormPanel } from './components/offers-form-panel';
import { OffersHeader } from './components/offers-header';
import { OffersListPanel } from './components/offers-list-panel';
import { OffersStatusBanner } from './components/offers-status-banner';
import { useOffersPage } from './useOffersPage';

export default function OffersScreen() {
  const page = useOffersPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <OffersHeader addButtonRef={page.addRef} denied={!page.allowed} onAdd={page.startCreate} />
      <OffersStatusBanner status={page.status} statusId={page.statusId} hint={page.statusHint} />
      {page.allowed ? (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
          <OffersListPanel
            items={page.items}
            selectedId={page.creating ? null : (page.selected?.id ?? null)}
            onSelect={page.selectOffer}
          />
          {page.creating || page.selected ? (
            <OffersFormPanel
              form={page.form}
              products={page.products}
              creating={page.creating}
              canPublish={Boolean(page.selected && page.selected.status === 'DRAFT')}
              canDeactivate={Boolean(page.selected && page.selected.status === 'ACTIVE')}
              busy={page.busy}
              onChange={page.onChange}
              onToggleProduct={page.toggleProduct}
              onSave={page.onSave}
              onPublish={page.onPublish}
              onDeactivate={page.onDeactivate}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
