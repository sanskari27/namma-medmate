import { useDispatch, useSelector } from 'react-redux';
import { kindLabel, outcomeLabel, formatIstDateTime, type KindFilter } from '../../WhatsappSendsScreen.utils';
import {
  kindChanged,
  selectWhatsappSendsItems,
  selectWhatsappSendsKind,
  selectWhatsappSendsSelected,
  sendSelected,
} from '../../store';

const FILTERS: { id: KindFilter; label: string }[] = [
  { id: 'ALL', label: 'All sends' },
  { id: 'REFILL_DUE', label: 'Refill due' },
  { id: 'CREDIT_DUE', label: 'Khata due' },
  { id: 'CAMPAIGN', label: 'Tag broadcast' },
];

export function WhatsappSendsListPanel() {
  const dispatch = useDispatch();
  const items = useSelector(selectWhatsappSendsItems);
  const selected = useSelector(selectWhatsappSendsSelected);
  const kind = useSelector(selectWhatsappSendsKind);
  return (
    <div className="wh-card">
      <div className="wh-card-head">
        <h3>On this pharmacy</h3>
      </div>
      <div className="wh-card-pad">
        <div className="wh-flex" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className="wh-chip"
              data-on={kind === filter.id}
              onClick={() => dispatch(kindChanged(filter.id))}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="wh-loading">No sends in this filter.</p>
      ) : (
        <div className="wh-list">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              data-on={item.id === selected?.id}
              onClick={() => dispatch(sendSelected(item.id))}
            >
              <b>{kindLabel(item.kind)}</b>
              <span className="wh-muted">{outcomeLabel(item.status)}</span>
              <span className="wh-muted">{formatIstDateTime(item.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
