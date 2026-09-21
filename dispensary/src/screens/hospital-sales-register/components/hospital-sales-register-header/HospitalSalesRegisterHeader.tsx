import { Button } from '@atoms';
import { HOSPITAL_SALES_REGISTER_CONTENT } from '../../HospitalSalesRegisterScreen.content';

type Props = {
  disabled: boolean;
  exportBusy: boolean;
  onCsv: (trigger: HTMLButtonElement) => void;
  onPdf: (trigger: HTMLButtonElement) => void;
};

export function HospitalSalesRegisterHeader({ disabled, exportBusy, onCsv, onPdf }: Props) {
  return (
    <header className="ps-header">
      <div>
        <h1 className="font-serif text-xl text-ink">{HOSPITAL_SALES_REGISTER_CONTENT.title}</h1>
        <p className="mt-1 text-sm text-muted">{HOSPITAL_SALES_REGISTER_CONTENT.subtitle}</p>
      </div>
      <div className="ps-header-actions">
        <Button
          type="button"
          disabled={disabled || exportBusy}
          aria-busy={exportBusy}
          onClick={(event) => onCsv(event.currentTarget)}
        >
          {HOSPITAL_SALES_REGISTER_CONTENT.downloadCsv}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || exportBusy}
          aria-busy={exportBusy}
          onClick={(event) => onPdf(event.currentTarget)}
        >
          {HOSPITAL_SALES_REGISTER_CONTENT.printPdf}
        </Button>
      </div>
    </header>
  );
}
