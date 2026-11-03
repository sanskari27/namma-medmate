import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

import type { IconProps } from './Icon';

/** The gold ECG rule under the splash wordmark. */
export function PulseLineIcon({
  size = 150,
  color = colors.gold,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size * 0.12} viewBox="0 0 150 18" fill="none" style={style}>
      <Path
        d="M2 9h52l5-6 7 12 5-6h77"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
