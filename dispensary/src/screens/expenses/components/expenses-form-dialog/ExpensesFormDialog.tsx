import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { EXPENSES_CONTENT } from '../../ExpensesScreen.content';
import { GST_OPTIONS, PAYMENT_OPTIONS } from '../../ExpensesScreen.utils';
import { expenseEvidenceUrl, type ExpensePaymentMode } from '@/services/expenses';
import {
  closeExpenseForm,
  patchExpenseForm,
  saveExpense,
  selectExpensesCategories,
  selectExpensesEditingId,
  selectExpensesForm,
  selectExpensesFormBusy,
  selectExpensesFormOpen,
  selectExpensesItems,
  selectExpensesScope,
} from '../../store';

export function ExpensesFormDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const open = useSelector(selectExpensesFormOpen);
  const form = useSelector(selectExpensesForm);
  const busy = useSelector(selectExpensesFormBusy);
  const editingId = useSelector(selectExpensesEditingId);
  const categories = useSelector(selectExpensesCategories);
  const items = useSelector(selectExpensesItems);
  const scope = useSelector(selectExpensesScope);
  const user = useSelector((state: RootState) => state.auth.user);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const [evidence, setEvidence] = useState<File | null>(null);

  const editing = items.find((row) => row.id === editingId) ?? null;
  const branches = user?.branches ?? [];
  const needsOutlet = scope === 'tenant' || !user?.activeBranchId;

  useEffect(() => {
    if (open) {
      titleRef.current?.focus();
      setEvidence(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const canSave =
    Boolean(form.categoryId && form.occurredOn && form.amountRupees.trim()) && !busy;

  return (
    <div
      className="ex-overlay"
      role="presentation"
      onClick={() => dispatch(closeExpenseForm())}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          dispatch(closeExpenseForm());
        }
      }}
    >
      <div
        className="ex-dialog-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-form-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ex-dialog">
          <button
            type="button"
            className="ex-dialog-close"
            aria-label="Close"
            onClick={() => dispatch(closeExpenseForm())}
          >
            <X size={18} aria-hidden />
          </button>
          <h3 id="expense-form-title" ref={titleRef} tabIndex={-1}>
            {editingId ? EXPENSES_CONTENT.formTitleEdit : EXPENSES_CONTENT.formTitleCreate}
          </h3>
          <form
            className="ex-form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void dispatch(saveExpense(evidence ?? undefined));
            }}
          >
            {needsOutlet ? (
              <label className="ex-label">
                {EXPENSES_CONTENT.fieldOutlet}
                <select
                  className="ex-select"
                  value={form.branchId}
                  onChange={(event) =>
                    dispatch(patchExpenseForm({ branchId: event.target.value }))
                  }
                >
                  <option value="">{EXPENSES_CONTENT.fieldOutletPlaceholder}</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="ex-label">
              {EXPENSES_CONTENT.fieldDate}
              <input
                className="ex-field"
                type="date"
                value={form.occurredOn}
                onChange={(event) =>
                  dispatch(patchExpenseForm({ occurredOn: event.target.value }))
                }
              />
            </label>
            <label className="ex-label">
              {EXPENSES_CONTENT.fieldParty}
              <input
                className="ex-field"
                value={form.partyName}
                placeholder={EXPENSES_CONTENT.fieldPartyPlaceholder}
                onChange={(event) =>
                  dispatch(patchExpenseForm({ partyName: event.target.value }))
                }
              />
            </label>
            <label className="ex-label">
              {EXPENSES_CONTENT.fieldCategory}
              <select
                className="ex-select"
                value={form.categoryId}
                onChange={(event) =>
                  dispatch(patchExpenseForm({ categoryId: event.target.value }))
                }
              >
                <option value="">Select category</option>
                {categories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="ex-label">
              {EXPENSES_CONTENT.fieldPayment}
              <select
                className="ex-select"
                value={form.paymentMode}
                onChange={(event) =>
                  dispatch(
                    patchExpenseForm({
                      paymentMode: event.target.value as ExpensePaymentMode,
                    }),
                  )
                }
              >
                {PAYMENT_OPTIONS.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="ex-label">
              {EXPENSES_CONTENT.fieldAmount}
              <input
                className="ex-field"
                inputMode="decimal"
                placeholder="0"
                value={form.amountRupees}
                onChange={(event) =>
                  dispatch(patchExpenseForm({ amountRupees: event.target.value }))
                }
              />
            </label>
            <label className="ex-label">
              {EXPENSES_CONTENT.fieldGst}
              <select
                className="ex-select"
                value={form.gstPercent}
                onChange={(event) =>
                  dispatch(
                    patchExpenseForm({
                      gstPercent: Number.parseInt(event.target.value, 10),
                    }),
                  )
                }
              >
                {GST_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value} %
                  </option>
                ))}
              </select>
            </label>
            <label className="ex-label">
              {EXPENSES_CONTENT.fieldNote}
              <input
                className="ex-field"
                value={form.notes}
                placeholder={EXPENSES_CONTENT.fieldNotePlaceholder}
                onChange={(event) => dispatch(patchExpenseForm({ notes: event.target.value }))}
              />
            </label>
            <label className="ex-label">
              {EXPENSES_CONTENT.fieldEvidence}
              {editing?.evidence?.length ? (
                <ul className="ex-evidence">
                  {editing.evidence.map((row) => (
                    <li key={row.id}>
                      <a
                        href={expenseEvidenceUrl(editing.id, row.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {row.originalFilename}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="ex-muted">{EXPENSES_CONTENT.evidenceEmpty}</span>
              )}
              <input
                className="ex-field"
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => setEvidence(event.target.files?.[0] ?? null)}
              />
            </label>
            <div className="ex-dialog-actions">
              <button
                type="button"
                className="ex-btn ex-btn-ghost"
                onClick={() => dispatch(closeExpenseForm())}
              >
                {EXPENSES_CONTENT.cancel}
              </button>
              <button type="submit" className="ex-btn ex-btn-primary" disabled={!canSave}>
                {EXPENSES_CONTENT.saveExpense}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
