export const e2eTags = {
  smoke: '@smoke',
  a11y: '@a11y',
  visual: '@visual',
} as const;

export type E2eTag = (typeof e2eTags)[keyof typeof e2eTags];

export function taggedTitle(name: string, ...tags: readonly E2eTag[]): string {
  if (tags.length === 0) {
    return name;
  }
  return `${name} ${tags.join(' ')}`;
}
