import { CategoryMark } from '@atoms';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import type { SalesCatalogueItem } from '@/services/salesCatalogue';
import { POS_CONTENT } from '../../PosScreen.content';
import { formatPaise, restorePosSearchFocus } from '../../PosScreen.utils';
import {
  selectPosBusy,
  selectPosCartQtyByProductId,
  selectPosCatalogue,
} from '../../store/pos.selectors';
import { addProduct } from '../../store/pos.thunks';

function scheduleLabel(item: SalesCatalogueItem): { text: string; kind: 'otc' | 'sch' } {
  const schedule = item.scheduleClassification;
  if (!schedule || schedule === 'OTC' || (!item.prescriptionRequired && !item.controlledSubstance)) {
    return { text: POS_CONTENT.scheduleOtc, kind: 'otc' };
  }
  return { text: `${POS_CONTENT.schedulePrefix} ${schedule}`, kind: 'sch' };
}

function isLowStock(item: SalesCatalogueItem): boolean {
  const threshold = item.reorderLevel ?? item.minimumStock;
  if (threshold == null) {
    return false;
  }
  return item.onHandQuantity < threshold;
}

function canSellLoose(item: SalesCatalogueItem): boolean {
  return item.packSize > 1 && item.baseUnit !== item.packUnit;
}

function looseUnitPaise(item: SalesCatalogueItem): number | null {
  if (!canSellLoose(item)) {
    return null;
  }
  const packPaise = item.suggestedSellingPaise ?? item.suggestedMrpPaise;
  if (packPaise == null || item.packSize <= 0) {
    return null;
  }
  return Math.round(packPaise / item.packSize);
}

export function PosProductCard({ item }: { item: SalesCatalogueItem }) {
  const dispatch = useDispatch<AppDispatch>();
  const busy = useSelector(selectPosBusy);
  const qtyMap = useSelector(selectPosCartQtyByProductId);
  const qty = qtyMap.get(item.id) ?? 0;
  const badge = scheduleLabel(item);
  const mrp = item.suggestedMrpPaise ?? item.suggestedSellingPaise ?? 0;
  const loose = looseUnitPaise(item);
  const warn = isLowStock(item);
  const loosePrice = loose != null ? formatPaise(loose) : null;

  return (
    <div className="pos-card" data-disabled={busy || undefined}>
      <button
        type="button"
        className="pos-card-main"
        disabled={busy}
        onClick={() =>
          void dispatch(addProduct({ item, mode: 'pack' })).finally(restorePosSearchFocus)
        }
        aria-label={POS_CONTENT.addPackAria(item.name)}
      >
        <span className="pos-card-badge" data-kind={badge.kind}>
          {badge.text}
        </span>
        <div className="pos-card-top">
          <CategoryMark icon={item.categoryIcon} size="sm" />
          <div>
            <div className="pos-card-name">{item.name}</div>
            <div className="pos-card-pack">
              {item.packDescription?.trim() ||
                `${item.packSize} ${item.packUnit}${item.packSize === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>
        {item.rackLocation ? <span className="pos-card-rack">{item.rackLocation}</span> : null}
        <div className="pos-card-price">{formatPaise(mrp)}</div>
        <div className="pos-card-stock" data-warn={warn}>
          {item.onHandQuantity} {POS_CONTENT.stockInStock}
          {warn ? ` · ${POS_CONTENT.stockLow}` : ''}
          {qty > 0 ? ` · ${POS_CONTENT.billBaseQty(qty, item.baseUnit)}` : ''}
        </div>
        {qty > 0 ? <span className="pos-card-qty">{qty}</span> : null}
      </button>
      {canSellLoose(item) ? (
        <button
          type="button"
          className="pos-card-loose"
          disabled={busy}
          onClick={() =>
            void dispatch(addProduct({ item, mode: 'loose' })).finally(restorePosSearchFocus)
          }
          aria-label={POS_CONTENT.addLooseAria(item.name, item.baseUnit)}
        >
          {POS_CONTENT.looseLabel(loosePrice, item.baseUnit)}
        </button>
      ) : null}
    </div>
  );
}

export function PosProductGrid() {
  const catalogue = useSelector(selectPosCatalogue);

  if (catalogue.length === 0) {
    return (
      <div className="pos-cart-empty" role="status">
        {POS_CONTENT.catalogueEmpty}
      </div>
    );
  }

  return (
    <div className="pos-grid" aria-label={POS_CONTENT.catalogueAria}>
      {catalogue.map((item) => (
        <PosProductCard key={item.id} item={item} />
      ))}
    </div>
  );
}
