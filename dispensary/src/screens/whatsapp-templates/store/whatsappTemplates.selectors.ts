import type { RootState } from '@/store';

export const selectWhatsappTemplatesStatus = (state: RootState) => state.whatsappTemplates.status;
export const selectWhatsappTemplatesHint = (state: RootState) => state.whatsappTemplates.statusHint;
export const selectWhatsappTemplates = (state: RootState) => state.whatsappTemplates.templates;
export const selectWhatsappProvider = (state: RootState) => state.whatsappTemplates.provider;
export const selectWhatsappSelectedName = (state: RootState) => state.whatsappTemplates.selectedName;
export const selectWhatsappValues = (state: RootState) => state.whatsappTemplates.values;
export const selectWhatsappBusy = (state: RootState) => state.whatsappTemplates.busy;

export const selectWhatsappSelected = (state: RootState) =>
  state.whatsappTemplates.templates.find((row) => row.uniqueName === state.whatsappTemplates.selectedName) ??
  null;

export const selectWhatsappPreview = (state: RootState) => {
  const selected = selectWhatsappSelected(state);
  if (!selected) {
    return '';
  }
  let rendered = selected.body;
  for (const [key, value] of Object.entries(state.whatsappTemplates.values)) {
    if (!value.trim()) {
      continue;
    }
    rendered = rendered.split(`{{${key}}}`).join(value);
  }
  return rendered;
};
