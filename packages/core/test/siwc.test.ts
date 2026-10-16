// Critérios 18 e 19 da SPEC 0001: ChatGPT por Sign in with ChatGPT (SIWC), contra servidores falsos locais.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fakeHttp, type Captured } from './fake-http.ts';
import { tempHome } from './helpers.ts';
import { openDatabase } from '../src/db.ts';
import { EventLog } from '../src/log.ts';
import { Budget, defaultWindows } from '../src/budget.ts';
import { ProviderLimitError, ProviderRejectedError, ProviderUnknownError } from '../src/providers/index.ts';
import {
  createChatGptProvider, credentialsPath, FORBIDDEN_FIELDS, loadCredentials, saveCredentials, SiwcAuth, SiwcAuthError,
  SIWC_RESOURCE, SIWC_SCOPE, startLogin, type SiwcEndpoints,
} from '../src/providers/siwc.ts';
import type { ModelRequest } from '../src/providers/types.ts';

const b64url = (b: Buffer | string): string => Buffer.from(b).toString('base64url');

// Servidor OAuth falso: JWKS, troca de código (confere PKCE) e refresh.
async function fakeAuth() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const st = {
    challenge: '' as string,
    nonce: '' as string,
    idNonce: null as string | null, // força outro nonce no ID token
    badSig: false, // assina o ID token com chave fora do JWKS
    scope: SIWC_SCOPE,
    refreshResponder: null as null | ((c: Captured) => { status: number; json: unknown }),
    refreshCount: 0,
    accessSeq: 0,
  };
  let fake: Awaited<ReturnType<typeof fakeHttp>>;
  const idToken = (aud: string, nonce: string, key: KeyObject = privateKey): string => {
    const h = b64url(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const p = b64url(JSON.stringify({ iss: fake.url, aud, sub: 'conta-1', email: 'pai@example.com', nonce, iat: now, exp: now + 3600 }));
    return `${h}.${p}.${b64url(sign('RSA-SHA256', Buffer.from(`${h}.${p}`), key))}`;
  };
  fake = await fakeHttp((c) => {
    if (c.method === 'GET' && c.path === '/jwks.json') return { json: { keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' }] } };
    if (c.path === '/token' && c.body.grant_type === 'authorization_code') {
      const pkceOk = b64url(createHash('sha256').update(String(c.body.code_verifier)).digest()) === st.challenge;
      if (!pkceOk) return { status: 400, json: { error: 'invalid_grant' } };
      st.accessSeq += 1;
      return { json: { access_token: `a${st.accessSeq}`, refresh_token: `r${st.accessSeq}`, id_token: idToken(String(c.body.client_id), st.idNonce ?? st.nonce, st.badSig ? otherKey : privateKey), token_type: 'Bearer', expires_in: 3600, scope: st.scope } };
    }
    if (c.path === '/token' && c.body.grant_type === 'refresh_token') {
      st.refreshCount += 1;
      if (st.refreshResponder) return st.refreshResponder(c);
      st.accessSeq += 1;
      return { json: { access_token: `a${st.accessSeq}`, refresh_token: `r${st.accessSeq}`, token_type: 'Bearer', expires_in: 3600, scope: st.scope } };
    }
    if (c.path === '/revoke') return { status: 200, json: {} };
    return { status: 404, json: { error: 'rota desconhecida' } };
  });
  const endpoints: SiwcEndpoints = { issuer: fake.url, authorize: `${fake.url}/authorize`, token: `${fake.url}/token`, revoke: `${fake.url}/revoke`, jwks: `${fake.url}/jwks.json`, api: `${fake.url}/v1` };
  return { fake, st, endpoints };
}

// O "navegador": lê a URL de autorização, guarda desafio e nonce no servidor falso e chama o callback.
async function browse(url: string, st: { challenge: string; nonce: string }, extra: Record<string, string> = {}, { keepState = true } = {}) {
  const u = new URL(url);
  const q = u.searchParams;
  st.challenge = q.get('code_challenge') ?? '';
  st.nonce = q.get('nonce') ?? '';
  const cb = new URL(q.get('redirect_uri') ?? '');
  const params = { code: 'codigo-1', ...(keepState ? { state: q.get('state') ?? '' } : {}), ...extra };
  for (const [k, v] of Object.entries(params)) cb.searchParams.set(k, v);
  const r = await fetch(cb);
  await r.text();
  return { q, status: r.status };
}

test('siwc: login oauth — PKCE S256, callback em 127.0.0.1, state/nonce novos, host id estável, client id emitido (critério 19)', async () => {
  const { fake, st, endpoints } = await fakeAuth();
  const home = tempHome();

  const l1 = await startLogin({ home, endpoints, port: 0 });
  const { q: q1 } = await browse(l1.url, st, { client_id: 'oaiapp_123', scope: SIWC_SCOPE });
  const c1 = await l1.done;

  assert.equal(new URL(l1.url).origin + new URL(l1.url).pathname, endpoints.authorize);
  assert.equal(q1.get('response_type'), 'code');
  assert.equal(q1.get('client_id'), 'dynamic_agent_client');
  assert.equal(q1.get('agent_name_hint'), 'Rabelus Buddy');
  assert.equal(q1.get('scope'), 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct');
  assert.equal(q1.get('resource'), 'https://api.openai.com/v1');
  assert.equal(q1.get('code_challenge_method'), 'S256');
  assert.match(q1.get('code_challenge') ?? '', /^[A-Za-z0-9_-]{43}$/, 'base64url sem padding');
  assert.match(q1.get('redirect_uri') ?? '', /^http:\/\/127\.0\.0\.1:\d+\/auth\/callback$/);
  assert.ok((q1.get('ext_agent_host_id') ?? '').length >= 16);
  assert.ok((q1.get('state') ?? '').length >= 32 && (q1.get('nonce') ?? '').length >= 32);

  // Troca: client id emitido, verifier conferido pelo servidor, mesmo redirect e resource.
  const ex = fake.requests.find((r) => r.body.grant_type === 'authorization_code');
  assert.ok(ex);
  assert.equal(ex.headers['content-type'], 'application/x-www-form-urlencoded');
  assert.equal(ex.body.client_id, 'oaiapp_123');
  assert.equal(ex.body.code, 'codigo-1');
  assert.equal(ex.body.redirect_uri, q1.get('redirect_uri'));
  assert.equal(ex.body.resource, SIWC_RESOURCE);
  assert.equal(ex.body.client_secret, undefined);

  assert.equal(c1.clientId, 'oaiapp_123');
  assert.equal(c1.sub, 'conta-1');
  assert.equal(c1.accessToken, 'a1');
  assert.equal(c1.refreshToken, 'r1');
  assert.equal(c1.planEnabled, true);
  assert.ok(c1.expiresAt && c1.expiresAt > Date.now() + 3_500_000);

  // Guarda: arquivo só do dono (no Unix), relido igual.
  assert.ok(existsSync(credentialsPath(home)));
  if (process.platform !== 'win32') assert.equal(statSync(credentialsPath(home)).mode & 0o777, 0o600);
  assert.deepEqual(loadCredentials(home), c1);

  // Segundo login: client id salvo, sem agent_name_hint, mesmo host id, state/nonce novos, id_token_hint.
  const l2 = await startLogin({ home, endpoints, port: 0 });
  const { q: q2 } = await browse(l2.url, st, { scope: SIWC_SCOPE });
  const c2 = await l2.done;
  assert.equal(q2.get('client_id'), 'oaiapp_123');
  assert.equal(q2.get('agent_name_hint'), null);
  assert.equal(q2.get('ext_agent_host_id'), q1.get('ext_agent_host_id'));
  assert.notEqual(q2.get('state'), q1.get('state'));
  assert.notEqual(q2.get('nonce'), q1.get('nonce'));
  assert.notEqual(q2.get('code_challenge'), q1.get('code_challenge'));
  assert.equal(q2.get('id_token_hint'), c1.idToken);
  assert.equal(c2.clientId, 'oaiapp_123');
  assert.equal(c2.hostId, c1.hostId);
  await fake.close();
});

test('siwc: login recusa state errado, access_denied, ID token com nonce ou assinatura errados, e registro sem client id emitido', async () => {
  const { fake, st, endpoints } = await fakeAuth();
  const home = tempHome();
  const exchanges = () => fake.requests.filter((r) => r.body.grant_type === 'authorization_code').length;

  const bad = await startLogin({ home, endpoints, port: 0 });
  const r = await browse(bad.url, st, { state: 'forjado', client_id: 'oaiapp_123' }, { keepState: false });
  await assert.rejects(bad.done, (e: unknown) => e instanceof SiwcAuthError && e.code === 'state_mismatch');
  assert.equal(r.status, 400);
  assert.equal(exchanges(), 0, 'sem troca de código com state errado');

  const denied = await startLogin({ home, endpoints, port: 0 });
  await browse(denied.url, st, { error: 'access_denied' });
  await assert.rejects(denied.done, (e: unknown) => e instanceof SiwcAuthError && e.code === 'access_denied');
  assert.equal(exchanges(), 0);

  const noClient = await startLogin({ home, endpoints, port: 0 });
  await browse(noClient.url, st, {});
  await assert.rejects(noClient.done, (e: unknown) => e instanceof SiwcAuthError && e.code === 'missing_client_id');
  assert.equal(exchanges(), 0, 'registro novo sem client id emitido é incompleto');

  const wrongNonce = await startLogin({ home, endpoints, port: 0 });
  st.idNonce = 'outro-nonce';
  await browse(wrongNonce.url, st, { client_id: 'oaiapp_123' });
  await assert.rejects(wrongNonce.done, (e: unknown) => e instanceof SiwcAuthError && e.code === 'id_token_invalid');
  st.idNonce = null;
  assert.equal(loadCredentials(home)?.accessToken, undefined, 'nada de token guardado sem ID token válido');

  // Assinatura de outra chave: o JWKS não confirma.
  const forged = await startLogin({ home, endpoints, port: 0 });
  st.badSig = true;
  await browse(forged.url, st, { client_id: 'oaiapp_123' });
  await assert.rejects(forged.done, (e: unknown) => e instanceof SiwcAuthError && e.code === 'id_token_invalid');
  st.badSig = false;
  assert.equal(loadCredentials(home)?.accessToken, undefined);
  await fake.close();
});

test('siwc: sem chatgpt.tokens.use.direct no escopo concedido, o login fica e o plano não é usado', async () => {
  const { fake, st, endpoints } = await fakeAuth();
  const home = tempHome();
  st.scope = 'openid profile email offline_access';
  const l = await startLogin({ home, endpoints, port: 0 });
  await browse(l.url, st, { client_id: 'oaiapp_9' });
  const c = await l.done;
  assert.equal(c.planEnabled, false);
  const provider = createChatGptProvider({ home, endpoints });
  const before = fake.requests.length;
  await assert.rejects(provider.call(req(), { session: 's' }), (e: unknown) => e instanceof ProviderRejectedError && e.code === 'plan_not_enabled');
  assert.equal(fake.requests.length, before, 'nenhuma inferência sem o escopo do plano');
  await fake.close();
});

function savedHome(endpointsExpired: boolean, overrides: Record<string, unknown> = {}) {
  const home = tempHome();
  saveCredentials(home, {
    hostId: 'host-fixo-0123456789', clientId: 'oaiapp_123', sub: 'conta-1', email: 'pai@example.com',
    accessToken: 'a0', refreshToken: 'r0', idToken: 'h.p.s', scope: SIWC_SCOPE, planEnabled: true,
    expiresAt: endpointsExpired ? Date.now() - 1000 : Date.now() + 3_600_000, ...overrides,
  });
  return home;
}

test('siwc: refresh troca access token, expiração, escopo e refresh token juntos, serializado (critério 19)', async () => {
  const { fake, st, endpoints } = await fakeAuth();
  const home = savedHome(true);
  const auth = new SiwcAuth({ home, endpoints });
  const tokens = await Promise.all([auth.accessToken(), auth.accessToken(), auth.accessToken()]);
  assert.deepEqual(tokens, ['a1', 'a1', 'a1']);
  assert.equal(st.refreshCount, 1, 'um refresh só, mesmo com chamadas concorrentes');
  const rq = fake.requests.find((r) => r.body.grant_type === 'refresh_token');
  assert.ok(rq);
  assert.equal(rq.body.client_id, 'oaiapp_123');
  assert.equal(rq.body.refresh_token, 'r0');
  assert.equal(rq.body.resource, SIWC_RESOURCE);
  assert.equal(rq.body.scope, undefined, 'omitir scope mantém a concessão');
  const c = loadCredentials(home);
  assert.equal(c?.accessToken, 'a1');
  assert.equal(c?.refreshToken, 'r1');
  assert.ok(c?.expiresAt && c.expiresAt > Date.now() + 3_500_000);
  assert.equal(c?.hostId, 'host-fixo-0123456789');
  // Token válido: nenhum refresh novo.
  await auth.accessToken();
  assert.equal(st.refreshCount, 1);
  await fake.close();
});

test('siwc: refresh terminal limpa os tokens e guarda client id e host id; falha temporária não apaga nada', async () => {
  const { fake, st, endpoints } = await fakeAuth();
  const home = savedHome(true);
  st.refreshResponder = () => ({ status: 503, json: { error: 'temporarily_unavailable' } });
  await assert.rejects(new SiwcAuth({ home, endpoints }).accessToken(), (e: unknown) => e instanceof SiwcAuthError && !e.reauth);
  assert.equal(loadCredentials(home)?.refreshToken, 'r0', 'falha temporária mantém as credenciais');

  st.refreshResponder = () => ({ status: 400, json: { error: 'refresh_token_reused' } });
  await assert.rejects(new SiwcAuth({ home, endpoints }).accessToken(), (e: unknown) => e instanceof SiwcAuthError && e.reauth && e.code === 'refresh_token_reused');
  const c = loadCredentials(home);
  assert.equal(c?.accessToken, undefined);
  assert.equal(c?.refreshToken, undefined);
  assert.equal(c?.clientId, 'oaiapp_123');
  assert.equal(c?.hostId, 'host-fixo-0123456789');
  await fake.close();
});

// ---------- Inferência (critério 18) ----------

const req = (): ModelRequest => ({
  model: 'gpt-6.1-sol',
  maxOutputTokens: 500, // o núcleo pede, o SIWC proíbe: tem de sair do corpo
  messages: [{ role: 'system', content: 'Você é o buddy.' }, { role: 'user', content: 'Oi' }],
  tools: [{ name: 'read_file', description: 'lê', parameters: { type: 'object', properties: { path: { type: 'string' } } } }],
});

const completed = { id: 'resp_1', object: 'response', status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'olá (siwc)' }] }], usage: { input_tokens: 80, input_tokens_details: { cached_tokens: 20 }, output_tokens: 10, total_tokens: 90 } };

