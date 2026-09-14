import { ROUTES } from '@/libs/constants/routes.const';
import { Link } from 'react-router-dom';

export type WhatsappSendsHeaderProps = {
  denied?: boolean;
  queued: number;
  sent: number;
  failed: number;
};

export function WhatsappSendsHeader({
  denied = false,
  queued,
  sent,
  failed,
}: WhatsappSendsHeaderProps) {
  return (
    <>
      <div className="wh-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>WhatsApp sends</h2>
          <span className="wh-muted">Queued, sent and failed patient messages from this pharmacy</span>
        </div>
        <div className="wh-toolbar-spacer" />
        {denied ? null : (
          <Link className="wh-btn wh-btn-ghost" to={ROUTES.CAMPAIGNS}>
            Tag broadcasts
          </Link>
        )}
      </div>
      {denied ? null : (
        <div className="wh-stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div className="wh-stat">
            <div className="lbl">Queued</div>
            <div className="val">{queued}</div>
            <div className="split">waiting to go out</div>
          </div>
          <div className="wh-stat">
            <div className="lbl">Sent</div>
            <div className="val">{sent}</div>
            <div className="split">delivered from this till</div>
          </div>
          <div className="wh-stat">
            <div className="lbl">Failed</div>
            <div className="val">{failed}</div>
            <div className="split">retry from this counter</div>
          </div>
        </div>
      )}
    </>
  );
}
