import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

import type { IconProps } from './Icon';

export function ShieldCheckIcon({
  size = 18,
  color = colors.gold,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 12l2 2 4-4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StethoscopeIcon({
  size = 18,
  color = colors.gold,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="20" cy="10" r="2" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}
