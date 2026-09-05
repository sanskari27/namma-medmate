import { Button } from '@atoms';
import type { Product } from '@/services/products';
import type { FormState } from '../../OffersScreen.utils';

export type OffersFormPanelProps = {
  form: FormState;
  products: Product[];
  creating: boolean;
  canPublish: boolean;
  canDeactivate: boolean;
  busy: boolean;
  onChange: (patch: Partial<FormState>) => void;
  onToggleProduct: (productId: string) => void;
  onSave: () => void;
  onPublish: () => void;
  onDeactivate: () => void;
};

export function OffersFormPanel({
  form,
  products,
  creating,
  canPublish,
  canDeactivate,
  busy,
  onChange,
  onToggleProduct,
  onSave,
  onPublish,
  onDeactivate,
}: OffersFormPanelProps) {
  return (
    <section className="space-y-3 border border-line bg-surface p-3" aria-label="Scheme form">
      <h2 className="text-sm font-semibold text-ink">{creating ? 'New scheme' : 'Edit scheme'}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-ink">
          Scheme name
          <input
            className="mt-1 w-full border border-line bg-canvas px-2 py-1.5 text-sm"
            value={form.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </label>
        <label className="block text-sm text-ink">
          Scheme type
          <select
            className="mt-1 w-full border border-line bg-canvas px-2 py-1.5 text-sm"
            value={form.kind}
            onChange={(event) => onChange({ kind: event.target.value as FormState['kind'] })}
          >
            <option value="BOGO">Buy 2 get 1</option>
            <option value="SEASONAL">Seasonal</option>
            <option value="BUNDLE">Bundle</option>
          </select>
        </label>
        <label className="block text-sm text-ink">
          Priority
          <input
            className="mt-1 w-full border border-line bg-canvas px-2 py-1.5 font-mono text-sm"
            type="number"
            value={form.priority}
            onChange={(event) => onChange({ priority: event.target.value })}
          />
        </label>
        {form.kind === 'BOGO' ? (
          <>
            <label className="block text-sm text-ink">
              Buy qty
              <input
                className="mt-1 w-full border border-line bg-canvas px-2 py-1.5 font-mono text-sm"
                type="number"
                value={form.buyQuantity}
                onChange={(event) => onChange({ buyQuantity: event.target.value })}
              />
            </label>
            <label className="block text-sm text-ink">
              Free qty
              <input
                className="mt-1 w-full border border-line bg-canvas px-2 py-1.5 font-mono text-sm"
                type="number"
                value={form.getQuantity}
                onChange={(event) => onChange({ getQuantity: event.target.value })}
              />
            </label>
          </>
        ) : null}
        {form.kind === 'SEASONAL' ? (
          <>
            <label className="block text-sm text-ink">
              Starts
              <input
                className="mt-1 w-full border border-line bg-canvas px-2 py-1.5 font-mono text-sm"
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => onChange({ startsAt: event.target.value })}
              />
            </label>
            <label className="block text-sm text-ink">
              Ends
              <input
                className="mt-1 w-full border border-line bg-canvas px-2 py-1.5 font-mono text-sm"
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => onChange({ endsAt: event.target.value })}
              />
            </label>
            <label className="block text-sm text-ink">
              Discount bps
              <input
                className="mt-1 w-full border border-line bg-canvas px-2 py-1.5 font-mono text-sm"
                type="number"
                value={form.percentBps}
                onChange={(event) => onChange({ percentBps: event.target.value })}
              />
            </label>
          </>
        ) : null}
      </div>
      <fieldset className="space-y-1">
        <legend className="text-sm text-ink">Medicines on this scheme</legend>
        {products.map((product) => (
          <label key={product.id} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.productIds.includes(product.id)}
              onChange={() => onToggleProduct(product.id)}
            />
            {product.name}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onSave} disabled={busy}>
          Save scheme
        </Button>
        {canPublish ? (
          <Button type="button" variant="outline" onClick={onPublish} disabled={busy}>
            Publish scheme
          </Button>
        ) : null}
        {canDeactivate ? (
          <Button type="button" variant="outline" onClick={onDeactivate} disabled={busy}>
            Turn this scheme off
          </Button>
        ) : null}
      </div>
    </section>
  );
}
