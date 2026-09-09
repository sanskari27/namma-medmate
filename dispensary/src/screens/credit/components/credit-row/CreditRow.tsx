import { Bell, UserRound } from 'lucide-react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import type { OutstandingCreditAccount } from '@/services/credit';
import { CREDIT_CONTENT } from '../../CreditScreen.content';
import {
  formatAge,
  formatPaise,
  formatPhone,
  whatsappHref,
} from '../../CreditScreen.utils';
import { openCreditDetail } from '../../store/credit.slice';

type CreditRowProps = {
  row: OutstandingCreditAccount;
};

export function CreditRow({ row }: CreditRowProps) {
  const dispatch = useDispatch<AppDispatch>();
  const wa = whatsappHref(row.customerPhone, row.balancePaise);

  return (
    <tr onClick={() => dispatch(openCreditDetail(row.customerId))}>
      <td>
        <div className="credit-cust">
          <div className="credit-avatar" aria-hidden>
            <UserRound size={16} strokeWidth={1.8} />
          </div>
          <div className="credit-name">{row.customerName}</div>
        </div>
      </td>
      <td>{formatPhone(row.customerPhone)}</td>
      <td className="num">{row.billCount}</td>
      <td className="num">{formatPaise(row.givenPaise)}</td>
      <td className="num">{formatPaise(row.repaidPaise)}</td>
      <td className="num due">{formatPaise(row.balancePaise)}</td>
      <td>
        <span className="credit-age">{formatAge(row.ageDays)}</span>
      </td>
      <td>
        {wa ? (
          <a
            className="credit-btn credit-btn-ghost"
            href={wa}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            <Bell size={14} strokeWidth={1.8} aria-hidden />
            {CREDIT_CONTENT.remind}
          </a>
        ) : (
          <button
            type="button"
            className="credit-btn credit-btn-ghost"
            disabled
            onClick={(event) => event.stopPropagation()}
          >
            <Bell size={14} strokeWidth={1.8} aria-hidden />
            {CREDIT_CONTENT.remind}
          </button>
        )}
      </td>
    </tr>
  );
}
