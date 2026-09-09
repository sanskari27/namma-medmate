import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { DoctorReferenceDialog } from '@/components/templates/doctor-reference-dialog';
import { listDoctors } from '@/services/doctors';
import type { ProductUnit } from '@/services/products';
import type { AppDispatch } from '@/store';
import { PosCustomerDialog } from '../pos-customer-dialog';
import {
  batchChanged,
  clearBill,
  clearCustomer,
  doctorChanged,
  doctorsLoaded,
  prescribedQuantityChanged,
  prescriptionAttachmentChanged,
  prescriptionReferenceChanged,
  prescriptionVerifiedChanged,
  quantityChanged,
  removeProduct,
} from '../../store/pos.slice';
import {
  selectPosBusy,
  selectPosCanDispense,
  selectPosCustomerChosen,
  selectPosCustomerDisplayName,
  selectPosCustomerPhone,
  selectPosDoctors,
  selectPosDraft,
  selectPosPrescriptionAttachmentName,
  selectPosPrescriptionDraft,
  selectPosPrescriptionReference,
  selectPosPrescriptionVerified,
  selectPosSelectedCustomer,
  selectPosSelectedDoctorId,
  selectPosWalkIn,
} from '../../store/pos.selectors';
import { changeLineUnit, saveInvoice } from '../../store/pos.thunks';
import { POS_CONTENT } from '../../PosScreen.content';
import {
  formatPaise,
  isControlledProduct,
  isPrescriptionProduct,
  rupeesToPaise,
} from '../../PosScreen.utils';

