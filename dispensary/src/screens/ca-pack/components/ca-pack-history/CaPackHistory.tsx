import { useSelector } from 'react-redux';
import { CA_PACK_CONTENT } from '../../CaPackScreen.content';
import { formatWhen } from '../../CaPackScreen.utils';
import { selectCaPackHistory } from '../../store';

export function CaPackHistory() {
  const history = useSelector(selectCaPackHistory);
  return (
    <section className="ca-card ca-history" aria-label={CA_PACK_CONTENT.history}>
      <h3>{CA_PACK_CONTENT.history}</h3>
      {history.length === 0 ? (
        <p className="ca-empty">{CA_PACK_CONTENT.historyEmpty}</p>
      ) : (
        <ul>
          {history.map((row) => (
            <li key={row.id}>
              <div>
                <strong>{row.advisorName}</strong>
                <p className="ca-meta">{row.reports.join(', ')}</p>
              </div>
              <span className="ca-meta">
                {row.period}
                <br />
                {formatWhen(row.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
