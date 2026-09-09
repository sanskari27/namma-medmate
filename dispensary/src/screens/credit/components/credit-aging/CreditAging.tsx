import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { CREDIT_CONTENT } from '../../CreditScreen.content';
import { formatPaise } from '../../CreditScreen.utils';
import type { CreditAgingFilter } from '../../CreditScreen.utils';
import { selectCreditAging, selectCreditAgingFilter } from '../../store/credit.selectors';
import { setAgingFilter } from '../../store/credit.slice';

export function CreditAging() {
  const dispatch = useDispatch<AppDispatch>();
  const aging = useSelector(selectCreditAging);
  const active = useSelector(selectCreditAgingFilter);
  const total = aging.reduce((sum, band) => sum + band.totalPaise, 0);

  return (
    <section className="credit-aging" aria-label={CREDIT_CONTENT.aging.title}>
      <div className="credit-aging-head">
        <div>
          <h2>{CREDIT_CONTENT.aging.title}</h2>
          <p>{CREDIT_CONTENT.aging.subtitle}</p>
        </div>
      </div>
      <div className="credit-aging-bar" aria-hidden>
        {aging.map((band) => {
          const pct = total > 0 ? (band.totalPaise / total) * 100 : 0;
          if (pct <= 0) return null;
          return (
            <span
              key={band.key}
              data-key={band.key}
              style={{ width: `${Math.max(pct, band.totalPaise > 0 ? 4 : 0)}%` }}
            />
          );
        })}
      </div>
      <div className="credit-aging-bands">
        {aging.map((band) => (
          <button
            key={band.key}
            type="button"
            className="credit-band"
            data-key={band.key}
            data-on={active === band.key ? 'true' : 'false'}
            aria-pressed={active === band.key}
            onClick={() => dispatch(setAgingFilter(band.key as CreditAgingFilter))}
          >
            <span className="dot" aria-hidden />
            <span>{band.label}</span>
            <span className="amt">{formatPaise(band.totalPaise)}</span>
            <span className="meta">{CREDIT_CONTENT.aging.accounts(band.accountCount)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
