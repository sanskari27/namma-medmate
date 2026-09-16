import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { POS_CONTENT } from '../../PosScreen.content';
import { formatPaise } from '../../PosScreen.utils';
import { selectPosBusy, selectPosHeld, selectPosHeldLoading } from '../../store/pos.selectors';
import { continueInvoice } from '../../store/pos.thunks';

export function PosHeldStrip() {
  const dispatch = useDispatch<AppDispatch>();
  const held = useSelector(selectPosHeld);
  const loading = useSelector(selectPosHeldLoading);
  const busy = useSelector(selectPosBusy);

  return (
    <section className="pos-held" aria-label={POS_CONTENT.held.panelAria}>
      {loading ? <p>{POS_CONTENT.held.loading}</p> : null}
      {!loading && held.length === 0 ? <p>{POS_CONTENT.held.empty}</p> : null}
      {!loading
        ? held.map((invoice) => (
            <button
              key={invoice.id}
              type="button"
              className="pos-held-item"
              disabled={busy}
              aria-label={POS_CONTENT.held.resume(invoice.invoiceNumber)}
              onClick={() => void dispatch(continueInvoice(invoice.id))}
            >
              {POS_CONTENT.held.resume(invoice.invoiceNumber)}
              <span aria-hidden="true">{formatPaise(invoice.totalPaise)}</span>
            </button>
          ))
        : null}
    </section>
  );
}
