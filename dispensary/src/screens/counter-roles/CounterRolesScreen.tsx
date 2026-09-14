import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import type { AppDispatch, RootState } from '@/store';
import './CounterRolesScreen.css';
import { FloorRoleDialog } from './components/floor-role-dialog';
import { moduleLabel } from './CounterRolesScreen.utils';
import {
  accessDenied,
  addOpened,
  bannerSet,
  loadRoles,
  selectRoles,
  selectRolesAddOpen,
  selectRolesBanner,
  selectRolesCatalog,
  selectRolesStatus,
} from './store';

export default function CounterRolesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const owner = useSelector((state: RootState) => state.auth.user?.role) === 'pharmacy_owner';
  const roles = useSelector(selectRoles);
  const catalog = useSelector(selectRolesCatalog);
  const addOpen = useSelector(selectRolesAddOpen);
  const status = useSelector(selectRolesStatus);
  const banner = useSelector(selectRolesBanner);
  const text =
    banner ??
    (status === 'denied'
      ? 'Only the pharmacy owner can manage floor roles.'
      : status === 'failure'
        ? 'Could not load floor roles. Try again.'
        : status === 'empty'
          ? 'No custom roles yet. Built-in roles cover common jobs.'
          : status === 'loading'
            ? 'Loading floor roles'
            : null);

  useEffect(() => {
    if (!owner) {
      dispatch(accessDenied('Only the pharmacy owner can manage floor roles.'));
      return;
    }
    void dispatch(loadRoles());
  }, [dispatch, owner]);

  return (
    <div className="fr" aria-label="Floor roles">
      {text ? (
        <p className="fr-alert" data-tone={status === 'failure' ? 'alert' : status === 'success' ? 'ok' : undefined} role="status">
          {text}
        </p>
      ) : null}
      <div className="fr-toolbar">
        <div>
          <h2 style={{ margin: 0 }}>Floor roles</h2>
          <span className="fr-muted">What each staff login can access on this floor</span>
        </div>
        <div className="fr-toolbar-spacer" />
        {owner ? (
          <button type="button" className="fr-btn fr-btn-primary" onClick={() => dispatch(addOpened(true))}>
            <Plus size={16} /> Add role
          </button>
        ) : null}
      </div>
      {owner ? (
        <div className="fr-links">
          {roles.map((row) => (
            <article key={row.id} className="fr-card fr-card-pad">
              <div className="fr-flex" style={{ justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>{row.name}</h3>
                <span className="fr-pill" data-tone={row.kind === 'PREDEFINED' ? 'tag' : 'green'}>
                  {row.kind === 'PREDEFINED' ? 'Built-in' : 'Custom'}
                </span>
              </div>
              <p className="fr-muted" style={{ marginTop: 8 }}>
                {row.modules.map(moduleLabel).join(', ') || 'No modules'}
              </p>
              <div className="fr-muted" style={{ marginTop: 10, fontSize: 12 }}>
                {row.modules.length} modules
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {owner ? (
        <FloorRoleDialog
          open={addOpen}
          catalog={catalog}
          onOpenChange={(open) => dispatch(addOpened(open))}
          onSuccess={async (message) => {
            dispatch(bannerSet(message));
            await dispatch(loadRoles());
          }}
        />
      ) : null}
    </div>
  );
}
