import { create } from 'zustand';

import { locationService } from '@/services';
import type { Address, Pharmacy } from '@/types';

interface LocationState {
  addresses: Address[];
  pharmacies: Pharmacy[];
  selectedAddressId: string | null;
  loading: boolean;
  error: string | null;

  load: () => Promise<void>;
  selectAddress: (addressId: string) => void;
  detect: () => Promise<boolean>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  addresses: [],
  pharmacies: [],
  selectedAddressId: null,
  loading: false,
  error: null,

  async load() {
    set({ loading: true, error: null });

    const [addresses, pharmacies] = await Promise.all([
      locationService.fetchAddresses(),
      locationService.fetchPharmacies(),
    ]);

    const failure = !addresses.ok
      ? addresses.error
      : !pharmacies.ok
        ? pharmacies.error
        : null;

    if (!addresses.ok || !pharmacies.ok) {
      set({ loading: false, error: failure?.message ?? 'Could not load locations.' });
      return;
    }

    set({
      loading: false,
      addresses: addresses.data,
      pharmacies: pharmacies.data,
      selectedAddressId:
        get().selectedAddressId ??
        addresses.data.find((address) => address.isDefault)?.id ??
        addresses.data[0]?.id ??
        null,
    });
  },

  selectAddress(addressId) {
    set({ selectedAddressId: addressId });
  },

  async detect() {
    const result = await locationService.detectLocation();
    if (!result.ok) {
      set({ error: result.error.message });
      return false;
    }

    set({
      addresses: [result.data.address, ...get().addresses],
      selectedAddressId: result.data.address.id,
      error: null,
    });
    return true;
  },
}));
