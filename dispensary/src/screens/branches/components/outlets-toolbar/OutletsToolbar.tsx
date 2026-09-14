import { useDispatch, useSelector } from 'react-redux';
import { createOpened, selectOutletsEditing } from '../../store';

export function OutletsToolbar({ allowed }: { allowed: boolean }) {
  const dispatch = useDispatch();
  const editing = useSelector(selectOutletsEditing);
  return (
    <div className="ot-toolbar">
      <div>
        <h2>Outlets</h2>
        <span className="ot-muted">Branches at this pharmacy — address, licence and till pricing</span>
      </div>
      <div className="ot-toolbar-spacer" />
      {allowed ? (
        <button
          type="button"
          className="ot-btn ot-btn-primary"
          onClick={() => dispatch(createOpened())}
          disabled={editing}
        >
          Add outlet
        </button>
      ) : null}
    </div>
  );
}
