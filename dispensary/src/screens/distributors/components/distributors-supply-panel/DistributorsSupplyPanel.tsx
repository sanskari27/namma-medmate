import { DISTRIBUTORS_CONTENT } from '../../DistributorsScreen.content';

export function DistributorsSupplyPanel() {
  return (
    <div className="dist-card">
      <div className="dist-card-head">
        <h2>Medicines & devices by distributor</h2>
      </div>
      <div className="dist-empty">
        <strong>{DISTRIBUTORS_CONTENT.supplyEmptyTitle}</strong>
        {DISTRIBUTORS_CONTENT.supplyEmptyBody}
      </div>
    </div>
  );
}
