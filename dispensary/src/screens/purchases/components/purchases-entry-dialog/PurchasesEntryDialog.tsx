import { Check, Plus, Trash2, X } from 'lucide-react';
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { PURCHASES_CONTENT } from '../../PurchasesScreen.content';
import {
  entryTotals,
  formatPaise,
  lineMoney,
  productLabel,
  toNumber,
  validateEntry,
} from '../../PurchasesScreen.utils';
import {
  addDraftLine,
  closeCreatePurchase,
  patchDraftLine,
  removeDraftLine,
  setCreateValidation,
  setDraftInvoiceDate,
  setDraftInvoiceNo,
  setDraftSupplier,
} from '../../store/purchases.slice';
import {
  selectCreateBusy,
  selectCreateHint,
  selectCreateOpen,
  selectCreateStatus,
  selectPurchaseDraft,
  selectPurchasesProducts,
  selectPurchasesSuppliers,
} from '../../store/purchases.selectors';
import { createPurchaseEntry } from '../../store/purchases.thunks';

export function PurchasesEntryDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const open = useSelector(selectCreateOpen);
  const draft = useSelector(selectPurchaseDraft);
  const suppliers = useSelector(selectPurchasesSuppliers);
  const products = useSelector(selectPurchasesProducts);
  const busy = useSelector(selectCreateBusy);
  const createStatus = useSelector(selectCreateStatus);
  const createHint = useSelector(selectCreateHint);

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const totals = entryTotals(draft.lines, productsById);

  if (!open) return null;

  const hintTone =
    createStatus === 'success'
      ? 'ok'
      : createStatus === 'validation' ||
          createStatus === 'failure' ||
          createStatus === 'conflict' ||
          createStatus === 'denied'
        ? 'alert'
        : null;

  function onSave() {
    const error = validateEntry(draft);
    if (error) {
      dispatch(setCreateValidation(error));
      return;
    }
    void dispatch(createPurchaseEntry());
  }

  return (
    <div className="purchases-modal-wrap" role="presentation" onClick={() => dispatch(closeCreatePurchase())}>
      <div
        className="purchases-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchases-entry-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="purchases-modal-head">
          <h2 id="purchases-entry-title">{PURCHASES_CONTENT.entry.title}</h2>
          <button
            type="button"
            className="purchases-x"
            aria-label={PURCHASES_CONTENT.actions.close}
            onClick={() => dispatch(closeCreatePurchase())}
          >
            <X size={16} />
          </button>
        </div>

        <div className="purchases-modal-body">
          {createHint && hintTone ? (
            <div className="purchases-banner" data-tone={hintTone} role="status">
              {createHint}
            </div>
          ) : null}

          <div className="purchases-grid-3">
            <div className="purchases-field">
              <label htmlFor="pur-supplier">{PURCHASES_CONTENT.entry.distributor}</label>
              <select
                id="pur-supplier"
                value={draft.supplierId}
                onChange={(e) => dispatch(setDraftSupplier(e.target.value))}
              >
                <option value="">{PURCHASES_CONTENT.entry.distributorPlaceholder}</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.legalName}
                  </option>
                ))}
              </select>
            </div>
            <div className="purchases-field">
              <label htmlFor="pur-invoice">{PURCHASES_CONTENT.entry.invoiceNo}</label>
              <input
                id="pur-invoice"
                value={draft.invoiceNo}
                onChange={(e) => dispatch(setDraftInvoiceNo(e.target.value))}
                placeholder={PURCHASES_CONTENT.entry.invoicePlaceholder}
              />
            </div>
            <div className="purchases-field">
              <label htmlFor="pur-date">{PURCHASES_CONTENT.entry.invoiceDate}</label>
              <input
                id="pur-date"
                type="date"
                value={draft.invoiceDate}
                onChange={(e) => dispatch(setDraftInvoiceDate(e.target.value))}
              />
            </div>
          </div>

          <div className="purchases-bulk">{PURCHASES_CONTENT.entry.bulkHint}</div>

          <div className="purchases-lines-head">
            <h3>{PURCHASES_CONTENT.entry.billedItems}</h3>
            <span>{PURCHASES_CONTENT.entry.freeNote}</span>
          </div>

          {draft.lines.map((line) => {
            const product = productsById.get(line.productId);
            const money = lineMoney(line.quantity, line.rateRupees, product?.gstRate);
            return (
              <div className="purchases-line" key={line.key}>
                <div className="purchases-line-top">
                  <div className="purchases-field">
                    <label>{PURCHASES_CONTENT.entry.product}</label>
                    <select
                      value={line.productId}
                      onChange={(e) =>
                        dispatch(
                          patchDraftLine({
                            key: line.key,
                            patch: { productId: e.target.value },
                          }),
                        )
                      }
                    >
                      <option value="">{PURCHASES_CONTENT.entry.productPlaceholder}</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {productLabel(product)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="purchases-line-money">{formatPaise(money.totalPaise)}</div>
                  <button
                    type="button"
                    className="purchases-iconbtn"
                    aria-label={PURCHASES_CONTENT.entry.removeLine}
                    onClick={() => dispatch(removeDraftLine(line.key))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="purchases-line-grid">
                  <div className="purchases-field">
                    <label>{PURCHASES_CONTENT.entry.qty}</label>
                    <input
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(e) =>
                        dispatch(patchDraftLine({ key: line.key, patch: { quantity: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="purchases-field">
                    <label>{PURCHASES_CONTENT.entry.free}</label>
                    <input
                      inputMode="decimal"
                      value={line.freeQuantity}
                      onChange={(e) =>
                        dispatch(
                          patchDraftLine({ key: line.key, patch: { freeQuantity: e.target.value } }),
                        )
                      }
                    />
                  </div>
                  <div className="purchases-field">
                    <label>{PURCHASES_CONTENT.entry.rate}</label>
                    <input
                      inputMode="decimal"
                      value={line.rateRupees}
                      onChange={(e) =>
                        dispatch(
                          patchDraftLine({ key: line.key, patch: { rateRupees: e.target.value } }),
                        )
                      }
                    />
                  </div>
                  <div className="purchases-field">
                    <label>{PURCHASES_CONTENT.entry.mrp}</label>
                    <input value="—" disabled aria-label={PURCHASES_CONTENT.entry.mrp} />
                  </div>
                  <div className="purchases-field">
                    <label>{PURCHASES_CONTENT.entry.gst}</label>
                    <input
                      value={product?.gstRate == null ? '—' : `${product.gstRate} %`}
                      disabled
                      aria-label={PURCHASES_CONTENT.entry.gst}
                    />
                  </div>
                  <div className="purchases-field">
                    <label>{PURCHASES_CONTENT.entry.batch}</label>
                    <input
                      value=""
                      disabled
                      placeholder="At QC"
                      aria-label={PURCHASES_CONTENT.entry.batch}
                    />
                  </div>
                </div>
                {toNumber(line.freeQuantity) > 0 ? (
                  <div className="purchases-sub" style={{ marginTop: 8, color: 'var(--pur-muted)', fontSize: 12 }}>
                    Free {toNumber(line.freeQuantity)} unit{toNumber(line.freeQuantity) === 1 ? '' : 's'}{' '}
                    stocked · not charged
                  </div>
                ) : null}
              </div>
            );
          })}

          <button
            type="button"
            className="purchases-btn purchases-btn-outline purchases-add-line"
            onClick={() => dispatch(addDraftLine())}
          >
            <Plus size={15} aria-hidden />
            {PURCHASES_CONTENT.entry.addLine}
          </button>
        </div>

        <div className="purchases-modal-foot">
          <div className="purchases-foot-meta">
            <span>
              {PURCHASES_CONTENT.entry.linesSummary(totals.lineCount, totals.units)}
            </span>
            <span>
              {PURCHASES_CONTENT.entry.taxable} <strong>{formatPaise(totals.taxablePaise)}</strong>
            </span>
            <span>
              {PURCHASES_CONTENT.entry.gstTotal} <strong>{formatPaise(totals.taxPaise)}</strong>
            </span>
            <span>
              {PURCHASES_CONTENT.entry.bill} <strong>{formatPaise(totals.totalPaise)}</strong>
            </span>
          </div>
          <div className="purchases-foot-actions">
            <button
              type="button"
              className="purchases-btn purchases-btn-ghost"
              onClick={() => dispatch(closeCreatePurchase())}
              disabled={busy}
            >
              {PURCHASES_CONTENT.entry.cancel}
            </button>
            <button
              type="button"
              className="purchases-btn purchases-btn-soft"
              onClick={onSave}
              disabled={busy || totals.lineCount === 0}
            >
              <Check size={15} aria-hidden />
              {busy ? 'Saving…' : PURCHASES_CONTENT.entry.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
