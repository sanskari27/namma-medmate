export interface SsmParameter {
  Name?: string;
  Value?: string;
}

export interface SsmClientLike {
  send(command: unknown): Promise<{ Parameters?: SsmParameter[] }>;
}

export function parametersToEnv(parameters: SsmParameter[] | undefined): Record<string, string> {
  const env: Record<string, string> = {};
  for (const parameter of parameters ?? []) {
    if (!parameter.Name || parameter.Value === undefined) {
      continue;
    }
    const key = parameter.Name.split('/').filter(Boolean).at(-1);
    if (key) {
      env[key.toUpperCase().replaceAll('-', '_')] = parameter.Value;
    }
  }
  return env;
}

export function ssmPath(environment: string, service: string, name: string): string {
  return `/namma-medmate/${environment}/${service}/${name}`;
}
