import { Search } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { POS_CONTENT } from '../../PosScreen.content';
import { restorePosSearchFocus } from '../../PosScreen.utils';
import {
  barcodeQueryChanged,
  productQueryChanged,
} from '../../store/pos.slice';
import {
  selectPosBarcodeQuery,
  selectPosBusy,
  selectPosCatalogue,
  selectPosProductQuery,
} from '../../store/pos.selectors';
import { addProduct, scanBarcode } from '../../store/pos.thunks';

export function PosToolbar() {
  const dispatch = useDispatch<AppDispatch>();
  const barcodeQuery = useSelector(selectPosBarcodeQuery);
  const productQuery = useSelector(selectPosProductQuery);
  const catalogue = useSelector(selectPosCatalogue);
  const busy = useSelector(selectPosBusy);

  return (
    <div className="pos-toolbar">
      <form
        className="pos-barcode-row"
        onSubmit={(event) => {
          event.preventDefault();
          void dispatch(scanBarcode());
        }}
      >
        <input
          id="pos-barcode-input"
          value={barcodeQuery}
          onChange={(event) => dispatch(barcodeQueryChanged(event.target.value))}
          placeholder={POS_CONTENT.barcodePlaceholder}
          disabled={busy}
          aria-label={POS_CONTENT.barcodeAria}
        />
        <button type="submit" className="pos-add-btn" disabled={busy || !barcodeQuery.trim()}>
          {POS_CONTENT.addBarcode}
        </button>
      </form>
      <form
        className="pos-search-row"
        onSubmit={(event) => {
          event.preventDefault();
          const first = catalogue[0];
          if (!first || busy) {
            return;
          }
          void dispatch(addProduct({ item: first, mode: 'pack' })).finally(restorePosSearchFocus);
        }}
      >
        <Search size={16} aria-hidden="true" className="pos-search-icon" />
        <input
          id="pos-product-search"
          value={productQuery}
          onChange={(event) => dispatch(productQueryChanged(event.target.value))}
          placeholder={POS_CONTENT.searchPlaceholder}
          disabled={busy}
          aria-label={POS_CONTENT.searchAria}
        />
      </form>
    </div>
  );
}
