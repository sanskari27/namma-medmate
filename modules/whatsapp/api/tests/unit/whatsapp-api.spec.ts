import { createServer, type Server } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT, type GenerateKeyPairResult } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import {
  BUSINESS_TYPE_RETAIL,
  GST_DEALER_TYPE_REGULAR,
  createMemoryTenancyRepository,
  createMemoryWhatsAppRepository,
} from '@namma-medmate/db-services';
import { ErrorCode } from '@namma-medmate/constants';
import { hmacSha256 } from '@namma-medmate/encryption-utils';
import { HttpClientError } from '@namma-medmate/http-client';
import { createApp, resolveApiSpecPath } from '../../src/app.ts';
import { loadWhatsAppEnv } from '../../src/config/env.ts';
import { principalFromSession, requireCatalogueReader } from '../../src/auth/principal.ts';
import { canAdvanceStatus } from '../../src/send/send-service.ts';
import { MemoryMetaClient } from '../../src/meta/memory-client.ts';
import { createGraphMetaClient } from '../../src/meta/graph-client.ts';
import { ImmediateRetryScheduler } from '../../src/send/retry-scheduler.ts';
import { buildShareDeeplink } from '../../src/share/deeplink.ts';
import {
  bodyParamsForMeta,
  getTemplate,
  inboxPreview,
  purposeForTemplate,
} from '../../src/catalogue.ts';
import { localSeedPharmacy } from '../../src/local-seed.ts';
import { WhatsAppErrors } from '../../src/errors.ts';
import { parseMobileTo, parseOptionalMobileTo } from '../../src/http/validate.ts';
import { requirePharmacy } from '../../src/auth/principal.ts';
import { META_MESSAGING_PRODUCT } from '../../src/meta/client.ts';
import * as catalogue from '../../src/catalogue.ts';
import { resolveLocation } from '../../src/tenancy/resolve-location.ts';
import {
  createMetaWebhookController,
  createMetaWebhookParser,
} from '../../src/controllers/meta-webhook.controller.ts';
import { parseUuid } from '../../src/http/validate.ts';
import { resolveScopedPair } from '../../src/http/scope.ts';

const DISPLAY = 'Sri Krishna Medicals';
const MOBILE = '+919876543210';

describe('whatsapp env', () => {
  it('loads required settings and defaults the port', () => {
    const env = loadWhatsAppEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      WHATSAPP_SERVICE_TOKEN: 'svc',
      META_WABA_PHONE_NUMBER_ID: 'phone',
      META_WABA_ACCESS_TOKEN: 'token',
      META_WEBHOOK_APP_SECRET: 'secret',
    });
    expect(env.WHATSAPP_API_PORT).toBe(3003);
    expect(env.WHATSAPP_PERSISTENCE).toBe('memory');
  });

  it('accepts postgres persistence and a coerced port', () => {
    const env = loadWhatsAppEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      WHATSAPP_SERVICE_TOKEN: 'svc',
      META_WABA_PHONE_NUMBER_ID: 'phone',
      META_WABA_ACCESS_TOKEN: 'token',
      META_WEBHOOK_APP_SECRET: 'secret',
      WHATSAPP_PERSISTENCE: 'postgres',
      WHATSAPP_API_PORT: '4011',
      DATABASE_URL: 'postgres://namma:namma@127.0.0.1:5432/namma',
    });
    expect(env.WHATSAPP_PERSISTENCE).toBe('postgres');
    expect(env.WHATSAPP_API_PORT).toBe(4011);
  });
});

describe('resolveApiSpecPath', () => {
  it('prefers the module-relative swagger when it exists', () => {
    expect(
      resolveApiSpecPath(
        (path) => path.endsWith('contract/swagger.yaml'),
        'file:///modules/whatsapp/api/src/app.ts',
        '/tmp',
      ),
    ).toMatch(/contract\/swagger\.yaml$/);
  });

  it('falls back to cwd copies and ignores an invalid module url', () => {
    expect(
      resolveApiSpecPath((path) => path === '/var/task/swagger.yaml', 'not-a-url', '/var/task'),
    ).toBe('/var/task/swagger.yaml');
    expect(resolveApiSpecPath(() => false, undefined, '/tmp')).toBeUndefined();
  });
});

