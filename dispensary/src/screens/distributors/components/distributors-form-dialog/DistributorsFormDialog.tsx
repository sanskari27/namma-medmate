import { X } from 'lucide-react';
import { FormEvent, useEffect, useId, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { DISTRIBUTORS_CONTENT } from '../../DistributorsScreen.content';
import {
  PAYMENT_TERM_OPTIONS,
  formatPaise,
  toSupplierInput,
  validateDialogForm,
  type PaymentTermsChoice,
} from '../../DistributorsScreen.utils';
import {
  selectDistributorEditingId,
  selectDistributorForm,
  selectDistributorFormBusy,
  selectDistributorFormOpen,
  selectDistributorLedger,
  selectEditingDistributor,
} from '../../store/distributors.selectors';
import {
  closeDistributorForm,
  markDistributorsValidation,
  openPayDialog,
  patchDistributorForm,
} from '../../store/distributors.slice';
import { saveDistributor } from '../../store/distributors.thunks';

export function DistributorsFormDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const open = useSelector(selectDistributorFormOpen);
  const form = useSelector(selectDistributorForm);
  const busy = useSelector(selectDistributorFormBusy);
  const editingId = useSelector(selectDistributorEditingId);
  const editing = useSelector(selectEditingDistributor);
  const ledger = useSelector(selectDistributorLedger);
  const titleId = useId();
  const firstRef = useRef<HTMLInputElement | null>(null);
  const creating = !editingId;
  const outstanding = ledger?.balancePaise ?? editing?.outstandingPaise ?? 0;

  useEffect(() => {
    if (open) {
      window.setTimeout(() => firstRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validateDialogForm(form)) {
      dispatch(markDistributorsValidation());
      return;
    }
    void dispatch(
      saveDistributor({
        input: toSupplierInput(form, creating),
        id: editingId ?? undefined,
      }),
    );
  }

  return (
    <div
      className="dist-modal-wrap"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dispatch(closeDistributorForm());
      }}
    >
      <div
        className="dist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="dist-modal-head">
          <h2 id={titleId}>
            {creating ? DISTRIBUTORS_CONTENT.form.addTitle : DISTRIBUTORS_CONTENT.form.editTitle}
          </h2>
          <button
            type="button"
            className="dist-x"
            aria-label="Close"
            onClick={() => dispatch(closeDistributorForm())}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="dist-modal-body">
            <div className="dist-grid">
              <label className="dist-field full">
                <span>{DISTRIBUTORS_CONTENT.form.firmName}</span>
                <input
                  ref={firstRef}
                  value={form.legalName}
                  placeholder={DISTRIBUTORS_CONTENT.form.firmPlaceholder}
                  onChange={(event) =>
                    dispatch(patchDistributorForm({ legalName: event.target.value }))
                  }
                />
              </label>
              <label className="dist-field">
                <span>{DISTRIBUTORS_CONTENT.form.contact}</span>
                <input
                  value={form.contactPersonName}
                  onChange={(event) =>
                    dispatch(patchDistributorForm({ contactPersonName: event.target.value }))
                  }
                />
              </label>
              <label className="dist-field">
                <span>{DISTRIBUTORS_CONTENT.form.phone}</span>
                <input
                  value={form.phone}
                  placeholder={DISTRIBUTORS_CONTENT.form.phonePlaceholder}
                  onChange={(event) =>
                    dispatch(patchDistributorForm({ phone: event.target.value }))
                  }
                />
              </label>
              <label className="dist-field">
                <span>{DISTRIBUTORS_CONTENT.form.email}</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    dispatch(patchDistributorForm({ email: event.target.value }))
                  }
                />
              </label>
              <label className="dist-field">
                <span>{DISTRIBUTORS_CONTENT.form.gstin}</span>
                <input
                  value={form.gstin}
                  placeholder={DISTRIBUTORS_CONTENT.form.gstinPlaceholder}
                  onChange={(event) =>
                    dispatch(patchDistributorForm({ gstin: event.target.value }))
                  }
                />
              </label>
              <label className="dist-field">
                <span>{DISTRIBUTORS_CONTENT.form.drugLicense}</span>
                <input
                  value={form.drugLicenseNumber}
                  placeholder={DISTRIBUTORS_CONTENT.form.drugLicensePlaceholder}
                  onChange={(event) =>
                    dispatch(patchDistributorForm({ drugLicenseNumber: event.target.value }))
                  }
                />
              </label>
              <label className="dist-field full">
                <span>{DISTRIBUTORS_CONTENT.form.address}</span>
                <input
                  value={form.addressLine1}
                  onChange={(event) =>
                    dispatch(patchDistributorForm({ addressLine1: event.target.value }))
                  }
                />
              </label>
              <label className="dist-field">
                <span>{DISTRIBUTORS_CONTENT.form.city}</span>
                <input
                  value={form.city}
                  onChange={(event) =>
                    dispatch(patchDistributorForm({ city: event.target.value }))
                  }
                />
              </label>
              <label className="dist-field">
                <span>{DISTRIBUTORS_CONTENT.form.state}</span>
                <input
                  value={form.state}
                  onChange={(event) =>
                    dispatch(patchDistributorForm({ state: event.target.value }))
                  }
                />
              </label>
              <label className="dist-field">
                <span>{DISTRIBUTORS_CONTENT.form.pincode}</span>
                <input
                  value={form.pincode}
                  onChange={(event) =>
                    dispatch(patchDistributorForm({ pincode: event.target.value }))
                  }
                />
              </label>
              <label className="dist-field">
                <span>{DISTRIBUTORS_CONTENT.form.paymentTerms}</span>
                <select
                  value={form.paymentTermsChoice}
                  onChange={(event) =>
                    dispatch(
                      patchDistributorForm({
                        paymentTermsChoice: event.target.value as PaymentTermsChoice,
                      }),
                    )
                  }
                >
                  {PAYMENT_TERM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dist-field">
                <span>{DISTRIBUTORS_CONTENT.form.outstanding}</span>
                <input value={formatPaise(outstanding)} disabled readOnly />
                <p className="dist-hint">{DISTRIBUTORS_CONTENT.form.outstandingHint}</p>
              </label>
              <div className="dist-toggle-row full">
                <span>{DISTRIBUTORS_CONTENT.form.active}</span>
                <button
                  type="button"
                  className="dist-switch"
                  data-on={form.status === 'ACTIVE' ? 'true' : 'false'}
                  aria-pressed={form.status === 'ACTIVE'}
                  aria-label={DISTRIBUTORS_CONTENT.form.active}
                  onClick={() =>
                    dispatch(
                      patchDistributorForm({
                        status: form.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                      }),
                    )
                  }
                >
                  <i aria-hidden />
                </button>
              </div>
            </div>
          </div>

          <div className="dist-modal-foot">
            {!creating && outstanding > 0 ? (
              <button
                type="button"
                className="dist-btn dist-btn-ghost"
                style={{ marginRight: 'auto' }}
                onClick={() => dispatch(openPayDialog())}
              >
                {DISTRIBUTORS_CONTENT.form.recordPayment}
              </button>
            ) : null}
            <button
              type="button"
              className="dist-btn dist-btn-ghost"
              onClick={() => dispatch(closeDistributorForm())}
            >
              {DISTRIBUTORS_CONTENT.form.cancel}
            </button>
            <button type="submit" className="dist-btn dist-btn-primary" disabled={busy}>
              {busy
                ? DISTRIBUTORS_CONTENT.form.saving
                : creating
                  ? DISTRIBUTORS_CONTENT.form.create
                  : DISTRIBUTORS_CONTENT.form.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
