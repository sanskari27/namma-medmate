import { Pencil, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { CA_PACK_CONTENT } from '../../CaPackScreen.content';
import { emptyAdvisor, saveAdvisors, type AdvisorKind } from '../../CaPackScreen.utils';
import {
  advisorsSaved,
  openAdvisorForm,
  selectCaPackAdvisors,
} from '../../store';

export function CaPackAdvisors() {
  const dispatch = useDispatch<AppDispatch>();
  const advisors = useSelector(selectCaPackAdvisors);
  const tenantId = useSelector((state: RootState) => state.auth.user?.tenantId);

  function add(kind: AdvisorKind) {
    dispatch(openAdvisorForm(emptyAdvisor(kind)));
  }

  function remove(id: string) {
    const next = advisors.filter((row) => row.id !== id);
    saveAdvisors(next, tenantId);
    dispatch(advisorsSaved(next));
  }

  return (
    <section className="ca-card" aria-label={CA_PACK_CONTENT.advisorsTitle}>
      <div className="ca-card-head">
        <h3>{CA_PACK_CONTENT.advisorsTitle}</h3>
        <button type="button" className="ca-mini" onClick={() => add('CA')}>
          {CA_PACK_CONTENT.addCa}
        </button>
        <button type="button" className="ca-mini" onClick={() => add('Accountant')}>
          {CA_PACK_CONTENT.addAccountant}
        </button>
      </div>
      {advisors.length === 0 ? (
        <p className="ca-empty">Add your CA and in-house accountant so packs go to the right desk.</p>
      ) : (
        advisors.map((row) => (
          <article key={row.id} className="ca-advisor">
            <div className="ca-avatar" aria-hidden>
              {(row.name.trim()[0] || row.kind[0]).toUpperCase()}
            </div>
            <div className="ca-advisor-body">
              <strong>
                {row.name}
                <span className="ca-kind" data-kind={row.kind}>
                  {row.kind}
                </span>
              </strong>
              <p className="ca-meta">
                {[row.firm, row.email].filter(Boolean).join(' · ')}
              </p>
              {row.phone ? <p className="ca-meta">{row.phone}</p> : null}
            </div>
            <button
              type="button"
              className="ca-icon-btn"
              aria-label={CA_PACK_CONTENT.edit}
              onClick={() => dispatch(openAdvisorForm(row))}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              className="ca-icon-btn"
              aria-label={CA_PACK_CONTENT.remove}
              onClick={() => remove(row.id)}
            >
              <Trash2 size={15} />
            </button>
          </article>
        ))
      )}
    </section>
  );
}
