import { Reveal } from '@atoms';
import { ShieldAlert } from 'lucide-react';

interface PosHeaderProps {
  titleId: string;
}

export function PosHeader({ titleId }: PosHeaderProps) {
  return (
    <Reveal className="space-y-1">
      <div className="flex items-center gap-2 text-brand">
        <ShieldAlert className="size-5" aria-hidden />
        <p className="text-xs font-medium text-muted">Counter sales</p>
      </div>
      <h1 id={titleId} className="font-sans text-xl font-semibold text-ink">
        Draft safety check
      </h1>
      <p className="max-w-2xl text-sm text-muted">
        Link a customer, add draft medicines, and review allergy or duplicate-composition warnings
        before completing. Invoice posting ships with full billing later.
      </p>
    </Reveal>
  );
}
