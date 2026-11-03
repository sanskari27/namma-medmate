import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { clampUserFontScale } from '@/theme';

/**
 * In-app text size.
 *
 * Android's system font-size setting is app-scoped in practice: Zepto's own
 * text-size control cannot change MedMate, and vice versa. So MedMate ships
 * its own control, stored locally and applied on top of the (clamped) OS
 * setting. See `fontScalePolicy` in `@/theme` for the full rationale.
 */

export type TextSizeKey = 'small' | 'default' | 'large' | 'xlarge';

export interface TextSizeOption {
  key: TextSizeKey;
  label: string;
  /** Multiplier applied to the base type scale. */
  scale: number;
}

export const TEXT_SIZE_OPTIONS: readonly TextSizeOption[] = [
  { key: 'small', label: 'Small', scale: 0.9 },
  { key: 'default', label: 'Default', scale: 1 },
  { key: 'large', label: 'Large', scale: 1.1 },
  { key: 'xlarge', label: 'Extra large', scale: 1.25 },
];

const STORAGE_KEY = 'medmate.preferences.text-size';

interface TextSizeState {
  /** The selected option key. */
  size: TextSizeKey;
  /** The resolved multiplier for the selected option. */
  scale: number;
  /** True once the persisted value has been read from storage. */
  hydrated: boolean;
  setSize: (size: TextSizeKey) => void;
}

function optionFor(size: TextSizeKey): TextSizeOption {
  return TEXT_SIZE_OPTIONS.find((option) => option.key === size) ?? TEXT_SIZE_OPTIONS[1]!;
}

export const useTextSizeStore = create<TextSizeState>()(
  persist(
    (set) => ({
      size: 'default',
      scale: 1,
      hydrated: false,

      setSize(size) {
        const option = optionFor(size);
        set({ size, scale: clampUserFontScale(option.scale) });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Only the choice is persisted; the multiplier is derived on read.
      partialize: (state) => ({ size: state.size }),
      merge: (persisted, current) => {
        const stored = (persisted as Partial<TextSizeState> | undefined)?.size;
        const option = optionFor(stored ?? 'default');
        return {
          ...current,
          size: option.key,
          scale: clampUserFontScale(option.scale),
        };
      },
      onRehydrateStorage: () => () => {
        useTextSizeStore.setState({ hydrated: true });
      },
    },
  ),
);

/** The current text size key, safe to read outside React. */
export function getTextSize(): TextSizeKey {
  return useTextSizeStore.getState().size;
}
