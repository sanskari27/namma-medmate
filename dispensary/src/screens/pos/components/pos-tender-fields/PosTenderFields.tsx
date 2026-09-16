import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { POS_CONTENT } from '../../PosScreen.content';
import { formatPaise } from '../../PosScreen.utils';
import { tenderPatched } from '../../store/pos.slice';
import {
  selectPosBusy,
  selectPosCollected,
  selectPosSelectedCustomer,
  selectPosTender,
  selectPosTenderPreview,
  selectPosWalkIn,
} from '../../store/pos.selectors';

type PosTenderFieldsProps = {
  offline: boolean;
};

export function PosTenderFields({ offline }: PosTenderFieldsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const tender = useSelector(selectPosTender);
  const preview = useSelector(selectPosTenderPreview);
  const busy = useSelector(selectPosBusy);
  const collected = useSelector(selectPosCollected);
  const walkIn = useSelector(selectPosWalkIn);
  const customer = useSelector(selectPosSelectedCustomer);
  const disabled = busy || collected || offline;
  const khataBlocked = walkIn || !customer;

  return (
    <div className="pos-tender">
      {preview.parts.length === 0 ? <p>{POS_CONTENT.tender.empty}</p> : null}
      <label>
        {POS_CONTENT.tender.cash}
        <input
          value={tender.cashRupees}
          disabled={disabled}
          inputMode="decimal"
          aria-label={POS_CONTENT.tender.cash}
          onChange={(event) => dispatch(tenderPatched({ cashRupees: event.target.value }))}
        />
      </label>
      <label>
        {POS_CONTENT.tender.upi}
        <input
          value={tender.upiRupees}
          disabled={disabled}
          inputMode="decimal"
          aria-label={POS_CONTENT.tender.upi}
          onChange={(event) => dispatch(tenderPatched({ upiRupees: event.target.value }))}
        />
      </label>
      <label>
        {POS_CONTENT.tender.upiReference}
        <input
          value={tender.upiReference}
          disabled={disabled}
          autoComplete="off"
          aria-label={POS_CONTENT.tender.upiReference}
          onChange={(event) => dispatch(tenderPatched({ upiReference: event.target.value }))}
        />
      </label>
      <label>
        {POS_CONTENT.tender.card}
        <input
          value={tender.cardRupees}
          disabled={disabled}
          inputMode="decimal"
          aria-label={POS_CONTENT.tender.card}
          onChange={(event) => dispatch(tenderPatched({ cardRupees: event.target.value }))}
        />
      </label>
      <label>
        {POS_CONTENT.tender.cardReference}
        <input
          value={tender.cardReference}
          disabled={disabled}
          autoComplete="off"
          aria-label={POS_CONTENT.tender.cardReference}
          onChange={(event) => dispatch(tenderPatched({ cardReference: event.target.value }))}
        />
      </label>
      <label>
        {POS_CONTENT.tender.bank}
        <input
          value={tender.bankRupees}
          disabled={disabled}
          inputMode="decimal"
          aria-label={POS_CONTENT.tender.bank}
          onChange={(event) => dispatch(tenderPatched({ bankRupees: event.target.value }))}
        />
      </label>
      <label>
        {POS_CONTENT.tender.bankReference}
        <input
          value={tender.bankReference}
          disabled={disabled}
          autoComplete="off"
          aria-label={POS_CONTENT.tender.bankReference}
          onChange={(event) => dispatch(tenderPatched({ bankReference: event.target.value }))}
        />
      </label>
      <label>
        {POS_CONTENT.tender.credit}
        <input
          value={tender.creditRupees}
          disabled={disabled || khataBlocked}
          inputMode="decimal"
          aria-label={POS_CONTENT.tender.credit}
          onChange={(event) => dispatch(tenderPatched({ creditRupees: event.target.value }))}
        />
      </label>
      {preview.changePaise > 0 ? (
        <p>
          {POS_CONTENT.tender.change} {formatPaise(preview.changePaise)}
        </p>
      ) : null}
      {preview.remainingPaise > 0 || preview.duePaise > 0 ? (
        <p>
          {POS_CONTENT.tender.due}{' '}
          {formatPaise(preview.remainingPaise > 0 ? preview.remainingPaise : preview.duePaise)}
        </p>
      ) : null}
    </div>
  );
}