describe('helpers', () => {
  it('maps principals, catalogue, status rank, and share URLs', () => {
    expect(
      principalFromSession({
        sub: 'x',
        issuer: 'iss',
        audience: 'aud',
        principalType: 'pharmacy',
        tenantId: 't',
      }),
    ).toBeUndefined();
    expect(
      principalFromSession({ sub: 'ops', issuer: 'iss', audience: 'aud', principalType: 'hq' }),
    ).toEqual({ kind: 'hq', sub: 'ops' });
    expect(() => requireCatalogueReader(undefined)).toThrow();
    expect(getTemplate('missing')).toBeUndefined();
    expect(purposeForTemplate('login_otp', 'camp-1')).toBe('campaign');
    expect(inboxPreview('login_otp', DISPLAY)).toBe('Login code sent.');
    expect(inboxPreview('khata_remind', DISPLAY)).toContain(DISPLAY);
    expect(canAdvanceStatus('read', 'sent')).toBe(false);
    expect(canAdvanceStatus('queued', 'sent')).toBe(true);
    expect(canAdvanceStatus('failed', 'delivered')).toBe(true);
    expect(canAdvanceStatus('sent', 'failed')).toBe(true);
    expect(canAdvanceStatus('queued', 'failed')).toBe(true);
    expect(canAdvanceStatus('delivered', 'failed')).toBe(false);
    expect(canAdvanceStatus('failed', 'sent')).toBe(false);
    expect(canAdvanceStatus('failed', 'read')).toBe(true);
    expect(canAdvanceStatus('read', 'read')).toBe(false);
    expect(buildShareDeeplink({ text: 'Hello' }).url).toBe('https://wa.me/?text=Hello');
    expect(buildShareDeeplink({ to: MOBILE, text: 'Hi' }).url).toContain('919876543210');
    expect(localSeedPharmacy().location.displayName).toBe(DISPLAY);
    expect(WhatsAppErrors.validationFailed('x').message).toBe('x');
    expect(WhatsAppErrors.locationNotFound().code).toBe(ErrorCode.LOCATION_NOT_FOUND);
    expect(() => requirePharmacy(undefined)).toThrow();
    expect(() => parseMobileTo(1)).toThrow();
    expect(() => parseMobileTo('+44123456')).toThrow();
    expect(parseOptionalMobileTo('')).toBeUndefined();
    expect(parseOptionalMobileTo(null)).toBeUndefined();
    expect(inboxPreview('nope' as never, DISPLAY)).toBe(`${DISPLAY}: WhatsApp sent.`);
    expect(bodyParamsForMeta('login_otp', DISPLAY, {})).toEqual([DISPLAY, '']);
    expect(bodyParamsForMeta('low_stock', DISPLAY, { sku_name: 1 })).toEqual([DISPLAY, '']);
    expect(bodyParamsForMeta('nope' as never, DISPLAY, {})).toEqual([]);
    expect(META_MESSAGING_PRODUCT).toBe('whatsapp');
    expect(() => parseUuid('nope', 'tenant_id')).toThrow();
    expect(() => resolveScopedPair(undefined, undefined, undefined)).toThrow();
    expect(() =>
      resolveScopedPair({ kind: 'service', sub: 'svc' }, crypto.randomUUID(), undefined),
    ).toThrow();
  });

  it('truncates share text and rejects encoded overflow', () => {
    const long = 'x'.repeat(1005);
    const url = buildShareDeeplink({ text: long }).url;
    expect(url).toContain('%E2%80%A6');
    expect(() => buildShareDeeplink({ text: '' })).toThrow();
    expect(() => buildShareDeeplink({ text: '字'.repeat(1000) })).toThrow();
  });
});

describe('graph meta client', () => {
  it('sends a template and maps 4xx vs 5xx', async () => {
    const env = loadWhatsAppEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
      WHATSAPP_SERVICE_TOKEN: 'svc',
      META_WABA_PHONE_NUMBER_ID: 'phone',
      META_WABA_ACCESS_TOKEN: 'token',
      META_WEBHOOK_APP_SECRET: 'secret',
    });
    const ok = createGraphMetaClient(
      env,
      async () => new Response(JSON.stringify({ messages: [{ id: 'wamid.ok' }] }), { status: 200 }),
    );
    await expect(
      ok.sendTemplate({
        to: MOBILE,
        templateName: 'namma_login_otp',
        language: 'en',
        bodyParams: [DISPLAY, '1234'],
      }),
    ).resolves.toMatchObject({ ok: true, metaMessageId: 'wamid.ok' });
    const clientErr = createGraphMetaClient(env, async () => {
      throw new HttpClientError('bad', 400);
    });
    await expect(
      clientErr.sendTemplate({ to: MOBILE, templateName: 'x', language: 'en', bodyParams: [] }),
    ).resolves.toMatchObject({ ok: false, retryable: false });
    const serverErr = createGraphMetaClient(env, async () => {
      throw new HttpClientError('down', 503);
    });
    await expect(
      serverErr.sendTemplate({ to: MOBILE, templateName: 'x', language: 'en', bodyParams: [] }),
    ).resolves.toMatchObject({ ok: false, retryable: true });
    const timeout = createGraphMetaClient(
      env,
      async () => new Response('not-json', { status: 200 }),
    );
    await expect(
      timeout.sendTemplate({ to: MOBILE, templateName: 'x', language: 'en', bodyParams: [] }),
    ).resolves.toMatchObject({ ok: false, retryable: true });
    const noStatus = createGraphMetaClient(env, async () => {
      throw new HttpClientError('offline');
    });
    await expect(
      noStatus.sendTemplate({ to: MOBILE, templateName: 'x', language: 'en', bodyParams: [] }),
    ).resolves.toMatchObject({ ok: false, retryable: true });
  });
});

