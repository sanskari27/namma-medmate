export const requiredTags = [
  'type:app',
  'type:module-ui',
  'type:module-api',
  'type:lib',
  'type:tool',
] as const;

export const allowedTypeDependencies: Record<string, readonly string[]> = {
  'type:app': ['type:module-ui', 'type:lib'],
  'type:module-ui': ['type:lib'],
  'type:module-api': ['type:lib'],
  'type:lib': ['type:lib'],
  'type:tool': ['type:lib', 'type:tool'],
};
