// ChatGPT por Sign in with ChatGPT, fluxo de código aberto (SPEC 0001, critérios 18 e 19; ADR 0015).
// Fatos verificados na ficha assinaturas-de-agentes (seção SIWC, 2026-10-16). Sem dependência nova:
// PKCE e ID token RS256 pelo node:crypto, callback pelo node:http, inferência pelo SDK openai em stream.

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHash, createPublicKey, randomBytes, randomUUID, verify, type JsonWebKey } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import OpenAI from 'openai';
import { parseResponsesOutput, responsesInput, responsesTools, systemOf } from './adapters.ts';
import { trustSystemCAs, USER_AGENT } from './identity.ts';
import { ProviderLimitError, ProviderRejectedError, ProviderUnknownError, type CallContext, type ModelRequest, type ModelResponse, type Provider } from './types.ts';

export interface SiwcEndpoints { issuer: string; authorize: string; token: string; revoke: string; jwks: string; api: string }

// Descoberta OpenID consultada ao vivo em 2026-10-16 (ficha).
export const SIWC_ENDPOINTS: SiwcEndpoints = {
  issuer: 'https://auth.openai.com',
  authorize: 'https://auth.openai.com/api/accounts/authorize',
  token: 'https://auth.openai.com/api/accounts/oauth/token',
  revoke: 'https://auth.openai.com/api/accounts/oauth/revoke',
  jwks: 'https://auth.openai.com/.well-known/jwks.json',
  api: 'https://api.openai.com/v1',
};
export const SIWC_SCOPE = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
export const SIWC_RESOURCE = 'https://api.openai.com/v1';
export const PLAN_SCOPE = 'chatgpt.tokens.use.direct';
export const AGENT_NAME = 'Rabelus Buddy';
// Campos que a prévia manda omitir (ficha, preview-limitations; reverificada em 2026-10-17).
export const FORBIDDEN_FIELDS = ['max_output_tokens', 'metadata', 'temperature', 'top_p', 'truncation', 'user', 'background', 'conversation', 'previous_response_id', 'max_tool_calls', 'moderation', 'multi_agent', 'prompt', 'prompt_cache_retention', 'safety_identifier', 'top_logprobs'] as const;
const DEFAULT_PORT = 1455; // o exemplo oficial; só a porta pode variar
const REFRESH_MARGIN_MS = 60_000;
// "Do not infer a reset time": a pausa é só o intervalo até reavaliar, não o horário de volta.
const LIMIT_RECHECK_MS = 60 * 60_000;
const TEMPORARY_BACKOFF_MS = 5 * 60_000;
const TERMINAL_REFRESH = new Set(['invalid_grant', 'invalid_refresh_token', 'token_expired', 'refresh_token_expired', 'refresh_token_invalidated', 'refresh_token_reused']);

export interface ChatGptCredentials {
  hostId: string;
  clientId: string | null;
  sub?: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: number;
  scope?: string;
  planEnabled?: boolean;
}

export class SiwcAuthError extends Error {
  readonly code: string;
  readonly reauth: boolean; // true: precisa de novo `rbuddy login chatgpt`
  constructor(code: string, message: string, reauth = false) {
    super(message);
    this.code = code;
    this.reauth = reauth;
  }
}

// ---------- Guarda das credenciais: um arquivo, só do dono, escrita atômica ----------

export const credentialsPath = (home: string): string => join(home, 'credentials', 'chatgpt.json');

export function loadCredentials(home: string): ChatGptCredentials | null {
  const p = credentialsPath(home);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as ChatGptCredentials) : null;
}

export function saveCredentials(home: string, c: ChatGptCredentials): void {
  const p = credentialsPath(home);
  mkdirSync(dirname(p), { recursive: true, mode: 0o700 });
  const tmp = `${p}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(c, null, 2)}\n`, { mode: 0o600 });
  renameSync(tmp, p);
  chmodSync(p, 0o600); // no Windows só mexe no somente-leitura; o diretório de estado já é do usuário
}

const compact = (c: ChatGptCredentials): ChatGptCredentials => Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined)) as unknown as ChatGptCredentials;

