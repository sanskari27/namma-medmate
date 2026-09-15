import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { POS_CONTENT } from '../../PosScreen.content';
import { checkStatusLabel, warningSummary } from '../../PosScreen.utils';
import { reasonChanged } from '../../store/pos.slice';
import {
  selectPosBusy,
  selectPosCollected,
  selectPosDraft,
  selectPosEvaluation,
  selectPosReason,
} from '../../store/pos.selectors';

export function PosSafetyPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const evaluation = useSelector(selectPosEvaluation);
  const reason = useSelector(selectPosReason);
  const busy = useSelector(selectPosBusy);
  const collected = useSelector(selectPosCollected);
  const draft = useSelector(selectPosDraft);

  if (!evaluation) {
    return null;
  }

  const productNames = Object.fromEntries(draft.map((line) => [line.product.id, line.product.name]));
  const unchecked = checkStatusLabel(evaluation.checkStatus, evaluation.checkLabel);
  const warnings = evaluation.warnings;

  return (
    <section className="pos-safety" aria-label={POS_CONTENT.safety.panelAria}>
      {unchecked ? (
        <p className="pos-safety-unchecked">
          <strong>{unchecked}</strong>
          <span>{POS_CONTENT.safety.neverSafe}</span>
        </p>
      ) : null}
      {warnings.map((warning) => (
        <article key={warning.warningKey} className="pos-safety-warning">
          <h3>
            {warning.kind === 'ALLERGY'
              ? POS_CONTENT.safety.allergyTitle
              : POS_CONTENT.safety.compositionTitle}
          </h3>
          <p>{warningSummary(warning, productNames)}</p>
          {warning.requiredReview ? (
            <p className="pos-safety-review">{POS_CONTENT.safety.reviewRequired}</p>
          ) : null}
        </article>
      ))}
      {warnings.length > 0 ? (
        <label className="pos-safety-reason">
          {POS_CONTENT.safety.reasonLabel}
          <textarea
            value={reason}
            disabled={busy || collected}
            onChange={(event) => dispatch(reasonChanged(event.target.value))}
            rows={3}
          />
        </label>
      ) : null}
    </section>
  );
}
