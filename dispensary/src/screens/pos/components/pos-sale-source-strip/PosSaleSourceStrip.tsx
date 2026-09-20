import { BedDouble, Siren, Stethoscope, Store } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { hasHospitalAccess } from '@/libs/hospitalAccess';
import type { AppDispatch, RootState } from '@/store';
import type { InvoiceSaleSource } from '@/services/salesInvoices';
import { POS_CONTENT } from '../../PosScreen.content';
import {
  doctorChanged,
  saleSourceChanged,
  saleUhidChanged,
  saleWardChanged,
} from '../../store/pos.slice';
import {
  selectPosBusy,
  selectPosCollected,
  selectPosHospitalDoctors,
  selectPosHospitalWards,
  selectPosSaleSource,
  selectPosSelectedDoctorId,
  selectPosUhid,
  selectPosWardId,
} from '../../store/pos.selectors';

const SOURCES: { id: InvoiceSaleSource; label: string; Icon: typeof Store }[] = [
  { id: 'COUNTER', label: POS_CONTENT.saleSource.counter, Icon: Store },
  { id: 'OPD_RX', label: POS_CONTENT.saleSource.opdRx, Icon: Stethoscope },
  { id: 'WARD', label: POS_CONTENT.saleSource.ward, Icon: BedDouble },
  { id: 'EMERGENCY', label: POS_CONTENT.saleSource.emergency, Icon: Siren },
];

export function PosSaleSourceStrip() {
  const dispatch = useDispatch<AppDispatch>();
  const modules = useSelector((state: RootState) => state.auth.user?.modules);
  const saleSource = useSelector(selectPosSaleSource);
  const uhid = useSelector(selectPosUhid);
  const wardId = useSelector(selectPosWardId);
  const wards = useSelector(selectPosHospitalWards);
  const doctors = useSelector(selectPosHospitalDoctors);
  const selectedDoctorId = useSelector(selectPosSelectedDoctorId);
  const busy = useSelector(selectPosBusy);
  const collected = useSelector(selectPosCollected);
  const disabled = busy || collected;

  if (!hasHospitalAccess(modules)) {
    return null;
  }

  const needsStay = saleSource === 'WARD' || saleSource === 'EMERGENCY';

  return (
    <section className="pos-sale-source" aria-label={POS_CONTENT.saleSource.aria}>
      <p className="pos-sale-source-label">{POS_CONTENT.saleSource.aria}</p>
      <div className="pos-sale-source-chips" role="group" aria-label={POS_CONTENT.saleSource.aria}>
        {SOURCES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className="pos-sale-source-chip"
            data-active={saleSource === id}
            disabled={disabled}
            onClick={() => dispatch(saleSourceChanged(id))}
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {needsStay ? (
        <div className="pos-sale-source-fields">
          <label>
            {POS_CONTENT.saleSource.uhid}
            <input
              value={uhid}
              disabled={disabled}
              autoComplete="off"
              aria-label={POS_CONTENT.saleSource.uhid}
              onChange={(event) => dispatch(saleUhidChanged(event.target.value))}
            />
          </label>
          <label>
            {POS_CONTENT.saleSource.wardSelect}
            <select
              value={wardId}
              disabled={disabled}
              aria-label={POS_CONTENT.saleSource.wardSelect}
              required={saleSource === 'WARD'}
              onChange={(event) => dispatch(saleWardChanged(event.target.value))}
            >
              <option value="">{POS_CONTENT.saleSource.wardPlaceholder}</option>
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
      {saleSource === 'OPD_RX' ? (
        <div className="pos-sale-source-fields">
          <label>
            {POS_CONTENT.saleSource.doctor}
            <select
              value={selectedDoctorId}
              disabled={disabled}
              aria-label={POS_CONTENT.saleSource.doctor}
              onChange={(event) => dispatch(doctorChanged(event.target.value))}
            >
              <option value="">{POS_CONTENT.saleSource.doctorPlaceholder}</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.doctorId}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </section>
  );
}
