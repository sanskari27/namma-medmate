import { Plus } from 'lucide-react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import { OFFERS_CONTENT } from '../../OffersScreen.content';
import { openCreateOffer } from '../../store/offers.slice';

export function OffersToolbar() {
  const dispatch = useDispatch<AppDispatch>();

  return (
    <div className="off-toolbar">
      <h2>{OFFERS_CONTENT.sectionTitle}</h2>
      <div className="off-spacer" />
      <button
        type="button"
        className="off-btn off-btn-primary"
        onClick={() => dispatch(openCreateOffer())}
      >
        <Plus size={16} aria-hidden />
        {OFFERS_CONTENT.createOffer}
      </button>
    </div>
  );
}
