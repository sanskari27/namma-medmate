import { Button } from '@atoms';
import { HOSPITAL_INDENTS_CONTENT } from '../../HospitalIndentsScreen.content';

type HospitalIndentsHeaderProps = {
  disabled: boolean;
  onRecord: () => void;
};

export function HospitalIndentsHeader({ disabled, onRecord }: HospitalIndentsHeaderProps) {
  return (
    <header className="hi-header">
      <div>
        <h1 className="font-serif text-xl text-ink">{HOSPITAL_INDENTS_CONTENT.title}</h1>
        <p className="mt-1 text-sm text-muted">{HOSPITAL_INDENTS_CONTENT.subtitle}</p>
      </div>
      <Button type="button" disabled={disabled} onClick={onRecord}>
        {HOSPITAL_INDENTS_CONTENT.recordIndent}
      </Button>
    </header>
  );
}
