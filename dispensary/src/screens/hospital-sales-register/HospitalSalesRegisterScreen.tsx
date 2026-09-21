import { HospitalSalesRegisterFilters } from './components/hospital-sales-register-filters';
import { HospitalSalesRegisterHeader } from './components/hospital-sales-register-header';
import { HospitalSalesRegisterStatusBanner } from './components/hospital-sales-register-status-banner';
import { HospitalSalesRegisterTable } from './components/hospital-sales-register-table';
import { HospitalSalesRegisterTiles } from './components/hospital-sales-register-tiles';
import { HOSPITAL_SALES_REGISTER_CONTENT } from './HospitalSalesRegisterScreen.content';
import './HospitalSalesRegisterScreen.css';
import { useHospitalSalesRegister } from './useHospitalSalesRegister';

export default function HospitalSalesRegisterScreen() {
  const page = useHospitalSalesRegister();

  return (
    <main className="ps" aria-label={HOSPITAL_SALES_REGISTER_CONTENT.regionLabel}>
      <HospitalSalesRegisterHeader
        disabled={page.formDisabled}
        exportBusy={page.exportBusy}
        onCsv={(trigger) => void page.onExport('csv', trigger)}
        onPdf={(trigger) => void page.onExport('pdf', trigger)}
      />
      <HospitalSalesRegisterStatusBanner
        status={page.status}
        message={page.message}
        onDismiss={page.onDismiss}
        onRetry={() => void page.load()}
      />
      {page.showWorkspace ? (
        <>
          <HospitalSalesRegisterTiles
            tiles={page.register?.tiles ?? []}
            selected={page.filters.source}
            disabled={page.formDisabled}
            onSelect={(source) => page.setFilters({ ...page.filters, source })}
          />
          <HospitalSalesRegisterFilters
            filters={page.filters}
            wards={page.wards}
            disabled={page.formDisabled}
            onChange={page.setFilters}
          />
          <HospitalSalesRegisterTable register={page.register} />
        </>
      ) : null}
    </main>
  );
}
