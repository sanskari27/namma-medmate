import { Reveal } from '@atoms';
import { Receipt } from 'lucide-react';

interface PosHeaderProps {
  titleId: string;
  invoiceNumber?: string | null;
}

export function PosHeader({ titleId, invoiceNumber }: PosHeaderProps) {
  return (
    <Reveal className="space-y-1">
      <div className="flex items-center gap-2 text-brand">
        <Receipt className="size-5" aria-hidden />
        <p className="text-xs font-medium text-muted">Counter sales</p>
      </div>
      <h1 id={titleId} className="font-sans text-xl font-semibold text-ink">
        Till bill
      </h1>
      <p className="max-w-2xl text-sm text-muted">
        {invoiceNumber
          ? `Draft ${invoiceNumber} is open on this till. Add lines, then save again.`
          : 'Ask for the patient, skip for walk-in, pick batch and price, then save a numbered draft.'}
      </p>
    </Reveal>
  );
}
