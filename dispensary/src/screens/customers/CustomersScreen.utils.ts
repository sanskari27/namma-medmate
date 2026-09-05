import type { Customer, CustomerInput } from '@/services/customers';
import { AlertCircle, BadgeCheck, Unplug, Users } from 'lucide-react';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export type FormState = {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  bloodGroup: string;
  allergies: string;
  chronicConditions: string;
};

export const emptyForm: FormState = {
  name: '',
  phone: '',
  email: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  bloodGroup: '',
  allergies: '',
  chronicConditions: '',
};

export function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: Users, text: 'Loading customers for this counter…' };
    case 'empty':
      return {
        icon: Users,
        text: 'No customers yet. Add the first walk-in or regular for this pharmacy.',
      };
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Name and phone are required before saving this customer.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'This till login cannot open customer records. Ask the owner to grant the CRM area.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'That change conflicts with existing floor data — duplicate phone, refill, or tag. Refresh and try again.',
      };
    case 'failure':
      return { icon: Unplug, text: 'Could not reach the server for customers. Try again.' };
    case 'success':
      return { icon: BadgeCheck, text: 'Customer saved on this floor.' };
    default:
      return null;
  }
}

export function toForm(customer: Customer): FormState {
  return {
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? '',
    dateOfBirth: customer.dateOfBirth ?? '',
    gender: customer.gender ?? '',
    address: customer.address ?? '',
    bloodGroup: customer.bloodGroup ?? '',
    allergies: customer.allergies ?? '',
    chronicConditions: customer.chronicConditions ?? '',
  };
}

export function toInput(form: FormState): CustomerInput {
  return {
    name: form.name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim() || undefined,
    dateOfBirth: form.dateOfBirth.trim() || undefined,
    gender: form.gender.trim() || undefined,
    address: form.address.trim() || undefined,
    bloodGroup: form.bloodGroup.trim() || undefined,
    allergies: form.allergies.trim() || undefined,
    chronicConditions: form.chronicConditions.trim() || undefined,
  };
}

export function hasCrmAccess(modules: string[] | undefined): boolean {
  return modules?.includes('CRM') === true;
}

export function hasLoyaltyAccess(modules: string[] | undefined): boolean {
  return modules?.includes('LOYALTY') === true;
}

export function hasHealthFlag(customer: Customer): boolean {
  return Boolean(customer.allergies?.trim() || customer.chronicConditions?.trim());
}

export function railClass(customer: Customer): string {
  return hasHealthFlag(customer) ? 'bg-warn' : 'bg-brand';
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

export function statusIconClass(status: PageStatus): string {
  if (status === 'success') {
    return 'text-brand';
  }
  if (status === 'conflict' || status === 'validation') {
    return 'text-warn';
  }
  if (status === 'failure' || status === 'denied') {
    return 'text-danger';
  }
  return 'text-brand';
}