export function PosCartPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const draft = useSelector(selectPosDraft);
  const busy = useSelector(selectPosBusy);
  const customerChosen = useSelector(selectPosCustomerChosen);
  const customerName = useSelector(selectPosCustomerDisplayName);
  const customerPhone = useSelector(selectPosCustomerPhone);
  const selectedCustomer = useSelector(selectPosSelectedCustomer);
  const walkIn = useSelector(selectPosWalkIn);
  const needsRx = useSelector(selectPosPrescriptionDraft);
  const prescriptionVerified = useSelector(selectPosPrescriptionVerified);
  const prescriptionReference = useSelector(selectPosPrescriptionReference);
  const attachmentName = useSelector(selectPosPrescriptionAttachmentName);
  const doctors = useSelector(selectPosDoctors);
  const selectedDoctorId = useSelector(selectPosSelectedDoctorId);
  const canDispense = useSelector(selectPosCanDispense);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);

  const rxLines = draft.filter((line) => isPrescriptionProduct(line.product));
  const controlledDraft = draft.some((line) => isControlledProduct(line.product));
  const rxLocked = busy || (controlledDraft && !canDispense);

  return (
    <aside className="pos-cart" aria-label={POS_CONTENT.cartAria}>
      <div className="pos-cart-head">
        <h2>{POS_CONTENT.cartTitle}</h2>
        {draft.length > 0 ? (
          <button
            type="button"
            className="pos-cart-clear"
            disabled={busy}
            onClick={() => dispatch(clearBill())}
          >
            {POS_CONTENT.cartClear}
          </button>
        ) : null}
      </div>
      <div className="pos-cart-body">
        {draft.length === 0 ? (
          <div className="pos-cart-empty" role="status">
            {POS_CONTENT.cartEmpty}
          </div>
        ) : (
          draft.map((line) => {
            const qty = Number(line.quantity) || 1;
            const unitPaise = rupeesToPaise(line.sellingRupees);
            const baseEach = line.baseQuantity != null ? line.baseQuantity / qty : null;
            return (
              <div key={line.id} className="pos-cart-line">
                <div className="pos-cart-line-top">
                  <div>
                    <div className="pos-cart-line-name">{line.product.name}</div>
                    <div className="pos-cart-line-price">
                      {unitPaise != null
                        ? POS_CONTENT.ratePerUnit(formatPaise(unitPaise), line.unit)
                        : line.unit}
                      {baseEach != null && line.unit !== line.product.baseUnit
                        ? POS_CONTENT.unitEach(baseEach, line.product.baseUnit)
                        : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pos-cart-remove"
                    aria-label={POS_CONTENT.removeLineAria(line.product.name, line.unit)}
                    disabled={busy}
                    onClick={() => dispatch(removeProduct(line.id))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="pos-cart-line-meta">
                  <select
                    aria-label={POS_CONTENT.unitAria(line.product.name)}
                    value={line.unit}
                    disabled={busy}
                    onChange={(event) =>
                      void dispatch(
                        changeLineUnit({
                          lineId: line.id,
                          unit: event.target.value as ProductUnit,
                        }),
                      )
                    }
                  >
                    {line.unitOptions.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                        {unit === line.product.baseUnit
                          ? POS_CONTENT.unitLooseSuffix
                          : unit === line.product.packUnit
                            ? POS_CONTENT.unitPackSuffix
                            : ''}
                      </option>
                    ))}
                  </select>
                  {line.product.requiresBatchTracking ? (
                    <select
                      aria-label={POS_CONTENT.batchAria(line.product.name, line.unit)}
                      value={line.batchId ?? ''}
                      disabled={busy}
                      onChange={(event) =>
                        dispatch(
                          batchChanged({
                            lineId: line.id,
                            batchId: event.target.value,
                          }),
                        )
                      }
                    >
                      <option value="">{POS_CONTENT.batchSelect}</option>
                      {line.batches
                        .filter((batch) => batch.batchId && !batch.expired)
                        .map((batch) => (
                          <option key={batch.batchId!} value={batch.batchId!}>
                            {batch.batchNumber ?? batch.batchId}
                            {batch.nearExpiry ? ` · ${POS_CONTENT.batchNearExpiry}` : ''}
                          </option>
                        ))}
                    </select>
                  ) : null}
                  <div
                    className="pos-qty"
                    aria-label={POS_CONTENT.qtyAria(line.product.name, line.unit)}
                  >
                    <button
                      type="button"
                      disabled={busy || qty <= 1}
                      onClick={() =>
                        dispatch(
                          quantityChanged({
                            lineId: line.id,
                            quantity: String(Math.max(1, qty - 1)),
                          }),
                        )
                      }
                    >
                      −
                    </button>
                    <span>{qty}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        dispatch(
                          quantityChanged({
                            lineId: line.id,
                            quantity: String(qty + 1),
                          }),
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="pos-cart-footer">
        {customerChosen ? (
          <div className="pos-customer-row">
            <div>
              <strong>{customerName}</strong>
              <span>
                {walkIn
                  ? POS_CONTENT.walkInSale
                  : (customerPhone ?? selectedCustomer?.phone ?? POS_CONTENT.noPhone)}
              </span>
            </div>
            <button
              type="button"
              className="pos-customer-change"
              disabled={busy}
              onClick={() => {
                dispatch(clearCustomer());
                setCustomerOpen(true);
              }}
            >
              {POS_CONTENT.changeCustomer}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="pos-customer-btn"
            disabled={busy}
            onClick={() => setCustomerOpen(true)}
          >
            {POS_CONTENT.selectCustomer}
          </button>
        )}

        {needsRx ? (
          <section className="pos-rx" aria-label={POS_CONTENT.rxAria}>
            <h3>{POS_CONTENT.rxTitle}</h3>
            <p>{POS_CONTENT.rxHelp}</p>
            <label className="pos-rx-check">
              <input
                type="checkbox"
                checked={prescriptionVerified}
                disabled={rxLocked}
                onChange={(event) =>
                  dispatch(prescriptionVerifiedChanged(event.target.checked))
                }
              />
              {POS_CONTENT.rxVerified}
            </label>
            <label>
              {POS_CONTENT.rxReference}
              <input
                type="text"
                value={prescriptionReference}
                disabled={rxLocked}
                onChange={(event) =>
                  dispatch(prescriptionReferenceChanged(event.target.value))
                }
                placeholder={POS_CONTENT.rxReferencePlaceholder}
                autoComplete="off"
              />
            </label>
            <div className="pos-rx-file">
              <input
                type="file"
                accept="image/*,.pdf"
                disabled={rxLocked}
                aria-label={POS_CONTENT.rxUploadAria}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  dispatch(prescriptionAttachmentChanged(file?.name ?? ''));
                }}
              />
              {attachmentName ? (
                <span className="pos-rx-file-name">{attachmentName}</span>
              ) : null}
            </div>
            {rxLines.map((line) => (
              <label key={line.id}>
                {POS_CONTENT.rxPrescribed(line.product.name, line.unit)}
                <input
                  type="text"
                  inputMode="decimal"
                  value={line.prescribedQuantity}
                  disabled={rxLocked}
                  onChange={(event) =>
                    dispatch(
                      prescribedQuantityChanged({
                        lineId: line.id,
                        value: event.target.value,
                      }),
                    )
                  }
                />
              </label>
            ))}
            <label>
              {POS_CONTENT.rxDoctor}
              <select
                value={selectedDoctorId}
                disabled={rxLocked}
                onChange={(event) => dispatch(doctorChanged(event.target.value))}
              >
                <option value="">{POS_CONTENT.rxDoctorSelect}</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                    {doctor.registrationNumber ? ` · ${doctor.registrationNumber}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="pos-rx-actions">
              <button type="button" disabled={rxLocked} onClick={() => setDoctorOpen(true)}>
                {POS_CONTENT.rxAddDoctor}
              </button>
            </div>
          </section>
        ) : null}

        <button
          type="button"
          className="pos-proceed"
          disabled={busy || draft.length === 0 || !customerChosen}
          onClick={() => void dispatch(saveInvoice({ advanceToPayment: true }))}
        >
          {POS_CONTENT.proceed}
        </button>
      </div>

      <PosCustomerDialog open={customerOpen} onOpenChange={setCustomerOpen} />
      <DoctorReferenceDialog
        open={doctorOpen}
        onOpenChange={setDoctorOpen}
        onSaved={() => {
          void listDoctors()
            .then((rows) => dispatch(doctorsLoaded(rows)))
            .catch(() => undefined);
        }}
      />
    </aside>
  );
}
