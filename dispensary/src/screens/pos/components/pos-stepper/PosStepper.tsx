import { Check } from 'lucide-react';
import { useSelector } from 'react-redux';
import { POS_CONTENT } from '../../PosScreen.content';
import { selectPosHasCartItems, selectPosStep } from '../../store/pos.selectors';

export function PosStepper() {
  const step = useSelector(selectPosStep);
  const hasItems = useSelector(selectPosHasCartItems);
  const cartActive = step === 'cart';
  const paymentActive = step === 'payment';
  const cartDone = paymentActive;

  return (
    <nav className="pos-stepper" aria-label={POS_CONTENT.stepsNav}>
      <span className="pos-step" data-active={cartActive} data-done={cartDone}>
        <span className="pos-step-num" aria-hidden="true">
          {cartDone ? <Check size={14} strokeWidth={3} /> : '1'}
        </span>
        {POS_CONTENT.stepCart}
      </span>
      <span className="pos-step-arrow" aria-hidden="true">
        {POS_CONTENT.stepArrow}
      </span>
      <span
        className="pos-step"
        data-active={paymentActive}
        data-done={false}
        aria-disabled={!hasItems && !paymentActive}
      >
        <span className="pos-step-num" aria-hidden="true">
          2
        </span>
        {POS_CONTENT.stepPayment}
      </span>
    </nav>
  );
}
