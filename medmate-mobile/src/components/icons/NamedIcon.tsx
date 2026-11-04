import {
  CheckCircleIcon,
  ClockIcon,
  FileUploadIcon,
  FlaskIcon,
  GridIcon,
  InfoIcon,
  PackageIcon,
  PercentIcon,
  PillIcon,
  SearchIcon,
  SlidersIcon,
  StoreIcon,
  WalletIcon,
} from './discover';
import type { IconProps } from './Icon';

/**
 * Render an icon by name.
 *
 * The catalogue sends icon *names* over the wire, so the UI needs a
 * name → artwork lookup. It is a switch rather than a lookup table on purpose:
 * resolving a component from a map at render time creates a new component
 * identity on every render, which resets its state.
 */
export interface NamedIconProps extends IconProps {
  /** Key from the icon registry. */
  name: string;
}

export function NamedIcon({ name, size = 18, color, ...rest }: NamedIconProps) {
  switch (name) {
    case 'upload':
      return <FileUploadIcon size={size} color={color} {...rest} />;
    case 'pill':
      return <PillIcon size={size} color={color} {...rest} />;
    case 'percent':
      return <PercentIcon size={size} color={color} {...rest} />;
    case 'flask':
      return <FlaskIcon size={size} color={color} {...rest} />;
    case 'package':
      return <PackageIcon size={size} color={color} {...rest} />;
    case 'store':
      return <StoreIcon size={size} color={color} {...rest} />;
    case 'clock':
      return <ClockIcon size={size} color={color} {...rest} />;
    case 'info':
      return <InfoIcon size={size} color={color} {...rest} />;
    case 'search':
      return <SearchIcon size={size} color={color} {...rest} />;
    case 'sliders':
      return <SlidersIcon size={size} color={color} {...rest} />;
    case 'grid':
      return <GridIcon size={size} color={color} {...rest} />;
    case 'wallet':
      return <WalletIcon size={size} color={color} {...rest} />;
    case 'checkCircle':
      return <CheckCircleIcon size={size} color={color} {...rest} />;
    default:
      return null;
  }
}
