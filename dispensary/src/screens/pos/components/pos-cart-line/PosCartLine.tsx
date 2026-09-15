import { Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { ProductUnit } from '@/services/products';
import type { AppDispatch } from '@/store';
import type { PosDraftLine } from '../../pos.types';
import { POS_CONTENT } from '../../PosScreen.content';
import { formatPaise, rupeesToPaise } from '../../PosScreen.utils';
import {
  batchChanged,
  discountChanged,
  discountTypeChanged,
  mrpChanged,
  quantityChanged,
  removeProduct,
  sellingChanged,
} from '../../store/pos.slice';
import { changeLineUnit } from '../../store/pos.thunks';
import { selectPosBusy } from '../../store/pos.selectors';

type PosCartLineProps = {
  line: PosDraftLine;
};

export function PosCartLine({ line }: PosCartLineProps) {
  const dispatch = useDispatch<AppDispatch>();
  const busy = useSelector(selectPosBusy);
  const qty = Number(line.quantity) || 1;
  const unitPaise = rupeesToPaise(line.sellingRupees);
  const baseEach = line.baseQuantity != null ? line.baseQuantity / qty : null;
  const percent = line.discountType === 'PERCENT';

  return (
    <div className="pos-cart-line">
      <div className="pos-cart-line-top">
        <div>
          <div className="pos-cart-line-name">{line.product.name}</div>
          <div className="pos-cart-line-price">
            {unitPaise != null
              ? POS_CONTENT.ratePerUnit(formatPaise(unitPaise), line.unit)
              : line.unit}
            {baseEach != null && line.unit !== line.product.baseUnit
              ? POS_CONTENT.unitEach(baseEach, line.product.baseUnit)
              : null}
          </div>
        </div>
        <button
          type="button"
          className="pos-cart-remove"
          aria-label={POS_CONTENT.removeLineAria(line.product.name, line.unit)}
          disabled={busy}
          onClick={() => dispatch(removeProduct(line.id))}
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="pos-cart-line-meta">
        <select
          aria-label={POS_CONTENT.unitAria(line.product.name)}
          value={line.unit}
          disabled={busy}
          onChange={(event) =>
            void dispatch(
              changeLineUnit({
                lineId: line.id,
                unit: event.target.value as ProductUnit,
              }),
            )
          }
        >
          {line.unitOptions.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
              {unit === line.product.baseUnit
                ? POS_CONTENT.unitLooseSuffix
                : unit === line.product.packUnit
                  ? POS_CONTENT.unitPackSuffix
                  : ''}
            </option>
          ))}
        </select>
        {line.product.requiresBatchTracking ? (
          <select
            aria-label={POS_CONTENT.batchAria(line.product.name, line.unit)}
            value={line.batchId ?? ''}
            disabled={busy}
            onChange={(event) =>
              dispatch(
                batchChanged({
                  lineId: line.id,
                  batchId: event.target.value,
                }),
              )
            }
          >
            <option value="">{POS_CONTENT.batchSelect}</option>
            {line.batches
              .filter((batch) => batch.batchId && !batch.expired)
              .map((batch) => (
                <option key={batch.batchId!} value={batch.batchId!}>
                  {batch.batchNumber ?? batch.batchId}
                  {batch.nearExpiry ? ` · ${POS_CONTENT.batchNearExpiry}` : ''}
                </option>
              ))}
          </select>
        ) : null}
        <div className="pos-qty" aria-label={POS_CONTENT.qtyAria(line.product.name, line.unit)}>
          <button
            type="button"
            disabled={busy || qty <= 1}
            onClick={() =>
              dispatch(
                quantityChanged({
                  lineId: line.id,
                  quantity: String(Math.max(1, qty - 1)),
                }),
              )
            }
          >
            −
          </button>
          <span>{qty}</span>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              dispatch(
                quantityChanged({
                  lineId: line.id,
                  quantity: String(qty + 1),
                }),
              )
            }
          >
            +
          </button>
        </div>
      </div>
      <div className="pos-cart-prices">
        <label>
          {POS_CONTENT.lineMrp}
          <input
            value={line.mrpRupees}
            inputMode="decimal"
            disabled={busy}
            onChange={(event) =>
              dispatch(mrpChanged({ lineId: line.id, value: event.target.value }))
            }
          />
        </label>
        <label>
          {POS_CONTENT.lineSelling}
          <input
            value={line.sellingRupees}
            inputMode="decimal"
            disabled={busy}
            onChange={(event) =>
              dispatch(sellingChanged({ lineId: line.id, value: event.target.value }))
            }
          />
        </label>
        <label>
          {percent ? POS_CONTENT.lineDiscountPercent : POS_CONTENT.lineDiscountFlat}
          <input
            value={line.discountRupees}
            inputMode="decimal"
            disabled={busy}
            onChange={(event) =>
              dispatch(discountChanged({ lineId: line.id, value: event.target.value }))
            }
          />
        </label>
        <button
          type="button"
          className="pos-line-discount-type"
          disabled={busy}
          aria-label={
            percent
              ? POS_CONTENT.flatDiscountAria(line.product.name)
              : POS_CONTENT.percentDiscountAria(line.product.name)
          }
          onClick={() =>
            dispatch(
              discountTypeChanged({
                lineId: line.id,
                value: percent ? 'FLAT' : 'PERCENT',
              }),
            )
          }
        >
          {percent ? POS_CONTENT.discountFlat : POS_CONTENT.discountPercent}
        </button>
      </div>
    </div>
  );
}
