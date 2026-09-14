import { Check, ShoppingCart } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { KIOSK_CONTENT } from '../../KioskScreen.content';
import { formatPaise, paymentLabel } from '../../KioskScreen.utils';
import {
  selectKioskBusy,
  selectKioskCart,
  selectKioskCartHasRx,
  selectKioskCartTotal,
  selectKioskConfigDraft,
  selectKioskEnabledPayments,
  selectKioskPaymentMethod,
  selectKioskRxFileName,
} from '../../store/kiosk.selectors';
import {
  changeQty,
  markValidation,
  placeOrder,
  setPaymentMethod,
  setRxFileName,
} from '../../store';

export function KioskCartPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const cart = useSelector(selectKioskCart);
  const total = useSelector(selectKioskCartTotal);
  const hasRx = useSelector(selectKioskCartHasRx);
  const config = useSelector(selectKioskConfigDraft);
  const payments = useSelector(selectKioskEnabledPayments);
  const paymentMethod = useSelector(selectKioskPaymentMethod);
  const busy = useSelector(selectKioskBusy);
  const rxFile = useSelector(selectKioskRxFileName);
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);

  function onPlace() {
    if (cart.length === 0) {
      dispatch(markValidation());
      return;
    }
    void dispatch(placeOrder({ cart, paymentMethod }));
  }

  return (
    <aside className="ko-cart">
      <div className="ko-cart-head">
        <ShoppingCart size={16} aria-hidden />
        {KIOSK_CONTENT.yourOrder}
        {count > 0 ? ` · ${count}` : ''}
      </div>
      <div className="ko-cart-list">
        {cart.length === 0 ? (
          <p className="ko-cart-empty">{KIOSK_CONTENT.tapProducts}</p>
        ) : (
          cart.map((line) => (
            <div
              key={`${line.productId}:${line.loose ? 'loose' : 'pack'}`}
              className="ko-cart-line"
            >
              <div>
                <div className="nm">
                  {line.name}
                  {line.prescriptionRequired ? ' · Rx' : ''}
                </div>
                {config.showPrices ? (
                  <div className="pr">{formatPaise(line.unitPricePaise * line.quantity)}</div>
                ) : null}
              </div>
              <div className="ko-qty">
                <button
                  type="button"
                  aria-label="Decrease"
                  onClick={() =>
                    dispatch(
                      changeQty({
                        productId: line.productId,
                        loose: line.loose,
                        delta: -1,
                      }),
                    )
                  }
                >
                  −
                </button>
                <span>{line.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase"
                  onClick={() =>
                    dispatch(
                      changeQty({
                        productId: line.productId,
                        loose: line.loose,
                        delta: 1,
                      }),
                    )
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {hasRx ? <p className="ko-rx-note">{KIOSK_CONTENT.rxNote}</p> : null}

      {hasRx && config.allowRxUpload ? (
        <div className="ko-rx-upload">
          <label htmlFor="ko-rx-file">{KIOSK_CONTENT.rxUpload}</label>
          <input
            id="ko-rx-file"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              dispatch(setRxFileName(file?.name ?? null));
            }}
          />
          <p className="ko-hint">
            {rxFile ? rxFile : KIOSK_CONTENT.rxUploadHint}
          </p>
        </div>
      ) : null}

      <div className="ko-cart-foot">
        <div className="ko-total">
          <span>{KIOSK_CONTENT.total}</span>
          <strong>{config.showPrices ? formatPaise(total) : '—'}</strong>
        </div>
        <div className="ko-pay-row">
          {payments.map((method) => (
            <button
              key={method}
              type="button"
              className="ko-pay"
              data-on={paymentMethod === method}
              onClick={() => dispatch(setPaymentMethod(method))}
            >
              {paymentLabel(method)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="ko-place"
          disabled={busy || cart.length === 0}
          onClick={onPlace}
        >
          <Check size={16} aria-hidden />
          {busy ? KIOSK_CONTENT.placing : KIOSK_CONTENT.placeOrder}
        </button>
      </div>
    </aside>
  );
}
