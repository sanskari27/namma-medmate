import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { POS_CONTENT } from '../../PosScreen.content';
import { newSale } from '../../store/pos.slice';
import {
  selectPosBusy,
  selectPosCollected,
  selectPosCopyBusy,
  selectPosCopyHint,
  selectPosSelectedCustomer,
  selectPosWalkIn,
} from '../../store/pos.selectors';
import { emailCopy, printInvoice } from '../../store/pos.thunks';

type PosInvoiceCopyProps = {
  offline: boolean;
};

export function PosInvoiceCopy({ offline }: PosInvoiceCopyProps) {
  const dispatch = useDispatch<AppDispatch>();
  const collected = useSelector(selectPosCollected);
  const copyBusy = useSelector(selectPosCopyBusy);
  const copyHint = useSelector(selectPosCopyHint);
  const busy = useSelector(selectPosBusy);
  const walkIn = useSelector(selectPosWalkIn);
  const customer = useSelector(selectPosSelectedCustomer);
  const disabled = busy || copyBusy || offline;

  return (
    <section className="pos-copy" aria-label={POS_CONTENT.copy.panelAria}>
      {copyBusy ? <p>{POS_CONTENT.invoiceOutput.loading}</p> : null}
      {!copyBusy && copyHint ? <p>{copyHint}</p> : null}
      {!collected ? <p>{POS_CONTENT.invoiceOutput.empty}</p> : null}
      <div className="pos-copy-actions">
        <button
          type="button"
          disabled={!collected || disabled}
          onClick={() => void dispatch(printInvoice())}
        >
          {POS_CONTENT.copy.print}
        </button>
        {collected && !walkIn && customer ? (
          <button type="button" disabled={disabled} onClick={() => void dispatch(emailCopy())}>
            {POS_CONTENT.copy.send}
          </button>
        ) : null}
        {collected ? (
          <button
            type="button"
            className="pos-new-sale"
            disabled={busy}
            onClick={() => dispatch(newSale())}
          >
            {POS_CONTENT.copy.newSale}
          </button>
        ) : null}
      </div>
    </section>
  );
}
