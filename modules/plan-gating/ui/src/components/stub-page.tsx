import { translate } from '@namma-medmate/i18n';
import { planGatingMessages } from '../i18n/en.ts';
import { interpolate } from '../lib/copy.ts';

export interface StubPageProps {
  titleKey: string;
  moduleLabel: string;
}

export function StubPage({ titleKey, moduleLabel }: StubPageProps) {
  return (
    <section className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">{translate(planGatingMessages, titleKey)}</h1>
      <p className="text-muted-foreground">
        {interpolate(translate(planGatingMessages, 'planGating.stub.body'), {
          module: moduleLabel,
        })}
      </p>
    </section>
  );
}
