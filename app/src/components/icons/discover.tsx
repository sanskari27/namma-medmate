import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

import type { IconProps } from './Icon';

/**
 * Icons used by the Discover feature.
 *
 * Paths follow the MVP's inline SVGs: 24 × 24 viewBox, 1.8 stroke, round caps.
 */

export function SearchIcon({
  size = 20,
  color = colors.ink,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M20 20l-3.5-3.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BellIcon({
  size = 18,
  color = colors.white,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.7 21a2 2 0 0 1-3.4 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function WalletIcon({
  size = 16,
  color = colors.gold,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 7H5a2 2 0 0 1 0-4h13v4z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 11v-4h-5a2 2 0 0 0 0 4h5z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UserIcon({
  size = 18,
  color = colors.forest,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function FileUploadIcon({
  size = 16,
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
        d="M12 18v-6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.5 14.5L12 12l2.5 2.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PillIcon({
  size = 22,
  color = colors.green700,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.5 20.5a5 5 0 0 1-7-7l10-10a5 5 0 0 1 7 7l-10 10z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 8.5l7 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PercentIcon({
  size = 22,
  color = colors.green700,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 5L5 19"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Circle cx="6.5" cy="6.5" r="2.5" stroke={color} strokeWidth={strokeWidth} />
      <Circle cx="17.5" cy="17.5" r="2.5" stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function ChevronDownIcon({
  size = 14,
  color = colors.mint200,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ClockIcon({
  size = 16,
  color = colors.muted,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M12 7v5l3 2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShareIcon({
  size = 20,
  color = colors.ink,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 6l-4-4-4 4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 2v14"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BagIcon({
  size = 20,
  color = colors.ink,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h16l-1.2 13.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 7z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 10V6a3.5 3.5 0 0 1 7 0v4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SlidersIcon({
  size = 18,
  color = colors.ink,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M1 14h6M9 8h6M17 16h6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StoreIcon({
  size = 18,
  color = colors.green700,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9l1.5-5h15L21 9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PackageIcon({
  size = 16,
  color = colors.green700,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 8l-9-5-9 5v8l9 5 9-5V8z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 8l9 5 9-5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 13v8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function InfoIcon({
  size = 20,
  color = colors.green700,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M12 16v-5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="8" r="1" fill={color} />
    </Svg>
  );
}

export function CheckCircleIcon({
  size = 12,
  color = colors.ink2,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.1V12a10 10 0 1 1-5.9-9.1"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 4L12 14.01l-3-3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FlaskIcon({
  size = 18,
  color = colors.green700,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 2v6.5L3.5 18A2 2 0 0 0 5.2 21h13.6a2 2 0 0 0 1.7-3L15 8.5V2"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8 2h8" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path
        d="M7.5 14h9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StarFillIcon({ size = 12, color = colors.gold, style }: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={color}
      />
    </Svg>
  );
}

export function GridIcon({
  size = 16,
  color = colors.green700,
  strokeWidth = 1.8,
  style,
}: IconProps) {
  return (
    <Svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}
