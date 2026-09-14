import { useDispatch, useSelector } from 'react-redux';
import { editOpened, selectOutletsEditing, selectOutletsItems } from '../../store';

export function OutletsTable() {
  const dispatch = useDispatch();
  const items = useSelector(selectOutletsItems);
  const editing = useSelector(selectOutletsEditing);
  if (editing || items.length === 0) {
    return null;
  }
  return (
    <div className="ot-card">
      <div className="ot-tbl-wrap">
        <table className="ot-tbl">
          <thead>
            <tr>
              <th>Code</th>
              <th>Outlet</th>
              <th>Type</th>
              <th>Licence</th>
              <th>Default</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((branch) => (
              <tr key={branch.id}>
                <td className="ot-mono">{branch.branchCode}</td>
                <td>
                  <b>{branch.name}</b>
                  <div className="ot-muted">
                    {branch.city}, {branch.state} {branch.pincode}
                  </div>
                </td>
                <td>
                  <span className="ot-pill" data-tone={branch.branchType === 'KIOSK' ? 'gold' : 'tag'}>
                    {branch.branchType === 'KIOSK' ? 'Kiosk' : 'Retail'}
                  </span>
                </td>
                <td className="ot-mono">{branch.drugLicenseNumber}</td>
                <td>{branch.defaultBranch ? <span className="ot-pill">Default</span> : '—'}</td>
                <td>
                  <button
                    type="button"
                    className="ot-btn ot-btn-ghost ot-btn-sm"
                    onClick={() => dispatch(editOpened(branch.id))}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
