import { Search } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { POS_CONTENT } from '../../PosScreen.content';
import {
  barcodeQueryChanged,
  productQueryChanged,
} from '../../store/pos.slice';
import {
  selectPosBarcodeQuery,
  selectPosBusy,
  selectPosProductQuery,
} from '../../store/pos.selectors';
import { scanBarcode } from '../../store/pos.thunks';

export function PosToolbar() {
  const dispatch = useDispatch<AppDispatch>();
  const barcodeQuery = useSelector(selectPosBarcodeQuery);
  const productQuery = useSelector(selectPosProductQuery);
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
      <div className="pos-search-row">
        <Search size={16} aria-hidden="true" className="pos-search-icon" />
        <input
          id="pos-product-search"
          value={productQuery}
          onChange={(event) => dispatch(productQueryChanged(event.target.value))}
          placeholder={POS_CONTENT.searchPlaceholder}
          disabled={busy}
          aria-label={POS_CONTENT.searchAria}
        />
      </div>
    </div>
  );
}
