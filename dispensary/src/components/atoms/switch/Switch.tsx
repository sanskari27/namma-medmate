import { cn } from '@/libs/cn';
import type { ComponentProps } from 'react';

export type SwitchProps = Omit<ComponentProps<'button'>, 'onChange'> & {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
};

export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
  disabled,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors',
        checked ? 'border-brand bg-brand' : 'border-line bg-line/40',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-0.5 size-4 rounded-full bg-surface shadow transition-transform',
          checked ? 'left-4' : 'left-0.5',
        )}
      />
    </button>
  );
}
