import { translate } from '@namma-medmate/i18n';
import { planGatingMessages } from '../i18n/en.ts';
import { PLAN_LABELS, type PlanId } from '../packaging.ts';

export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replaceAll(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? '');
}

export function planLabel(plan: PlanId): string {
  return translate(planGatingMessages, `planGating.plans.${plan}.name`, PLAN_LABELS[plan]);
}

export function paywallTitle(plan: PlanId): string {
  return interpolate(translate(planGatingMessages, 'planGating.paywall.title'), {
    plan: planLabel(plan),
  });
}

export function paywallBody(plan: PlanId, monthlyInr: number): string {
  return interpolate(translate(planGatingMessages, 'planGating.paywall.body'), {
    plan: planLabel(plan),
    monthly_inr: String(monthlyInr),
  });
}