// Sai do uso o conjunto de tokens; ficam host id, client id emitido e o ID token (para o id_token_hint).
function clearTokens(c: ChatGptCredentials): ChatGptCredentials {
  const { accessToken: _a, refreshToken: _r, expiresAt: _e, scope: _s, planEnabled: _p, ...rest } = c;
  return rest;
}

// ---------- OAuth ----------

const b64url = (b: Buffer): string => b.toString('base64url');
const random = (): string => b64url(randomBytes(32));

async function postForm(url: string, form: Record<string, string>): Promise<{ status: number; json: Record<string, unknown> }> {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': USER_AGENT }, body: new URLSearchParams(form).toString() });
  const text = await r.text();
  let json: Record<string, unknown> = {};
  try { json = text ? (JSON.parse(text) as Record<string, unknown>) : {}; } catch { /* corpo não JSON: só o status conta */ }
  return { status: r.status, json };
}

const errorCode = (json: Record<string, unknown>, status: number): string => {
  const e = json.error;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && typeof (e as { code?: unknown }).code === 'string') return (e as { code: string }).code;
  return `http_${status}`;
};

// ID token RS256: assinatura pelo JWKS, emissor, audiência (client id emitido), expiração e nonce.
async function verifyIdToken(token: string, { endpoints, audience, nonce }: { endpoints: SiwcEndpoints; audience: string; nonce: string }): Promise<{ sub: string; email?: string }> {
  const fail = (why: string): never => { throw new SiwcAuthError('id_token_invalid', `ID token inválido: ${why}`); };
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) fail('formato');
  const header = JSON.parse(Buffer.from(h!, 'base64url').toString('utf8')) as { alg?: string; kid?: string };
  if (header.alg !== 'RS256') fail(`algoritmo ${header.alg}`);
  const r = await fetch(endpoints.jwks, { headers: { 'user-agent': USER_AGENT } });
  const { keys = [] } = (await r.json()) as { keys?: (JsonWebKey & { kid?: string })[] };
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) fail('chave fora do JWKS');
  const ok = verify('RSA-SHA256', Buffer.from(`${h}.${p}`), createPublicKey({ key: jwk!, format: 'jwk' }), Buffer.from(s!, 'base64url'));
  if (!ok) fail('assinatura');
  const claims = JSON.parse(Buffer.from(p!, 'base64url').toString('utf8')) as { iss?: string; aud?: string | string[]; exp?: number; nonce?: string; sub?: string; email?: string };
  if (claims.iss !== endpoints.issuer) fail('emissor');
  if (!(Array.isArray(claims.aud) ? claims.aud.includes(audience) : claims.aud === audience)) fail('audiência');
  if (!claims.exp || claims.exp * 1000 <= Date.now()) fail('expirado');
  if (claims.nonce !== nonce) fail('nonce');
  if (!claims.sub) fail('sem sub');
  return { sub: claims.sub!, ...(claims.email ? { email: claims.email } : {}) };
}

export interface LoginOptions { home: string; endpoints?: SiwcEndpoints; port?: number; timeoutMs?: number; page?: { ok: string; fail: string } }
export interface PendingLogin { url: string; done: Promise<ChatGptCredentials>; cancel: () => void }

function listen(server: http.Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve((server.address() as AddressInfo).port); });
  });
}

