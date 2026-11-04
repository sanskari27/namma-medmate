import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Whether the soft keyboard is currently on screen.
 *
 * Screens use this to move a primary action into view when the keyboard
 * would otherwise cover it — the CTA sits below the fold on a 390×844 screen
 * once the keyboard takes ~40% of the height.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
