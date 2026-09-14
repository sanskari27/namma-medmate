import { useDispatch, useSelector } from 'react-redux';
import { slotLabel } from '../../WhatsappTemplatesScreen.utils';
import { selectWhatsappSelected, selectWhatsappValues, slotChanged } from '../../store';

export function TemplateVariableForm() {
  const dispatch = useDispatch();
  const template = useSelector(selectWhatsappSelected);
  const values = useSelector(selectWhatsappValues);
  if (!template) {
    return null;
  }
  return (
    <div className="ws-card ws-card-pad ws-form">
      <h3 style={{ margin: 0, fontFamily: 'Manrope, Inter, sans-serif', fontSize: 15, fontWeight: 800 }}>
        Slots on this message
      </h3>
      {template.tenantSlots.map((slot) => {
        const id = `slot-${slot}`;
        return (
          <div key={slot} className="ws-field" data-span="2">
            <label htmlFor={id}>{slotLabel(slot)}</label>
            <input
              id={id}
              className="ws-input"
              value={values[slot] ?? ''}
              onChange={(event) => dispatch(slotChanged({ slot, value: event.target.value }))}
              autoComplete="off"
            />
          </div>
        );
      })}
      <div className="ws-field" data-span="2">
        <label>Approved wording</label>
        <p className="ws-quote ws-mono ws-muted">{template.body}</p>
      </div>
    </div>
  );
}
