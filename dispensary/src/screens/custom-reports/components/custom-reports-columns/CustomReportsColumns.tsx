import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { CUSTOM_REPORTS_CONTENT } from '../../CustomReportsScreen.content';
import {
  columnsToggled,
  selectCrBusy,
  selectCrColumns,
  selectCrFields,
} from '../../store';

export function CustomReportsColumns() {
  const dispatch = useDispatch<AppDispatch>();
  const fields = useSelector(selectCrFields);
  const selected = useSelector(selectCrColumns);
  const busy = useSelector(selectCrBusy);

  return (
    <div className="cr-panel">
      <div className="cr-panel-head">{CUSTOM_REPORTS_CONTENT.tabs.columns}</div>
      <div className="cr-panel-body">
        <div className="cr-cols">
          {fields.map((field) => (
            <label key={field.key} className="cr-check">
              <input
                type="checkbox"
                checked={selected.includes(field.key)}
                disabled={busy}
                onChange={() => dispatch(columnsToggled(field.key))}
              />
              {field.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
