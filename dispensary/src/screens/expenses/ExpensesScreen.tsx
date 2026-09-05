import { ExpenseFormPanel } from './components/expense-form-panel';
import { ExpensesFilterBar } from './components/expenses-filter-bar';
import { ExpensesHeader } from './components/expenses-header';
import { ExpensesListPanel } from './components/expenses-list-panel';
import { ExpensesStatusBanner } from './components/expenses-status-banner';
import { ExpensesTotalsStrip } from './components/expenses-totals-strip';
import { useExpensesPage } from './useExpensesPage';

export default function ExpensesScreen() {
  const page = useExpensesPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      <ExpensesHeader addButtonRef={page.addRef} denied={!page.allowed} onAdd={page.startCreate} />
      <ExpensesStatusBanner
        status={page.status}
        statusId={page.statusId}
        hint={page.statusHint}
        spendState={page.spendState}
      />
      {page.allowed ? (
        <>
          <ExpensesFilterBar
            categories={page.categories}
            owner={page.owner}
            categoryId={page.filterCategoryId}
            from={page.from}
            to={page.to}
            scope={page.scope}
            spendState={page.spendState}
            onCategory={page.setFilterCategoryId}
            onFrom={page.setFrom}
            onTo={page.setTo}
            onScope={page.setScope}
            onSpendState={page.setSpendState}
          />
          <ExpensesTotalsStrip totals={page.totals} allOutlets={page.scope === 'tenant'} />
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
            <ExpensesListPanel
              items={page.items}
              selectedId={page.creating ? null : (page.selected?.id ?? null)}
              spendState={page.spendState}
              onSelect={page.selectExpense}
            />
            {page.creating || page.selected ? (
              <ExpenseFormPanel
                form={page.form}
                categories={page.categories}
                creating={page.creating}
                selected={page.creating ? null : page.selected}
                busy={page.busy}
                onChange={page.onChange}
                onSave={page.onSave}
                onAddCategory={page.onAddCategory}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
