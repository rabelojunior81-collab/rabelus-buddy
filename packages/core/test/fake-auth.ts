// Servidor OAuth falso do Sign in with ChatGPT e o "navegador" que o percorre (testes do núcleo e da CLI).
import { createHash, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { fakeHttp, type Captured } from './fake-http.ts';
import { SIWC_SCOPE, type SiwcEndpoints } from '../src/providers/siwc.ts';

const b64url = (b: Buffer | string): string => Buffer.from(b).toString('base64url');

// Servidor OAuth falso: JWKS, troca de código (confere PKCE) e refresh.
export async function fakeAuth() {
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
export async function browse(url: string, st: { challenge: string; nonce: string }, extra: Record<string, string> = {}, { keepState = true } = {}) {
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
