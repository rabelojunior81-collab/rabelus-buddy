// Console web local (ADR 0017; SPEC 0001 rev. 5, escopo 19, critérios 27, 28 e 30).
// Servida pelo dono em 127.0.0.1, sem dependência: a página (packages/core/console/) fala com a
// mesma API do IPC, por uma lista fechada de métodos. Toda requisição exige o token da console e o
// cabeçalho Host exato (contra DNS rebinding e contra páginas de terceiros).

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { checkParams } from './contract.ts';
import { iconPath } from './harness/catalog.ts';

const PAGE_DIR = join(import.meta.dirname, '..', 'console');
const LOCALES = join(import.meta.dirname, '..', '..', '..', 'locales');
export const DEFAULT_CONSOLE_PORT = 47321;

// O que a página pode chamar. Fora daqui (eventos crus, efeitos, reservas, daemon.stop): 404.
export const CONSOLE_METHODS = [
  'daemon.status', 'console.defaults', 'session.events', 'session.list',
  'run.get', 'run.list', 'agent.run', 'agent.resume',
  'run.live', 'agent.steer', 'agent.unqueue', 'agent.stop',
  'approval.list', 'approval.resolve', 'budget.status',
  'providers.status', 'providers.usage', 'harness.list', 'keys.set', 'keys.remove',
  'auth.chatgpt.start', 'auth.chatgpt.status', 'auth.chatgpt.logout',
] as const;

export const consolePath = (home: string): string => join(home, 'console.json');

// Token estável entre reinícios (o endereço salvo pelo Pai continua valendo); arquivo só do dono.
function loadToken(home: string): string {
  const p = consolePath(home);
  if (existsSync(p)) {
    const t = (JSON.parse(readFileSync(p, 'utf8')) as { token?: string }).token;
    if (t && /^[A-Za-z0-9_-]{32,}$/.test(t)) return t;
  }
  return randomBytes(24).toString('base64url');
}

function saveConsole(home: string, data: { port: number; token: string }): void {
  const p = consolePath(home);
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  renameSync(tmp, p);
  chmodSync(p, 0o600);
}

const same = (a: string, b: string): boolean => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

function catalog(lang: string): Record<string, unknown> | null {
  if (!/^[A-Za-z-]{2,10}$/.test(lang) || !existsSync(join(LOCALES, lang))) return null;
  const out: Record<string, unknown> = {};
  for (const f of readdirSync(join(LOCALES, lang)).filter((x) => x.endsWith('.json'))) Object.assign(out, JSON.parse(readFileSync(join(LOCALES, lang, f), 'utf8')));
  return out;
}

export interface ConsoleServer { url: string; port: number; close: () => Promise<void> }

export async function startConsole({ home, methods, touch, port = Number(process.env.RBUDDY_CONSOLE_PORT ?? DEFAULT_CONSOLE_PORT) }: {
  home: string;
  methods: Record<string, (p: Record<string, unknown>) => unknown>;
  touch: () => void;
  port?: number;
}): Promise<ConsoleServer> {
  const token = loadToken(home);
  const page = readFileSync(join(PAGE_DIR, 'index.html'), 'utf8');
  const allowed = new Set<string>(CONSOLE_METHODS);
  let bound = 0;

  const send = (res: http.ServerResponse, status: number, body: string, type = 'application/json; charset=utf-8', extra: Record<string, string> = {}) => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', ...extra });
    res.end(body);
  };
  const json = (res: http.ServerResponse, status: number, obj: unknown) => send(res, status, JSON.stringify(obj));

  const server = http.createServer((req, res) => {
    touch();
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${bound}`);
    if (req.headers.host !== `127.0.0.1:${bound}`) return json(res, 403, { error: { message: 'host' } });
    const given = String(req.headers['x-rbuddy-token'] ?? url.searchParams.get('t') ?? '');
    if (!same(given, token)) return json(res, 401, { error: { message: 'token' } });

    if (req.method === 'GET' && url.pathname === '/') return send(res, 200, page, 'text/html; charset=utf-8');
    const m = /^\/i18n\/([A-Za-z-]+)\.json$/.exec(url.pathname);
    if (req.method === 'GET' && m) {
      const c = catalog(m[1]!);
      return c ? json(res, 200, c) : json(res, 404, { error: { message: 'idioma' } });
    }
    // Ícone de harness (SPEC 0002, escopo 1): imagem guardada localmente, servida isolada, nunca como documento.
    const ic = /^\/icons\/harness\/([a-z0-9][a-z0-9._-]{0,63})\.svg$/.exec(url.pathname);
    if (req.method === 'GET' && ic) {
      const p = iconPath(home, ic[1]!);
      if (!p || !existsSync(p)) return json(res, 404, { error: { message: 'ícone' } });
      return send(res, 200, readFileSync(p, 'utf8'), 'image/svg+xml', { 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox", 'cache-control': 'private, max-age=86400' });
    }
    const a = /^\/api\/([a-z.]+)$/i.exec(url.pathname);
    if (req.method !== 'POST' || !a || !allowed.has(a[1]!) || !methods[a[1]!]) return json(res, 404, { error: { message: 'não encontrado' } });

    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (c: string) => { raw += c; if (raw.length > 1_000_000) req.destroy(); });
    req.on('end', () => {
      void (async () => {
        // Contrato tipado (SPEC 0002, critério 10): entrada inválida não chega ao núcleo.
        let input: unknown;
        try { input = raw ? JSON.parse(raw) : {}; } catch { return json(res, 400, { error: { code: -32602, message: 'JSON inválido', data: {} } }); }
        const checked = checkParams(a[1] as (typeof CONSOLE_METHODS)[number], input);
        if (!checked.ok) return json(res, 400, { error: { code: -32602, message: checked.message, data: {} } });
        try {
          json(res, 200, { result: await methods[a[1]!]!(checked.params) });
        } catch (e) {
          const err = e as { code?: number; message?: string; data?: unknown };
          json(res, 400, { error: { code: err.code ?? -32603, message: err.message ?? 'erro', data: err.data ?? {} } });
        }
      })();
    });
  });

  const listen = (p: number) => new Promise<number>((resolve, reject) => {
    server.once('error', reject);
    server.listen(p, '127.0.0.1', () => { server.off('error', reject); resolve((server.address() as AddressInfo).port); });
  });
  try { bound = await listen(port); } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EADDRINUSE' || port === 0) throw e;
    bound = await listen(0);
  }
  saveConsole(home, { port: bound, token });
  return {
    url: `http://127.0.0.1:${bound}/?t=${token}`,
    port: bound,
    close: () => new Promise((r) => { server.close(() => r()); server.closeAllConnections(); }),
  };
}
