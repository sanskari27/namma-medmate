import { Plus, Search } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { DISTRIBUTORS_CONTENT } from '../../DistributorsScreen.content';
import {
  selectDistributorsQuery,
  selectFilteredDistributors,
} from '../../store/distributors.selectors';
import { openCreateDistributor, setDistributorsQuery } from '../../store/distributors.slice';
import { DistributorsRow } from '../distributors-row';

export function DistributorsDirectory() {
  const dispatch = useDispatch<AppDispatch>();
  const query = useSelector(selectDistributorsQuery);
  const rows = useSelector(selectFilteredDistributors);

  return (
    <div className="dist-card">
      <div className="dist-card-head">
        <h2>{DISTRIBUTORS_CONTENT.directoryTitle}</h2>
        <div className="dist-card-actions">
          <label className="dist-search">
            <Search size={16} strokeWidth={1.8} aria-hidden />
            <input
              type="search"
              value={query}
              placeholder={DISTRIBUTORS_CONTENT.searchPlaceholder}
              aria-label={DISTRIBUTORS_CONTENT.searchPlaceholder}
              onChange={(event) => dispatch(setDistributorsQuery(event.target.value))}
            />
          </label>
          <button
            type="button"
            className="dist-btn dist-btn-primary"
            onClick={() => dispatch(openCreateDistributor())}
          >
            <Plus size={15} strokeWidth={2.2} aria-hidden />
            {DISTRIBUTORS_CONTENT.addDistributor}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="dist-empty">
          <strong>{DISTRIBUTORS_CONTENT.emptyTitle}</strong>
          {DISTRIBUTORS_CONTENT.emptyBody}
        </div>
      ) : (
        <div className="dist-tbl-wrap">
          <table className="dist-tbl">
            <thead>
              <tr>
                <th>{DISTRIBUTORS_CONTENT.columns.distributor}</th>
                <th>{DISTRIBUTORS_CONTENT.columns.contact}</th>
                <th>{DISTRIBUTORS_CONTENT.columns.gstinDl}</th>
                <th>{DISTRIBUTORS_CONTENT.columns.paymentTerms}</th>
                <th>{DISTRIBUTORS_CONTENT.columns.products}</th>
                <th className="num">{DISTRIBUTORS_CONTENT.columns.outstanding}</th>
                <th>{DISTRIBUTORS_CONTENT.columns.status}</th>
                <th>{DISTRIBUTORS_CONTENT.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <DistributorsRow key={row.id} supplier={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
