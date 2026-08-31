export type Messages = Record<string, string>;

export function translate(messages: Messages, key: string, fallback = key): string {
  return messages[key] ?? fallback;
}
