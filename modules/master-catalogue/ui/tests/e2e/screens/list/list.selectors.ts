export const masterCatalogueListSelectors = {
  title: { role: 'heading' as const, name: 'Master catalogue' },
  name: { role: 'columnheader' as const, name: 'Name' },
  medicine: { role: 'cell' as const, name: 'Paracetamol 500mg' },
  add: { role: 'button' as const, name: 'Add medicine' },
  empty: { text: 'No medicines match these filters.' },
  error: { role: 'alert' as const },
} as const;
