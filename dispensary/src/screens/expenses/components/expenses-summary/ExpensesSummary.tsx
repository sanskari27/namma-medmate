import { useSelector } from 'react-redux';
import { EXPENSES_CONTENT } from '../../ExpensesScreen.content';
import { formatPaise } from '../../ExpensesScreen.utils';
import {
  selectExpensesPeriodMeta,
  selectExpensesTotals,
} from '../../store';

export function ExpensesSummary() {
  const totals = useSelector(selectExpensesTotals);
  const period = useSelector(selectExpensesPeriodMeta);

  const cards = [
    {
      label: EXPENSES_CONTENT.cardExpenses,
      value: String(totals?.count ?? 0),
    },
    {
      label: EXPENSES_CONTENT.cardTotalSpend,
      value: formatPaise(totals?.totalPaise ?? 0),
    },
    {
      label: EXPENSES_CONTENT.cardGst,
      value: formatPaise(totals?.gstPaise ?? 0),
    },
    {
      label: EXPENSES_CONTENT.periodLabel,
      value: period.label,
    },
  ];

  return (
    <div className="ex-cards" aria-label="Expense summary">
      {cards.map((card) => (
        <article key={card.label} className="ex-card">
          <p className="ex-card-label">{card.label}</p>
          <p className="ex-card-value">{card.value}</p>
        </article>
      ))}
    </div>
  );
}
