import { Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROUTES } from '@/libs/constants/routes.const';
import type { ComplianceLicense } from '@/services/licenses';
import { ACCOUNT_CONTENT } from '../../AccountScreen.content';
import { licenseTypeLabel } from '../../AccountScreen.utils';
import { selectAccountLicenses, selectAccountPack } from '../../store';

const ROWS: { type: ComplianceLicense['docType']; empty: string }[] = [
  { type: 'GST', empty: 'Add GST certificate' },
  { type: 'DRUG_LICENSE', empty: 'Add drug licence' },
  { type: 'FSSAI', empty: 'Add FSSAI licence' },
  { type: 'PHARMACIST_REGISTRATION', empty: 'Add pharmacist registration' },
];

export function AccountVerification() {
  const licenses = useSelector(selectAccountLicenses);
  const pack = useSelector(selectAccountPack);
  const latest = (type: ComplianceLicense['docType']) =>
    licenses.find((row) => row.docType === type) ?? null;

  return (
    <div className="ac-card">
      <div className="ac-card-head">
        <h3>{ACCOUNT_CONTENT.verification}</h3>
        <Link className="ac-btn ac-btn-ghost ac-btn-sm" to={ROUTES.LICENSES}>
          {ACCOUNT_CONTENT.update}
        </Link>
      </div>
      <div className="ac-card-pad" style={{ paddingTop: 4 }}>
        <div className="ac-row">
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>KYC</div>
            <div className="ac-muted ac-mono" style={{ fontSize: 11 }}>
              {pack?.status ?? 'Not submitted'}
            </div>
          </div>
          {pack?.status === 'APPROVED' || pack?.tenantStatus === 'ACTIVE' ? (
            <span className="ac-pill">
              <Check size={12} /> Done
            </span>
          ) : (
            <Link className="ac-btn ac-btn-ghost ac-btn-sm" to={ROUTES.ACCOUNT}>
              {ACCOUNT_CONTENT.add}
            </Link>
          )}
        </div>
        {ROWS.map((row) => {
          const license = latest(row.type);
          return (
            <div key={row.type} className="ac-row">
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{licenseTypeLabel(row.type)}</div>
                <div className="ac-muted ac-mono" style={{ fontSize: 11 }}>
                  {license?.licenseNumber ?? row.empty}
                </div>
              </div>
              {license ? (
                <span className="ac-pill">
                  <Check size={12} /> Done
                </span>
              ) : (
                <Link className="ac-btn ac-btn-ghost ac-btn-sm" to={ROUTES.LICENSES}>
                  {ACCOUNT_CONTENT.add}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
