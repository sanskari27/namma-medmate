import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

import type { IconProps } from './Icon';

export function BoltIcon({ size = 18, color = colors.gold, style }: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} />
    </Svg>
  );
}

export function StarIcon({
  size = 18,
  color = colors.green700,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
