import { useState, type FormEvent } from 'react';
import { translate } from '@namma-medmate/i18n';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  StatusBanner,
  Switch,
} from '@namma-medmate/shared-ui';
import {
  GST_SLABS,
  SCHEDULES,
  parseGstSlabValue,
  parseScheduleValue,
  type GstSlab,
  type Schedule,
} from '../lib/constants.ts';
import { masterCatalogueMessages } from '../i18n/en.ts';
import { emptyToNull, formString } from '../lib/form.ts';
import { useCreateSkuMutation } from '../store/api/master-catalogue-api.ts';

export interface AddMedicineModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  skipQuery?: boolean;
  error?: boolean;
}

export function AddMedicineModal({
  open = true,
  onOpenChange,
  skipQuery = false,
  error = false,
}: AddMedicineModalProps) {
  const [createSku, createState] = useCreateSkuMutation();
  const [schedule, setSchedule] = useState<Schedule>('OTC');
  const [gstSlab, setGstSlab] = useState<GstSlab>(12);
  const [rxOnly, setRxOnly] = useState(false);
  const failed = error || createState.isError;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (skipQuery) {
      onOpenChange?.(false);
      return;
    }
    const form = new FormData(event.currentTarget);
    const result = await createSku({
      name: formString(form.get('name')),
      composition: formString(form.get('composition')),
      manufacturer: emptyToNull(form.get('manufacturer')),
      brand: emptyToNull(form.get('brand')),
      pack: emptyToNull(form.get('pack')),
      form: emptyToNull(form.get('form')),
      category: formString(form.get('category')),
      schedule,
      rx_only: rxOnly,
      hsn: formString(form.get('hsn')),
      gst_slab: gstSlab,
      dpco_ceiling: emptyToNull(form.get('dpco_ceiling')),
    });
    if (!('error' in result)) {
      onOpenChange?.(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" showCloseButton>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {translate(masterCatalogueMessages, 'masterCatalogue.add.title')}
            </DialogTitle>
            <DialogDescription>
              {translate(masterCatalogueMessages, 'masterCatalogue.list.subtitle')}
            </DialogDescription>
          </DialogHeader>
          {failed ? (
            <StatusBanner tone="error">
              {translate(masterCatalogueMessages, 'masterCatalogue.errors.createFailed')}
            </StatusBanner>
          ) : null}
          <Field
            id="master-catalogue-name"
            name="name"
            labelKey="masterCatalogue.add.name"
            required
          />
          <Field
            id="master-catalogue-composition"
            name="composition"
            labelKey="masterCatalogue.add.composition"
            required
          />
          <Field
            id="master-catalogue-manufacturer"
            name="manufacturer"
            labelKey="masterCatalogue.add.manufacturer"
          />
          <Field id="master-catalogue-brand" name="brand" labelKey="masterCatalogue.add.brand" />
          <Field id="master-catalogue-pack" name="pack" labelKey="masterCatalogue.add.pack" />
          <Field id="master-catalogue-form" name="form" labelKey="masterCatalogue.add.form" />
          <Field
            id="master-catalogue-category"
            name="category"
            labelKey="masterCatalogue.add.category"
            required
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="master-catalogue-schedule">
              {translate(masterCatalogueMessages, 'masterCatalogue.add.schedule')}
            </Label>
            <select
              id="master-catalogue-schedule"
              className="h-11 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={schedule}
              onChange={(event) => setSchedule(parseScheduleValue(event.target.value) ?? schedule)}
            >
              {SCHEDULES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="master-catalogue-rx-only"
              checked={rxOnly}
              onCheckedChange={(checked) => setRxOnly(checked === true)}
            />
            <Label htmlFor="master-catalogue-rx-only">
              {translate(masterCatalogueMessages, 'masterCatalogue.add.rxOnly')}
            </Label>
          </div>
          <Field id="master-catalogue-hsn" name="hsn" labelKey="masterCatalogue.add.hsn" required />
          <div className="flex flex-col gap-2">
            <Label htmlFor="master-catalogue-gst">
              {translate(masterCatalogueMessages, 'masterCatalogue.add.gst')}
            </Label>
            <select
              id="master-catalogue-gst"
              className="h-11 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={String(gstSlab)}
              onChange={(event) => setGstSlab(parseGstSlabValue(event.target.value) ?? gstSlab)}
            >
              {GST_SLABS.map((value) => (
                <option key={value} value={String(value)}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <Field
            id="master-catalogue-ceiling"
            name="dpco_ceiling"
            labelKey="masterCatalogue.add.ceiling"
          />
          <p className="text-sm text-muted-foreground">
            {translate(masterCatalogueMessages, 'masterCatalogue.ceiling.help')}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
              {translate(masterCatalogueMessages, 'masterCatalogue.add.cancel')}
            </Button>
            <Button type="submit">
              {translate(masterCatalogueMessages, 'masterCatalogue.add.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  name,
  labelKey,
  required = false,
}: {
  id: string;
  name: string;
  labelKey: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{translate(masterCatalogueMessages, labelKey)}</Label>
      <Input id={id} name={name} required={required} />
    </div>
  );
}