async function fakeApi(events: unknown[] | ((c: Captured) => { status?: number; headers?: Record<string, string>; json?: unknown; sse?: unknown[] })) {
  return fakeHttp((c) => (typeof events === 'function' ? events(c) : { sse: events }));
}

test('siwc: contrato da prévia — store:false, stream:true, sem campos proibidos, sucesso só em response.completed (critério 18)', async () => {
  const api = await fakeApi([
    { type: 'response.created', response: { id: 'resp_1', status: 'in_progress' } },
    { type: 'response.output_text.delta', delta: 'olá ' },
    { type: 'response.output_text.delta', delta: '(siwc)' },
    { type: 'response.completed', response: completed },
  ]);
  const home = savedHome(false);
  const p = createChatGptProvider({ home, endpoints: { ...(await fakeAuth()).endpoints, api: `${api.url}/v1` } });
  assert.equal(p.id, 'chatgpt');
  const r = await p.call(req(), { session: 's' });
  const sent = api.requests[0]!;
  assert.equal(sent.path, '/v1/responses');
  assert.equal(sent.headers.authorization, 'Bearer a0');
  assert.equal(sent.body.store, false);
  assert.equal(sent.body.stream, true);
  for (const f of FORBIDDEN_FIELDS) assert.equal(f in sent.body, false, `campo proibido no corpo: ${f}`);
  assert.deepEqual([...FORBIDDEN_FIELDS].sort(), ['background', 'conversation', 'max_output_tokens', 'metadata', 'previous_response_id', 'temperature', 'top_p', 'truncation', 'user']);
  assert.equal((sent.body.input as { role?: string }[]).some((i) => i.role === 'system'), false, 'sem item system');
  assert.equal(sent.body.instructions, 'Você é o buddy.');
  assert.equal(r.text, 'olá (siwc)');
  assert.deepEqual(r.usage, { input_tokens: 80, cached_tokens: 20, cache_write_tokens: 0, output_tokens: 10 });
  assert.equal(r.finish, 'stop');
  await api.close();
});

