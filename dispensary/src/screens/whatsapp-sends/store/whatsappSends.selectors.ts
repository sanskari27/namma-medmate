import type { RootState } from '@/store';

export const selectWhatsappSendsStatus = (state: RootState) => state.whatsappSends.status;
export const selectWhatsappSendsHint = (state: RootState) => state.whatsappSends.statusHint;
export const selectWhatsappSendsItems = (state: RootState) => state.whatsappSends.items;
export const selectWhatsappSendsQueued = (state: RootState) => state.whatsappSends.queued;
export const selectWhatsappSendsSent = (state: RootState) => state.whatsappSends.sent;
export const selectWhatsappSendsFailed = (state: RootState) => state.whatsappSends.failed;
export const selectWhatsappSendsKind = (state: RootState) => state.whatsappSends.kind;
export const selectWhatsappSendsBusy = (state: RootState) => state.whatsappSends.busy;
export const selectWhatsappSendsSelected = (state: RootState) =>
  state.whatsappSends.items.find((row) => row.id === state.whatsappSends.selectedId) ?? null;
