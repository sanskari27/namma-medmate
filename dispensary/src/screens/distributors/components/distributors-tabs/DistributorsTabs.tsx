import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { DISTRIBUTORS_CONTENT } from '../../DistributorsScreen.content';
import { selectDistributorsItems, selectDistributorsTab } from '../../store/distributors.selectors';
import { setDistributorsTab } from '../../store/distributors.slice';
import type { DistributorsTab } from '../../DistributorsScreen.utils';

export function DistributorsTabs() {
  const dispatch = useDispatch<AppDispatch>();
  const tab = useSelector(selectDistributorsTab);
  const items = useSelector(selectDistributorsItems);
  const supplyCount = items.reduce(
    (sum, row) => sum + (row.productLineCount ?? row.categoryIds.length),
    0,
  );

  const tabs: { id: DistributorsTab; label: string }[] = [
    {
      id: 'distributors',
      label: `${DISTRIBUTORS_CONTENT.tabs.distributors} (${items.length})`,
    },
    {
      id: 'supply',
      label: `${DISTRIBUTORS_CONTENT.tabs.supply} (${supplyCount})`,
    },
    { id: 'compare', label: DISTRIBUTORS_CONTENT.tabs.compare },
  ];

  return (
    <div className="dist-tabs" role="tablist" aria-label="Distributor views">
      {tabs.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          data-on={tab === item.id ? 'true' : 'false'}
          aria-selected={tab === item.id}
          onClick={() => dispatch(setDistributorsTab(item.id))}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
