import type { MouseEvent } from 'react';
import { Eye } from 'lucide-react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import type { SalesReturnSummary } from '@/services/salesReturns';
import { RETURNS_CONTENT } from '../../ReturnsScreen.content';
import {
  formatIstDateTime,
  formatPaise,
  refundModeLabel,
  refundTone,
  relativeTime,
  unitsLabel,
} from '../../ReturnsScreen.utils';
import { openReturnDetail } from '../../store/returns.slice';

type ReturnsRowProps = {
  row: SalesReturnSummary;
};

export function ReturnsRow({ row }: ReturnsRowProps) {
  const dispatch = useDispatch<AppDispatch>();
  const tone = refundTone(row.refundMode);

  function onView(event: MouseEvent) {
    event.stopPropagation();
    dispatch(openReturnDetail(row.id));
  }

  return (
    <tr onClick={() => dispatch(openReturnDetail(row.id))}>
      <td className="returns-mono">{row.invoiceNumber}</td>
      <td>
        <div>{formatIstDateTime(row.createdAt)}</div>
        <div className="returns-sub">{relativeTime(row.createdAt)}</div>
      </td>
      <td>
        <div className="returns-cust-name">{row.customerName}</div>
        {row.customerPhone ? <div className="returns-sub">{row.customerPhone}</div> : null}
      </td>
      <td>
        {unitsLabel(row)}
        {row.itemSummary ? <div className="returns-sub">{row.itemSummary}</div> : null}
      </td>
      <td>
        <div className="returns-sub" style={{ whiteSpace: 'normal', maxWidth: 220 }}>
          {row.reason}
        </div>
      </td>
      <td>
        <span className={`returns-pill returns-pill-${tone}`}>
          <i className="d" aria-hidden />
          {refundModeLabel(row.refundMode)}
        </span>
      </td>
      <td className="num">{formatPaise(row.refundTotalPaise)}</td>
      <td>
        <div className="returns-actions" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="returns-iconbtn"
            title={RETURNS_CONTENT.actions.view}
            aria-label={RETURNS_CONTENT.actions.view}
            onClick={onView}
          >
            <Eye size={16} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      </td>
    </tr>
  );
}
