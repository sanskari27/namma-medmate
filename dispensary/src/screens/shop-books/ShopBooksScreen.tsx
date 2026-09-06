import { ShopBooksBookList } from './components/shop-books-book-list';
import { ShopBooksEmptyState } from './components/shop-books-empty-state';
import { ShopBooksFilterBar } from './components/shop-books-filter-bar';
import { ShopBooksHeader } from './components/shop-books-header';
import { ShopBooksStatusBanner } from './components/shop-books-status-banner';
import { ShopBooksTable } from './components/shop-books-table';
import { ShopBooksTotalsStrip } from './components/shop-books-totals-strip';
import { ShopBooksUpgrade } from './components/shop-books-upgrade';
import { shopBookTitle } from './ShopBooksScreen.utils';
import { useShopBooksPage } from './useShopBooksPage';

export default function ShopBooksScreen() {
  const page = useShopBooksPage();
  const tableTitle = page.table ? shopBookTitle(page.table.key, page.table.title) : 'Shop book';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <ShopBooksHeader
        spreadsheetRef={page.spreadsheetRef}
        pdfRef={page.pdfRef}
        denied={!page.allowed || page.planGate}
        busy={page.busy}
        onSpreadsheet={page.onSpreadsheet}
        onPdf={page.onPdf}
      />
      <ShopBooksStatusBanner
        status={page.status}
        statusId={page.statusId}
        hint={page.statusHint}
        planGate={page.planGate}
      />
      {page.allowed ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <ShopBooksBookList
            books={page.books}
            selectedKey={page.selectedKey}
            onSelect={page.onSelectBook}
          />
          <div className="flex min-h-0 flex-col gap-3">
            <ShopBooksFilterBar
              filters={page.filters}
              owner={page.owner}
              scope={page.scope}
              disabled={page.busy || page.planGate}
              onChange={page.onChangeFilters}
              onScope={page.onScope}
              onApply={page.onApplyFilters}
            />
            {page.planGate ? (
              <ShopBooksUpgrade
                hint={
                  page.upgradeHint ??
                  'This shop book is on Growth. Open the plan to turn it on.'
                }
                linkRef={page.upgradeRef}
              />
            ) : page.status === 'loading' || page.status === 'denied' ? null : page.table ? (
              <>
                <ShopBooksTotalsStrip
                  totals={page.table.totals}
                  allOutlets={page.scope === 'tenant'}
                />
                <ShopBooksTable
                  title={tableTitle}
                  columns={page.table.columns}
                  items={page.table.items}
                />
              </>
            ) : (
              <ShopBooksEmptyState />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
