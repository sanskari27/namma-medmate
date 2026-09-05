import { ControlledRegisterFilters } from './components/controlled-register-filters';
import { ControlledRegisterHeader } from './components/controlled-register-header';
import { ControlledRegisterList } from './components/controlled-register-list';
import { ControlledRegisterStatusBanner } from './components/controlled-register-status-banner';
import { useControlledRegisterPage } from './useControlledRegisterPage';

export default function ControlledRegisterScreen() {
  const page = useControlledRegisterPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <ControlledRegisterHeader
        spreadsheetRef={page.spreadsheetRef}
        ndpsRef={page.ndpsRef}
        denied={!page.allowed}
        busy={page.busy}
        onSpreadsheet={page.onSpreadsheet}
        onNdps={page.onNdps}
      />
      <ControlledRegisterStatusBanner
        status={page.status}
        statusId={page.statusId}
        hint={page.statusHint}
      />
      {page.allowed ? (
        <>
          <ControlledRegisterFilters
            filters={page.filters}
            products={page.products}
            patients={page.patients}
            pharmacists={page.pharmacists}
            disabled={page.busy}
            onChange={page.onChangeFilters}
            onApply={page.onApplyFilters}
          />
          {page.status === 'loading' || page.status === 'denied' ? null : (
            <ControlledRegisterList items={page.items} />
          )}
        </>
      ) : null}
    </div>
  );
}
