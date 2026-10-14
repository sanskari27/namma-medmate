import { Plus } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { LicenseDocType } from '@/services/licenses';
import { selectLicensesDue, selectLicensesItems, startCreate, licenseSelected } from '../../store';
import { formatIstDate, typeLabel } from '../../LicensesScreen.utils';

const LICENCE_TYPES: LicenseDocType[] = [
  'DRUG_LICENSE',
  'GST',
  'FSSAI',
  'PHARMACIST_REGISTRATION',
];

export function LicensesHeader({ denied }: { denied: boolean }) {
  const dispatch = useDispatch();
  const due = useSelector(selectLicensesDue);
  const items = useSelector(selectLicensesItems);
  const allFiled = LICENCE_TYPES.every((type) => items.some((row) => row.docType === type));
  return (
    <>
      <div className="lc-toolbar">
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Manrope, Inter, sans-serif', fontSize: 16 }}>Licences</h2>
          <span className="lc-muted">Drug, GST, FSSAI and pharmacist papers for this pharmacy</span>
        </div>
        <div className="lc-toolbar-spacer" />
        {denied || allFiled ? null : (
          <button type="button" className="lc-btn lc-btn-primary" onClick={() => dispatch(startCreate())}>
            <Plus size={16} /> Add licence
          </button>
        )}
      </div>
      {due.length > 0 ? (
        <div className="lc-card lc-card-pad" style={{ borderColor: '#f0c9b8', background: '#feecec' }}>
          <b style={{ color: '#e2542a' }}>Due within 30 days</b>
          <div className="lc-pills" style={{ marginTop: 8 }}>
            {due.map((row) => (
              <button
                key={row.id}
                type="button"
                className="lc-chip"
                data-on="true"
                onClick={() => dispatch(licenseSelected(row.id))}
              >
                {typeLabel(row.docType)} · {formatIstDate(row.expiresOn)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
