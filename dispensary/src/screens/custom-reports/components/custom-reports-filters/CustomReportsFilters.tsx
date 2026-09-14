import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { CUSTOM_REPORTS_CONTENT } from '../../CustomReportsScreen.content';
import {
  filterChanged,
  selectCrBusy,
  selectCrFields,
  selectCrFilter,
  selectCrOperators,
} from '../../store';

export function CustomReportsFilters() {
  const dispatch = useDispatch<AppDispatch>();
  const fields = useSelector(selectCrFields);
  const operators = useSelector(selectCrOperators);
  const draft = useSelector(selectCrFilter);
  const busy = useSelector(selectCrBusy);

  return (
    <div className="cr-panel">
      <div className="cr-panel-head">{CUSTOM_REPORTS_CONTENT.tabs.filters}</div>
      <div className="cr-panel-body">
        <div className="cr-filters">
          <div className="cr-field">
            <label htmlFor="custom-report-filter-field">Column</label>
            <select
              id="custom-report-filter-field"
              value={draft.field}
              disabled={busy}
              onChange={(event) =>
                dispatch(filterChanged({ ...draft, field: event.target.value }))
              }
            >
              <option value="">Any</option>
              {fields.map((field) => (
                <option key={field.key} value={field.key}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>
          <div className="cr-field">
            <label htmlFor="custom-report-filter-op">Match</label>
            <select
              id="custom-report-filter-op"
              value={draft.operator}
              disabled={busy}
              onChange={(event) =>
                dispatch(filterChanged({ ...draft, operator: event.target.value }))
              }
            >
              {operators.map((operator) => (
                <option key={operator.key} value={operator.key}>
                  {operator.label}
                </option>
              ))}
            </select>
          </div>
          <div className="cr-field">
            <label htmlFor="custom-report-filter-value">Value</label>
            <input
              id="custom-report-filter-value"
              value={draft.value}
              disabled={busy}
              onChange={(event) =>
                dispatch(filterChanged({ ...draft, value: event.target.value }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
