import { createContext, useContext } from 'react';
import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { textColors, useTypography, type TextTone, type TypographyToken } from '@/theme';

export interface TextProps extends Omit<RNTextProps, 'style'> {
  /** Type-scale token. */
  variant?: TypographyToken;
  /** Semantic colour. */
  tone?: TextTone;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
}

/**
 * `true` when the text node is nested inside another `<Text>`.
 *
 * React Native nested text inherits the parent's font metrics, so a nested
 * node must not re-apply a type token — otherwise the size would be applied
 * twice. The nested node only overrides the colour.
 */
const NestedTextContext = createContext(false);

/**
 * The only text primitive in the app.
 *
 * `allowFontScaling={false}` is deliberate: React Native applies the OS
 * font-size setting natively, and on Android handsets whose system scale sits
 * below 1.0 that silently shrinks every label and wrecks the measured
 * layouts. The app owns its scale instead — see `fontScalePolicy` in
 * `@/theme` and the in-app control in `@/preferences`.
 */
export function Text({
  variant = 'body',
  tone = 'primary',
  align,
  style,
  children,
  ...rest
}: TextProps) {
  const { typography } = useTypography();
  const isNested = useContext(NestedTextContext);

  return (
    <NestedTextContext.Provider value>
      <RNText
        allowFontScaling={false}
        style={[
          isNested ? null : typography[variant],
          { color: textColors[tone] },
          align ? { textAlign: align } : null,
          style,
        ]}
        {...rest}
      >
        {children}
      </RNText>
    </NestedTextContext.Provider>
  );
}
