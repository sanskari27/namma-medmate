import { CheckCircle2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { KIOSK_CONTENT } from '../../KioskScreen.content';
import { selectKioskLastToken } from '../../store/kiosk.selectors';
import { clearCart } from '../../store';

export function KioskSuccess() {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector(selectKioskLastToken);

  return (
    <div className="ko-success">
      <CheckCircle2 size={64} color="#2f7d52" strokeWidth={1.5} aria-hidden />
      <h3>{KIOSK_CONTENT.orderPlaced}</h3>
      <p>
        {token != null ? (
          <>
            Token <b>{token}</b> — please collect &amp; pay at the counter.
          </>
        ) : (
          KIOSK_CONTENT.tokenCollect(0)
        )}
      </p>
      <button
        type="button"
        className="ko-btn ko-btn-primary"
        onClick={() => dispatch(clearCart())}
      >
        {KIOSK_CONTENT.startNew}
      </button>
    </div>
  );
}
