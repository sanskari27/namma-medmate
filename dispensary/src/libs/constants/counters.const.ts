export const COUNTERS = [
  { id: 'main', name: 'Main counter', code: 'CTR-01' },
  { id: 'annex', name: 'Annex window', code: 'CTR-02' },
] as const;

export type CounterId = (typeof COUNTERS)[number]['id'];

export const COUNTER_STORAGE_KEY = 'dispensary.counterId';
export const PHARMACY_NAME = 'This pharmacy';
