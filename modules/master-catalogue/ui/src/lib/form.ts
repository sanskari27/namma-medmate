export function formString(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : '';
}

export function emptyToNull(value: FormDataEntryValue | null): string | null {
  const text = formString(value).trim();
  return text.length > 0 ? text : null;
}
