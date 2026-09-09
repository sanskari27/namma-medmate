import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { PrescriptionsCard } from '../prescriptions-card';
import { RX_CONTENT } from '../../PrescriptionsScreen.content';
import { selectFilteredPrescriptions, selectRxStatus } from '../../store/prescriptions.selectors';
import { loadPrescriptions } from '../../store/prescriptions.thunks';

export function PrescriptionsGrid() {
  const dispatch = useDispatch<AppDispatch>();
  const rows = useSelector(selectFilteredPrescriptions);
  const status = useSelector(selectRxStatus);

  if (status === 'empty' || rows.length === 0) {
    return (
      <div className="rx-card">
        <div className="rx-empty">
          <strong>{RX_CONTENT.emptyTitle}</strong>
          {RX_CONTENT.emptyBody}
          {status === 'empty' ? (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="rx-btn rx-btn-ghost"
                onClick={() => void dispatch(loadPrescriptions())}
              >
                {RX_CONTENT.retry}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rx-grid" aria-label="Prescription cards">
      {rows.map((row) => (
        <PrescriptionsCard key={row.id} row={row} />
      ))}
    </div>
  );
}
