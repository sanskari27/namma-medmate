import { hasHospitalAccess } from '@/libs/hospitalAccess';
import type { RootState } from '@/store';
import {
  approveHospitalIndent,
  createHospitalIndent,
  getHospitalIndents,
  getHospitalWards,
  isApiError,
  rejectHospitalIndent,
  type HospitalIndent,
  type HospitalIndentList,
} from '@/services/hospital';
import { listProducts, type Product } from '@/services/products';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { HospitalIndentCreateDialog } from './components/hospital-indent-create-dialog';
import { HospitalIndentsCountsStrip } from './components/hospital-indents-counts-strip';
import { HospitalIndentsDetail } from './components/hospital-indents-detail';
import { HospitalIndentsHeader } from './components/hospital-indents-header';
import { HospitalIndentsList } from './components/hospital-indents-list';
import { HospitalIndentsStatusBanner } from './components/hospital-indents-status-banner';
import { HOSPITAL_INDENTS_CONTENT } from './HospitalIndentsScreen.content';
import './HospitalIndentsScreen.css';
import {
  emptyDraft,
  mapHttpStatus,
  validateDraft,
  type IndentDraft,
  type PageStatus,
  type StatusFilter,
} from './HospitalIndentsScreen.utils';

const EMPTY_COUNTS: HospitalIndentList = {
  pendingCount: 0,
  approvedCount: 0,
  issuedTodayCount: 0,
  totalCount: 0,
  items: [],
};

export default function HospitalIndentsScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasHospitalAccess(user?.modules);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [board, setBoard] = useState<HospitalIndentList>(EMPTY_COUNTS);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<IndentDraft>(emptyDraft());
  const [wards, setWards] = useState<Awaited<ReturnType<typeof getHospitalWards>>['wards']>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [actionBusy, setActionBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);

  const selectedIndent = useMemo(
    () => board.items.find((indent) => indent.id === selectedId) ?? null,
    [board.items, selectedId],
  );

  const filteredItems = useMemo(() => {
    if (filter === 'ALL') {
      return board.items;
    }
    return board.items.filter((indent) => indent.status === filter);
  }, [board.items, filter]);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('plan_limit');
      return;
    }
    if (!user?.activeBranchId) {
      setMessage(HOSPITAL_INDENTS_CONTENT.noBranch);
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      const data = await getHospitalIndents();
      setBoard(data);
      setSelectedId((current) => current ?? data.items[0]?.id ?? null);
      setStatus(data.items.length === 0 ? 'empty' : null);
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapHttpStatus(error.status, error.code));
      } else {
        setStatus('failure');
      }
    }
  }, [allowed, user?.activeBranchId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dialogOpen && status === 'success') {
      restoreRef.current?.focus();
    }
  }, [dialogOpen, status]);

  const openDialog = async () => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDraft(emptyDraft());
    setDialogMessage(null);
    setDialogOpen(true);
    try {
      const [wardData, productRows] = await Promise.all([
        getHospitalWards(),
        listProducts().catch(() => [] as Product[]),
      ]);
      setWards(wardData.wards);
      setProducts(productRows);
    } catch {
      setProducts([]);
      setWards([]);
    }
  };

  const saveIndent = async () => {
    const validation = validateDraft(draft);
    if (validation) {
      setDialogMessage(HOSPITAL_INDENTS_CONTENT.validation);
      return;
    }
    setSaveBusy(true);
    try {
      const created = await createHospitalIndent({
        wardId: draft.wardId,
        bedId: draft.bedId || null,
        patientName: draft.patientName.trim() || null,
        note: draft.note.trim() || null,
        requestedBy: draft.requestedBy.trim(),
        lines: draft.lines
          .filter((line) => line.productId && Number(line.quantity) > 0)
          .map((line) => ({
            productId: line.productId,
            quantity: Number(line.quantity),
          })),
      });
      const refreshed = await getHospitalIndents();
      setBoard(refreshed);
      setSelectedId(created.id);
      setDialogOpen(false);
      setMessage(HOSPITAL_INDENTS_CONTENT.indentSaved);
      setStatus('success');
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapHttpStatus(error.status, error.code));
      } else {
        setStatus('failure');
      }
    } finally {
      setSaveBusy(false);
    }
  };

  const runAction = async (kind: 'approve' | 'reject', indent: HospitalIndent) => {
    setActionBusy(true);
    try {
      if (kind === 'approve') {
        await approveHospitalIndent(indent.id);
        setMessage(HOSPITAL_INDENTS_CONTENT.approved);
      } else {
        await rejectHospitalIndent(indent.id);
        setMessage(HOSPITAL_INDENTS_CONTENT.rejected);
      }
      const refreshed = await getHospitalIndents();
      setBoard(refreshed);
      setSelectedId(indent.id);
      setStatus('success');
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapHttpStatus(error.status, error.code));
      } else {
        setStatus('failure');
      }
    } finally {
      setActionBusy(false);
    }
  };

  const disabled = !allowed || status === 'loading' || !user?.activeBranchId;

  return (
    <main className="hi" aria-label={HOSPITAL_INDENTS_CONTENT.regionLabel}>
      <HospitalIndentsHeader disabled={disabled} onRecord={() => void openDialog()} />
      <HospitalIndentsStatusBanner
        status={status}
        message={message}
        onDismiss={() => {
          setStatus(null);
          setMessage(null);
        }}
        onRetry={() => void load()}
      />
      {allowed && user?.activeBranchId && status !== 'loading' && status !== 'denied' ? (
        <>
          <HospitalIndentsCountsStrip counts={board} />
          <div className="hi-board">
            <HospitalIndentsList
              items={filteredItems}
              selectedId={selectedId}
              filter={filter}
              onFilterChange={setFilter}
              onSelect={(indent) => setSelectedId(indent.id)}
            />
            <HospitalIndentsDetail
              indent={selectedIndent}
              busy={actionBusy}
              onApprove={() => selectedIndent && void runAction('approve', selectedIndent)}
              onReject={() => selectedIndent && void runAction('reject', selectedIndent)}
            />
          </div>
        </>
      ) : null}
      <HospitalIndentCreateDialog
        open={dialogOpen}
        draft={draft}
        wards={wards}
        products={products}
        busy={saveBusy}
        message={dialogMessage}
        onChange={setDraft}
        onClose={() => setDialogOpen(false)}
        onSave={() => void saveIndent()}
      />
    </main>
  );
}
