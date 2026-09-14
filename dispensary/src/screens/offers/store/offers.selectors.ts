import type { RootState } from '@/store';

export const selectOffers = (state: RootState) => state.offers;
export const selectOffersStatus = (state: RootState) => state.offers.status;
export const selectOffersStatusHint = (state: RootState) => state.offers.statusHint;
export const selectOffersItems = (state: RootState) => state.offers.items;
export const selectOffersProducts = (state: RootState) => state.offers.products;
export const selectOfferFormOpen = (state: RootState) => state.offers.formOpen;
export const selectOfferFormBusy = (state: RootState) => state.offers.formBusy;
export const selectOfferForm = (state: RootState) => state.offers.form;
export const selectOfferEditingId = (state: RootState) => state.offers.editingId;
export const selectOfferTogglingId = (state: RootState) => state.offers.togglingId;

export const selectEditingOffer = (state: RootState) => {
  const id = state.offers.editingId;
  if (!id) return null;
  return state.offers.items.find((row) => row.id === id) ?? null;
};
