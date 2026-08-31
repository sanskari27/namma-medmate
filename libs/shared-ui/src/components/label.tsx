import type { ComponentProps } from 'react';
import { cn } from '../lib/utils.ts';

export type LabelProps = ComponentProps<'label'>;

function Label({ className, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn('text-sm font-medium text-foreground', className)}
      {...props}
    />
  );
}

export { Label };
