import { useSelector } from 'react-redux';
import { selectCrFields, selectCrPreview } from '../../store';
import { previewCell } from '../../CustomReportsScreen.utils';

export function CustomReportsPreviewTable() {
  const preview = useSelector(selectCrPreview);
  const fields = useSelector(selectCrFields);

  if (!preview) return null;

  const labels = new Map(fields.map((field) => [field.key, field.label]));
  const kinds = new Map(fields.map((field) => [field.key, field.kind]));
  const columns = preview.columns;

  return (
    <div className="cr-tbl-wrap">
      <table className="cr-tbl" aria-label="Report preview">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{labels.get(column) ?? column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.items.map((item, index) => (
            <tr key={`row-${index}`}>
              {columns.map((column) => (
                <td key={column}>{previewCell(column, item[column], kinds.get(column))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
