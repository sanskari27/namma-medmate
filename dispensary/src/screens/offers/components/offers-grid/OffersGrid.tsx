import { useSelector } from 'react-redux';
import { OFFERS_CONTENT } from '../../OffersScreen.content';
import { selectOffersItems } from '../../store/offers.selectors';
import { OffersCard } from '../offers-card';

export function OffersGrid() {
  const items = useSelector(selectOffersItems);

  if (items.length === 0) {
    return (
      <div className="off-empty" role="status">
        <strong>{OFFERS_CONTENT.emptyTitle}</strong>
        {OFFERS_CONTENT.emptyBody}
      </div>
    );
  }

  return (
    <div className="off-grid" aria-label={OFFERS_CONTENT.sectionTitle}>
      {items.map((offer) => (
        <OffersCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}
