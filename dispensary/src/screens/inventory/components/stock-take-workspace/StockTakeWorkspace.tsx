import { isApiError } from '@/services/axios';
import {
  cancelStockTake,
  listStockTakes,
  postStockTake,
  saveStockTakeCounts,
  startStockTake,
  type StockTake,
} from '@/services/stockTakes';
import { Button } from '@atoms';
import { Ref, useCallback, useEffect, useState } from 'react';
import { mapApiStatus, type PageStatus } from '../../InventoryScreen.utils';
import { StockTakeCountSheet } from '../stock-take-count-sheet/StockTakeCountSheet';
import { StockTakeHistory } from '../stock-take-history/StockTakeHistory';
import { StockTakeStartDialog } from '../stock-take-start-dialog/StockTakeStartDialog';
import { StockTakeVarianceList } from '../stock-take-variance-list/StockTakeVarianceList';

export type StockTakeWorkspaceProps = {
  allowed: boolean;
  activeBranchId: string | null;
  startOpen: boolean;
  onStartOpenChange: (open: boolean) => void;
  startButtonRef: Ref<HTMLButtonElement>;
  onStatusChange: (status: PageStatus) => void;
};

function draftsFrom(take: StockTake | null): Record<string, string> {
  if (!take) {
    return {};
  }
  const next: Record<string, string> = {};
  for (const line of take.lines) {
    next[line.id] = line.countedQuantity == null ? '' : String(line.countedQuantity);
  }
  return next;
}

export function StockTakeWorkspace({
  allowed,
  activeBranchId,
  startOpen,
  onStartOpenChange,
  startButtonRef,
  onStatusChange,
}: StockTakeWorkspaceProps) {
  const [openTake, setOpenTake] = useState<StockTake | null>(null);
  const [history, setHistory] = useState<StockTake[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      onStatusChange('denied');
      return;
    }
    if (!activeBranchId) {
      setOpenTake(null);
      setHistory([]);
      onStatusChange('failure');
      return;
    }
    onStatusChange('loading');
    try {
      const [openItems, historyItems] = await Promise.all([
        listStockTakes('open'),
        listStockTakes('history'),
      ]);
      const current = openItems[0] ?? null;
      setOpenTake(current);
      setHistory(historyItems);
      setDrafts(draftsFrom(current));
      onStatusChange(current || historyItems.length > 0 ? null : 'empty');
    } catch (error) {
      onStatusChange(mapApiStatus(error));
    }
  }, [allowed, activeBranchId, onStatusChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        onStatusChange('conflict');
      } else {
        onStatusChange(mapApiStatus(error));
      }
    } finally {
      setBusy(false);
    }
  };

  const onStart = () =>
    void run(async () => {
      const created = await startStockTake(`ui-take-${crypto.randomUUID()}`);
      setOpenTake(created);
      setDrafts(draftsFrom(created));
      onStartOpenChange(false);
      await load();
      onStatusChange('success');
    });

  const onSaveCounts = () => {
    if (!openTake) {
      return;
    }
    const lines = openTake.lines.flatMap((line) => {
      const raw = drafts[line.id]?.trim() ?? '';
      if (raw === '') {
        return [];
      }
      const countedQuantity = Number(raw);
      if (!Number.isFinite(countedQuantity) || countedQuantity < 0) {
        return [];
      }
      return [{ lineId: line.id, countedQuantity }];
    });
    if (lines.length === 0) {
      onStatusChange('validation');
      return;
    }
    void run(async () => {
      const next = await saveStockTakeCounts(openTake.id, lines);
      setOpenTake(next);
      setDrafts(draftsFrom(next));
      onStatusChange('success');
    });
  };

  const onPost = () => {
    if (!openTake) {
      return;
    }
    void run(async () => {
      await postStockTake(openTake.id);
      await load();
      onStatusChange('success');
    });
  };

  const onCancel = () => {
    if (!openTake) {
      return;
    }
    void run(async () => {
      await cancelStockTake(openTake.id);
      await load();
      onStatusChange('success');
    });
  };

  if (!activeBranchId) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {openTake ? (
        <>
          <StockTakeCountSheet
            lines={openTake.lines}
            drafts={drafts}
            busy={busy}
            onDraftChange={(lineId, value) => setDrafts((prev) => ({ ...prev, [lineId]: value }))}
            onSave={onSaveCounts}
          />
          <StockTakeVarianceList lines={openTake.lines} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={onPost}>
              Post variances
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
              Abandon count
            </Button>
          </div>
        </>
      ) : null}
      <StockTakeHistory items={history} />
      <StockTakeStartDialog
        open={startOpen}
        busy={busy}
        onOpenChange={onStartOpenChange}
        onConfirm={onStart}
        onCloseFocus={() => {
          if (startButtonRef && typeof startButtonRef !== 'function') {
            startButtonRef.current?.focus();
          }
        }}
      />
    </div>
  );
}
