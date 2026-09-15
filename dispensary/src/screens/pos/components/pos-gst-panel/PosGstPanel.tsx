import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { POS_CONTENT } from '../../PosScreen.content';
import { formatPaise } from '../../PosScreen.utils';
import {
  closeTaxOverride,
  customerGstinChanged,
  openTaxOverride,
  taxRateChanged,
  taxReasonChanged,
} from '../../store/pos.slice';
import {
  selectPosBusy,
  selectPosCollected,
  selectPosCustomerGstin,
  selectPosDraft,
  selectPosTaxProductId,
  selectPosTaxRate,
  selectPosTaxReason,
  selectPosTotals,
} from '../../store/pos.selectors';
import { adjustTax, applyPricing } from '../../store/pos.thunks';

export function PosGstPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const totals = useSelector(selectPosTotals);
  const gstin = useSelector(selectPosCustomerGstin);
  const draft = useSelector(selectPosDraft);
  const taxProductId = useSelector(selectPosTaxProductId);
  const taxRate = useSelector(selectPosTaxRate);
  const taxReason = useSelector(selectPosTaxReason);
  const busy = useSelector(selectPosBusy);
  const collected = useSelector(selectPosCollected);
  const disabled = busy || collected;
  const firstProductId = draft[0]?.product.id;
  const inter = totals.taxJurisdiction === 'INTER';

  return (
    <section className="pos-gst" aria-label={POS_CONTENT.gst.panelAria}>
      <div className="pos-money-row">
        <span>{inter ? POS_CONTENT.gst.igst : POS_CONTENT.cgst}</span>
        <strong>{formatPaise(inter ? totals.igstPaise : totals.cgstPaise)}</strong>
      </div>
      {inter ? null : (
        <div className="pos-money-row">
          <span>{POS_CONTENT.sgst}</span>
          <strong>{formatPaise(totals.sgstPaise)}</strong>
        </div>
      )}
      <label className="pos-gstin">
        {POS_CONTENT.gst.gstin}
        <input
          value={gstin}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => dispatch(customerGstinChanged(event.target.value))}
        />
      </label>
      <div className="pos-gst-actions">
        <button
          type="button"
          className="pos-gst-apply"
          disabled={disabled}
          onClick={() => void dispatch(applyPricing())}
        >
          {POS_CONTENT.gst.apply}
        </button>
        {firstProductId ? (
          <button
            type="button"
            className="pos-gst-override"
            disabled={disabled}
            onClick={() => dispatch(openTaxOverride(firstProductId))}
          >
            {POS_CONTENT.gst.override}
          </button>
        ) : null}
      </div>
      {taxProductId ? (
        <div className="pos-tax-override">
          <label>
            {POS_CONTENT.gst.rate}
            <input
              value={taxRate}
              inputMode="decimal"
              disabled={disabled}
              onChange={(event) => dispatch(taxRateChanged(event.target.value))}
            />
          </label>
          <label>
            {POS_CONTENT.gst.reason}
            <input
              value={taxReason}
              disabled={disabled}
              onChange={(event) => dispatch(taxReasonChanged(event.target.value))}
            />
          </label>
          <div className="pos-gst-actions">
            <button
              type="button"
              disabled={disabled}
              onClick={() => void dispatch(adjustTax())}
            >
              {POS_CONTENT.gst.save}
            </button>
            <button type="button" disabled={disabled} onClick={() => dispatch(closeTaxOverride())}>
              {POS_CONTENT.gst.close}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
