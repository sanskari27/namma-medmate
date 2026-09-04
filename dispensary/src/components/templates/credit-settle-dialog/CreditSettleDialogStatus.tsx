import { AlertCircle, BadgeCheck, Wallet } from 'lucide-react';
import type { DialogStatus } from './creditSettleDialog.types';

export type CreditSettleDialogStatusProps = {
  status: DialogStatus;
  statusId: string;
};

export function CreditSettleDialogStatus({ status, statusId }: CreditSettleDialogStatusProps) {
  if (!status) {
    return <div id={statusId} className="min-h-10" aria-live="polite" />;
  }

  const alert = status === 'denied' || status === 'conflict' || status === 'failure';
  const copy = (() => {
    switch (status) {
      case 'loading':
        return { icon: Wallet, text: 'Recording settlement on this khata…' };
      case 'empty':
        return { icon: Wallet, text: 'Nothing due on this khata yet.' };
      case 'validation':
        return {
          icon: AlertCircle,
          text: 'Enter a payoff amount in rupees and pick how they paid.',
        };
      case 'denied':
        return {
          icon: AlertCircle,
          text: 'This till cannot settle khata. Ask the owner for CRM access.',
        };
      case 'conflict':
        return {
          icon: AlertCircle,
          text: 'Khata balance changed on another till. Close and open settle again.',
        };
      case 'failure':
        return {
          icon: AlertCircle,
          text: 'Could not record this settlement. Try again from the counter.',
        };
      case 'success':
        return { icon: BadgeCheck, text: 'Settlement posted. Balance updated.' };
      default:
        return null;
    }
  })();

  if (!copy) {
    return <div id={statusId} className="min-h-10" aria-live="polite" />;
  }

  const Icon = copy.icon;
  return (
    <div
      id={statusId}
      role={alert ? 'alert' : 'status'}
      className="flex min-h-10 items-start gap-2 border border-line bg-brand-soft/40 px-3 py-2 text-sm text-ink"
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
      <p>{copy.text}</p>
    </div>
  );
}
