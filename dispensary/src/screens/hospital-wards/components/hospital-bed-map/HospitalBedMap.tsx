import type { HospitalWard } from '@/services/hospital';
import { HOSPITAL_WARDS_CONTENT } from '../../HospitalWardsScreen.content';
import { categoryLabel } from '../../HospitalWardsScreen.utils';

type HospitalBedMapProps = {
  wards: HospitalWard[];
  onEditWard: (ward: HospitalWard, trigger: HTMLButtonElement) => void;
  onSelectBed: (ward: HospitalWard, bedId: string, bedLabel: string, occupied: boolean) => void;
};

export function HospitalBedMap({ wards, onEditWard, onSelectBed }: HospitalBedMapProps) {
  return (
    <section className="hw-bed-map" aria-label={HOSPITAL_WARDS_CONTENT.bedMapLabel}>
      {wards.map((ward) => (
        <article key={ward.id} className="hw-ward-block">
          <header className="hw-ward-head">
            <div>
              <h2 className="text-sm font-semibold text-ink">{ward.name}</h2>
              <p className="hw-ward-meta">
                {ward.code}
                {ward.floor ? ` · Floor ${ward.floor}` : ''}
                {` · ${categoryLabel(ward.category)}`}
                {ward.nurseInCharge ? ` · ${ward.nurseInCharge}` : ''}
              </p>
            </div>
            <button
              type="button"
              className="text-sm text-brand underline"
              onClick={(event) => onEditWard(ward, event.currentTarget)}
            >
              {HOSPITAL_WARDS_CONTENT.editWard}
            </button>
          </header>
          <div className="hw-bed-grid">
            {ward.beds.map((bed) => {
              const occupied = bed.occupancyStatus === 'OCCUPIED';
              return (
                <button
                  key={bed.id}
                  type="button"
                  className="hw-bed"
                  data-state={occupied ? 'occupied' : 'free'}
                  aria-label={`${bed.label} ${occupied ? HOSPITAL_WARDS_CONTENT.bedOccupied : HOSPITAL_WARDS_CONTENT.bedFree}`}
                  onClick={() => onSelectBed(ward, bed.id, bed.label, occupied)}
                >
                  {bed.label}
                  <span className="hw-bed-state">
                    {occupied ? HOSPITAL_WARDS_CONTENT.bedOccupied : HOSPITAL_WARDS_CONTENT.bedFree}
                  </span>
                </button>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}
