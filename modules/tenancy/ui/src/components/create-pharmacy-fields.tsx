import { useState, type FormEvent } from 'react';
import { translate } from '@namma-medmate/i18n';
import { Button, Input, Label } from '@namma-medmate/shared-ui';
import { tenancyMessages } from '../i18n/en.ts';

export interface CreatePharmacyFieldsProps {
  onSubmit?: (displayName: string) => void | Promise<void>;
  submitting?: boolean;
}

export function CreatePharmacyFields({ onSubmit, submitting = false }: CreatePharmacyFieldsProps) {
  const [displayName, setDisplayName] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (submitting) {
      return;
    }
    await onSubmit?.(displayName);
  }

  return (
    <form
      className="flex w-full max-w-md flex-col gap-8 rounded-xl border border-border bg-card p-8"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-[32px] font-bold leading-10 text-foreground">
          {translate(tenancyMessages, 'tenancy.create.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {translate(tenancyMessages, 'tenancy.create.subtitle')}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="tenancy-display-name" className="font-mono text-[13px] tracking-wide">
          {translate(tenancyMessages, 'tenancy.form.displayName')}
        </Label>
        <Input
          id="tenancy-display-name"
          name="display_name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {translate(tenancyMessages, 'tenancy.form.gstRegular')}
        </p>
        <div className="h-px bg-border" />
        <p className="text-sm text-muted-foreground">
          {translate(tenancyMessages, 'tenancy.form.retail')}
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {translate(tenancyMessages, 'tenancy.form.save')}
      </Button>
    </form>
  );
}
