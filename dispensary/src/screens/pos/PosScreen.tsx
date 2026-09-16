import { useId } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { PosBillPayment } from './components/pos-bill-payment';
import { PosCartPanel } from './components/pos-cart-panel';
import { PosCategoryChips } from './components/pos-category-chips';
import { PosConnectivityOverlay } from './components/pos-connectivity-overlay';
import { PosGstPanel } from './components/pos-gst-panel';
import { PosHeldStrip } from './components/pos-held-strip';
import { PosInvoiceCopy } from './components/pos-invoice-copy';
import { PosLoyaltyPanel } from './components/pos-loyalty-panel';
import { PosOfferPanel } from './components/pos-offer-panel';
import { PosOrderSummary } from './components/pos-order-summary';
import { PosProductGrid } from './components/pos-product-grid';
import { PosSafetyPanel } from './components/pos-safety-panel';
import { PosStatusBanner } from './components/pos-status-banner';
import { PosStepper } from './components/pos-stepper';
import { PosToolbar } from './components/pos-toolbar';
import { POS_CONTENT } from './PosScreen.content';
import { statusCopy } from './PosScreen.utils';
import './PosScreen.css';
import { backToCart } from './store/pos.slice';
import {
  selectPosBusy,
  selectPosInvoice,
  selectPosStatus,
  selectPosStatusHint,
  selectPosStep,
} from './store/pos.selectors';
import { usePosConnectivity } from './usePosConnectivity';
import { usePosSale } from './usePosSale';

export default function PosScreen() {
  const statusId = useId();
  const { allowed } = usePosSale();
  const connectivity = usePosConnectivity();
  const dispatch = useDispatch<AppDispatch>();
  const step = useSelector(selectPosStep);
  const status = useSelector(selectPosStatus);
  const statusHint = useSelector(selectPosStatusHint);
  const invoice = useSelector(selectPosInvoice);
  const busy = useSelector(selectPosBusy);

  if (!allowed) {
    return (
      <div className="pos" aria-label={POS_CONTENT.regionLabel}>
        <div className="pos-denied" role="alert">
          {statusCopy('denied')}
        </div>
      </div>
    );
  }

  return (
    <div className="pos" aria-label={POS_CONTENT.regionLabel}>
      <PosStatusBanner
        status={status}
        statusId={statusId}
        invoiceNumber={invoice?.invoiceNumber}
        hint={statusHint}
      />
      <PosStepper />
      {step === 'cart' ? (
        <>
          <PosHeldStrip />
          <PosToolbar />
          <PosCategoryChips />
          <div className="pos-main">
            <PosProductGrid />
            <PosCartPanel />
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            className="pos-back"
            disabled={busy}
            onClick={() => dispatch(backToCart())}
          >
            {POS_CONTENT.backToCart}
          </button>
          <div className="pos-pay">
            <PosOrderSummary />
            <div className="pos-pay-col">
              <PosOfferPanel />
              <PosGstPanel />
              <PosLoyaltyPanel />
              <PosSafetyPanel />
              <PosBillPayment offline={connectivity.offline} />
              <PosInvoiceCopy offline={connectivity.offline} />
            </div>
          </div>
        </>
      )}
      <PosConnectivityOverlay open={connectivity.offline} />
    </div>
  );
}
