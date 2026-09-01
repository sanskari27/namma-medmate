import type { HTMLAttributes } from 'react';
import { cn } from '@/libs/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border border-line border-l-4 border-l-brand bg-surface p-4', className)}
      {...props}
    />
  );
}
