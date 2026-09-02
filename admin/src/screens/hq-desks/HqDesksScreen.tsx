import { Reveal, Button, Input, Label } from '@atoms';
import { ApiError, isApiError } from '@/services/axios';
import { createRole, listRoles, type AccessRole, type ModuleCatalogItem } from '@/services/roles';
import { Ban, ShieldAlert, ShieldCheck, Unplug } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { deskModuleLabel } from './HqDesksScreen.utils';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;
type FormStatus = 'validation' | 'conflict' | 'denied' | 'failure' | null;
type Selection = 'new' | string | null;

function statusCopy(status: PageStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: ShieldAlert, text: 'Loading HQ desks' };
    case 'empty':
      return {
        icon: ShieldAlert,
        text: 'No custom desks yet. Built-in desks cover the standard operator jobs.',
      };
    case 'denied':
      return { icon: Ban, text: 'Only the HQ administrator can manage operator desks.' };
    case 'failure':
      return { icon: Unplug, text: 'Could not load HQ desks. Try again.' };
    case 'success':
      return { icon: ShieldCheck, text: 'Desk saved. Assign it from Operators.' };
    default:
      return null;
  }
}

export default function HqDesksScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const master = role === 'admin_super';
  const statusId = useId();
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [catalog, setCatalog] = useState<ModuleCatalogItem[]>([]);
  const [status, setStatus] = useState<PageStatus>(master ? 'loading' : 'denied');
  const [banner, setBanner] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selection>(null);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<FormStatus>(null);

  const load = useCallback(async () => {
    if (!master) {
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
  }, [master]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedRole = roles.find((row) => row.id === selected) ?? null;
  const copy = banner ? { icon: ShieldCheck, text: banner } : statusCopy(status);

  const formMessage =
    formStatus === 'validation'
      ? 'Enter a desk name and select at least one HQ area.'
      : formStatus === 'conflict'
        ? 'A desk with this name already exists.'
        : formStatus === 'denied'
          ? 'Only the HQ administrator can manage operator desks.'
          : formStatus === 'failure'
            ? 'Could not save this desk. Try again.'
            : null;

  const onFile = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || picked.length === 0) {
      setFormStatus('validation');
      return;
    }
    try {
      await createRole(name.trim(), picked);
      setBanner('Desk saved. Assign it from Operators.');
      setStatus('success');
      setSelected(null);
      setName('');
      setPicked([]);
      setFormStatus(null);
      const next = await listRoles();
      setRoles(next.roles);
      setCatalog(next.catalog);
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 409 || error.code === 'ROLE_NAME_TAKEN') {
          setFormStatus('conflict');
          return;
        }
        if (error.status === 403) {
          setFormStatus('denied');
          return;
        }
      }
      setFormStatus('failure');
    }
  };

  return (
    <Reveal className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="font-serif text-xl text-ink">HQ desks</h1>
          <p className="mt-1 text-sm text-muted">
            Create desks for operators and choose which HQ areas each desk can open. You already
            have full HQ access as the administrator.
          </p>
        </div>
        {master ? (
          <Button
            type="button"
            onClick={() => {
              setSelected('new');
              setName('');
              setPicked([]);
              setFormStatus(null);
            }}
          >
            New desk
          </Button>
        ) : null}
      </div>

      {copy && selected !== 'new' ? (
        <p
          id={statusId}
          role="alert"
          className="flex items-start gap-2 border border-line bg-elevated px-3 py-2 text-sm text-ink"
        >
          <copy.icon className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
          <span>{copy.text}</span>
        </p>
      ) : null}

      {master && status !== 'loading' && status !== 'failure' ? (
        <div className="grid gap-0 border border-line lg:grid-cols-[minmax(0,16rem)_1fr]">
          <nav className="border-b border-line bg-surface lg:border-r lg:border-b-0">
            <p className="border-b border-line px-3 py-2 text-[11px] text-muted">Desks</p>
            <ul>
              {roles.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left text-sm ${
                      selected === row.id ? 'bg-brand-soft text-ink' : 'text-ink hover:bg-elevated'
                    }`}
                    onClick={() => {
                      setSelected(row.id);
                      setFormStatus(null);
                    }}
                  >
                    <span>{row.name}</span>
                    <span className="font-mono text-[10px] text-muted" aria-hidden="true">
                      {row.kind === 'PREDEFINED' ? 'Built-in' : 'Custom'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <section className="bg-elevated px-4 py-4">
            {selected === 'new' ? (
              <form onSubmit={(event) => void onFile(event)} className="space-y-4" noValidate>
                <p className="font-serif text-lg text-ink">New operator desk</p>
                {formMessage ? (
                  <p role="alert" className="text-sm text-ink">
                    {formMessage}
                  </p>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="desk-name">Desk name</Label>
                  <Input
                    id="desk-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">HQ areas this desk can open</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-muted">
                      <th className="py-2 font-medium">Include</th>
                      <th className="py-2 font-medium">Area</th>
                      <th className="py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map((item) => (
                      <tr key={item.code} className="border-b border-line">
                        <td className="py-2">
                          <input
                            id={`desk-mod-${item.code}`}
                            type="checkbox"
                            className="size-4 accent-brand"
                            aria-label={deskModuleLabel(item.code)}
                            checked={picked.includes(item.code)}
                            disabled={!item.entitled}
                            onChange={() =>
                              setPicked((current) =>
                                current.includes(item.code)
                                  ? current.filter((code) => code !== item.code)
                                  : [...current, item.code],
                              )
                            }
                          />
                        </td>
                        <td className="py-2 text-ink">{deskModuleLabel(item.code)}</td>
                        <td className="py-2 text-xs text-warn">
                          {item.entitled ? '' : "You don't have this permission"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Button type="submit">Save desk</Button>
              </form>
            ) : selectedRole ? (
              <div>
                <p className="font-serif text-lg text-ink">{selectedRole.name}</p>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {selectedRole.kind === 'PREDEFINED' ? 'Built-in desk' : 'Custom desk'}
                </p>
                <table className="mt-4 w-full border-collapse text-sm">
                  <caption className="sr-only">Areas this desk can open</caption>
                  <tbody>
                    {selectedRole.modules.map((code) => (
                      <tr key={code} className="border-b border-line">
                        <td className="py-2 text-ink">{deskModuleLabel(code)}</td>
                        <td className="py-2 text-right text-xs text-muted">Included</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">Select a desk on the left, or create a new one.</p>
            )}
          </section>
        </div>
      ) : null}
    </Reveal>
  );
}
