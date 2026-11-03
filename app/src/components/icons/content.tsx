import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme';

import type { IconProps } from './Icon';

export function MessageSquareIcon({
  size = 36,
  color = colors.gold,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FileTextIcon({
  size = 18,
  color = colors.green700,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 2v6h6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 15l2 2 4-4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
