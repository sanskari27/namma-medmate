import { Archive, Clock3, FileCheck2, IndianRupee, ShieldAlert, Timer } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RX_CONTENT } from '../../PrescriptionsScreen.content';
import { formatPaise } from '../../PrescriptionsScreen.utils';
import { selectRxSummary } from '../../store/prescriptions.selectors';

export function PrescriptionsSummary() {
  const stats = useSelector(selectRxSummary);

  return (
    <div className="rx-stats" aria-label="Prescriptions summary">
      <div className="rx-stat">
        <div className="ico" aria-hidden>
          <FileCheck2 size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{RX_CONTENT.summary.active}</div>
        <div className="v">{stats.active}</div>
        <div className="s">on the pharmacy file</div>
      </div>
      <div className="rx-stat" data-tone="gold">
        <div className="ico" aria-hidden>
          <Timer size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{RX_CONTENT.summary.expiring}</div>
        <div className="v">{stats.expiring}</div>
        <div className="s">within 30 days</div>
      </div>
      <div className="rx-stat" data-tone="rose">
        <div className="ico" aria-hidden>
          <ShieldAlert size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{RX_CONTENT.summary.due}</div>
        <div className="v">{stats.due}</div>
        <div className={stats.due > 0 ? 's warn' : 's'}>
          {stats.due > 0 ? 'ready to archive' : 'none overdue'}
        </div>
      </div>
      <div className="rx-stat" data-tone="blue">
        <div className="ico" aria-hidden>
          <Archive size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{RX_CONTENT.summary.fulfilled}</div>
        <div className="v">{stats.fulfilled}</div>
        <div className="s">nothing left to fill</div>
      </div>
      <div className="rx-stat">
        <div className="ico" aria-hidden>
          <Clock3 size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{RX_CONTENT.summary.expired}</div>
        <div className="v">{stats.expired}</div>
        <div className="s">six-month archive</div>
      </div>
      <div className="rx-stat" data-tone="purple">
        <div className="ico" aria-hidden>
          <IndianRupee size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{RX_CONTENT.summary.billed}</div>
        <div className="v" style={{ fontSize: 20 }}>
          {formatPaise(stats.billedPaise)}
        </div>
        <div className="s">from linked bills</div>
      </div>
    </div>
  );
}
