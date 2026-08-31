export function formatSnapshot(value: Record<string, unknown> | null | undefined): string {
  if (!value) {
    return '';
  }
  return JSON.stringify(value);
}

export function formatTarget(type: string, id: string): string {
  return `${type} ${id}`;
}
