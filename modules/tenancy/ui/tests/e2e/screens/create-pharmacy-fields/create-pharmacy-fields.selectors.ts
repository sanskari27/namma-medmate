export const createPharmacySelectors = {
  heading: { role: 'heading' as const, name: 'Create pharmacy' },
  shopName: { role: 'textbox' as const, name: 'Shop name' },
  save: { role: 'button' as const, name: 'Save' },
} as const;
