import { Button } from '@atoms';
import { HOSPITAL_WARDS_CONTENT } from '../../HospitalWardsScreen.content';

type HospitalWardsHeaderProps = {
  disabled: boolean;
  onManage: (trigger: HTMLButtonElement) => void;
};

export function HospitalWardsHeader({ disabled, onManage }: HospitalWardsHeaderProps) {
  return (
    <header className="hw-header">
      <div>
        <h1 className="font-serif text-xl text-ink">{HOSPITAL_WARDS_CONTENT.title}</h1>
        <p className="mt-1 text-sm text-muted">{HOSPITAL_WARDS_CONTENT.subtitle}</p>
      </div>
      <Button type="button" disabled={disabled} onClick={(event) => onManage(event.currentTarget)}>
        {HOSPITAL_WARDS_CONTENT.manageWards}
      </Button>
    </header>
  );
}
