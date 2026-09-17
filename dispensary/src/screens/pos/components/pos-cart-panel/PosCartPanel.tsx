import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DoctorReferenceDialog } from '@/components/templates/doctor-reference-dialog';
import { listDoctors } from '@/services/doctors';
import type { AppDispatch } from '@/store';
import { PosCartLine } from '../pos-cart-line';
import { PosCustomerDialog } from '../pos-customer-dialog';
import { PosDueRefills } from '../pos-due-refills';
import { PosOfferPanel } from '../pos-offer-panel';
import { setPendingPrescriptionFile } from '../../pos.prescriptionFile';
import {
  clearBill,
  clearCustomer,
  doctorChanged,
  doctorsLoaded,
  prescribedQuantityChanged,
  prescriptionAttachmentChanged,
  prescriptionReferenceChanged,
  prescriptionVerifiedChanged,
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
  selectPosRxFulfillment,
  selectPosRxFulfillmentLoading,
  selectPosSelectedCustomer,
  selectPosSelectedDoctorId,
  selectPosWalkIn,
} from '../../store/pos.selectors';
import { saveInvoice, loadRxFulfillment } from '../../store/pos.thunks';
import { POS_CONTENT } from '../../PosScreen.content';
import { isControlledProduct, isPrescriptionProduct } from '../../PosScreen.utils';

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
  const rxFulfillment = useSelector(selectPosRxFulfillment);
  const rxLoading = useSelector(selectPosRxFulfillmentLoading);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);

  const rxLines = draft.filter((line) => isPrescriptionProduct(line.product));
  const controlledDraft = draft.some((line) => isControlledProduct(line.product));
  const rxLocked = busy || (controlledDraft && !canDispense);
  const remainingQty = rxFulfillment.reduce(
    (sum, item) => sum + (Number(item.remainingQuantity) || 0),
    0,
  );

  useEffect(() => {
    if (!selectedCustomer || !prescriptionReference.trim()) {
      return;
    }
    const handle = window.setTimeout(() => {
      void dispatch(loadRxFulfillment());
    }, 200);
    return () => window.clearTimeout(handle);
  }, [dispatch, selectedCustomer, prescriptionReference]);

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
      <PosDueRefills />
      <div className="pos-cart-body">
        {draft.length === 0 ? (
          <div className="pos-cart-empty" role="status">
            {POS_CONTENT.cartEmpty}
          </div>
        ) : (
          draft.map((line) => <PosCartLine key={line.id} line={line} />)
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
            {controlledDraft && !canDispense ? (
              <p>{POS_CONTENT.rxPharmacist}</p>
            ) : null}
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
                  const file = event.target.files?.[0] ?? null;
                  setPendingPrescriptionFile(file);
                  dispatch(prescriptionAttachmentChanged(file?.name ?? ''));
                }}
              />
              {attachmentName ? (
                <span className="pos-rx-file-name">{attachmentName}</span>
              ) : null}
            </div>
            {rxLines.map((line) => (
              <label key={line.id}>
                {POS_CONTENT.rxPrescribed(line.product.name)}
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
            {selectedCustomer && prescriptionReference.trim() ? (
              <p>
                {rxLoading
                  ? POS_CONTENT.rxChecking
                  : rxFulfillment.length === 0
                    ? POS_CONTENT.rxEmptyFills
                    : POS_CONTENT.rxRemaining(remainingQty)}
              </p>
            ) : null}
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

        <PosOfferPanel />

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
