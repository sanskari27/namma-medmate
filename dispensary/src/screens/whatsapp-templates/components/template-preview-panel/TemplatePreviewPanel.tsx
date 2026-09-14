import { useSelector } from 'react-redux';
import { selectWhatsappPreview, selectWhatsappSelected } from '../../store';

export function TemplatePreviewPanel() {
  const template = useSelector(selectWhatsappSelected);
  const preview = useSelector(selectWhatsappPreview);
  if (!template) {
    return null;
  }
  return (
    <div className="ws-card ws-card-pad">
      <h3 style={{ margin: 0, fontFamily: 'Manrope, Inter, sans-serif', fontSize: 15, fontWeight: 800 }}>
        How it reads at the counter
      </h3>
      <p className="ws-quote" style={{ marginTop: 12 }}>
        {preview}
      </p>
      {template.runtimeSlots.length > 0 ? (
        <p className="ws-muted" style={{ marginTop: 10 }}>
          Patient and medicine names fill when the message is sent.
        </p>
      ) : null}
    </div>
  );
}