test('siwc: stream interrompido sem response.completed fica desconhecido; response.incomplete não é sucesso', async () => {
  const cut = await fakeApi([{ type: 'response.output_text.delta', delta: 'olá' }]);
  const home = savedHome(false);
  const { endpoints } = await fakeAuth();
  await assert.rejects(createChatGptProvider({ home, endpoints: { ...endpoints, api: `${cut.url}/v1` } }).call(req(), { session: 's' }), (e: unknown) => e instanceof ProviderUnknownError);
  await cut.close();

  const inc = await fakeApi([{ type: 'response.incomplete', response: { ...completed, status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } } }]);
  const r = await createChatGptProvider({ home, endpoints: { ...endpoints, api: `${inc.url}/v1` } }).call(req(), { session: 's' });
  assert.equal(r.finish, 'length');
  await inc.close();
});

test('siwc: response.failed com usage_limit_exceeded esgota a janela do ChatGPT; outros códigos viram recusa sem nova tentativa (critério 18)', async () => {
  const { endpoints } = await fakeAuth();
  const home = savedHome(false);
  const failed = (code: string) => [{ type: 'response.failed', response: { id: 'resp_x', status: 'failed', error: { code, message: code } } }];

  const lim = await fakeApi(failed('subscription_sharing_usage_limit_exceeded'));
  const t0 = Date.now();
  let limit: ProviderLimitError | undefined;
  await assert.rejects(createChatGptProvider({ home, endpoints: { ...endpoints, api: `${lim.url}/v1` } }).call(req(), { session: 's' }), (e: unknown) => {
    assert.ok(e instanceof ProviderLimitError);
    assert.equal(e.provider, 'chatgpt');
    assert.ok(e.until > t0);
    limit = e;
    return true;
  });
  assert.equal(lim.requests.length, 1);
  await lim.close();

  const b = new Budget(new EventLog(openDatabase(join(tempHome(), 'nucleo.db'))), { windows: defaultWindows() });
  b.markExhausted(limit!.provider, null, limit!.until, 'subscription_sharing_usage_limit_exceeded');
  const w = b.status().find((s) => s.id === 'chatgpt/semana');
  assert.ok(w?.exhaustedUntil, 'janela do ChatGPT esgotada');

  for (const code of ['subscription_sharing_user_not_eligible', 'subscription_sharing_unsupported_capability']) {
    const f = await fakeApi(failed(code));
    await assert.rejects(createChatGptProvider({ home, endpoints: { ...endpoints, api: `${f.url}/v1` } }).call(req(), { session: 's' }), (e: unknown) => e instanceof ProviderRejectedError && e.code === code);
    assert.equal(f.requests.length, 1);
    await f.close();
  }
});

