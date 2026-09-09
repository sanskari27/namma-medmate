import { BarChart3, Stethoscope } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RX_CONTENT } from '../../PrescriptionsScreen.content';
import { formatPaise } from '../../PrescriptionsScreen.utils';
import { selectRxStatusMix, selectRxTopDoctors } from '../../store/prescriptions.selectors';

export function PrescriptionsInsights() {
  const doctors = useSelector(selectRxTopDoctors);
  const mix = useSelector(selectRxStatusMix);
  const max = Math.max(1, ...doctors.map((d) => d.count));

  return (
    <div className="rx-insights" aria-label="Prescription insights">
      <div className="rx-card rx-card-pad">
        <div className="rx-inhead">
          <Stethoscope size={15} strokeWidth={1.8} aria-hidden />
          {RX_CONTENT.insights.topDoctors}
        </div>
        {doctors.length === 0 ? (
          <div className="rx-empty" style={{ padding: '20px 0' }}>
            No prescribers on file yet.
          </div>
        ) : (
          doctors.map((doc) => (
            <div key={doc.name} className="rx-doc-row">
              <div className="rx-doc-meta">
                <span className="name">{doc.name}</span>
                <span className="cnt">{RX_CONTENT.insights.rxCount(doc.count)}</span>
              </div>
              <div className="rx-prog" aria-hidden>
                <i style={{ width: `${Math.round((doc.count / max) * 100)}%` }} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rx-card rx-card-pad">
        <div className="rx-inhead">
          <BarChart3 size={15} strokeWidth={1.8} aria-hidden />
          {RX_CONTENT.insights.statusMix}
        </div>
        <div className="rx-splitbar" aria-hidden>
          {mix.activePct > 0 ? <i data-tone="green" style={{ width: `${mix.activePct}%` }} /> : null}
          {mix.fulfilledPct > 0 ? (
            <i data-tone="gray" style={{ width: `${mix.fulfilledPct}%` }} />
          ) : null}
          {mix.expiredPct > 0 ? <i data-tone="rose" style={{ width: `${mix.expiredPct}%` }} /> : null}
        </div>
        <div className="rx-legend">
          <span>
            <i className="g" aria-hidden /> Active {mix.active}
          </span>
          <span>
            <i className="a" aria-hidden /> Fulfilled {mix.fulfilled}
          </span>
          <span>
            <i className="r" aria-hidden /> Expired {mix.expired}
          </span>
        </div>
        <div className="rx-facts">
          <div>
            <div className="k">{RX_CONTENT.insights.active}</div>
            <div className="v">{mix.active}</div>
          </div>
          <div>
            <div className="k">{RX_CONTENT.insights.fulfilled}</div>
            <div className="v">{mix.fulfilled}</div>
          </div>
          <div>
            <div className="k">{RX_CONTENT.insights.expired}</div>
            <div className="v">{mix.expired}</div>
          </div>
          <div>
            <div className="k">{RX_CONTENT.insights.billed}</div>
            <div className="v">{formatPaise(mix.billedPaise)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
