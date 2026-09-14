import { Link } from 'react-router-dom';
import { ROUTES } from '@/libs/constants/routes.const';
import { useSelector } from 'react-redux';
import { SHOP_BOOKS_CONTENT } from '../../ShopBooksScreen.content';
import { cellValue, columnLabel, formatPaise, numericColumn } from '../../ShopBooksScreen.utils';
import {
  selectSelectedHint,
  selectSelectedTitle,
  selectShopBooksPeriodLabel,
  selectShopBooksPlanGate,
  selectShopBooksStatus,
  selectShopBooksTable,
  selectShopBooksUpgradeHint,
} from '../../store';

export function ShopBooksReport() {
  const status = useSelector(selectShopBooksStatus);
  const table = useSelector(selectShopBooksTable);
  const title = useSelector(selectSelectedTitle);
  const hint = useSelector(selectSelectedHint);
  const period = useSelector(selectShopBooksPeriodLabel);
  const planGate = useSelector(selectShopBooksPlanGate);
  const upgradeHint = useSelector(selectShopBooksUpgradeHint);

  if (planGate) {
    return (
      <div className="bk-upgrade" role="region" aria-label="Plan required for this shop book">
        <p>{upgradeHint ?? 'This shop book is on Growth. Open the plan to turn it on.'}</p>
        <Link to={ROUTES.SUBSCRIPTION}>Open the plan</Link>
      </div>
    );
  }

  if (status === 'loading') {
    return <p className="bk-loading">{SHOP_BOOKS_CONTENT.loading}</p>;
  }

  const columns = table?.columns ?? [];
  const items = table?.items ?? [];
  const moneyColumns = columns.filter((column) => column.endsWith('Paise'));

  return (
    <section aria-label={title}>
      <div className="bk-head">
        <h2>{title}</h2>
        <span className="bk-pill">{period}</span>
      </div>
      <p className="bk-hint">
        {hint} · {items.length} row{items.length === 1 ? '' : 's'}
      </p>
      {items.length === 0 ? (
        <p className="bk-empty">{SHOP_BOOKS_CONTENT.empty}</p>
      ) : (
        <div className="bk-table-wrap">
          <table className="bk-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column} className={numericColumn(column) ? 'bk-num' : undefined}>
                    {columnLabel(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.invoiceNumber ?? item.line ?? item.reference ?? index}`}>
                  {columns.map((column) => (
                    <td key={column} className={numericColumn(column) ? 'bk-num' : undefined}>
                      {cellValue(column, item[column])}
                    </td>
                  ))}
                </tr>
              ))}
              {moneyColumns.length > 0 ? (
                <tr className="bk-total">
                  {columns.map((column, index) => (
                    <td key={column} className={numericColumn(column) ? 'bk-num' : undefined}>
                      {index === 0
                        ? SHOP_BOOKS_CONTENT.total
                        : column.endsWith('Paise')
                          ? formatPaise(
                              items.reduce((sum, item) => sum + Number(item[column] || 0), 0),
                            )
                          : ''}
                    </td>
                  ))}
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
