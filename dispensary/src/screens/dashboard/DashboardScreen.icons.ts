import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  PackageMinus,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';

export function paymentModeIcon(mode: string): LucideIcon {
  switch (mode) {
    case 'CASH':
      return Banknote;
    case 'CARD':
      return CreditCard;
    case 'UPI':
      return Smartphone;
    case 'CREDIT':
      return BookOpen;
    case 'BANK_TRANSFER':
      return Building2;
    default:
      return Wallet;
  }
}

export function attentionKindIcon(kind: string): LucideIcon {
  switch (kind) {
    case 'PRESCRIPTION':
      return ClipboardList;
    case 'LOW_STOCK':
      return PackageMinus;
    case 'APPROVAL':
      return ShieldCheck;
    default:
      return ClipboardCheck;
  }
}
