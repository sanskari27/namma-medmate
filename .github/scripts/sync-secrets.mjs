import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';

const environment = process.argv[2];
if (!environment) {
  throw new Error('Usage: node sync-secrets.mjs <staging|prod>');
}

const config = load(readFileSync(`secrets-config/${environment}.secrets.yaml`, 'utf8'));
const client = new SSMClient({ region: 'ap-south-1' });

for (const parameter of config.parameters) {
  const value = process.env[parameter.githubSecret];
  if (!value) {
    throw new Error(`Missing GitHub Environment secret ${parameter.githubSecret}`);
  }
  const name = `/namma-medmate/${environment}/${parameter.service}/${parameter.name}`;
  await client.send(
    new PutParameterCommand({
      Name: name,
      Value: value,
      Type: 'SecureString',
      Overwrite: true,
      Tags: [
        { Key: 'app', Value: 'namma-medmate' },
        { Key: 'environment', Value: environment },
        { Key: 'service', Value: parameter.service },
      ],
    }),
  );
  process.stdout.write(`updated ${name}\n`);
}
