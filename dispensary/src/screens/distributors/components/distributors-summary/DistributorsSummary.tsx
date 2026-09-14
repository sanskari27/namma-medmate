import { Boxes, CreditCard, Truck, UserRound } from 'lucide-react';
import { useSelector } from 'react-redux';
import { DISTRIBUTORS_CONTENT } from '../../DistributorsScreen.content';
import { formatPaiseWhole } from '../../DistributorsScreen.utils';
import {
  selectDistributorsSummary,
  selectDistributorsTab,
} from '../../store/distributors.selectors';

export function DistributorsSummary() {
  const tab = useSelector(selectDistributorsTab);
  const stats = useSelector(selectDistributorsSummary);

  if (tab === 'supply') {
    return (
      <div className="dist-stats" data-cols="3" aria-label="Supply list summary">
        <div className="dist-stat" data-tone="blue">
          <div className="ico" aria-hidden>
            <Boxes size={15} strokeWidth={1.8} />
          </div>
          <div className="k">{DISTRIBUTORS_CONTENT.summary.supplyItems}</div>
          <div className="v">{stats.products}</div>
          <div className="s">{DISTRIBUTORS_CONTENT.summary.supplyItemsHint}</div>
        </div>
        <div className="dist-stat" data-tone="green">
          <div className="ico" aria-hidden>
            <Truck size={15} strokeWidth={1.8} />
          </div>
          <div className="k">{DISTRIBUTORS_CONTENT.summary.multiSource}</div>
          <div className="v">0</div>
          <div className="s">{DISTRIBUTORS_CONTENT.summary.multiSourceHint}</div>
        </div>
        <div className="dist-stat" data-tone="gold">
          <div className="ico" aria-hidden>
            <UserRound size={15} strokeWidth={1.8} />
          </div>
          <div className="k">{DISTRIBUTORS_CONTENT.summary.preferred}</div>
          <div className="v">0</div>
          <div className="s">{DISTRIBUTORS_CONTENT.summary.preferredHint}</div>
        </div>
      </div>
    );
  }

  if (tab === 'compare') {
    return (
      <div className="dist-stats" data-cols="3" aria-label="Price compare summary">
        <div className="dist-stat" data-tone="blue">
          <div className="ico" aria-hidden>
            <Boxes size={15} strokeWidth={1.8} />
          </div>
          <div className="k">{DISTRIBUTORS_CONTENT.summary.comparable}</div>
          <div className="v">0</div>
          <div className="s">{DISTRIBUTORS_CONTENT.summary.comparableHint}</div>
        </div>
        <div className="dist-stat" data-tone="green">
          <div className="ico" aria-hidden>
            <CreditCard size={15} strokeWidth={1.8} />
          </div>
          <div className="k">{DISTRIBUTORS_CONTENT.summary.saving}</div>
          <div className="v" style={{ fontSize: 22 }}>
            ₹0
          </div>
          <div className="s">{DISTRIBUTORS_CONTENT.summary.savingHint}</div>
        </div>
        <div className="dist-stat" data-tone="orange">
          <div className="ico" aria-hidden>
            <Truck size={15} strokeWidth={1.8} />
          </div>
          <div className="k">{DISTRIBUTORS_CONTENT.summary.compared}</div>
          <div className="v">{stats.total}</div>
          <div className="s">{DISTRIBUTORS_CONTENT.summary.comparedHint}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dist-stats" aria-label="Distributors summary">
      <div className="dist-stat" data-tone="blue">
        <div className="ico" aria-hidden>
          <Truck size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{DISTRIBUTORS_CONTENT.summary.distributors}</div>
        <div className="v">{stats.total}</div>
        <div className="s">{DISTRIBUTORS_CONTENT.summary.active(stats.activeCount)}</div>
      </div>
      <div className="dist-stat" data-tone="green">
        <div className="ico" aria-hidden>
          <Boxes size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{DISTRIBUTORS_CONTENT.summary.products}</div>
        <div className="v">{stats.products}</div>
        <div className="s">{DISTRIBUTORS_CONTENT.summary.productsHint}</div>
      </div>
      <div className="dist-stat" data-tone="rose">
        <div className="ico" aria-hidden>
          <CreditCard size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{DISTRIBUTORS_CONTENT.summary.outstanding}</div>
        <div className="v" style={{ fontSize: 22 }}>
          {formatPaiseWhole(stats.outstandingPaise)}
        </div>
        <div className="s">{DISTRIBUTORS_CONTENT.summary.outstandingHint}</div>
      </div>
      <div className="dist-stat" data-tone="orange">
        <div className="ico" aria-hidden>
          <UserRound size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{DISTRIBUTORS_CONTENT.summary.credit}</div>
        <div className="v">{stats.creditCount}</div>
        <div className="s">{DISTRIBUTORS_CONTENT.summary.creditHint}</div>
      </div>
    </div>
  );
}
