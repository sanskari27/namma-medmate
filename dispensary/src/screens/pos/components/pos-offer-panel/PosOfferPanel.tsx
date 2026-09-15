import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { POS_CONTENT } from '../../PosScreen.content';
import { applyOffers, loadInvoiceOffers } from '../../store/pos.thunks';
import {
  selectPosBusy,
  selectPosCollected,
  selectPosInvoice,
  selectPosOffers,
  selectPosOffersLoading,
} from '../../store/pos.selectors';

export function PosOfferPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const invoice = useSelector(selectPosInvoice);
  const offers = useSelector(selectPosOffers);
  const loading = useSelector(selectPosOffersLoading);
  const busy = useSelector(selectPosBusy);
  const collected = useSelector(selectPosCollected);
  const invoiceId = invoice?.id ?? null;

  useEffect(() => {
    if (!invoiceId) {
      return;
    }
    void dispatch(loadInvoiceOffers(invoiceId));
  }, [dispatch, invoiceId]);

  const explanations = [
    ...offers.map((offer) => offer.explanation),
    ...(invoice?.lines.map((line) => line.offerExplanation) ?? []),
  ].filter((text): text is string => Boolean(text));
  const uniqueExplanations = [...new Set(explanations)];
  const names = [
    ...offers.map((offer) => offer.name),
    ...(invoice?.lines.map((line) => line.offerName) ?? []),
  ].filter((name): name is string => Boolean(name));
  const uniqueNames = [...new Set(names)];

  return (
    <section className="pos-offers" aria-label={POS_CONTENT.offer.panelAria}>
      {loading ? <p>{POS_CONTENT.offer.loading}</p> : null}
      {!loading && invoice && offers.length === 0 && uniqueNames.length === 0 ? (
        <p>{POS_CONTENT.offer.empty}</p>
      ) : null}
      {uniqueNames.map((name) => (
        <h3 key={name}>{name}</h3>
      ))}
      {uniqueExplanations.map((text) => (
        <p key={text}>{text}</p>
      ))}
      <button
        type="button"
        className="pos-offer-apply"
        disabled={busy || collected}
        onClick={() => void dispatch(applyOffers())}
      >
        {POS_CONTENT.offer.apply}
      </button>
    </section>
  );
}
