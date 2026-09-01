export const addMedicineModalSelectors = {
  title: { role: 'heading' as const, name: 'Add medicine' },
  name: { label: 'Name' },
  ceilingHelp: { text: 'Pharmacies cannot sell above this ceiling.' },
  save: { role: 'button' as const, name: 'Save' },
} as const;
