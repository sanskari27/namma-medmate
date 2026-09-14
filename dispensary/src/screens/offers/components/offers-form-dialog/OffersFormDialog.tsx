import { X } from 'lucide-react';
import { FormEvent, useEffect, useId, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { OFFERS_CONTENT } from '../../OffersScreen.content';
import {
  formValid,
  toInput,
  type FormState,
} from '../../OffersScreen.utils';
import {
  selectEditingOffer,
  selectOfferEditingId,
  selectOfferForm,
  selectOfferFormBusy,
  selectOfferFormOpen,
  selectOffersProducts,
} from '../../store/offers.selectors';
import {
  closeOfferForm,
  markOffersValidation,
  patchOfferForm,
  toggleOfferProduct,
} from '../../store/offers.slice';
import { saveOffer } from '../../store/offers.thunks';

export function OffersFormDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const open = useSelector(selectOfferFormOpen);
  const form = useSelector(selectOfferForm);
  const busy = useSelector(selectOfferFormBusy);
  const editingId = useSelector(selectOfferEditingId);
  const editing = useSelector(selectEditingOffer);
  const products = useSelector(selectOffersProducts);
  const titleId = useId();
  const firstRef = useRef<HTMLInputElement | null>(null);
  const creating = !editingId;
  const c = OFFERS_CONTENT.form;
  const canLaunch = formValid(form);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => firstRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  function onChange(patch: Partial<FormState>) {
    dispatch(patchOfferForm(patch));
  }

  function submit(launch: boolean) {
    if (!formValid(form)) {
      dispatch(markOffersValidation());
      return;
    }
    void dispatch(
      saveOffer({
        input: toInput(form, editing?.version),
        id: editingId ?? undefined,
        launch: creating ? launch : false,
      }),
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit(creating);
  }

  const valueLabel = form.benefitMode === 'FLAT' ? c.flatOff : c.percentOff;

  return (
    <div
      className="off-modal-wrap"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dispatch(closeOfferForm());
      }}
    >
      <div className="off-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="off-modal-head">
          <h3 id={titleId}>{creating ? c.createTitle : c.editTitle}</h3>
          <button
            type="button"
            className="off-x"
            aria-label="Close"
            onClick={() => dispatch(closeOfferForm())}
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="off-modal-body">
            <div className="off-form-grid">
              <div className="off-field" data-span="2">
                <label htmlFor="off-name">{c.name}</label>
                <input
                  id="off-name"
                  ref={firstRef}
                  className="off-input"
                  placeholder={c.namePlaceholder}
                  value={form.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                />
              </div>

              <div className="off-field">
                <label htmlFor="off-coupon">{c.coupon}</label>
                <input
                  id="off-coupon"
                  className="off-input off-mono"
                  placeholder={c.couponPlaceholder}
                  value={form.couponCode}
                  onChange={(e) => onChange({ couponCode: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="off-field">
                <label htmlFor="off-kind">{c.kind}</label>
                <select
                  id="off-kind"
                  className="off-select"
                  value={form.kind}
                  onChange={(e) => onChange({ kind: e.target.value as FormState['kind'] })}
                >
                  <option value="SEASONAL">{OFFERS_CONTENT.kinds.SEASONAL}</option>
                  <option value="BOGO">{OFFERS_CONTENT.kinds.BOGO}</option>
                  <option value="BUNDLE">{OFFERS_CONTENT.kinds.BUNDLE}</option>
                </select>
              </div>

              {form.kind !== 'BOGO' ? (
                <>
                  <div className="off-field">
                    <label htmlFor="off-dtype">{c.discountType}</label>
                    <select
                      id="off-dtype"
                      className="off-select"
                      value={form.benefitMode}
                      onChange={(e) =>
                        onChange({ benefitMode: e.target.value as FormState['benefitMode'] })
                      }
                    >
                      <option value="PERCENT">Percentage %</option>
                      <option value="FLAT">Flat ₹</option>
                    </select>
                  </div>
                  <div className="off-field">
                    <label htmlFor="off-value">{valueLabel}</label>
                    <input
                      id="off-value"
                      className="off-input"
                      type="number"
                      min={0}
                      step={form.benefitMode === 'PERCENT' ? 1 : 0.01}
                      value={form.benefitMode === 'FLAT' ? form.flatRupees : form.percentValue}
                      onChange={(e) =>
                        onChange(
                          form.benefitMode === 'FLAT'
                            ? { flatRupees: e.target.value }
                            : { percentValue: e.target.value },
                        )
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="off-field">
                    <label htmlFor="off-buy">{c.buyQty}</label>
                    <input
                      id="off-buy"
                      className="off-input"
                      type="number"
                      min={1}
                      value={form.buyQuantity}
                      onChange={(e) => onChange({ buyQuantity: e.target.value })}
                    />
                  </div>
                  <div className="off-field">
                    <label htmlFor="off-get">{c.getQty}</label>
                    <input
                      id="off-get"
                      className="off-input"
                      type="number"
                      min={1}
                      value={form.getQuantity}
                      onChange={(e) => onChange({ getQuantity: e.target.value })}
                    />
                  </div>
                </>
              )}

              {form.kind === 'SEASONAL' ? (
                <>
                  <div className="off-field">
                    <label htmlFor="off-start">{c.startsAt}</label>
                    <input
                      id="off-start"
                      className="off-input off-mono"
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => onChange({ startsAt: e.target.value })}
                    />
                  </div>
                  <div className="off-field">
                    <label htmlFor="off-end">{c.endsAt}</label>
                    <input
                      id="off-end"
                      className="off-input off-mono"
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(e) => onChange({ endsAt: e.target.value })}
                    />
                  </div>
                </>
              ) : null}

              <div className="off-field" data-span="2">
                <label>{c.products}</label>
                <div className="off-products">
                  {products.length === 0 ? (
                    <span className="off-muted" style={{ margin: 0 }}>
                      No medicines loaded yet.
                    </span>
                  ) : (
                    products.map((product) => (
                      <label key={product.id}>
                        <input
                          type="checkbox"
                          checked={form.productIds.includes(product.id)}
                          onChange={() => dispatch(toggleOfferProduct(product.id))}
                        />
                        {product.name}
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <label className="off-online">
              <button
                type="button"
                className="off-switch"
                data-on={form.onlineVisible ? 'true' : 'false'}
                aria-pressed={form.onlineVisible}
                aria-label={c.online}
                onClick={() => onChange({ onlineVisible: !form.onlineVisible })}
              />
              <span>{c.online}</span>
            </label>
          </div>

          <div className="off-modal-foot">
            <button
              type="button"
              className="off-btn off-btn-ghost"
              onClick={() => dispatch(closeOfferForm())}
              disabled={busy}
            >
              {c.cancel}
            </button>
            {creating ? (
              <>
                <button
                  type="button"
                  className="off-btn off-btn-ghost"
                  disabled={busy || !canLaunch}
                  onClick={() => submit(false)}
                >
                  {busy ? c.saving : c.saveDraft}
                </button>
                <button
                  type="submit"
                  className="off-btn off-btn-primary"
                  disabled={busy || !canLaunch}
                >
                  {busy ? c.saving : c.launch}
                </button>
              </>
            ) : (
              <button type="submit" className="off-btn off-btn-primary" disabled={busy || !canLaunch}>
                {busy ? c.saving : c.save}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
