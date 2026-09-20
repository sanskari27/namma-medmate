import {
  createHospitalIssue,
  downloadHospitalIssuePdf,
  getHospitalIndent,
  getHospitalIssues,
  getHospitalWards,
  isApiError,
  type HospitalIssue,
  type HospitalIssueList,
  type HospitalWard,
} from '@/services/hospital';
import { listStockBatches } from '@/services/inventory';
import { listProducts, type Product } from '@/services/products';
import { openInvoicePdf } from '@/services/salesInvoices';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HOSPITAL_ISSUES_CONTENT } from './HospitalIssuesScreen.content';
import {
  emptyDraft,
  mapHttpStatus,
  pickFefo,
  toBatchOptions,
  validationMessage,
  type BatchOption,
  type IssueDraft,
  type IssueKindFilter,
  type PageStatus,
} from './HospitalIssuesScreen.utils';

const EMPTY_BOARD: HospitalIssueList = { items: [] };

export function useHospitalIssuesBoard(allowed: boolean, activeBranchId: string | null | undefined) {
  const restoreRef = useRef<HTMLElement | null>(null);
  const indentPrefillRef = useRef<string | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [board, setBoard] = useState<HospitalIssueList>(EMPTY_BOARD);
  const [wards, setWards] = useState<HospitalWard[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [wardFilter, setWardFilter] = useState('');
  const [kindFilter, setKindFilter] = useState<IssueKindFilter>('ALL');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<IssueDraft>(emptyDraft());
  const [batchesByProduct, setBatchesByProduct] = useState<Record<string, BatchOption[]>>({});
  const [saveBusy, setSaveBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);

  const selectedIssue = useMemo(
    () => board.items.find((issue) => issue.id === selectedId) ?? null,
    [board.items, selectedId],
  );

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('plan_limit');
      return;
    }
    if (!activeBranchId) {
      setMessage(HOSPITAL_ISSUES_CONTENT.noBranch);
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      const [issueData, wardData] = await Promise.all([
        getHospitalIssues(),
        getHospitalWards().catch(() => ({ wards: [] as HospitalWard[] })),
      ]);
      setBoard(issueData ?? EMPTY_BOARD);
      setWards(wardData?.wards ?? []);
      setSelectedId((current) => current ?? issueData?.items[0]?.id ?? null);
      setStatus((issueData?.items.length ?? 0) === 0 ? 'empty' : null);
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapHttpStatus(error.status, error.code));
      } else {
        setStatus('failure');
      }
    }
  }, [allowed, activeBranchId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dialogOpen && status === 'success') {
      restoreRef.current?.focus();
    }
  }, [dialogOpen, status]);

  const applyProductBatches = async (productId: string) => {
    const stock = await listStockBatches(productId).catch(() => []);
    const options = toBatchOptions(stock);
    setBatchesByProduct((current) => ({ ...current, [productId]: options }));
    return options;
  };

  const openDialog = async (nextDraft: IssueDraft = emptyDraft()) => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDraft(nextDraft);
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
    }
  };

  const openFromIndent = useCallback(async (indentId: string) => {
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDialogOpen(true);
    setDialogMessage(null);
    try {
      const [indent, wardData, productRows] = await Promise.all([
        getHospitalIndent(indentId),
        getHospitalWards(),
        listProducts().catch(() => [] as Product[]),
      ]);
      setWards(wardData.wards);
      setProducts(productRows);
      const nextLines: IssueDraft['lines'] = [];
      const nextBatches: Record<string, BatchOption[]> = {};
      for (const line of indent.lines) {
        const options = await applyProductBatches(line.productId);
        nextBatches[line.productId] = options;
        const suggested = pickFefo(options);
        nextLines.push({
          productId: line.productId,
          productName: line.productName,
          batchId: suggested?.batchId ?? '',
          batchLabel: suggested?.label ?? '',
          quantity: String(line.requestedQty),
        });
      }
      setBatchesByProduct((current) => ({ ...current, ...nextBatches }));
      setDraft({
        wardId: indent.wardId,
        indentId: indent.id,
        reason: 'FLOOR_STOCK',
        uhid: '',
        patientName: indent.patientName ?? '',
        lines: nextLines.length > 0 ? nextLines : emptyDraft().lines,
      });
    } catch {
      setDraft(emptyDraft());
    }
  }, []);

  const consumeIndentPrefill = useCallback((indentId: string | null) => {
    if (!indentId || indentPrefillRef.current === indentId) {
      return;
    }
    indentPrefillRef.current = indentId;
    void openFromIndent(indentId);
  }, [openFromIndent]);

  const onProductChange = async (index: number, productId: string) => {
    const product = products.find((item) => item.id === productId);
    const options = productId ? await applyProductBatches(productId) : [];
    const suggested = pickFefo(options);
    setDraft((current) => {
      const next = [...current.lines];
      next[index] = {
        productId,
        productName: product?.name ?? '',
        batchId: suggested?.batchId ?? '',
        batchLabel: suggested?.label ?? '',
        quantity: next[index]?.quantity ?? '',
      };
      return { ...current, lines: next };
    });
  };

  const saveIssue = async () => {
    const validation = validationMessage(draft);
    if (validation === 'refill') {
      setDialogMessage(HOSPITAL_ISSUES_CONTENT.refillUhid);
      return;
    }
    if (validation) {
      setDialogMessage(HOSPITAL_ISSUES_CONTENT.validation);
      return;
    }
    setSaveBusy(true);
    try {
      const created = await createHospitalIssue({
        wardId: draft.wardId,
        indentId: draft.indentId || null,
        reason: draft.reason,
        uhid: draft.uhid.trim() || null,
        patientName: draft.patientName.trim() || null,
        idempotencyKey: crypto.randomUUID(),
        lines: draft.lines
          .filter((line) => line.productId && line.batchId && Number(line.quantity) > 0)
          .map((line) => ({
            productId: line.productId,
            batchId: line.batchId,
            quantity: Number(line.quantity),
          })),
      });
      const refreshed = await getHospitalIssues();
      setBoard(refreshed);
      setSelectedId(created.id);
      setDialogOpen(false);
      setMessage(HOSPITAL_ISSUES_CONTENT.issued);
      setStatus('success');
    } catch (error) {
      if (isApiError(error)) {
        const mapped = mapHttpStatus(error.status, error.code);
        setStatus(mapped);
        if (error.code === 'CREDIT_LIMIT') {
          setMessage(HOSPITAL_ISSUES_CONTENT.creditLimit);
          setDialogMessage(HOSPITAL_ISSUES_CONTENT.creditLimit);
        } else if (mapped === 'conflict') {
          setDialogMessage(HOSPITAL_ISSUES_CONTENT.conflict);
        }
      } else {
        setStatus('failure');
      }
    } finally {
      setSaveBusy(false);
    }
  };

  const openPdf = async (issue: HospitalIssue, print: boolean) => {
    setPdfBusy(true);
    try {
      const blob = await downloadHospitalIssuePdf(issue.id);
      openInvoicePdf(blob, `${issue.invoiceNumber}.pdf`, print);
    } catch {
      setStatus('failure');
    } finally {
      setPdfBusy(false);
    }
  };

  return {
    status,
    message,
    board,
    wards,
    products,
    wardFilter,
    kindFilter,
    query,
    selectedIssue,
    dialogOpen,
    draft,
    batchesByProduct,
    saveBusy,
    pdfBusy,
    dialogMessage,
    setWardFilter,
    setKindFilter,
    setQuery,
    setSelectedId,
    setDraft,
    load,
    openDialog,
    consumeIndentPrefill,
    onProductChange,
    saveIssue,
    openPdf,
    dismiss: () => {
      setStatus(null);
      setMessage(null);
    },
    closeDialog: () => setDialogOpen(false),
  };
}
