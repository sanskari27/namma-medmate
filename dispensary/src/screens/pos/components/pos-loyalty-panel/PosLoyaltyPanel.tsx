import { Input, Label } from '@atoms';
import { Coins } from 'lucide-react';
import { collectiblePaise, maxRedeemPoints, redeemPaise } from '@/services/loyalty';
import { formatPaise } from '../../PosScreen.utils';

export type PosLoyaltyPanelProps = {
  visible: boolean;
  loading: boolean;
  loadFailed: boolean;
  balancePoints: number;
  redeemPoints: string;
  totalPaise: number;
  collected: boolean;
  disabled: boolean;
  busy: boolean;
  onChange: (value: string) => void;
};

export function PosLoyaltyPanel({
  visible,
  loading,
  loadFailed,
  balancePoints,
  redeemPoints,
  totalPaise,
  collected,
  disabled,
  busy,
  onChange,
}: PosLoyaltyPanelProps) {
  if (!visible) {
    return null;
  }

  const freeze = collected || busy || disabled;
  const cap = Math.min(balancePoints, maxRedeemPoints(totalPaise));
  const typed = Number(redeemPoints.trim() || '0');
  const previewPaise = Number.isFinite(typed) ? redeemPaise(Math.max(0, typed)) : 0;
  const dueAfter = collectiblePaise(totalPaise, Number.isFinite(typed) ? typed : 0);

  return (
    <section className="space-y-3 rounded border border-line bg-surface p-3" aria-label="Points">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Coins className="size-3.5 shrink-0 text-brand" aria-hidden />
          <h2 className="text-sm font-semibold text-ink">Points</h2>
        </div>
        <p className="font-mono text-xs tabular-nums text-muted">
          {loading ? '…' : `${balancePoints} pts`}
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted">Loading points…</p>
      ) : loadFailed ? (
        <p className="text-sm text-danger" role="alert">
          Could not load points for this patient. Collect without redeem, or retry after the till
          reconnects.
        </p>
      ) : balancePoints <= 0 ? (
        <p className="text-sm text-muted">No points on this patient yet.</p>
      ) : (
        <>
          <p className="text-sm text-muted">
            Use up to {cap} pts on this bill (20% cap). 1 point takes ₹1 off what they pay.
          </p>
          <div className="space-y-1">
            <Label htmlFor="pos-use-points">Use points</Label>
            <Input
              id="pos-use-points"
              inputMode="numeric"
              value={redeemPoints}
              onChange={(event) => onChange(event.target.value)}
              disabled={freeze}
            />
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Points off</dt>
            <dd className="font-mono tabular-nums text-ink">{formatPaise(previewPaise)}</dd>
            <dt className="text-muted">Still to collect</dt>
            <dd className="font-mono tabular-nums text-brand">{formatPaise(dueAfter)}</dd>
          </dl>
        </>
      )}
    </section>
  );
}
