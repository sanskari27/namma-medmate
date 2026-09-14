import { useSelector } from 'react-redux';
import { selectOutletsItems } from '../../store';

export function OutletsStats() {
  const items = useSelector(selectOutletsItems);
  return (
    <div className="ot-stats" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
      <div className="ot-stat">
        <div className="lbl">Outlets</div>
        <div className="val">{items.length}</div>
        <div className="split">{items.filter((row) => row.status === 'ACTIVE').length} active</div>
      </div>
      <div className="ot-stat">
        <div className="lbl">Retail</div>
        <div className="val">{items.filter((row) => row.branchType === 'RETAIL').length}</div>
        <div className="split">floor counters</div>
      </div>
      <div className="ot-stat">
        <div className="lbl">Kiosk</div>
        <div className="val">{items.filter((row) => row.branchType === 'KIOSK').length}</div>
        <div className="split">self-order</div>
      </div>
      <div className="ot-stat">
        <div className="lbl">Default</div>
        <div className="val">{items.filter((row) => row.defaultBranch).length}</div>
        <div className="split">home outlet</div>
      </div>
    </div>
  );
}
