import { WhatsAppErrors } from '../errors.ts';
import { parseOptionalMobileTo } from '../http/validate.ts';

const MAX_TEXT = 1000;
const MAX_ENCODED = 2000;

export function buildShareDeeplink(input: { to?: unknown; text: unknown }): { url: string } {
  if (typeof input.text !== 'string' || input.text.trim().length === 0) {
    throw WhatsAppErrors.validationFailed('text is required');
  }
  const truncated =
    input.text.length > MAX_TEXT ? `${input.text.slice(0, MAX_TEXT - 1)}…` : input.text;
  const to = parseOptionalMobileTo(input.to);
  const encoded = encodeURIComponent(truncated);
  const path = to ? to.replace(/^\+/, '') : '';
  const url = path ? `https://wa.me/${path}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  if (url.length > MAX_ENCODED) {
    throw WhatsAppErrors.textTooLong();
  }
  return { url };
}
