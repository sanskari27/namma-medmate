export const masterCatalogueDrawerSelectors = {
  composition: { role: 'heading' as const, name: 'Paracetamol 500mg' },
  ceilingHelp: { text: 'Pharmacies cannot sell above this ceiling.' },
  ban: { role: 'button' as const, name: 'Ban' },
  confirm: { text: 'Banning un-maps this medicine at every pharmacy.' },
  emptyStocking: { text: 'No pharmacies currently map this medicine.' },
  shop: { role: 'cell' as const, name: 'Sri Krishna Medicals' },
} as const;