// Abre o callback em 127.0.0.1, monta a URL de autorização e espera um único retorno.
export async function startLogin({ home, endpoints = SIWC_ENDPOINTS, port = DEFAULT_PORT, timeoutMs = 5 * 60_000, page = { ok: 'Rabelus Buddy: login concluído. Pode fechar esta aba.', fail: 'Rabelus Buddy: login não concluído. Volte ao terminal.' } }: LoginOptions): Promise<PendingLogin> {
  trustSystemCAs();
  let saved = loadCredentials(home);
  if (!saved) { saved = { hostId: `urn:uuid:${randomUUID()}`, clientId: null }; saveCredentials(home, saved); }
  // A OpenAI real recusa host id fora de urn:uuid: (400 invalid_authorize_request, observado em
  // 2026-10-17). Host id antigo (UUID puro) ganha o prefixo uma vez; o UUID continua o mesmo.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(saved.hostId)) {
    saved = { ...saved, hostId: `urn:uuid:${saved.hostId}` };
    saveCredentials(home, saved);
  }
  const { hostId } = saved;
  const savedClient = saved.clientId;
  const verifier = random();
  const state = random();
  const nonce = random();

  const server = http.createServer();
  let bound: number;
  try { bound = await listen(server, port); } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EADDRINUSE' || port === 0) throw e;
    bound = await listen(server, 0);
  }
  const redirectUri = `http://127.0.0.1:${bound}/auth/callback`;

  const q = new URLSearchParams({
    response_type: 'code',
    client_id: savedClient ?? 'dynamic_agent_client',
    ...(savedClient ? {} : { agent_name_hint: AGENT_NAME }),
    ext_agent_host_id: hostId,
    ...(saved.idToken ? { id_token_hint: saved.idToken } : {}),
    ...(saved.email ? { login_hint: saved.email } : {}),
    redirect_uri: redirectUri,
    scope: SIWC_SCOPE,
    resource: SIWC_RESOURCE,
    state,
    nonce,
    code_challenge_method: 'S256',
    code_challenge: b64url(createHash('sha256').update(verifier).digest()),
  });

  let settle!: { resolve: (c: ChatGptCredentials) => void; reject: (e: Error) => void };
  const done = new Promise<ChatGptCredentials>((resolve, reject) => { settle = { resolve, reject }; });
  done.catch(() => {}); // a recusa pode chegar antes de quem chamou esperar por ela; quem espera ainda a recebe
  let finished = false;
  const finish = (err: Error | null, c?: ChatGptCredentials) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    server.close();
    server.closeAllConnections();
    if (err) settle.reject(err); else settle.resolve(c!);
  };
  const timer = setTimeout(() => finish(new SiwcAuthError('timeout', 'login sem retorno no prazo')), timeoutMs);
  timer.unref();

  server.on('request', (req, res) => {
    const u = new URL(req.url ?? '/', redirectUri);
    if (u.pathname !== '/auth/callback' || finished) { res.writeHead(404).end(); return; }
    const reply = (status: number, err: Error | null, c?: ChatGptCredentials) => {
      res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', connection: 'close' }).end(status === 200 ? page.ok : page.fail);
      finish(err, c);
    };
    const p = u.searchParams;
    if (p.get('state') !== state) return reply(400, new SiwcAuthError('state_mismatch', 'state do callback não confere'));
    const error = p.get('error');
    if (error) return reply(400, new SiwcAuthError(error, `autorização recusada: ${error}`));
    const code = p.get('code');
    const clientId = p.get('client_id') ?? savedClient;
    if (!code) return reply(400, new SiwcAuthError('missing_code', 'callback sem code'));
    if (!clientId) return reply(400, new SiwcAuthError('missing_client_id', 'registro novo sem client id emitido: callback incompleto'));
    void (async () => {
      try {
        const t = await postForm(endpoints.token, { grant_type: 'authorization_code', client_id: clientId, code, code_verifier: verifier, redirect_uri: redirectUri, resource: SIWC_RESOURCE });
        if (t.status !== 200) throw new SiwcAuthError(errorCode(t.json, t.status), `troca do código recusada (${t.status})`);
        const tok = t.json as { access_token?: string; refresh_token?: string; id_token?: string; expires_in?: number; scope?: string };
        if (!tok.access_token || !tok.refresh_token || !tok.id_token) throw new SiwcAuthError('incomplete_token_response', 'resposta de token incompleta');
        const who = await verifyIdToken(tok.id_token, { endpoints, audience: clientId, nonce });
        const scope = tok.scope ?? '';
        const creds = compact({
          hostId, clientId, sub: who.sub, email: who.email,
          accessToken: tok.access_token, refreshToken: tok.refresh_token, idToken: tok.id_token,
          expiresAt: Date.now() + (tok.expires_in ?? 3600) * 1000, scope, planEnabled: scope.split(/\s+/).includes(PLAN_SCOPE),
        });
        saveCredentials(home, creds);
        reply(200, null, creds);
      } catch (e) {
        reply(400, e instanceof Error ? e : new Error(String(e)));
      }
    })();
  });

  return { url: `${endpoints.authorize}?${q.toString()}`, done, cancel: () => finish(new SiwcAuthError('cancelled', 'login cancelado')) };
}

