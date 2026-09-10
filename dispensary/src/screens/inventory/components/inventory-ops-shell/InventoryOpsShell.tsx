import { Button } from '@atoms';
import type { ComponentProps, ReactNode, Ref } from 'react';

export type InventoryOpsShellProps = {
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Shared chrome for inventory workspaces other than Stock. */
export function InventoryOpsShell({
  title,
  subtitle,
  action,
  children,
  className = '',
}: InventoryOpsShellProps) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-4 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export type InventoryOpsCardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
};

export function InventoryOpsCard({
  title,
  children,
  className = '',
  headerAction,
}: InventoryOpsCardProps) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-line/70 bg-surface ${className}`}
    >
      {title ? (
        <header className="flex items-center justify-between gap-2 border-b border-line/70 bg-brand-soft/50 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {headerAction}
        </header>
      ) : null}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

type PrimaryProps = ComponentProps<typeof Button> & { ref?: Ref<HTMLButtonElement> };

export function InventoryPrimaryAction({ className, ...props }: PrimaryProps) {
  return <Button type="button" className={`rounded-lg ${className ?? ''}`} {...props} />;
}
