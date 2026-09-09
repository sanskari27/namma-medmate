import { Bell, Wallet, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { CREDIT_CONTENT } from '../../CreditScreen.content';
import {
  formatAge,
  formatPaise,
  formatPhone,
  whatsappHref,
} from '../../CreditScreen.utils';
import { selectSelectedCreditAccount } from '../../store/credit.selectors';
import { closeCreditDetail, openSettleCredit } from '../../store/credit.slice';

export function CreditDetailDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const row = useSelector(selectSelectedCreditAccount);
  if (!row) return null;

  const wa = whatsappHref(row.customerPhone, row.balancePaise);

  return (
    <div
      className="credit-modal-wrap"
      role="presentation"
      onClick={() => dispatch(closeCreditDetail())}
    >
      <div
        className="credit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="credit-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="credit-modal-head">
          <h2 id="credit-detail-title">{row.customerName}</h2>
          <button
            type="button"
            className="credit-x"
            aria-label={CREDIT_CONTENT.detail.close}
            onClick={() => dispatch(closeCreditDetail())}
          >
            <X size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
        <div className="credit-modal-body">
          <div className="credit-fact">
            <div>
              <div className="k">{CREDIT_CONTENT.detail.phone}</div>
              <div className="v">{formatPhone(row.customerPhone)}</div>
            </div>
            <div>
              <div className="k">{CREDIT_CONTENT.detail.outstanding}</div>
              <div className="v due">{formatPaise(row.balancePaise)}</div>
            </div>
            <div>
              <div className="k">{CREDIT_CONTENT.detail.given}</div>
              <div className="v">{formatPaise(row.givenPaise)}</div>
            </div>
            <div>
              <div className="k">{CREDIT_CONTENT.detail.repaid}</div>
              <div className="v">{formatPaise(row.repaidPaise)}</div>
            </div>
            <div>
              <div className="k">{CREDIT_CONTENT.detail.limit}</div>
              <div className="v">{formatPaise(row.limitPaise)}</div>
            </div>
            <div>
              <div className="k">{CREDIT_CONTENT.detail.available}</div>
              <div className="v">{formatPaise(row.availablePaise)}</div>
            </div>
            <div>
              <div className="k">{CREDIT_CONTENT.detail.bills}</div>
              <div className="v">{row.billCount}</div>
            </div>
            <div>
              <div className="k">{CREDIT_CONTENT.detail.age}</div>
              <div className="v">{formatAge(row.ageDays)}</div>
            </div>
          </div>

          <div className="credit-modal-actions">
            <button
              type="button"
              className="credit-btn credit-btn-primary"
              onClick={() => dispatch(openSettleCredit())}
            >
              <Wallet size={14} strokeWidth={1.8} aria-hidden />
              {CREDIT_CONTENT.detail.settle}
            </button>
            {wa ? (
              <a
                className="credit-btn credit-btn-ghost"
                href={wa}
                target="_blank"
                rel="noreferrer"
              >
                <Bell size={14} strokeWidth={1.8} aria-hidden />
                {CREDIT_CONTENT.detail.remind}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
