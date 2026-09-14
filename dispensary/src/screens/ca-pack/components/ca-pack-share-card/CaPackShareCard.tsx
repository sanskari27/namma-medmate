import { BookOpen, FileSpreadsheet, Send, ShoppingCart, TrendingUp, Truck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { CA_PACK_CONTENT, SHARE_TOGGLES, type ShareToggleId } from '../../CaPackScreen.content';
import { periodOptions } from '../../CaPackScreen.utils';
import {
  advisorSelected,
  downloadCaPackFile,
  periodKeyChanged,
  selectActiveAdvisor,
  selectCaPackAdvisorId,
  selectCaPackAdvisors,
  selectCaPackBusy,
  selectCaPackEnabled,
  selectCaPackPeriodKey,
  selectShareCount,
  selectShareLabel,
  toggleChanged,
} from '../../store';

const ICONS: Record<ShareToggleId, ReactNode> = {
  gst: <FileSpreadsheet size={16} aria-hidden />,
  sales: <ShoppingCart size={16} aria-hidden />,
  purchase: <Truck size={16} aria-hidden />,
  pnl: <TrendingUp size={16} aria-hidden />,
  daybook: <BookOpen size={16} aria-hidden />,
};

export function CaPackShareCard() {
  const dispatch = useDispatch<AppDispatch>();
  const periodKey = useSelector(selectCaPackPeriodKey);
  const enabled = useSelector(selectCaPackEnabled);
  const advisors = useSelector(selectCaPackAdvisors);
  const advisorId = useSelector(selectCaPackAdvisorId);
  const busy = useSelector(selectCaPackBusy);
  const count = useSelector(selectShareCount);
  const label = useSelector(selectShareLabel);
  const advisor = useSelector(selectActiveAdvisor);
  const options = periodOptions();

  return (
    <section className="ca-card" aria-label={CA_PACK_CONTENT.shareTitle}>
      <h3>{CA_PACK_CONTENT.shareTitle}</h3>
      <div className="ca-row">
        <label className="ca-label">
          {CA_PACK_CONTENT.period}
          <select
            className="ca-select"
            value={periodKey}
            onChange={(event) => dispatch(periodKeyChanged(event.target.value))}
          >
            {options.map((row) => (
              <option key={row.key} value={row.key}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ca-label">
          {CA_PACK_CONTENT.sendTo}
          <select
            className="ca-select"
            value={advisorId}
            onChange={(event) => dispatch(advisorSelected(event.target.value))}
          >
            {advisors.length === 0 ? <option value="">Add a CA first</option> : null}
            {advisors.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} ({row.kind})
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="ca-include">{CA_PACK_CONTENT.include}</p>
      {SHARE_TOGGLES.map((row) => (
        <div key={row.id} className="ca-toggle">
          <span className="ca-ico">{ICONS[row.id]}</span>
          <span>{row.label}</span>
          <button
            type="button"
            className="ca-switch"
            role="switch"
            aria-checked={enabled[row.id]}
            aria-label={row.label}
            onClick={() => dispatch(toggleChanged({ id: row.id, on: !enabled[row.id] }))}
          >
            <i />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="ca-share"
        disabled={busy || count === 0}
        onClick={() => void dispatch(downloadCaPackFile())}
      >
        <Send size={16} aria-hidden />
        {label}
      </button>
      <p className="ca-hint">
        {advisor
          ? CA_PACK_CONTENT.shareHint
          : 'Download the selected reports as a PDF pack for your CA.'}
      </p>
    </section>
  );
}
