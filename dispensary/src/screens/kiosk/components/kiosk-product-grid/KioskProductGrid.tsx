import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import {
  selectCartQtyByProduct,
  selectKioskCategory,
  selectKioskCategories,
  selectKioskConfigDraft,
  selectKioskVisibleCatalogue,
} from '../../store/kiosk.selectors';
import { addToCart, setCategory } from '../../store';
import { formatPaise, packLabel, productIcon } from '../../KioskScreen.utils';
import { KioskSearchBar } from '../kiosk-search-bar';

export function KioskProductGrid() {
  const dispatch = useDispatch<AppDispatch>();
  const categories = useSelector(selectKioskCategories);
  const category = useSelector(selectKioskCategory);
  const products = useSelector(selectKioskVisibleCatalogue);
  const qtyMap = useSelector(selectCartQtyByProduct);
  const config = useSelector(selectKioskConfigDraft);

  return (
    <div className="ko-browse">
      <KioskSearchBar />
      <div className="ko-cats" role="tablist" aria-label="Categories">
        {categories.map((name) => (
          <button
            key={name}
            type="button"
            className="ko-chip"
            data-on={category === name}
            onClick={() => dispatch(setCategory(name))}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="ko-products">
        {products.map((row) => {
          const packKey = `${row.productId}:pack`;
          const qty = qtyMap[packKey] ?? 0;
          return (
            <button
              key={row.productId}
              type="button"
              className="ko-pcard"
              onClick={() => dispatch(addToCart({ row, loose: false }))}
            >
              {qty > 0 ? <span className="added">{qty}</span> : null}
              <div className="em" aria-hidden>
                {productIcon(row)}
              </div>
              <div className="nm">{row.name}</div>
              <div className="sub">{packLabel(row)}</div>
              {config.showPrices ? (
                <div className="pr">{formatPaise(row.mrpPaise)}</div>
              ) : null}
              {row.prescriptionRequired ? <span className="rx">Rx</span> : null}
              {row.looseSellingEnabled && row.looseUnitPaise != null && config.showPrices ? (
                <span
                  className="ko-loose"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(addToCart({ row, loose: true }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      dispatch(addToCart({ row, loose: true }));
                    }
                  }}
                >
                  1 {row.baseUnit.toLowerCase()} · {formatPaise(row.looseUnitPaise)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
