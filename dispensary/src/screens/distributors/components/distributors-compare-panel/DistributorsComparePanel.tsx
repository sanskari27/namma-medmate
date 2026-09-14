import { DISTRIBUTORS_CONTENT } from '../../DistributorsScreen.content';

export function DistributorsComparePanel() {
  return (
    <div className="dist-card">
      <div className="dist-card-head">
        <h2>Purchase-price comparison</h2>
      </div>
      <div className="dist-empty">
        <strong>{DISTRIBUTORS_CONTENT.compareEmptyTitle}</strong>
        {DISTRIBUTORS_CONTENT.compareEmptyBody}
      </div>
    </div>
  );
}
