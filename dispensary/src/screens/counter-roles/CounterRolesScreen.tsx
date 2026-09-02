import { Reveal, Button } from '@atoms';
import { listRoles, type AccessRole } from '@/services/roles';
import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { FloorRoleDialog } from './components/floor-role-dialog';
import { moduleLabel } from './CounterRolesScreen.utils';
import type { ModuleCatalogItem } from '@/services/roles';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: AlertCircle, text: 'Loading floor roles' };
    case 'empty':
      return {
        icon: AlertCircle,
        text: 'No custom roles yet. Built-in roles cover common jobs. Add one when someone needs a different mix of access.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'Only the pharmacy owner can manage floor roles.',
      };
    case 'failure':
      return { icon: WifiOff, text: 'Could not load floor roles. Try again.' };
    case 'success':
      return {
        icon: CheckCircle2,
        text: 'Role saved. Assign it to staff from Staff accounts.',
      };
    default:
      return null;
  }
}

export default function CounterRolesScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const owner = role === 'pharmacy_owner';
  const statusId = useId();
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [catalog, setCatalog] = useState<ModuleCatalogItem[]>([]);
  const [status, setStatus] = useState<PageStatus>(owner ? 'loading' : 'denied');
  const [banner, setBanner] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    if (!owner) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const next = await listRoles();
      setRoles(next.roles);
      setCatalog(next.catalog);
      setStatus(next.roles.some((row) => row.kind === 'CUSTOM') ? null : 'empty');
    } catch {
      setStatus('failure');
    }
  }, [owner]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = banner ? { icon: CheckCircle2, text: banner } : statusCopy(status);

  return (
    <Reveal className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Floor roles</h1>
          <p className="mt-1 text-sm text-muted">
            Choose which parts of the pharmacy each staff login can use. The owner already has full
            access on the current plan.
          </p>
        </div>
        {owner ? (
          <Button type="button" onClick={() => setAddOpen(true)}>
            Add role
          </Button>
        ) : null}
      </div>

      {copy && !addOpen ? (
        <p
          id={statusId}
          role="alert"
          className="flex items-start gap-2 border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          <copy.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
          <span>{copy.text}</span>
        </p>
      ) : null}

      {owner && status !== 'loading' && status !== 'failure' ? (
        <ul className="divide-y divide-line border border-line bg-surface">
          {roles.map((row) => (
            <li key={row.id} className="flex items-stretch">
              <span
                className={`w-1 shrink-0 ${row.kind === 'PREDEFINED' ? 'bg-muted' : 'bg-brand'}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1 px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{row.name}</p>
                  <p className="text-[11px] text-muted">
                    {row.kind === 'PREDEFINED' ? 'Built-in' : 'Custom'}
                  </p>
                </div>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {row.modules.map(moduleLabel).join(', ')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {owner ? (
        <FloorRoleDialog
          open={addOpen}
          catalog={catalog}
          onOpenChange={setAddOpen}
          onSuccess={async (message) => {
            setBanner(message);
            setStatus('success');
            const next = await listRoles();
            setRoles(next.roles);
            setCatalog(next.catalog);
          }}
        />
      ) : null}
    </Reveal>
  );
}
