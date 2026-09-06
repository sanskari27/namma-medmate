import type { CurrentSubscription, PlanOffer } from '@/services/subscriptions';
import { AlertCircle, BadgeCheck, BadgePercent, Unplug } from 'lucide-react';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'quota'
  | 'unavailable'
  | null;

export const PLAN_ORDER = ['FREE', 'STARTER', 'GROWTH', 'PRO'] as const;

export function planLabel(code: string): string {
  switch (code) {
    case 'FREE':
      return 'Free';
    case 'STARTER':
      return 'Starter';
    case 'GROWTH':
      return 'Growth';
    case 'PRO':
      return 'Pro';
    default:
      return code;
  }
}

export function isPaidPlan(plan: PlanOffer | { planCode: string; pricePaiseMonthly?: number }): boolean {
  if ('pricePaiseMonthly' in plan && typeof plan.pricePaiseMonthly === 'number') {
    return plan.pricePaiseMonthly > 0;
  }
  return plan.planCode !== 'FREE';
}

export function hasLoyalty(modules: string[]): boolean {
  return modules.includes('LOYALTY');
}

export function hasKiosk(modules: string[]): boolean {
  return modules.includes('KIOSK');
}

export function floorDesks(modules: string[]): string {
  const names = modules
    .filter((code) => code !== 'LOYALTY' && code !== 'KIOSK')
    .map((code) => {
      switch (code) {
        case 'SALES':
          return 'billing';
        case 'INVENTORY':
          return 'stock';
        case 'PROCUREMENT':
          return 'purchase';
        case 'CRM':
          return 'patients';
        case 'FINANCE':
          return 'accounts';
        case 'REPORTING':
          return 'reports';
        case 'COMPLIANCE':
          return 'register book';
        case 'STAFF':
          return 'staff';
        case 'ROLES':
          return 'floor roles';
        case 'APPROVALS':
          return 'sign-off';
        default:
          return code.toLowerCase();
      }
    });
  return names.join(', ');
}

export function formatIst(value: string | null): string {
  if (!value) {
    return 'No expiry on file';
  }
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: BadgePercent, text: 'Loading this pharmacy’s plan…' };
    case 'empty':
      return {
        icon: BadgePercent,
        text: 'No plan on file yet. Finish KYC so this pharmacy can start on Free.',
      };
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Choose a higher plan before changing this pharmacy’s plan.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'Only the pharmacy owner can change the plan at this counter.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'This pharmacy already uses more outlets or till logins than that plan allows. Reduce usage first.',
      };
    case 'unavailable':
      return {
        icon: Unplug,
        text: 'Checkout is not available right now. Try again in a few minutes.',
      };
    case 'failure':
      return {
        icon: Unplug,
        text: 'Could not reach the server for this pharmacy’s plan. Try again.',
      };
    case 'success':
      return { icon: BadgeCheck, text: 'Plan updated for this pharmacy.' };
    case 'quota':
      return {
        icon: AlertCircle,
        text: 'This pharmacy is at a plan limit. Upgrade below to add more outlets or till logins.',
      };
    default:
      return null;
  }
}

export function paymentStatusCopy(status: string | null): string | null {
  if (status === 'PENDING') {
    return 'Checkout not finished — plan unchanged.';
  }
  if (status === 'ABANDONED' || status === 'FAILED') {
    return 'Checkout not finished — plan unchanged.';
  }
  if (status === 'SUCCESS') {
    return 'Payment landed. This pharmacy’s plan is on the new card.';
  }
  return null;
}

export function sortPlans(plans: PlanOffer[]): PlanOffer[] {
  return [...plans].sort((a, b) => {
    const rank = (code: string) => PLAN_ORDER.indexOf(code as (typeof PLAN_ORDER)[number]);
    return rank(a.planCode) - rank(b.planCode);
  });
}

export type { CurrentSubscription, PlanOffer };
