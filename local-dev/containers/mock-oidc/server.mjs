import { createServer } from 'node:http';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function jwkFromPublicKey() {
  const key = publicKey.export({ format: 'jwk' });
  return { ...key, kid: 'local-dev', alg: 'RS256', use: 'sig' };
}

function signJwt(claims) {
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', kid: 'local-dev', typ: 'JWT' }));
  const payload = toBase64Url(JSON.stringify(claims));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(privateKey).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

function mint({ sub, aud, iss, expiresInSeconds }) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt({
    sub,
    aud,
    iss,
    iat: now,
    nbf: now,
    exp: now + expiresInSeconds,
  });
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  res.setHeader('content-type', 'application/json');
  if (url.pathname === '/jwks.json') {
    res.end(JSON.stringify({ keys: [jwkFromPublicKey()] }));
    return;
  }
  if (url.pathname === '/.well-known/openid-configuration') {
    res.end(
      JSON.stringify({
        issuer: config.issuer,
        jwks_uri: `${config.issuer}/jwks.json`,
        token_endpoint: `${config.issuer}/token`,
      }),
    );
    return;
  }
  if (url.pathname === '/token') {
    const token = mint({
      sub: url.searchParams.get('sub') ?? 'user-1',
      aud: url.searchParams.get('aud') ?? config.audience,
      iss: url.searchParams.get('iss') ?? config.issuer,
      expiresInSeconds: url.searchParams.get('expired') === 'true' ? -30 : 3600,
    });
    res.end(JSON.stringify({ access_token: token, token_type: 'Bearer' }));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(config.port, '0.0.0.0', () => {
  process.stdout.write(`mock-oidc listening on ${config.port}\n`);
});