// Refresh serializado por arquivo de credenciais: "serialize refreshes for the same session".
const inflight = new Map<string, Promise<string>>();

export class SiwcAuth {
  readonly home: string;
  readonly endpoints: SiwcEndpoints;
  constructor({ home, endpoints = SIWC_ENDPOINTS }: { home: string; endpoints?: SiwcEndpoints }) {
    this.home = home;
    this.endpoints = endpoints;
  }

  accessToken(): Promise<string> {
    const c = loadCredentials(this.home);
    if (!c?.accessToken || !c.refreshToken || !c.clientId) return Promise.reject(new SiwcAuthError('not_logged_in', 'sem login no ChatGPT: rode rbuddy login chatgpt', true));
    if ((c.expiresAt ?? 0) - REFRESH_MARGIN_MS > Date.now()) return Promise.resolve(c.accessToken);
    const key = credentialsPath(this.home);
    let p = inflight.get(key);
    if (!p) {
      p = this.refresh(c).finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    return p;
  }

  private async refresh(c: ChatGptCredentials): Promise<string> {
    let r: { status: number; json: Record<string, unknown> };
    try {
      r = await postForm(this.endpoints.token, { grant_type: 'refresh_token', client_id: c.clientId!, refresh_token: c.refreshToken!, resource: SIWC_RESOURCE });
    } catch {
      throw new SiwcAuthError('network', 'refresh sem resposta; credenciais mantidas');
    }
    if (r.status === 200 && typeof r.json.access_token === 'string') {
      const tok = r.json as { access_token: string; refresh_token?: string; expires_in?: number; scope?: string };
      const scope = tok.scope ?? c.scope ?? '';
      // Os quatro juntos: access token, expiração, escopos e refresh token rotativo.
      saveCredentials(this.home, compact({ ...c, accessToken: tok.access_token, refreshToken: tok.refresh_token ?? c.refreshToken, expiresAt: Date.now() + (tok.expires_in ?? 3600) * 1000, scope, planEnabled: scope.split(/\s+/).includes(PLAN_SCOPE) }));
      return tok.access_token;
    }
    const code = errorCode(r.json, r.status);
    if (TERMINAL_REFRESH.has(code)) {
      saveCredentials(this.home, clearTokens(c));
      throw new SiwcAuthError(code, 'sessão do ChatGPT encerrada: rode rbuddy login chatgpt', true);
    }
    throw new SiwcAuthError(code, `refresh recusado (${r.status}); credenciais mantidas`);
  }
}

// Saída: revoga o refresh token; 200 vazio é sucesso. Sem confirmação, apaga local e avisa.
export async function logout(home: string, endpoints: SiwcEndpoints = SIWC_ENDPOINTS): Promise<{ revoked: boolean }> {
  const c = loadCredentials(home);
  if (!c?.refreshToken) return { revoked: false };
  let revoked = false;
  try {
    const r = await postForm(endpoints.revoke, { token: c.refreshToken, token_type_hint: 'refresh_token', ...(c.clientId ? { client_id: c.clientId } : {}) });
    revoked = r.status === 200;
  } catch { revoked = false; }
  saveCredentials(home, clearTokens(c));
  return { revoked };
}

// ---------- Inferência ----------

function rejected(code: string, message: string): ProviderRejectedError { return new ProviderRejectedError('chatgpt', code, message); }

// Erros estruturados (ficha, errors-and-recovery).
function fromCode(code: string, message: string, retryAfterS?: number): Error {
  if (code === 'subscription_sharing_usage_limit_exceeded') return new ProviderLimitError('chatgpt', Date.now() + (retryAfterS ? retryAfterS * 1000 : LIMIT_RECHECK_MS), message);
  if (code === 'subscription_sharing_usage_unavailable' || code === 'subscription_sharing_user_unavailable') return new ProviderLimitError('chatgpt', Date.now() + TEMPORARY_BACKOFF_MS, message);
  return rejected(code, message);
}

function fromHttp(e: unknown): never {
  const err = e as { status?: number; headers?: Headers | Record<string, string>; code?: string | null; message?: string };
  if (typeof err?.status !== 'number') throw new ProviderUnknownError(`ChatGPT sem resposta conclusiva: ${err?.message ?? String(e)}`);
  const raw = err.headers instanceof Headers ? err.headers.get('retry-after') : err.headers?.['retry-after'];
  const secs = Number(raw);
  const retry = Number.isFinite(secs) && secs > 0 ? secs : undefined;
  if (err.status === 429) throw new ProviderLimitError('chatgpt', Date.now() + (retry ? retry * 1000 : LIMIT_RECHECK_MS), err.message ?? 'limite do ChatGPT');
  if (err.status === 503) throw new ProviderLimitError('chatgpt', Date.now() + (retry ? retry * 1000 : TEMPORARY_BACKOFF_MS), err.message ?? 'ChatGPT indisponível');
  throw fromCode(err.code ?? `http_${err.status}`, err.message ?? `HTTP ${err.status}`);
}

export function createChatGptProvider({ home, endpoints = SIWC_ENDPOINTS }: { home: string; endpoints?: SiwcEndpoints }): Provider {
  trustSystemCAs();
  const auth = new SiwcAuth({ home, endpoints });
  return {
    id: 'chatgpt',
    async call(req: ModelRequest, _ctx: CallContext): Promise<ModelResponse> {
      if (loadCredentials(home)?.planEnabled === false) throw rejected('plan_not_enabled', 'o login não concedeu chatgpt.tokens.use.direct: o plano não pode ser usado');
      let token: string;
      try { token = await auth.accessToken(); } catch (e) {
        if (e instanceof SiwcAuthError) throw rejected(e.code, e.message);
        throw e;
      }
      const client = new OpenAI({ apiKey: token, baseURL: endpoints.api, maxRetries: 0 });
      // Sem max_output_tokens nem os demais campos proibidos; o system vai em instructions.
      const body = {
        model: req.model,
        instructions: systemOf(req.messages) || undefined,
        input: responsesInput(req.messages),
        store: false,
        stream: true,
        ...(req.tools?.length ? { tools: responsesTools(req) } : {}),
        // A prévia não cita `reasoning` (2026-10-17): vai só quando há esforço; recusa → o agente repete sem ele.
        ...(req.effort ? { reasoning: { effort: req.effort } } : {}),
      };
      let stream: AsyncIterable<{ type: string; response?: { error?: { code?: string; message?: string } | null } & Parameters<typeof parseResponsesOutput>[0] }>;
      try {
        stream = (await client.responses.create(body as unknown as Parameters<typeof client.responses.create>[0], { headers: { 'User-Agent': USER_AGENT } })) as unknown as typeof stream;
      } catch (e) { return fromHttp(e); }
      try {
        for await (const ev of stream) {
          if (ev.type === 'response.completed') return parseResponsesOutput(ev.response ?? {});
          if (ev.type === 'response.incomplete') return { ...parseResponsesOutput(ev.response ?? {}), finish: 'length' };
          if (ev.type === 'response.failed') {
            const er = ev.response?.error;
            throw fromCode(er?.code ?? 'unknown_error', er?.message ?? 'response.failed');
          }
        }
      } catch (e) {
        if (e instanceof ProviderLimitError || e instanceof ProviderRejectedError) throw e;
        const err = e as { status?: number };
        if (typeof err?.status === 'number') return fromHttp(e);
        throw new ProviderUnknownError(`stream do ChatGPT interrompido: ${(e as Error).message}`);
      }
      throw new ProviderUnknownError('stream do ChatGPT terminou sem response.completed');
    },
  };
}
