import { Banknote, Building2, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import type { PaymentMode } from '@/services/salesInvoices';
import { PosTenderFields } from '../pos-tender-fields';
import { POS_CONTENT } from '../../PosScreen.content';
import { formatPaise } from '../../PosScreen.utils';
import {
  billTypeChanged,
  billValueChanged,
  paymentModeSelected,
} from '../../store/pos.slice';
import {
  selectPosBillType,
  selectPosBillValue,
  selectPosBusy,
  selectPosCollected,
  selectPosCreditAvailablePaise,
  selectPosPaymentMode,
  selectPosTenderPreview,
  selectPosTotals,
  selectPosWalkIn,
  selectPosSelectedCustomer,
} from '../../store/pos.selectors';
import { applyPricing, collectPayment, holdBill } from '../../store/pos.thunks';

const MODE_ICONS: Record<PaymentMode, typeof Banknote> = {
  CASH: Banknote,
  UPI: Smartphone,
  CARD: CreditCard,
  CREDIT: Wallet,
  BANK_TRANSFER: Building2,
};

const PAYMENT_MODES = Object.keys(POS_CONTENT.paymentModes) as PaymentMode[];

type PosBillPaymentProps = {
  offline: boolean;
};

export function PosBillPayment({ offline }: PosBillPaymentProps) {
  const dispatch = useDispatch<AppDispatch>();
  const totals = useSelector(selectPosTotals);
  const billType = useSelector(selectPosBillType);
  const billValue = useSelector(selectPosBillValue);
  const paymentMode = useSelector(selectPosPaymentMode);
  const busy = useSelector(selectPosBusy);
  const collected = useSelector(selectPosCollected);
  const walkIn = useSelector(selectPosWalkIn);
  const customer = useSelector(selectPosSelectedCustomer);
  const creditAvailablePaise = useSelector(selectPosCreditAvailablePaise);
  const preview = useSelector(selectPosTenderPreview);

  const taxable = Math.max(0, totals.subtotalPaise);
  const disabled = busy || collected || offline;
  const chargeBlocked =
    disabled || preview.invalid || preview.parts.length === 0 || preview.remainingPaise > 0;

  return (
    <section className="pos-panel" aria-label={POS_CONTENT.paymentAria}>
      <div className="pos-panel-head">
        <h2>{POS_CONTENT.paymentTitle}</h2>
      </div>
      <div className="pos-money-rows">
        <div className="pos-money-row">
          <span>{POS_CONTENT.subtotal}</span>
          <strong>{formatPaise(totals.subtotalPaise + totals.discountPaise)}</strong>
        </div>
        <div className="pos-money-row">
          <span>{POS_CONTENT.discount}</span>
          <div className="pos-discount-edit">
            <input
              value={billValue}
              onChange={(event) => dispatch(billValueChanged(event.target.value))}
              onBlur={() => {
                if (!collected) {
                  void dispatch(applyPricing());
                }
              }}
              disabled={disabled}
              inputMode="decimal"
              aria-label={POS_CONTENT.billDiscountAria}
            />
            <select
              value={billType === 'PERCENT' ? 'PERCENT' : 'FLAT'}
              onChange={(event) =>
                dispatch(billTypeChanged(event.target.value === 'PERCENT' ? 'PERCENT' : 'FLAT'))
              }
              disabled={disabled}
              aria-label={POS_CONTENT.discountTypeAria}
            >
              <option value="FLAT">{POS_CONTENT.discountFlat}</option>
              <option value="PERCENT">{POS_CONTENT.discountPercent}</option>
            </select>
          </div>
        </div>
        <div className="pos-money-row">
          <span>{POS_CONTENT.taxable}</span>
          <strong>{formatPaise(taxable)}</strong>
        </div>
      </div>
      <div className="pos-to-pay">
        <span>{POS_CONTENT.toPay}</span>
        <strong>{formatPaise(totals.totalPaise)}</strong>
      </div>
      <div className="pos-pay-modes" role="group" aria-label={POS_CONTENT.paymentMethodAria}>
        {PAYMENT_MODES.map((mode) => {
          const Icon = MODE_ICONS[mode];
          const khataBlocked = mode === 'CREDIT' && (walkIn || !customer);
          return (
            <button
              key={mode}
              type="button"
              className="pos-pay-mode"
              data-active={paymentMode === mode}
              disabled={disabled || khataBlocked}
              onClick={() => dispatch(paymentModeSelected(mode))}
            >
              <Icon size={18} aria-hidden="true" />
              {POS_CONTENT.paymentModes[mode]}
            </button>
          );
        })}
      </div>
      {creditAvailablePaise != null && customer && !walkIn ? (
        <p className="pos-khata-left">{POS_CONTENT.khataLeft(formatPaise(creditAvailablePaise))}</p>
      ) : null}
      <PosTenderFields offline={offline} />
      <button
        type="button"
        className="pos-charge"
        disabled={chargeBlocked}
        onClick={() => void dispatch(collectPayment())}
      >
        {POS_CONTENT.charge(formatPaise(totals.totalPaise))}
      </button>
      <button
        type="button"
        className="pos-hold"
        disabled={disabled}
        onClick={() => void dispatch(holdBill())}
      >
        {POS_CONTENT.hold}
      </button>
    </section>
  );
}
