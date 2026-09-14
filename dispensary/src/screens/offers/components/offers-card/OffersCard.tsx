import { Globe, Tag, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import type { SalesOffer } from '@/services/offers';
import { OFFERS_CONTENT } from '../../OffersScreen.content';
import {
  appliesCopy,
  benefitBadge,
  isOfferRunning,
  runStateLabel,
} from '../../OffersScreen.utils';
import { selectOfferTogglingId } from '../../store/offers.selectors';
import { openEditOffer } from '../../store/offers.slice';
import { removeOffer, toggleOffer } from '../../store/offers.thunks';

export type OffersCardProps = {
  offer: SalesOffer;
};

export function OffersCard({ offer }: OffersCardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const togglingId = useSelector(selectOfferTogglingId);
  const busy = togglingId === offer.id;
  const running = isOfferRunning(offer.status);
  const applies = appliesCopy(offer);

  function onDelete() {
    if (!window.confirm(OFFERS_CONTENT.deleteConfirm(offer.name))) return;
    void dispatch(removeOffer(offer.id));
  }

  return (
    <article className="off-card" data-paused={!running ? 'true' : 'false'}>
      <div className="off-card-pad">
        <div className="off-card-top">
          <div className="off-ico" aria-hidden>
            <Tag size={22} strokeWidth={1.8} />
          </div>
          <button
            type="button"
            className="off-switch"
            data-on={running ? 'true' : 'false'}
            aria-label="Toggle offer"
            aria-pressed={running}
            disabled={busy}
            onClick={() => void dispatch(toggleOffer(offer.id))}
          />
        </div>

        <h3 onClick={() => dispatch(openEditOffer(offer))}>{offer.name}</h3>

        <div className="off-badges">
          <span className="off-pill off-pill-green">{benefitBadge(offer)}</span>
          {offer.couponCode ? <span className="off-tag">{offer.couponCode}</span> : null}
          {offer.onlineVisible ? (
            <span className="off-pill off-pill-blue">
              <Globe size={12} aria-hidden />
              {OFFERS_CONTENT.online}
            </span>
          ) : (
            <span className="off-pill off-pill-gray">{OFFERS_CONTENT.counter}</span>
          )}
        </div>

        <p className="off-muted">
          Applies to <b>{applies.scope}</b>
          {applies.count > 0 ? ` · ${applies.count} items` : null}
        </p>
      </div>

      <div className="off-card-foot">
        <span className={`off-pill ${running ? 'off-pill-green' : 'off-pill-gray'}`}>
          <i className="d" aria-hidden />
          {runStateLabel(offer.status)}
        </span>
        <button
          type="button"
          className="off-iconbtn"
          title="Delete"
          aria-label="Delete"
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2 size={15} strokeWidth={1.8} />
        </button>
      </div>
    </article>
  );
}
