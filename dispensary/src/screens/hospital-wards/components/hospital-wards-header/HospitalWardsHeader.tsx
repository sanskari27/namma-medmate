import { Button } from '@atoms';
import { HOSPITAL_WARDS_CONTENT } from '../../HospitalWardsScreen.content';

type HospitalWardsHeaderProps = {
  disabled: boolean;
  onManage: (trigger: HTMLButtonElement) => void;
  onAdmit: (trigger: HTMLButtonElement) => void;
};

export function HospitalWardsHeader({ disabled, onManage, onAdmit }: HospitalWardsHeaderProps) {
  return (
    <header className="hw-header">
      <div>
        <h1 className="font-serif text-xl text-ink">{HOSPITAL_WARDS_CONTENT.title}</h1>
        <p className="mt-1 text-sm text-muted">{HOSPITAL_WARDS_CONTENT.subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={disabled} onClick={(event) => onAdmit(event.currentTarget)}>
          {HOSPITAL_WARDS_CONTENT.admitPatient}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={(event) => onManage(event.currentTarget)}
        >
          {HOSPITAL_WARDS_CONTENT.manageWards}
        </Button>
      </div>
    </header>
  );
}
