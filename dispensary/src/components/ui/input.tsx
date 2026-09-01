import type { ComponentProps } from 'react';
import { cn } from '@/libs/cn';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/80',
        className,
      )}
      {...props}
    />
  );
}
