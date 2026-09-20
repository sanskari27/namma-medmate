import { Label } from '@atoms';
import type { HospitalIssueKind } from '@/services/hospital';
import type { HospitalWard } from '@/services/hospital';
import { HOSPITAL_ISSUES_CONTENT } from '../../HospitalIssuesScreen.content';
import { KIND_FILTERS } from '../../HospitalIssuesScreen.utils';

const KIND_LABEL: Record<HospitalIssueKind, string> = {
  ALL: HOSPITAL_ISSUES_CONTENT.filterAll,
  ISSUES: HOSPITAL_ISSUES_CONTENT.filterIssues,
  REFILLS: HOSPITAL_ISSUES_CONTENT.filterRefills,
  RETURNS: HOSPITAL_ISSUES_CONTENT.filterReturns,
};

type HospitalIssuesFiltersProps = {
  wards: HospitalWard[];
  wardId: string;
  kind: HospitalIssueKind;
  query: string;
  onWardChange: (wardId: string) => void;
  onKindChange: (kind: HospitalIssueKind) => void;
  onQueryChange: (query: string) => void;
};

export function HospitalIssuesFilters({
  wards,
  wardId,
  kind,
  query,
  onWardChange,
  onKindChange,
  onQueryChange,
}: HospitalIssuesFiltersProps) {
  return (
    <div className="hj-filters">
      <div>
        <Label htmlFor="hj-ward-filter">{HOSPITAL_ISSUES_CONTENT.wardFilter}</Label>
        <select
          id="hj-ward-filter"
          aria-label={HOSPITAL_ISSUES_CONTENT.wardFilter}
          value={wardId}
          onChange={(event) => onWardChange(event.target.value)}
        >
          <option value="">All wards</option>
          {wards.map((ward) => (
            <option key={ward.id} value={ward.id}>
              {ward.name}
            </option>
          ))}
        </select>
      </div>
      <div className="hj-filter" role="group" aria-label="Issue kind">
        {KIND_FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={kind === item}
            onClick={() => onKindChange(item)}
          >
            {KIND_LABEL[item]}
          </button>
        ))}
      </div>
      <div>
        <Label htmlFor="hj-search">{HOSPITAL_ISSUES_CONTENT.searchLabel}</Label>
        <input
          id="hj-search"
          aria-label={HOSPITAL_ISSUES_CONTENT.searchLabel}
          placeholder={HOSPITAL_ISSUES_CONTENT.searchPlaceholder}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
    </div>
  );
}
