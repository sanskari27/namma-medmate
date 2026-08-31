import { useState, type FormEvent } from 'react';
import { translate } from '@namma-medmate/i18n';
import { Button, Input, Label } from '@namma-medmate/shared-ui';
import { tenancyMessages } from '../i18n/en.ts';
import { usePatchCurrentMutation } from '../store/api/tenancy-api.ts';
import { useTenant } from '../hooks/use-tenant.ts';

export interface RenameShopFormProps {
  skipMutation?: boolean;
}

export function RenameShopForm({ skipMutation = false }: RenameShopFormProps) {
  const tenant = useTenant();
  const [displayName, setDisplayName] = useState(tenant.display_name ?? '');
  const [patchCurrent, mutation] = usePatchCurrentMutation();

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (skipMutation || !tenant.location_id) {
      return;
    }
    await patchCurrent({ displayName, locationId: tenant.location_id });
  }

  return (
    <form
      className="relative flex w-full max-w-md flex-col gap-8 overflow-hidden rounded-2xl border border-border bg-card p-8"
      onSubmit={handleSubmit}
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <h2 className="text-[32px] font-bold leading-10 tracking-tight text-foreground">
          {translate(tenancyMessages, 'tenancy.rename.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {translate(tenancyMessages, 'tenancy.rename.subtitle')}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="tenancy-rename-display-name"
          className="font-mono text-[13px] tracking-wide"
        >
          {translate(tenancyMessages, 'tenancy.form.displayName')}
        </Label>
        <Input
          id="tenancy-rename-display-name"
          name="display_name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
      </div>
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={mutation.isLoading}>
          {translate(tenancyMessages, 'tenancy.form.save')}
        </Button>
      </div>
    </form>
  );
}
