import { Button } from '@atoms';
import { HOSPITAL_DOCTORS_CONTENT } from '../../HospitalDoctorsScreen.content';

type Props = {
  disabled: boolean;
  onManage: (trigger: HTMLButtonElement) => void;
};

export function HospitalDoctorsHeader({ disabled, onManage }: Props) {
  return (
    <header className="hdoc-header">
      <div>
        <h1 className="font-serif text-xl text-ink">{HOSPITAL_DOCTORS_CONTENT.title}</h1>
        <p className="mt-1 text-sm text-muted">{HOSPITAL_DOCTORS_CONTENT.subtitle}</p>
        <p className="mt-1 text-xs text-muted">{HOSPITAL_DOCTORS_CONTENT.noLoginNote}</p>
      </div>
      <Button type="button" disabled={disabled} onClick={(event) => onManage(event.currentTarget)}>
        {HOSPITAL_DOCTORS_CONTENT.manageDoctors}
      </Button>
    </header>
  );
}
