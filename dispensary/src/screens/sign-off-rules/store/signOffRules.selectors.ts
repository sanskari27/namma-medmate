import type { RootState } from '@/store';

export const selectSignOffStatus = (state: RootState) => state.signOffRules.status;
export const selectSignOffBanner = (state: RootState) => state.signOffRules.banner;
export const selectSignOffFormError = (state: RootState) => state.signOffRules.formError;
export const selectSignOffRules = (state: RootState) => state.signOffRules.rules;
export const selectSignOffActions = (state: RootState) => state.signOffRules.actions;
export const selectSignOffActionKey = (state: RootState) => state.signOffRules.actionKey;
export const selectSignOffThreshold = (state: RootState) => state.signOffRules.threshold;
export const selectSignOffSelectedAction = (state: RootState) =>
  state.signOffRules.actions.find((row) => row.actionKey === state.signOffRules.actionKey) ??
  state.signOffRules.actions[0];
