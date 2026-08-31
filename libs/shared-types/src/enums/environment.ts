export const Environment = {
  Local: 'local',
  Staging: 'staging',
  Prod: 'prod',
} as const;

export type EnvironmentName = (typeof Environment)[keyof typeof Environment];