describe('whatsapp-api', () => {
  let keys: GenerateKeyPairResult;
  let server: Server;
  let issuer = '';
  let jwksUri = '';

  beforeAll(async () => {
    keys = await generateKeyPair('RS256');
    const jwk = await exportJWK(keys.publicKey);
    jwk.kid = 'whatsapp-test';
    jwk.alg = 'RS256';
    jwk.use = 'sig';
    server = createServer((req, res) => {
      if (req.url === '/jwks.json') {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ keys: [jwk] }));
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('jwks bind failed');
    }
    issuer = `http://127.0.0.1:${address.port}`;
    jwksUri = `${issuer}/jwks.json`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  function env() {
    return loadWhatsAppEnv({
      OIDC_ISSUER: issuer,
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: jwksUri,
      LOG_LEVEL: 'error',
      WHATSAPP_SERVICE_TOKEN: 'svc-token',
      META_WABA_PHONE_NUMBER_ID: 'phone',
      META_WABA_ACCESS_TOKEN: 'waba',
      META_WEBHOOK_APP_SECRET: 'meta-secret',
    });
  }

  async function token(claims: Record<string, unknown>) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'whatsapp-test' })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience('namma-medmate-dispensary')
      .setExpirationTime('5m')
      .sign(keys.privateKey);
  }

  async function pharmacyToken(tenantId: string, locationId: string, role = 'owner') {
    return token({
      sub: 'chemist-1',
      principal_type: 'pharmacy',
      tenant_id: tenantId,
      location_id: locationId,
      role,
    });
  }

  async function hqToken() {
    return token({ sub: 'ops-1', principal_type: 'hq' });
  }

  async function seedApp(meta = new MemoryMetaClient()) {
    const tenancy = createMemoryTenancyRepository();
    const pharmacy = await tenancy.createPharmacyWithLocation({
      displayName: DISPLAY,
      gstDealerType: GST_DEALER_TYPE_REGULAR,
      businessType: BUSINESS_TYPE_RETAIL,
    });
    const messages = createMemoryWhatsAppRepository();
    const scheduler = new ImmediateRetryScheduler();
    const app = createApp(env(), { tenancy, messages, meta, scheduler });
    return { app, pharmacy, messages, meta, scheduler };
  }

  it('auto-mounts /health', async () => {
    const { app } = await seedApp();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });

  it('sends login_otp with shop name and no digits in preview', async () => {
    const { app, pharmacy, meta } = await seedApp();
    const bearer = `Bearer ${await pharmacyToken(pharmacy.tenantId, pharmacy.location.locationId)}`;
    const sent = await request(app)
      .post('/whatsapp/messages')
      .set('Authorization', bearer)
      .send({
        tenant_id: pharmacy.tenantId,
        location_id: pharmacy.location.locationId,
        to: MOBILE,
        template_key: 'login_otp',
        purpose: 'otp',
        params: { otp: '4821' },
        idempotency_key: 'otp-1',
      });
    expect(sent.status).toBe(202);
    expect(sent.body.data.status).toBe('sent');
    expect(meta.sent[0]?.bodyParams[0]).toBe(DISPLAY);
    expect(JSON.stringify(meta.sent[0])).not.toContain('waba');
    const inbox = await request(app)
      .get(`/whatsapp/messages?location_id=${pharmacy.location.locationId}`)
      .set('Authorization', bearer);
    expect(inbox.status).toBe(200);
    expect(inbox.body.data.items[0].preview).toBe('Login code sent.');
    expect(JSON.stringify(inbox.body)).not.toContain('4821');
    expect(JSON.stringify(inbox.body)).not.toContain('waba');
  });

  it('marks OTP failed after three retryable Meta errors and never sends SMS', async () => {
    const meta = new MemoryMetaClient();
    meta.queueResult({ ok: false, retryable: true, errorCode: 'META_UNAVAILABLE' });
    meta.queueResult({ ok: false, retryable: true, errorCode: 'META_UNAVAILABLE' });
    meta.queueResult({ ok: false, retryable: true, errorCode: 'META_UNAVAILABLE' });
    const { app, pharmacy, scheduler } = await seedApp(meta);
    const sent = await request(app)
      .post('/whatsapp/messages')
      .set('Authorization', `Bearer svc-token`)
      .send({
        tenant_id: pharmacy.tenantId,
        location_id: pharmacy.location.locationId,
        to: MOBILE,
        template_key: 'login_otp',
        idempotency_key: 'otp-fail',
        params: { otp: '1111' },
      });
    expect(sent.status).toBe(202);
    expect(sent.body.data.status).toBe('failed');
    expect(scheduler.delays).toEqual([2000, 10000]);
    const inbox = await request(app)
      .get(`/whatsapp/messages?location_id=${pharmacy.location.locationId}`)
      .set(
        'Authorization',
        `Bearer ${await pharmacyToken(pharmacy.tenantId, pharmacy.location.locationId)}`,
      );
    expect(inbox.body.data.items[0].status).toBe('failed');
    expect(JSON.stringify(inbox.body)).not.toContain('1111');
  });

  it('fails 4xx immediately without retry and rejects bad to or unknown templates', async () => {
    const meta = new MemoryMetaClient();
    meta.queueResult({ ok: false, retryable: false, errorCode: 'META_CLIENT_ERROR' });
    const { app, pharmacy } = await seedApp(meta);
    const bearer = `Bearer ${await pharmacyToken(pharmacy.tenantId, pharmacy.location.locationId)}`;
    const failed = await request(app).post('/whatsapp/messages').set('Authorization', bearer).send({
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.location.locationId,
      to: MOBILE,
      template_key: 'refill',
      idempotency_key: 'refill-1',
    });
    expect(failed.body.data.status).toBe('failed');
    meta.queueResult({ ok: false, retryable: false });
    const failedNoCode = await request(app)
      .post('/whatsapp/messages')
      .set('Authorization', bearer)
      .send({
        tenant_id: pharmacy.tenantId,
        location_id: pharmacy.location.locationId,
        to: MOBILE,
        template_key: 'low_stock',
        idempotency_key: 'low-1',
        params: { sku_name: 'PCM' },
      });
    expect(failedNoCode.body.data.status).toBe('failed');
    const badTo = await request(app).post('/whatsapp/messages').set('Authorization', bearer).send({
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.location.locationId,
      to: '+911234567890',
      template_key: 'refill',
      idempotency_key: 'bad-to',
    });
    expect(badTo.status).toBe(400);
    expect(badTo.body.error.code).toBe(ErrorCode.INVALID_WHATSAPP_TO);
    const unknown = await request(app)
      .post('/whatsapp/messages')
      .set('Authorization', bearer)
      .send({
        tenant_id: pharmacy.tenantId,
        location_id: pharmacy.location.locationId,
        to: MOBILE,
        template_key: 'nope',
        idempotency_key: 'x',
      });
    expect(unknown.body.error.code).toBe(ErrorCode.UNKNOWN_TEMPLATE);
    const noKey = await request(app).post('/whatsapp/messages').set('Authorization', bearer).send({
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.location.locationId,
      to: MOBILE,
      template_key: 'refill',
    });
    expect(noKey.body.error.code).toBe(ErrorCode.IDEMPOTENCY_KEY_REQUIRED);
  });

  it('dedupes bill sends and OTP idempotency keys', async () => {
    const { app, pharmacy, meta } = await seedApp();
    const bearer = `Bearer ${await pharmacyToken(pharmacy.tenantId, pharmacy.location.locationId)}`;
    const first = await request(app).post('/whatsapp/messages').set('Authorization', bearer).send({
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.location.locationId,
      to: MOBILE,
      template_key: 'irn_fail',
      bill_id: 'INV-24-00018',
    });
    const second = await request(app).post('/whatsapp/messages').set('Authorization', bearer).send({
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.location.locationId,
      to: MOBILE,
      template_key: 'irn_fail',
      bill_id: 'INV-24-00018',
    });
    expect(first.status).toBe(202);
    expect(second.status).toBe(200);
    expect(second.body.data.deduped).toBe(true);
    expect(second.body.data.message_id).toBe(first.body.data.message_id);
    expect(meta.sent).toHaveLength(1);
    const otpA = await request(app).post('/whatsapp/messages').set('Authorization', bearer).send({
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.location.locationId,
      to: MOBILE,
      template_key: 'login_otp',
      idempotency_key: 'otp-same',
    });
    const otpB = await request(app).post('/whatsapp/messages').set('Authorization', bearer).send({
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.location.locationId,
      to: MOBILE,
      template_key: 'login_otp',
      idempotency_key: 'otp-same',
    });
    const otpC = await request(app).post('/whatsapp/messages').set('Authorization', bearer).send({
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.location.locationId,
      to: MOBILE,
      template_key: 'login_otp',
      idempotency_key: 'otp-new',
    });
    expect(otpB.body.data.deduped).toBe(true);
    expect(otpC.body.data.message_id).not.toBe(otpA.body.data.message_id);
  });

  it('keeps mandatory IRN failures until Owner acks and refuses Cashier', async () => {
    const meta = new MemoryMetaClient();
    meta.queueResult({ ok: false, retryable: false, errorCode: 'META_UNAVAILABLE' });
    const { app, pharmacy } = await seedApp(meta);
    const owner = `Bearer ${await pharmacyToken(pharmacy.tenantId, pharmacy.location.locationId)}`;
    const cashier = `Bearer ${await pharmacyToken(pharmacy.tenantId, pharmacy.location.locationId, 'cashier')}`;
    const sent = await request(app).post('/whatsapp/messages').set('Authorization', owner).send({
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.location.locationId,
      to: MOBILE,
      template_key: 'irn_fail',
      bill_id: 'INV-24-00019',
    });
    const listed = await request(app)
      .get(`/whatsapp/mandatory-failures?location_id=${pharmacy.location.locationId}`)
      .set('Authorization', owner);
    expect(listed.body.data.items[0].bill_id).toBe('INV-24-00019');
    const refused = await request(app)
      .post(`/whatsapp/messages/${sent.body.data.message_id}/acknowledge`)
      .set('Authorization', cashier)
      .send({ location_id: pharmacy.location.locationId });
    expect(refused.status).toBe(403);
    expect(refused.body.error.code).toBe(ErrorCode.FORBIDDEN_ROLE);
    const still = await request(app)
      .get(`/whatsapp/mandatory-failures?location_id=${pharmacy.location.locationId}`)
      .set('Authorization', owner);
    expect(still.body.data.items).toHaveLength(1);
    const acked = await request(app)
      .post(`/whatsapp/messages/${sent.body.data.message_id}/acknowledge`)
      .set('Authorization', owner)
      .send({ location_id: pharmacy.location.locationId });
    expect(acked.status).toBe(200);
    const empty = await request(app)
      .get(`/whatsapp/mandatory-failures?location_id=${pharmacy.location.locationId}`)
      .set('Authorization', owner);
    expect(empty.body.data.items).toHaveLength(0);
    const again = await request(app)
      .post(`/whatsapp/messages/${sent.body.data.message_id}/acknowledge`)
      .set('Authorization', owner)
      .send({ location_id: pharmacy.location.locationId });
    expect(again.status).toBe(409);
  });

  it('scopes inbox and rejects missing or foreign location_id', async () => {
    const { app, pharmacy } = await seedApp();
    const owner = `Bearer ${await pharmacyToken(pharmacy.tenantId, pharmacy.location.locationId)}`;
    const missing = await request(app).get('/whatsapp/messages').set('Authorization', owner);
    expect(missing.body.error.code).toBe(ErrorCode.LOCATION_ID_REQUIRED);
    const foreign = await request(app)
      .get(`/whatsapp/messages?location_id=${crypto.randomUUID()}`)
      .set('Authorization', owner);
    expect(foreign.body.error.code).toBe(ErrorCode.LOCATION_TENANT_MISMATCH);
    const hq = await request(app)
      .get(`/whatsapp/messages?location_id=${pharmacy.location.locationId}`)
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(hq.status).toBe(403);
  });

  it('builds a share deeplink without creating a message or calling Meta', async () => {
    const { app, pharmacy, meta, messages } = await seedApp();
    const owner = `Bearer ${await pharmacyToken(pharmacy.tenantId, pharmacy.location.locationId)}`;
    const shared = await request(app)
      .post('/whatsapp/share-deeplink')
      .set('Authorization', owner)
      .send({
        tenant_id: pharmacy.tenantId,
        location_id: pharmacy.location.locationId,
        to: MOBILE,
        text: `${DISPLAY} — invoice INV-24-00018. Thank you.`,
      });
    expect(shared.status).toBe(200);
    expect(shared.body.data.url).toContain('https://wa.me/919876543210');
    expect(meta.sent).toHaveLength(0);
    const inbox = await messages.listInbox({
      tenantId: pharmacy.tenantId,
      locationId: pharmacy.location.locationId,
      limit: 10,
    });
    expect(inbox.items).toHaveLength(0);
  });

  it('lists templates for HQ and pharmacy and updates inbox from Meta webhooks', async () => {
    const { app, pharmacy, messages } = await seedApp();
    const owner = `Bearer ${await pharmacyToken(pharmacy.tenantId, pharmacy.location.locationId)}`;
    const templates = await request(app)
      .get('/whatsapp/templates')
      .set('Authorization', `Bearer ${await hqToken()}`);
    expect(templates.body.data.items).toHaveLength(11);
    await request(app).get('/whatsapp/templates').set('Authorization', owner);
    const sent = await request(app)
      .post('/whatsapp/messages')
      .set('Authorization', owner)
      .send({
        tenant_id: pharmacy.tenantId,
        location_id: pharmacy.location.locationId,
        to: MOBILE,
        template_key: 'khata_remind',
        bill_id: 'INV-1',
        params: { amount: '₹400' },
      });
    const stored = await messages.findById(sent.body.data.message_id);
    const body = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  { id: stored?.metaMessageId, status: 'read' },
                  { id: 'wamid.unknown', status: 'delivered' },
                  { id: stored?.metaMessageId, status: 'sent' },
                  { id: stored?.metaMessageId },
                ],
              },
            },
          ],
        },
      ],
    };
    const raw = JSON.stringify(body);
    const ok = await request(app)
      .post('/whatsapp/webhooks/meta')
      .set('x-hub-signature-256', `sha256=${hmacSha256(raw, 'meta-secret')}`)
      .send(body);
    expect(ok.status).toBe(200);
    const inbox = await request(app)
      .get(
        `/whatsapp/messages?location_id=${pharmacy.location.locationId}&status=read&template_key=khata_remind`,
      )
      .set('Authorization', owner);
    expect(inbox.body.data.items[0].status).toBe('read');
    const inbound = {
      entry: [{ changes: [{ value: { messages: [{ type: 'image' }] } }] }],
    };
    const ignored = await request(app)
      .post('/whatsapp/webhooks/meta')
      .set('x-hub-signature-256', `sha256=${hmacSha256(JSON.stringify(inbound), 'meta-secret')}`)
      .send(inbound);
    expect(ignored.status).toBe(200);
    const badSig = await request(app)
      .post('/whatsapp/webhooks/meta')
      .set('x-hub-signature-256', 'sha256=nope')
      .send(body);
    expect(badSig.status).toBe(401);
  });

  it('rejects mismatched pharmacy pairing and missing location', async () => {
    const { app, pharmacy } = await seedApp();
    const owner = `Bearer ${await pharmacyToken(pharmacy.tenantId, pharmacy.location.locationId)}`;
    const mismatch = await request(app)
      .post('/whatsapp/messages')
      .set('Authorization', owner)
      .send({
        tenant_id: pharmacy.tenantId,
        location_id: crypto.randomUUID(),
        to: MOBILE,
        template_key: 'refill',
        idempotency_key: 'x',
      });
    expect(mismatch.body.error.code).toBe(ErrorCode.LOCATION_TENANT_MISMATCH);
    const missing = await request(app).post('/whatsapp/messages').set('Authorization', owner).send({
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.location.locationId,
      to: MOBILE,
      template_key: 'refill',
      idempotency_key: 'gone',
    });
    expect(missing.status).toBeLessThan(500);
    const otherLoc = createMemoryTenancyRepository();
    const other = await otherLoc.createPharmacyWithLocation({
      displayName: 'Other',
      gstDealerType: GST_DEALER_TYPE_REGULAR,
      businessType: BUSINESS_TYPE_RETAIL,
    });
    const ghost = await request(app)
      .post('/whatsapp/share-deeplink')
      .set('Authorization', owner)
      .send({
        tenant_id: other.tenantId,
        location_id: other.location.locationId,
        text: 'hi',
      });
    expect(ghost.body.error.code).toBe(ErrorCode.LOCATION_TENANT_MISMATCH);
  });

  it('drops a mandatory failure after a delayed delivered webhook', async () => {
    const meta = new MemoryMetaClient();
    meta.queueResult({
      ok: false,
      retryable: false,
      errorCode: 'META_UNAVAILABLE',
      metaMessageId: 'wamid.late',
    });
    const { app, pharmacy, messages } = await seedApp(meta);
    const owner = `Bearer ${await pharmacyToken(pharmacy.tenantId, pharmacy.location.locationId)}`;
    const sent = await request(app).post('/whatsapp/messages').set('Authorization', owner).send({
      tenant_id: pharmacy.tenantId,
      location_id: pharmacy.location.locationId,
      to: MOBILE,
      template_key: 'gstn_fail',
      idempotency_key: 'gstn-1',
    });
    await messages.markAttempt({
      messageId: sent.body.data.message_id,
      status: 'failed',
      retryCount: 0,
      metaMessageId: 'wamid.late',
    });
    const body = {
      entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.late', status: 'delivered' }] } }] }],
    };
    await request(app)
      .post('/whatsapp/webhooks/meta')
      .set('x-hub-signature-256', `sha256=${hmacSha256(JSON.stringify(body), 'meta-secret')}`)
      .send(body);
    const listed = await request(app)
      .get(`/whatsapp/mandatory-failures?location_id=${pharmacy.location.locationId}`)
      .set('Authorization', owner);
    expect(listed.body.data.items).toHaveLength(0);
  });

  it('covers lease miss and unknown template attempt', async () => {
    const { messages } = await seedApp();
    const created = await messages.insertQueued({
      tenantId: crypto.randomUUID(),
      locationId: crypto.randomUUID(),
      templateKey: 'login_otp',
      to: MOBILE,
      purpose: 'otp',
      billId: null,
      campaignId: null,
      idempotencyKey: 'lease',
      mandatory: false,
      paramsRedacted: { shop_name: DISPLAY },
    });
    await messages.acquireLease(created.messageId, new Date(Date.now() + 60_000));
    const { createSendService } = await import('../../src/send/send-service.ts');
    const service = createSendService({
      tenancy: createMemoryTenancyRepository(),
      messages,
      meta: new MemoryMetaClient(),
      scheduler: new ImmediateRetryScheduler(),
      logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn(),
      } as never,
    });
    await expect(service.attemptDelivery(created.messageId)).resolves.toMatchObject({
      messageId: created.messageId,
    });
    const bogus = await messages.insertQueued({
      tenantId: created.tenantId,
      locationId: created.locationId,
      templateKey: 'login_otp',
      to: MOBILE,
      purpose: 'otp',
      billId: null,
      campaignId: 'c',
      idempotencyKey: 'bogus',
      mandatory: false,
      paramsRedacted: {},
    });
    Object.assign((await messages.findById(bogus.messageId)) ?? {}, {});
    await expect(service.attemptDelivery(crypto.randomUUID())).resolves.toBeUndefined();
    const spy = vi.spyOn(catalogue, 'getTemplate').mockReturnValueOnce(undefined);
    const unknown = await messages.insertQueued({
      tenantId: created.tenantId,
      locationId: created.locationId,
      templateKey: 'login_otp',
      to: MOBILE,
      purpose: 'otp',
      billId: null,
      campaignId: null,
      idempotencyKey: 'unknown-template',
      mandatory: false,
      paramsRedacted: {},
    });
    await expect(service.attemptDelivery(unknown.messageId)).resolves.toMatchObject({
      status: 'failed',
    });
    spy.mockRestore();
  });

  it('covers remaining auth, webhook, campaign, and default app wiring', async () => {
    const health = await request(createApp(env())).get('/health');
    expect(health.status).toBe(200);
    const { app, pharmacy, messages } = await seedApp();
    const owner = `Bearer ${await pharmacyToken(pharmacy.tenantId, pharmacy.location.locationId)}`;
    const bare = await request(app)
      .post('/whatsapp/messages')
      .set('Authorization', `Bearer ${await token({ sub: 'x', principal_type: 'unknown' })}`)
      .send({
        tenant_id: pharmacy.tenantId,
        location_id: pharmacy.location.locationId,
        to: MOBILE,
        template_key: 'refill',
        idempotency_key: 'no-principal',
      });
    expect(bare.status).toBeGreaterThanOrEqual(400);
    const campaign = await request(app)
      .post('/whatsapp/messages')
      .set('Authorization', owner)
      .send({
        tenant_id: pharmacy.tenantId,
        location_id: pharmacy.location.locationId,
        to: MOBILE,
        template_key: 'bill_share',
        campaign_id: 'camp-1',
        idempotency_key: 'camp-send',
        params: { shop_name: DISPLAY, bill_no: '1', amount: '10' },
      });
    expect(campaign.status).toBe(202);
    await messages.insertQueued({
      tenantId: pharmacy.tenantId,
      locationId: pharmacy.location.locationId,
      templateKey: 'refill',
      to: MOBILE,
      purpose: 'refill',
      billId: null,
      campaignId: null,
      idempotencyKey: 'no-shop',
      mandatory: false,
      paramsRedacted: {},
    });
    const inbox = await request(app)
      .get(`/whatsapp/messages?location_id=${pharmacy.location.locationId}`)
      .set('Authorization', owner);
    expect(inbox.status).toBe(200);
    await expect(
      resolveLocation(createMemoryTenancyRepository(), pharmacy.tenantId, crypto.randomUUID()),
    ).rejects.toMatchObject({ code: ErrorCode.LOCATION_NOT_FOUND });
    await expect(
      resolveLocation(
        createMemoryTenancyRepository(localSeedPharmacy()),
        crypto.randomUUID(),
        localSeedPharmacy().location.locationId,
      ),
    ).rejects.toMatchObject({ code: ErrorCode.LOCATION_TENANT_MISMATCH });
    const missingLoc = await request(app)
      .post('/whatsapp/share-deeplink')
      .set('Authorization', 'Bearer svc-token')
      .send({
        tenant_id: pharmacy.tenantId,
        location_id: crypto.randomUUID(),
        text: 'hi',
      });
    expect(missingLoc.status).toBeGreaterThanOrEqual(400);
    const body = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [{ id: 'wamid.x', status: 'deleted' }, { status: 'read' }],
              },
            },
          ],
        },
      ],
    };
    const hook = await request(app)
      .post('/whatsapp/webhooks/meta')
      .set('x-hub-signature-256', `sha256=${hmacSha256(JSON.stringify(body), 'meta-secret')}`)
      .send(body);
    expect(hook.status).toBe(200);
    const empty = {};
    const emptyHook = await request(app)
      .post('/whatsapp/webhooks/meta')
      .set('x-hub-signature-256', `sha256=${hmacSha256(JSON.stringify(empty), 'meta-secret')}`)
      .send(empty);
    expect(emptyHook.status).toBe(200);
    const noChanges = { entry: [{}] };
    await request(app)
      .post('/whatsapp/webhooks/meta')
      .set('x-hub-signature-256', `sha256=${hmacSha256(JSON.stringify(noChanges), 'meta-secret')}`)
      .send(noChanges);
    const noStatuses = { entry: [{ changes: [{}] }] };
    await request(app)
      .post('/whatsapp/webhooks/meta')
      .set('x-hub-signature-256', `sha256=${hmacSha256(JSON.stringify(noStatuses), 'meta-secret')}`)
      .send(noStatuses);
    const inboxPaged = await request(app)
      .get(`/whatsapp/messages?location_id=${pharmacy.location.locationId}&limit=10`)
      .set('Authorization', owner);
    expect(inboxPaged.status).toBe(200);
    const { createSendService } = await import('../../src/send/send-service.ts');
    const isolated = createMemoryWhatsAppRepository();
    const blank = await isolated.insertQueued({
      tenantId: pharmacy.tenantId,
      locationId: pharmacy.location.locationId,
      templateKey: 'refill',
      to: MOBILE,
      purpose: 'refill',
      billId: null,
      campaignId: null,
      idempotencyKey: 'blank-shop',
      mandatory: false,
      paramsRedacted: { shop_name: 1 },
    });
    const service = createSendService({
      tenancy: createMemoryTenancyRepository(),
      messages: isolated,
      meta: new MemoryMetaClient(),
      scheduler: new ImmediateRetryScheduler(),
      logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn(),
      } as never,
    });
    await service.attemptDelivery(blank.messageId);
    const parser = createMetaWebhookParser(env());
    const fakeReq = {
      body: undefined,
      header: () => undefined,
    };
    expect(() => parser(fakeReq as never)).toThrow();
    const missingTo = await request(app)
      .post('/whatsapp/messages')
      .set('Authorization', owner)
      .send({
        tenant_id: pharmacy.tenantId,
        location_id: pharmacy.location.locationId,
        template_key: 'refill',
        idempotency_key: 'missing-to',
      });
    expect(missingTo.status).toBe(400);
    const { encodeCursor } = await import('@namma-medmate/pagination-utils');
    const withCursor = await request(app)
      .get(
        `/whatsapp/messages?location_id=${pharmacy.location.locationId}&cursor=${encodeCursor(campaign.body.data.message_id)}`,
      )
      .set('Authorization', owner);
    expect(withCursor.status).toBe(200);
    const sendDirect = (await import('../../src/send/send-service.ts')).createSendService({
      tenancy: createMemoryTenancyRepository(pharmacy),
      messages: isolated,
      meta: new MemoryMetaClient(),
      scheduler: new ImmediateRetryScheduler(),
      logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn(),
      } as never,
    });
    await expect(
      sendDirect.send({
        tenantId: pharmacy.tenantId,
        locationId: pharmacy.location.locationId,
        to: MOBILE,
        templateKey: 'refill',
        idempotencyKey: 'direct-no-params',
      }),
    ).resolves.toMatchObject({ deduped: false });
    const ctrl = createMetaWebhookController(isolated, {
      info: vi.fn(),
    } as never);
    const failed = await isolated.insertQueued({
      tenantId: pharmacy.tenantId,
      locationId: pharmacy.location.locationId,
      templateKey: 'irn_fail',
      to: MOBILE,
      purpose: 'irn_fail',
      billId: 'x',
      campaignId: null,
      idempotencyKey: 'hook-fail',
      mandatory: true,
      paramsRedacted: { shop_name: DISPLAY },
    });
    await isolated.markAttempt({
      messageId: failed.messageId,
      status: 'sent',
      retryCount: 0,
      metaMessageId: 'wamid.fail',
    });
    await ctrl({
      body: {
        entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.fail', status: 'failed' }] } }] }],
      },
    } as never);
  });
});
