import type { HospitalActivePatient } from '@/services/hospital';
import { HOSPITAL_PATIENTS_CONTENT } from '../../HospitalPatientsScreen.content';
import {
  formatPaise,
  locationCopy,
  patientRowKey,
} from '../../HospitalPatientsScreen.utils';

type Props = {
  items: HospitalActivePatient[];
  selectedKey: string | null;
  emptyCopy: string;
  onSelect: (row: HospitalActivePatient) => void;
};

export function HospitalPatientsListPanel({ items, selectedKey, emptyCopy, onSelect }: Props) {
  return (
    <section className="hp-panel" aria-label={HOSPITAL_PATIENTS_CONTENT.listLabel}>
      {items.length === 0 ? (
        <p className="hp-empty">{emptyCopy}</p>
      ) : (
        items.map((row) => {
          const key = patientRowKey(row);
          return (
            <button
              key={key}
              type="button"
              className="hp-row"
              data-patient-key={key}
              aria-selected={key === selectedKey}
              onClick={() => onSelect(row)}
            >
              <span>
                <strong>{row.patientName}</strong>
                <span className="hp-mono">{row.uhid}</span>
              </span>
              <span>{locationCopy(row)}</span>
              <span className="hp-mono">{formatPaise(row.unpaidPaise)}</span>
            </button>
          );
        })
      )}
    </section>
  );
}
