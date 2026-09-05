import { LicenseDueStrip } from './components/license-due-strip';
import { LicenseFormPanel } from './components/license-form-panel';
import { LicenseListPanel } from './components/license-list-panel';
import { LicensesHeader } from './components/licenses-header';
import { LicensesStatusBanner } from './components/licenses-status-banner';
import { useLicensesPage } from './useLicensesPage';

export default function LicensesScreen() {
  const page = useLicensesPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <LicensesHeader addButtonRef={page.addRef} denied={!page.allowed} onAdd={page.startCreate} />
      <LicensesStatusBanner status={page.status} statusId={page.statusId} hint={page.statusHint} />
      {page.allowed ? (
        <>
          <LicenseDueStrip items={page.dueItems} onSelect={page.selectLicense} />
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
            <LicenseListPanel
              items={page.items}
              selectedId={page.creating ? null : (page.selected?.id ?? null)}
              onSelect={page.selectLicense}
            />
            {page.creating || page.selected ? (
              <LicenseFormPanel
                form={page.form}
                creating={page.creating}
                selected={page.creating ? null : page.selected}
                branches={page.branches}
                staff={page.staff}
                busy={page.busy}
                onChange={page.onChange}
                onSave={page.onSave}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
