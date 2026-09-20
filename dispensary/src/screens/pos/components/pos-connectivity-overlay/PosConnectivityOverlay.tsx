import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Label } from '@atoms';
import { ALL_OUTLETS_LABEL } from '@/libs/constants/counters.const';
import { switchSessionBranch } from '@/services/sessionBranch';
import { branchSwitched, type RootState } from '@/store';
import { POS_CONTENT } from '../../PosScreen.content';

const ALL_OUTLETS_ID = 'all';

interface PosConnectivityOverlayProps {
  open: boolean;
}

export function PosConnectivityOverlay({ open }: PosConnectivityOverlayProps) {
  const dispatch = useDispatch();
  const dialogRef = useRef<HTMLDivElement>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const branches = user?.branches ?? [];
  const isOwner = user?.role === 'pharmacy_owner';
  const activeBranchId = user?.activeBranchId ?? null;
  const selectedId =
    activeBranchId ?? (isOwner ? ALL_OUTLETS_ID : (branches[0]?.id ?? ALL_OUTLETS_ID));
  const [switchBusy, setSwitchBusy] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const showOutletSwitch = branches.length > 1 || (isOwner && branches.length > 0);

  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
      setSwitchError(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const selectOutlet = (id: string) => {
    if (switchBusy) return;
    const nextBranchId = id === ALL_OUTLETS_ID ? null : id;
    if ((activeBranchId ?? null) === nextBranchId) return;
    setSwitchBusy(true);
    setSwitchError(null);
    void switchSessionBranch(nextBranchId)
      .then((result) => {
        dispatch(
          branchSwitched({
            activeBranchId: result.activeBranchId,
            branches: result.branches,
          }),
        );
      })
      .catch(() => {
        setSwitchError(POS_CONTENT.offlineOutletError);
      })
      .finally(() => {
        setSwitchBusy(false);
      });
  };

  return (
    <div
      ref={dialogRef}
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="pos-offline-title"
      aria-describedby="pos-offline-copy"
      tabIndex={-1}
      className="absolute inset-0 z-10 flex items-center justify-center bg-ink/80 p-6"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div className="max-w-md space-y-3 border border-line bg-surface p-6 text-ink">
        <h2 id="pos-offline-title" className="text-lg font-semibold">
          {POS_CONTENT.offlineTitle}
        </h2>
        <p id="pos-offline-copy" className="text-sm text-muted">
          {POS_CONTENT.offlineBody}
        </p>
        {showOutletSwitch ? (
          <div className="grid gap-1.5 pt-1">
            <Label htmlFor="pos-offline-outlet">{POS_CONTENT.offlineOutletLabel}</Label>
            <select
              id="pos-offline-outlet"
              className="h-10 w-full rounded-md border border-line bg-canvas px-3 text-sm text-ink"
              value={selectedId}
              disabled={switchBusy}
              onChange={(event) => selectOutlet(event.target.value)}
            >
              {isOwner ? <option value={ALL_OUTLETS_ID}>{ALL_OUTLETS_LABEL}</option> : null}
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            {switchError ? (
              <p role="alert" className="text-xs text-danger">
                {switchError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
