import { Mail, Pencil, Phone, Trash2, Truck } from 'lucide-react';
import { useDispatch } from 'react-redux';
import type { Supplier } from '@/services/suppliers';
import type { AppDispatch } from '@/store';
import { DISTRIBUTORS_CONTENT } from '../../DistributorsScreen.content';
import { formatPaise, termsLabel } from '../../DistributorsScreen.utils';
import { openEditDistributor } from '../../store/distributors.slice';
import { deactivateDistributor, loadDistributorLedger } from '../../store/distributors.thunks';

export type DistributorsRowProps = {
  supplier: Supplier;
};

export function DistributorsRow({ supplier }: DistributorsRowProps) {
  const dispatch = useDispatch<AppDispatch>();
  const outstanding = supplier.outstandingPaise ?? 0;
  const products = supplier.productLineCount ?? supplier.categoryIds.length;
  const statusTone =
    supplier.status === 'ACTIVE' ? 'active' : supplier.status === 'BLOCKED' ? 'blocked' : 'inactive';

  return (
    <tr>
      <td>
        <div className="dist-firm">
          <div className="dist-firm-ico" aria-hidden>
            <Truck size={15} strokeWidth={1.8} />
          </div>
          <div>
            <div className="dist-firm-name">{supplier.legalName}</div>
            <div className="dist-sub">
              {supplier.city}, {supplier.state}
            </div>
          </div>
        </div>
      </td>
      <td>
        <div className="dist-contact-name">{supplier.contactPersonName}</div>
        <div className="dist-contact-line">
          <Phone size={12} strokeWidth={1.8} aria-hidden />
          {supplier.phone}
        </div>
        {supplier.email ? (
          <div className="dist-contact-line">
            <Mail size={12} strokeWidth={1.8} aria-hidden />
            {supplier.email}
          </div>
        ) : null}
      </td>
      <td>
        <div className="dist-mono">{supplier.gstin || '—'}</div>
        <div className="dist-sub dist-mono">{supplier.drugLicenseNumber || '—'}</div>
      </td>
      <td>{termsLabel(supplier)}</td>
      <td>
        <span className="dist-pill">{products}</span>
      </td>
      <td className="num">
        <span className="dist-due" data-zero={outstanding === 0 ? 'true' : 'false'}>
          {formatPaise(outstanding)}
        </span>
      </td>
      <td>
        <span className="dist-status" data-tone={statusTone}>
          {supplier.status === 'ACTIVE'
            ? 'Active'
            : supplier.status === 'BLOCKED'
              ? 'Blocked'
              : 'Inactive'}
        </span>
      </td>
      <td>
        <div className="dist-actions">
          <button
            type="button"
            className="dist-icon-btn"
            aria-label={`Edit ${supplier.legalName}`}
            onClick={() => {
              dispatch(openEditDistributor(supplier));
              void dispatch(loadDistributorLedger(supplier.id));
            }}
          >
            <Pencil size={14} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            className="dist-icon-btn"
            data-tone="danger"
            aria-label={`Remove ${supplier.legalName}`}
            onClick={() => {
              if (window.confirm(DISTRIBUTORS_CONTENT.removeConfirm(supplier.legalName))) {
                void dispatch(deactivateDistributor(supplier.id));
              }
            }}
          >
            <Trash2 size={14} strokeWidth={1.8} />
          </button>
        </div>
      </td>
    </tr>
  );
}
