import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ACCOUNT_CONTENT } from '../../AccountScreen.content';
import { selectAccountTodos } from '../../store';

export function AccountCompleteness() {
  const todos = useSelector(selectAccountTodos);
  const done = todos.filter((row) => row.done).length;
  const pct = todos.length ? Math.round((done / todos.length) * 100) : 0;
  const open = todos.filter((row) => !row.done);
  const circumference = 2 * Math.PI * 30;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="ac-card">
      <div className="ac-card-head">
        <h3>{ACCOUNT_CONTENT.completeness}</h3>
        <span className="ac-muted">
          {done} of {todos.length}
        </span>
      </div>
      <div className="ac-card-pad">
        <div className="ac-complete">
          <div className="ac-ring" aria-hidden>
            <svg width="78" height="78" viewBox="0 0 78 78">
              <circle cx="39" cy="39" r="30" fill="none" stroke="#eef4ee" strokeWidth="8" />
              <circle
                cx="39"
                cy="39"
                r="30"
                fill="none"
                stroke="#2f7d52"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 39 39)"
              />
            </svg>
            <span className="ac-ring-val">{pct}%</span>
          </div>
          <div style={{ flex: 1 }}>
            <div className="ac-muted" style={{ marginBottom: 8 }}>
              {ACCOUNT_CONTENT.finishTodos}
            </div>
            <div className="ac-todos">
              {open.slice(0, 3).map((row) => (
                <Link key={row.id} className="ac-todo" to={row.href}>
                  <AlertTriangle size={12} />
                  {row.label}
                  <ArrowRight size={12} />
                </Link>
              ))}
              {open.length === 0 ? <p className="ac-muted">All account checks are complete.</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
