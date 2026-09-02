import type { HTMLAttributes } from 'react';
import { cn } from '@/libs/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border border-line bg-elevated p-4 shadow-[inset_0_1px_0_0_var(--color-brand)]',
        className,
      )}
      {...props}
    />
  );
}
