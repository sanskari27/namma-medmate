import type { ComponentProps } from 'react';
import { cn } from '@/libs/cn';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-sm border border-line bg-canvas px-3 text-sm text-ink placeholder:text-muted',
        className,
      )}
      {...props}
    />
  );
}
