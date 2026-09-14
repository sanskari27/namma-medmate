import { useDispatch, useSelector } from 'react-redux';
import { licenseSelected, selectLicensesItems, selectLicensesSelectedId } from '../../store';
import { formatIstDate, scopeLabel, typeLabel } from '../../LicensesScreen.utils';

export function LicenseListPanel() {
  const dispatch = useDispatch();
  const items = useSelector(selectLicensesItems);
  const selectedId = useSelector(selectLicensesSelectedId);
  if (items.length === 0) {
    return <p className="lc-loading">File the first paper from this counter.</p>;
  }
  return (
    <div className="lc-card lc-list">
      {items.map((row) => (
        <button
          key={row.id}
          type="button"
          data-on={row.id === selectedId}
          onClick={() => dispatch(licenseSelected(row.id))}
        >
          <b>{typeLabel(row.docType)}</b>
          <span className="lc-muted lc-mono">{row.licenseNumber}</span>
          <span className="lc-muted">
            {scopeLabel(row.scope)} · expires {formatIstDate(row.expiresOn)}
            {row.due ? ' · due' : ''}
          </span>
        </button>
      ))}
    </div>
  );
}
