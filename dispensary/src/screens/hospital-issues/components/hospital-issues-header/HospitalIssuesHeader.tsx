import { Button } from '@atoms';
import { HOSPITAL_ISSUES_CONTENT } from '../../HospitalIssuesScreen.content';

type HospitalIssuesHeaderProps = {
  disabled: boolean;
  onNewIssue: () => void;
};

export function HospitalIssuesHeader({ disabled, onNewIssue }: HospitalIssuesHeaderProps) {
  return (
    <header className="hj-header">
      <div>
        <h1 className="font-serif text-xl text-ink">{HOSPITAL_ISSUES_CONTENT.title}</h1>
        <p className="mt-1 text-sm text-muted">{HOSPITAL_ISSUES_CONTENT.subtitle}</p>
      </div>
      <Button type="button" disabled={disabled} onClick={onNewIssue}>
        {HOSPITAL_ISSUES_CONTENT.newIssue}
      </Button>
    </header>
  );
}
