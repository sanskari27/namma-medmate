import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { CA_PACK_CONTENT } from '../../CaPackScreen.content';
import { saveAdvisors } from '../../CaPackScreen.utils';
import {
  advisorsSaved,
  closeAdvisorForm,
  patchAdvisorForm,
  selectCaPackAdvisors,
  selectCaPackForm,
  selectCaPackFormOpen,
} from '../../store';

export function CaPackAdvisorDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const open = useSelector(selectCaPackFormOpen);
  const form = useSelector(selectCaPackForm);
  const advisors = useSelector(selectCaPackAdvisors);
  const tenantId = useSelector((state: RootState) => state.auth.user?.tenantId);
  if (!open || !form) {
    return null;
  }

  function onSave() {
    if (!form?.name.trim()) {
      return;
    }
    const next = form.id
      ? advisors.map((row) => (row.id === form.id ? form : row))
      : [...advisors, { ...form, id: crypto.randomUUID() }];
    saveAdvisors(next, tenantId);
    dispatch(advisorsSaved(next));
    dispatch(closeAdvisorForm());
  }

  return (
    <div className="ca-overlay">
      <div className="ca-dialog" role="dialog" aria-modal="true" aria-labelledby="ca-adv-title">
        <h3 id="ca-adv-title">{form.id ? 'Edit contact' : `Add ${form.kind}`}</h3>
        <div className="ca-form">
          <label className="ca-label">
            {CA_PACK_CONTENT.fieldName}
            <input
              className="ca-field"
              value={form.name}
              onChange={(event) => dispatch(patchAdvisorForm({ name: event.target.value }))}
            />
          </label>
          <label className="ca-label">
            {CA_PACK_CONTENT.fieldFirm}
            <input
              className="ca-field"
              value={form.firm}
              onChange={(event) => dispatch(patchAdvisorForm({ firm: event.target.value }))}
            />
          </label>
          <label className="ca-label">
            {CA_PACK_CONTENT.fieldEmail}
            <input
              className="ca-field"
              type="email"
              value={form.email}
              onChange={(event) => dispatch(patchAdvisorForm({ email: event.target.value }))}
            />
          </label>
          <label className="ca-label">
            {CA_PACK_CONTENT.fieldPhone}
            <input
              className="ca-field"
              value={form.phone}
              onChange={(event) => dispatch(patchAdvisorForm({ phone: event.target.value }))}
            />
          </label>
        </div>
        <div className="ca-actions">
          <button type="button" className="ca-btn-ghost" onClick={() => dispatch(closeAdvisorForm())}>
            {CA_PACK_CONTENT.cancel}
          </button>
          <button type="button" className="ca-btn-primary" onClick={onSave}>
            {CA_PACK_CONTENT.save}
          </button>
        </div>
      </div>
    </div>
  );
}
