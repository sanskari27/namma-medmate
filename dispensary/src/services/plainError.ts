/**
 * Shop-floor copy keyed only by API error code.
 * The server still sends a message; the screen does not match on that text.
 * ponytail: one sentence per code. Shared codes stay shared when the next step is the same.
 */
const COPY: Record<string, string> = {};

function say(text: string, ...codes: string[]) {
  for (const code of codes) COPY[code] = text;
}

say('Could not connect. Check your internet and try again.', 'NETWORK');
say(
  "You don't have permission for this. Ask the pharmacy owner to allow it.",
  'FORBIDDEN',
  'ACCESS_DENIED',
  'SOURCE_DENIED',
  'REACTIVATION_FORBIDDEN',
);
say('Your sign-in ended. Sign in again.', 'UNAUTHENTICATED', 'UNAUTHORIZED', 'SESSION_REVOKED');
say("That email or password doesn't match. Check both and try again.", 'INVALID_CREDENTIALS');
say('That PIN is wrong. Try again, or ask the owner to reset it.', 'INVALID_PIN');
say(
  'This account cannot sign in. Ask the owner to turn it back on.',
  'ACCOUNT_LOCKED',
  'ACCOUNT_CANNOT_SIGN_IN',
  'ACCOUNT_INACTIVE',
  'STAFF_DEACTIVATED',
);
say('Verify the pharmacy email before signing in.', 'EMAIL_UNVERIFIED');
say('No PIN is set yet. Set a PIN, then try again.', 'PIN_NOT_SET');
say('A PIN is already set. Use that PIN, or ask the owner to reset it.', 'PIN_ALREADY_SET');
say('Too many attempts. Wait a minute and try again.', 'RATE_LIMITED');
say('Choose a password you have not used here before.', 'PASSWORD_REUSED');
say('This reset link is no longer valid. Request a new one and use that.', 'RESET_TOKEN_INVALID');
say(
  'This verification link is no longer valid. Request a new email and use that link.',
  'VERIFY_TOKEN_INVALID',
);
say('This email is already verified. Sign in to continue.', 'EMAIL_ALREADY_VERIFIED');
say('This email is already used. Sign in with it, or use a different email.', 'EMAIL_TAKEN');
say('Change your password before continuing.', 'PASSWORD_CHANGE_REQUIRED');
say('This needs a higher plan. Ask the owner to upgrade.', 'PLAN_LIMIT');
say('Select an outlet, then try again.', 'NO_ACTIVE_BRANCH', 'NO_BRANCH');
say('Only a pharmacist or the owner can do this. Ask one of them.', 'PHARMACIST_REQUIRED');
say(
  'That record is no longer here. Go back and refresh the list.',
  'NOT_FOUND',
  'ROLE_NOT_FOUND',
  'NOTIFICATION_NOT_FOUND',
  'TENANT_NOT_FOUND',
);
say('This record was removed. Go back and refresh the list.', 'SOURCE_DELETED');
say(
  'Someone else updated this. Refresh the page and try again.',
  'STALE_STATE',
  'CONFLICT',
  'STALE_STOCK',
  'SOURCE_CONFLICT',
  'ROLE_STALE',
  'STALE_SNAPSHOT',
);
say(
  'This was already saved. Refresh the page instead of sending it again.',
  'IDEMPOTENCY_CONFLICT',
  'DUPLICATE_RECEIPT',
  'DUPLICATE_COMPLETION',
  'NUMBER_COLLISION',
);
say(
  "There isn't enough stock. Lower the quantity, or receive more stock first.",
  'INSUFFICIENT_STOCK',
);
say('This batch is expired. Pick a batch that is still in date.', 'BATCH_EXPIRED');
say('This product is switched off. Turn it on, or pick another product.', 'PRODUCT_INACTIVE');
say('Pick a batch for this medicine, then try again.', 'BATCH_REQUIRED');
say('Add at least one medicine line.', 'LINES_REQUIRED');
say(
  'That value is already used. Use a different one, or open the existing record.',
  'PHONE_TAKEN',
  'SKU_TAKEN',
  'DUPLICATE_CODE',
  'DUPLICATE_NAME',
  'CODE_TAKEN',
  'CATEGORY_TAKEN',
  'MANUFACTURER_TAKEN',
  'ROLE_NAME_TAKEN',
  'DUPLICATE_TAG',
  'DUPLICATE_REFILL',
  'DUPLICATE_RULE',
  'DUPLICATE_UNIT',
  'GSTIN_TAKEN',
  'COUPON_TAKEN',
  'REGISTRATION_TAKEN',
  'UHID_TAKEN',
);
say('That bed is already taken. Pick a free bed.', 'BED_OCCUPIED');
say(
  'That quantity is too high. Enter a smaller quantity.',
  'OVER_RETURN',
  'OVER_RECEIPT',
  'OVER_FULFILLMENT',
  'OVER_ALLOCATION',
);
say(
  'That amount is more than what is still due. Enter a smaller amount.',
  'OVERPAYMENT',
  'CREDIT_LIMIT_EXCEEDED',
  'CREDIT_LIMIT',
);
say('Nothing is due right now.', 'NOTHING_DUE', 'NOTHING_TO_SETTLE');
say('Enter the insurer name and policy number, then continue.', 'TPA_INCOMPLETE');
say('Enter the patient ID, then continue.', 'UHID_REQUIRED');
say('Choose a ward, then continue.', 'WARD_REQUIRED');
say('This patient is on another ward. Choose that ward and try again.', 'WARD_MISMATCH');
say('This patient is discharged. Open a new stay before a ward bill.', 'ADMISSION_DISCHARGED');
say('Settle the unpaid bills first, or include the payment in this request.', 'OUTSTANDING_BILLS');
say('Set up the hospital bill-to account before issuing to a ward.', 'ACCOUNT_REQUIRED');
say('Settle with cash, UPI, card, or Insurance/TPA.', 'INVALID_SETTLEMENT_MODE');
say(
  'Link a customer first, then try again.',
  'UNLINKED_CUSTOMER',
  'PRINCIPAL_REQUIRED',
  'KHATA_REQUIRES_CUSTOMER',
  'LOYALTY_REQUIRES_CUSTOMER',
);
say(
  'Link the patient and prescriber, then tick that the prescription was checked.',
  'INCOMPLETE_CONTROLLED',
);
say(
  'The safety warnings on this bill changed. Review them and try again.',
  'SAFETY_WARNINGS_CHANGED',
);
say(
  'A review reason is required. Type why you are continuing, then try again.',
  'REVIEW_REASON_REQUIRED',
);
say('A reason is required. Type why, then try again.', 'REASON_REQUIRED');
say(
  'Some details are missing or wrong. Check the form and try again.',
  'VALIDATION_ERROR',
  'VALIDATION',
);
say("That action isn't available. Refresh the page and try again.", 'METHOD_NOT_ALLOWED');
say('Something went wrong. Try again. If it keeps happening, refresh the page.', 'INTERNAL_ERROR');
say(
  'The file could not be saved. Check the file and try again.',
  'STORAGE_ERROR',
  'UNSUPPORTED_FILE',
);
say('That outlet is switched off. Pick an active outlet.', 'BRANCH_INACTIVE');
say(
  "That outlet doesn't belong to this pharmacy. Pick an outlet from your list.",
  'BRANCH_NOT_IN_TENANT',
);
say('Pick two different outlets.', 'SAME_BRANCH');
say('Pay the plan through checkout before this pharmacy can go live.', 'PAYMENT_REQUIRED');
say('Finish verification and KYC, then try again.', 'TENANT_VERIFICATION_REQUIRED');
say('This pharmacy is suspended. Contact support to restore it.', 'TENANT_SUSPENDED');
say("This pharmacy's plan has expired. Renew the plan, then sign in again.", 'TENANT_EXPIRED');
say('This pharmacy has been closed. Contact support if that is a mistake.', 'TENANT_TERMINATED');

const FALLBACK = COPY.INTERNAL_ERROR;

export function plainError(code: string | null | undefined): string {
  if (!code) return FALLBACK;
  return COPY[code] ?? FALLBACK;
}
