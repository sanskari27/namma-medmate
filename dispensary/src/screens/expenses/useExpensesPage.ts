import { isApiError } from '@/services/axios';
import {
  attachExpenseEvidence,
  createExpense,
  createExpenseCategory,
  listExpenseCategories,
  listExpenseTotals,
  listExpenses,
  updateExpense,
  type ExpenseCategory,
  type ExpenseListQuery,
  type ExpenseTotals,
  type ShopExpense,
} from '@/services/expenses';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  emptyForm,
  formValid,
  hasFinanceAccess,
  mapApiStatus,
  rupeesToPaise,
  type FormState,
  type OutletScope,
  type PageStatus,
} from './ExpensesScreen.utils';

export function useExpensesPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const statusId = useId();
  const addRef = useRef<HTMLButtonElement | null>(null);
  const allowed = hasFinanceAccess(user?.role, user?.modules);
  const owner = user?.role === 'pharmacy_owner';

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [items, setItems] = useState<ShopExpense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [totals, setTotals] = useState<ExpenseTotals | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState<OutletScope>('session');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const selected = items.find((row) => row.id === selectedId) ?? null;

  const query = useCallback((): ExpenseListQuery => {
    return {
      scope: scope === 'tenant' ? 'tenant' : undefined,
      categoryId: filterCategoryId || undefined,
      from: from || undefined,
      to: to || undefined,
    };
  }, [filterCategoryId, from, scope, to]);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    setStatusHint(null);
    try {
      const [spend, cats, summed] = await Promise.all([
        listExpenses(query()),
        listExpenseCategories(),
        listExpenseTotals(query()),
      ]);
      setItems(spend);
      setCategories(cats);
      setTotals(summed);
      setStatus(spend.length === 0 ? 'empty' : null);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    }
  }, [allowed, query]);

  useEffect(() => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    void load();
  }, [allowed, load]);

  function onChange(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function startCreate() {
    setCreating(true);
    setSelectedId(null);
    setForm(emptyForm());
    setStatus(null);
    setStatusHint(null);
  }

  function selectExpense(id: string) {
    const row = items.find((item) => item.id === id);
    if (!row) {
      return;
    }
    setCreating(false);
    setSelectedId(id);
    setForm({
      categoryId: row.categoryId,
      amountRupees: (row.amountPaise / 100).toFixed(2),
      occurredOn: row.occurredOn,
      notes: row.notes ?? '',
      evidence: null,
      newCode: '',
      newLabel: '',
    });
    setStatus(null);
    setStatusHint(null);
  }

  async function onSave() {
    if (!formValid(form)) {
      setStatus('validation');
      setStatusHint(null);
      return;
    }
    const amountPaise = rupeesToPaise(form.amountRupees);
    if (amountPaise == null) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        categoryId: form.categoryId,
        amountPaise,
        occurredOn: form.occurredOn,
        notes: form.notes.trim() || undefined,
        idempotencyKey: creating ? crypto.randomUUID() : undefined,
        expectedVersion: creating ? undefined : (selected?.version ?? 1),
      };
      const saved = creating
        ? await createExpense(payload)
        : await updateExpense(selectedId as string, payload);
      let next = saved;
      if (form.evidence) {
        next = await attachExpenseEvidence(saved.id, form.evidence);
      }
      await load();
      setCreating(false);
      setSelectedId(next.id);
      setStatus('success');
      setStatusHint(null);
      addRef.current?.focus();
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
        setStatusHint(apiStatusHint(error.code));
      } else {
        setStatus('failure');
      }
    } finally {
      setBusy(false);
    }
  }

  async function onAddCategory() {
    if (!form.newCode.trim() || !form.newLabel.trim()) {
      setStatus('validation');
      setStatusHint('Code and name are needed to add a category.');
      return;
    }
    setBusy(true);
    try {
      const created = await createExpenseCategory({
        code: form.newCode,
        label: form.newLabel,
      });
      const cats = await listExpenseCategories();
      setCategories(cats);
      setForm((prev) => ({ ...prev, categoryId: created.id, newCode: '', newLabel: '' }));
      setStatus('success');
      setStatusHint('Category added to the shop books.');
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
        setStatusHint(apiStatusHint(error.code) ?? error.message);
      } else {
        setStatus('failure');
      }
    } finally {
      setBusy(false);
    }
  }

  return {
    allowed,
    owner,
    status,
    statusHint,
    statusId,
    addRef,
    items,
    categories,
    totals,
    selected,
    creating,
    form,
    busy,
    scope,
    filterCategoryId,
    from,
    to,
    startCreate,
    selectExpense,
    onChange,
    onSave,
    onAddCategory,
    setScope,
    setFilterCategoryId,
    setFrom,
    setTo,
  };
}
