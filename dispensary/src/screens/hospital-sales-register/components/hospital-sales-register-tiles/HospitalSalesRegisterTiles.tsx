import type { HospitalSalesRegisterSource, HospitalSalesRegisterTile } from '@/services/hospital';
import { HOSPITAL_SALES_REGISTER_CONTENT } from '../../HospitalSalesRegisterScreen.content';
import { formatPaise, sourceLabel } from '../../HospitalSalesRegisterScreen.utils';

type Props = {
  tiles: HospitalSalesRegisterTile[];
  selected: HospitalSalesRegisterSource | '';
  disabled: boolean;
  onSelect: (source: HospitalSalesRegisterSource | '') => void;
};

export function HospitalSalesRegisterTiles({ tiles, selected, disabled, onSelect }: Props) {
  return (
    <div className="ps-tiles" aria-label={HOSPITAL_SALES_REGISTER_CONTENT.tilesLabel}>
      {tiles
        .filter((tile) => tile.source !== 'ONLINE')
        .map((tile) => (
          <button
            key={tile.source}
            type="button"
            className="ps-tile"
            disabled={disabled}
            aria-pressed={selected === tile.source}
            onClick={() =>
              onSelect(
                selected === tile.source ? '' : (tile.source as HospitalSalesRegisterSource),
              )
            }
          >
            <span>{sourceLabel(tile.source)}</span>
            <strong>{tile.count}</strong>
            <span>{formatPaise(tile.revenuePaise)}</span>
          </button>
        ))}
    </div>
  );
}