test('siwc: HTTP 429 antes do stream esgota; 401 recusa sem apagar credenciais', async () => {
  const { endpoints } = await fakeAuth();
  const home = savedHome(false);
  const h429 = await fakeApi(() => ({ status: 429, headers: { 'retry-after': '60' }, json: { error: { code: 'subscription_sharing_usage_limit_exceeded', message: 'limite' } } }));
  await assert.rejects(createChatGptProvider({ home, endpoints: { ...endpoints, api: `${h429.url}/v1` } }).call(req(), { session: 's' }), (e: unknown) => e instanceof ProviderLimitError && e.provider === 'chatgpt');
  assert.equal(h429.requests.length, 1);
  await h429.close();

  const h401 = await fakeApi(() => ({ status: 401, json: { error: { code: 'subscription_sharing_invalid_user', message: 'x' } } }));
  await assert.rejects(createChatGptProvider({ home, endpoints: { ...endpoints, api: `${h401.url}/v1` } }).call(req(), { session: 's' }), (e: unknown) => e instanceof ProviderRejectedError);
  assert.equal(loadCredentials(home)?.refreshToken, 'r0');
  await h401.close();
});

test('siwc: credenciais nunca aparecem no corpo nem em texto de erro', async () => {
  const { endpoints } = await fakeAuth();
  const home = savedHome(false);
  const f = await fakeApi(() => ({ status: 401, json: { error: { message: 'negado' } } }));
  await assert.rejects(createChatGptProvider({ home, endpoints: { ...endpoints, api: `${f.url}/v1` } }).call(req(), { session: 's' }), (e: unknown) => {
    assert.equal(String((e as Error).message).includes('a0'), false);
    assert.equal(String((e as Error).message).includes('r0'), false);
    return true;
  });
  assert.equal(JSON.stringify(f.requests[0]?.body).includes('r0'), false);
  assert.equal(readFileSync(credentialsPath(home), 'utf8').includes('"refreshToken"'), true);
  await f.close();
});
