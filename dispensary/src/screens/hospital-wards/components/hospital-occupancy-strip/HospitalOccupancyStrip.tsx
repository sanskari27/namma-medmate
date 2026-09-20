import { HOSPITAL_WARDS_CONTENT } from '../../HospitalWardsScreen.content';

type HospitalOccupancyStripProps = {
  wardCount: number;
  totalBeds: number;
  occupiedBeds: number;
  freeBeds: number;
  occupancyPercent: number;
  admittedCount: number;
};

export function HospitalOccupancyStrip({
  wardCount,
  totalBeds,
  occupiedBeds,
  freeBeds,
  occupancyPercent,
  admittedCount,
}: HospitalOccupancyStripProps) {
  return (
    <dl className="hw-kpi-strip" aria-label="Occupancy totals">
      <div className="hw-kpi">
        <dt>{HOSPITAL_WARDS_CONTENT.kpiWards}</dt>
        <dd>{wardCount}</dd>
      </div>
      <div className="hw-kpi">
        <dt>{HOSPITAL_WARDS_CONTENT.kpiTotalBeds}</dt>
        <dd>{totalBeds}</dd>
      </div>
      <div className="hw-kpi">
        <dt>{HOSPITAL_WARDS_CONTENT.kpiOccupied}</dt>
        <dd>{occupiedBeds}</dd>
      </div>
      <div className="hw-kpi">
        <dt>{HOSPITAL_WARDS_CONTENT.kpiFree}</dt>
        <dd>{freeBeds}</dd>
      </div>
      <div className="hw-kpi">
        <dt>{HOSPITAL_WARDS_CONTENT.kpiOccupancy}</dt>
        <dd>{HOSPITAL_WARDS_CONTENT.occupancySummary(occupancyPercent)}</dd>
      </div>
      <div className="hw-kpi">
        <dt>{HOSPITAL_WARDS_CONTENT.kpiAdmitted}</dt>
        <dd>{HOSPITAL_WARDS_CONTENT.admittedSummary(admittedCount)}</dd>
      </div>
    </dl>
  );
}
