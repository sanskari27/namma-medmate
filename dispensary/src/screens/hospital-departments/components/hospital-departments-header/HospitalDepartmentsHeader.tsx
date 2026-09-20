import { Button } from '@atoms';
import { HOSPITAL_DEPARTMENTS_CONTENT } from '../../HospitalDepartmentsScreen.content';

type Props = {
  disabled: boolean;
  onManage: (trigger: HTMLButtonElement) => void;
};

export function HospitalDepartmentsHeader({ disabled, onManage }: Props) {
  return (
    <header className="hd-header">
      <div>
        <h1 className="font-serif text-xl text-ink">{HOSPITAL_DEPARTMENTS_CONTENT.title}</h1>
        <p className="mt-1 text-sm text-muted">{HOSPITAL_DEPARTMENTS_CONTENT.subtitle}</p>
      </div>
      <Button type="button" disabled={disabled} onClick={(event) => onManage(event.currentTarget)}>
        {HOSPITAL_DEPARTMENTS_CONTENT.manageDepartments}
      </Button>
    </header>
  );
}
