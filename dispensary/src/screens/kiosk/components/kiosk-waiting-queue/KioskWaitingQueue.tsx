import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { KIOSK_CONTENT } from '../../KioskScreen.content';
import { paymentLabel } from '../../KioskScreen.utils';
import {
  selectKioskBusy,
  selectKioskOpen,
  selectKioskWaiting,
} from '../../store/kiosk.selectors';
import { cancelTicket } from '../../store';

export function KioskWaitingQueue() {
  const dispatch = useDispatch<AppDispatch>();
  const open = useSelector(selectKioskOpen);
  const tickets = useSelector(selectKioskWaiting);
  const busy = useSelector(selectKioskBusy);

  if (!open) return null;

  return (
    <section className="ko-queue" aria-labelledby="ko-waiting-heading">
      <h3 id="ko-waiting-heading">{KIOSK_CONTENT.waitingTitle}</h3>
      {tickets.length === 0 ? (
        <p className="ko-hint">{KIOSK_CONTENT.waitingEmpty}</p>
      ) : (
        tickets.map((ticket) => (
          <article key={ticket.id} className="ko-ticket">
            <div>
              <div className="ko-token">
                #{ticket.token}
                {ticket.requiresRx ? (
                  <span className="ko-rx">{KIOSK_CONTENT.rxBadge}</span>
                ) : null}
              </div>
              <p style={{ margin: '4px 0 0', fontWeight: 700 }}>
                {ticket.walkInName || 'Walk-in'}
              </p>
              <p className="ko-hint" style={{ marginTop: 4 }}>
                {ticket.pickupRequest}
              </p>
              {ticket.paymentMethod ? (
                <p className="ko-hint" style={{ marginTop: 2 }}>
                  Pay: {paymentLabel(ticket.paymentMethod)}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="ko-btn ko-btn-ghost"
              disabled={busy}
              onClick={() => void dispatch(cancelTicket(ticket.id))}
            >
              {KIOSK_CONTENT.clearSlip}
            </button>
          </article>
        ))
      )}
    </section>
  );
}
