import { Button } from '@atoms';
import { HOSPITAL_PATIENTS_CONTENT } from '../../HospitalPatientsScreen.content';
import type { HospitalActivePatientView } from '@/services/hospital';

type Props = {
  view: HospitalActivePatientView;
  query: string;
  disabled: boolean;
  onViewChange: (view: HospitalActivePatientView) => void;
  onQueryChange: (query: string) => void;
};

export function HospitalPatientsHeader({
  view,
  query,
  disabled,
  onViewChange,
  onQueryChange,
}: Props) {
  return (
    <header className="hp-header">
      <div>
        <h1 className="font-serif text-xl text-ink">{HOSPITAL_PATIENTS_CONTENT.title}</h1>
        <p className="mt-1 text-sm text-muted">{HOSPITAL_PATIENTS_CONTENT.subtitle}</p>
      </div>
      <div className="hp-header-tools">
        <div className="hp-filter" role="group" aria-label={HOSPITAL_PATIENTS_CONTENT.viewGroupLabel}>
          <Button
            type="button"
            variant={view === 'unsettled' ? 'primary' : 'outline'}
            aria-pressed={view === 'unsettled'}
            disabled={disabled}
            onClick={() => onViewChange('unsettled')}
          >
            {HOSPITAL_PATIENTS_CONTENT.viewUnsettled}
          </Button>
          <Button
            type="button"
            variant={view === 'all' ? 'primary' : 'outline'}
            aria-pressed={view === 'all'}
            disabled={disabled}
            onClick={() => onViewChange('all')}
          >
            {HOSPITAL_PATIENTS_CONTENT.viewAll}
          </Button>
        </div>
        <label className="hp-search">
          {HOSPITAL_PATIENTS_CONTENT.searchLabel}
          <input
            id="hp-search"
            aria-label={HOSPITAL_PATIENTS_CONTENT.searchLabel}
            placeholder={HOSPITAL_PATIENTS_CONTENT.searchPlaceholder}
            value={query}
            disabled={disabled}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      </div>
    </header>
  );
}
