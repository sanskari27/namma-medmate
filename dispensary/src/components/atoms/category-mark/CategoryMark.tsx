export type CategoryMarkProps = {
  icon?: string | null;
  fallback?: string;
  className?: string;
  size?: 'sm' | 'md';
};

/** Renders a category emoji/mark for medicine cards and category rows. */
export function CategoryMark({
  icon,
  fallback = '💊',
  className = '',
  size = 'md',
}: CategoryMarkProps) {
  const mark = icon?.trim() || fallback;
  const box =
    size === 'sm'
      ? 'inline-grid size-7 place-items-center rounded-lg text-sm'
      : 'inline-grid size-9 place-items-center rounded-[10px] text-base';
  return (
    <span className={`${box} shrink-0 bg-brand-soft ${className}`} aria-hidden="true">
      {mark}
    </span>
  );
}
