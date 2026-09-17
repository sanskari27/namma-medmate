import { useDispatch, useSelector } from 'react-redux';
import { catalogueOnly, templateLabel } from '../../WhatsappTemplatesScreen.utils';
import { selectWhatsappSelectedName, selectWhatsappTemplates, templateSelected } from '../../store';

export function TemplateCataloguePanel() {
  const dispatch = useDispatch();
  const items = useSelector(selectWhatsappTemplates);
  const selectedName = useSelector(selectWhatsappSelectedName);
  if (items.length === 0) {
    return <p className="ws-loading">No approved messages on file for this pharmacy.</p>;
  }
  return (
    <div className="ws-card ws-list">
      {items.map((row) => (
        <button
          key={row.uniqueName}
          type="button"
          data-on={row.uniqueName === selectedName}
          onClick={() => dispatch(templateSelected(row.uniqueName))}
        >
          <b>{templateLabel(row.uniqueName)}</b>
          <span className="ws-muted ws-mono">{row.namespaceName}</span>
          {catalogueOnly(row.uniqueName) ? (
            <span className="ws-muted">Catalogue only — this slot is not sent yet</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
