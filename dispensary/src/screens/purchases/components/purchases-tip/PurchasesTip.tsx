import { Lightbulb } from 'lucide-react';
import { PURCHASES_CONTENT } from '../../PurchasesScreen.content';

export function PurchasesTip() {
  return (
    <div className="purchases-tip" role="note">
      <Lightbulb size={16} aria-hidden />
      <span>{PURCHASES_CONTENT.tip}</span>
    </div>
  );
}
