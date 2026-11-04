import { PulseLineIcon } from './brand';
import { BoltIcon, StarIcon } from './commerce';
import { FileTextIcon, MessageSquareIcon } from './content';
import {
  BagIcon,
  BellIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  FileUploadIcon,
  FlaskIcon,
  GridIcon,
  InfoIcon,
  PackageIcon,
  PercentIcon,
  PillIcon,
  SearchIcon,
  ShareIcon,
  SlidersIcon,
  StarFillIcon,
  StoreIcon,
  UserIcon,
  WalletIcon,
} from './discover';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  HomeIcon,
  MapPinIcon,
  PlusIcon,
} from './navigation';
import { ShieldCheckIcon, StethoscopeIcon } from './trust';

export type { IconProps } from './Icon';
export { NamedIcon } from './NamedIcon';
export type { NamedIconProps } from './NamedIcon';

export { PulseLineIcon } from './brand';
export { BoltIcon, StarIcon } from './commerce';
export { MessageSquareIcon, FileTextIcon } from './content';
export {
  ChevronRightIcon,
  ChevronLeftIcon,
  MapPinIcon,
  HomeIcon,
  EditIcon,
  PlusIcon,
} from './navigation';
export { ShieldCheckIcon, StethoscopeIcon } from './trust';
export {
  BagIcon,
  BellIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  FileUploadIcon,
  FlaskIcon,
  GridIcon,
  InfoIcon,
  PackageIcon,
  PercentIcon,
  PillIcon,
  SearchIcon,
  ShareIcon,
  SlidersIcon,
  StarFillIcon,
  StoreIcon,
  UserIcon,
  WalletIcon,
} from './discover';

/**
 * Name → component map.
 *
 * The catalog API returns category tiles as a plain string (`"bolt"`,
 * `"stethoscope"`, …), so the UI needs a stable name→component lookup that
 * does not depend on the wire format staying identical to our file names.
 */
export const ICON_REGISTRY = {
  bolt: BoltIcon,
  stethoscope: StethoscopeIcon,
  shield: ShieldCheckIcon,
  message: MessageSquareIcon,
  file: FileTextIcon,
  star: StarIcon,
  mapPin: MapPinIcon,
  home: HomeIcon,
  edit: EditIcon,
  plus: PlusIcon,
  pulse: PulseLineIcon,
  chevronRight: ChevronRightIcon,
  chevronLeft: ChevronLeftIcon,
  search: SearchIcon,
  bell: BellIcon,
  wallet: WalletIcon,
  user: UserIcon,
  upload: FileUploadIcon,
  pill: PillIcon,
  percent: PercentIcon,
  chevronDown: ChevronDownIcon,
  clock: ClockIcon,
  share: ShareIcon,
  bag: BagIcon,
  sliders: SlidersIcon,
  store: StoreIcon,
  package: PackageIcon,
  info: InfoIcon,
  checkCircle: CheckCircleIcon,
  flask: FlaskIcon,
  grid: GridIcon,
  starFill: StarFillIcon,
} as const;

export type IconName = keyof typeof ICON_REGISTRY;

/** Look up an icon by name; returns `null` for unknown names. */
export function getIcon(name: string): (typeof ICON_REGISTRY)[IconName] | null {
  return ICON_REGISTRY[name as IconName] ?? null;
}
