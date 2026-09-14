import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ROUTES } from '@/libs/constants/routes.const';
import { TRENDS_CONTENT } from '../../TrendsScreen.content';
import { selectTrendsPlanGate } from '../../store';

export function TrendsHeader() {
  const planGate = useSelector(selectTrendsPlanGate);

  return (
    <header className="tr-head">
      <h1>{TRENDS_CONTENT.title}</h1>
      {planGate ? (
        <div>
          <p>{TRENDS_CONTENT.subtitle}. Growth unlocks these charts.</p>
          <Link className="tr-head-link" to={ROUTES.SUBSCRIPTION}>
            {TRENDS_CONTENT.openPlan}
          </Link>
        </div>
      ) : null}
    </header>
  );
}
