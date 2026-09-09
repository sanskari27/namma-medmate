import { AlertTriangle, IndianRupee, ScrollText, UserRound } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { CREDIT_CONTENT } from '../../CreditScreen.content';
import { averageOutstanding, formatPaise } from '../../CreditScreen.utils';
import { selectCreditSummary } from '../../store/credit.selectors';
import { setAgingFilter, toggleOverdueOnly } from '../../store/credit.slice';

export function CreditSummary() {
  const dispatch = useDispatch<AppDispatch>();
  const summary = useSelector(selectCreditSummary);
  const avg = averageOutstanding(summary);

  return (
    <div className="credit-stats" aria-label="Credit summary">
      <div className="credit-stat" data-tone="rose">
        <div className="ico" aria-hidden>
          <ScrollText size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{CREDIT_CONTENT.summary.total}</div>
        <div className="v">{formatPaise(summary.totalOutstandingPaise)}</div>
        <div className="s">
          {CREDIT_CONTENT.summary.accounts(summary.outstandingAccountCount, avg)}
        </div>
      </div>
      <button
        type="button"
        className="credit-stat"
        data-tone="orange"
        onClick={() => dispatch(toggleOverdueOnly())}
      >
        <div className="ico" aria-hidden>
          <AlertTriangle size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{CREDIT_CONTENT.summary.overdue}</div>
        <div className="v">{formatPaise(summary.overduePaise)}</div>
        <div className="s">{CREDIT_CONTENT.summary.chase(summary.overdueAccountCount)}</div>
      </button>
      <div className="credit-stat" data-tone="green">
        <div className="ico" aria-hidden>
          <IndianRupee size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{CREDIT_CONTENT.summary.collected}</div>
        <div className="v">{formatPaise(summary.collectedThisMonthPaise)}</div>
        <div className="s">
          {CREDIT_CONTENT.summary.collectionRate(summary.collectionRatePercent)}
        </div>
      </div>
      <button
        type="button"
        className="credit-stat"
        data-tone="blue"
        onClick={() => dispatch(setAgingFilter(null))}
      >
        <div className="ico" aria-hidden>
          <UserRound size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{CREDIT_CONTENT.summary.given}</div>
        <div className="v">{formatPaise(summary.creditGivenAllTimePaise)}</div>
        <div className="s">{CREDIT_CONTENT.summary.khataAccounts(summary.khataAccountCount)}</div>
      </button>
    </div>
  );
}
