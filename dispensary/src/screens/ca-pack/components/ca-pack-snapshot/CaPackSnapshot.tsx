import { useSelector } from 'react-redux';
import { CA_PACK_CONTENT } from '../../CaPackScreen.content';
import { formatPaise } from '../../CaPackScreen.utils';
import { selectSnapshot } from '../../store';

export function CaPackSnapshot() {
  const snap = useSelector(selectSnapshot);
  return (
    <section className="ca-card" aria-label={CA_PACK_CONTENT.snapshot}>
      <h3 className="ca-kicker">{CA_PACK_CONTENT.snapshot}</h3>
      <dl className="ca-snap">
        <div className="ca-snap-row">
          <dt>{CA_PACK_CONTENT.gstin}</dt>
          <strong>{snap.gstin}</strong>
        </div>
        <div className="ca-snap-row">
          <dt>{CA_PACK_CONTENT.netRevenue}</dt>
          <strong>{formatPaise(snap.revenue)}</strong>
        </div>
        <div className="ca-snap-row">
          <dt>{CA_PACK_CONTENT.outputGst}</dt>
          <strong>{formatPaise(snap.output)}</strong>
        </div>
        <div className="ca-snap-row">
          <dt>{CA_PACK_CONTENT.inputGst}</dt>
          <strong>{formatPaise(snap.input)}</strong>
        </div>
        <div className="ca-snap-row ca-net">
          <dt>{CA_PACK_CONTENT.netGst}</dt>
          <strong>{formatPaise(snap.payable)}</strong>
        </div>
      </dl>
    </section>
  );
}
