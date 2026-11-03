import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

import type { IconProps } from './Icon';

export function ChevronRightIcon({
  size = 16,
  color = colors.muted,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronLeftIcon({
  size = 20,
  color = colors.white,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MapPinIcon({
  size = 22,
  color = colors.gold,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function HomeIcon({
  size = 20,
  color = colors.green700,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 22V12h6v10"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function EditIcon({
  size = 18,
  color = colors.muted,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20h9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlusIcon({
  size = 18,
  color = colors.green,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
