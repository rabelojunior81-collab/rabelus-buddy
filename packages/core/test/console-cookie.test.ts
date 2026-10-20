// Console sem token na URL (SPEC 0002, critério 16; decisão do Pai em 2026-10-20): o token entra uma vez
// e vira cookie; o bilhete do `rbuddy ui` é de uso único; POST pelo cookie só da própria origem.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { consolePath, startConsole, type ConsoleServer } from '../src/console.ts';
import { tempHome } from './helpers.ts';

const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
const servers: ConsoleServer[] = [];
after(async () => { for (const s of servers) await s.close(); });

interface Res { status: number; body: string; headers: http.IncomingHttpHeaders }
function request(port: number, method: string, path: string, headers: Record<string, string> = {}, body?: string): Promise<Res> {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, method, path, headers: { host: `127.0.0.1:${port}`, ...headers, ...(body !== undefined ? { 'content-length': String(Buffer.byteLength(body)) } : {}) } }, (res) => {
      let b = '';
      res.setEncoding('utf8');
      res.on('data', (c: string) => { b += c; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: b, headers: res.headers }));
    });
    r.on('error', reject);
    if (body !== undefined) r.write(body);
    r.end();
  });
}

async function setup(now?: () => number) {
  const home = tempHome();
  let calls = 0;
  const srv = await startConsole({ home, port: 0, touch: () => {}, now, methods: { 'run.list': () => { calls++; return []; } } });
  servers.push(srv);
  const { token } = JSON.parse(readFileSync(consolePath(home), 'utf8')) as { token: string };
  return { srv, port: srv.port, token, calls: () => calls };
}
const cookieOf = (r: Res): string => {
  const sc = r.headers['set-cookie'];
  assert.ok(sc && sc.length === 1, 'um cookie');
  return sc[0]!;
};
const pair = (setCookie: string): string => setCookie.split(';')[0]!;

test('o token entra uma vez e vira cookie HttpOnly e SameSite=Strict, derivado dele; a URL fica limpa (critério 16)', async () => {
  const { srv, port, token } = await setup();
  assert.equal(srv.url, `http://127.0.0.1:${port}/`, 'endereço sem token');
  const bad = await request(port, 'GET', '/?t=errado');
  assert.equal(bad.status, 401);
  assert.equal(bad.headers['set-cookie'], undefined, 'token errado não ganha cookie');

  const r = await request(port, 'GET', `/?t=${token}`);
  assert.equal(r.status, 303);
  assert.equal(r.headers.location, '/', 'volta para a URL limpa');
  const sc = cookieOf(r);
  assert.match(sc, /HttpOnly/i);
  assert.match(sc, /SameSite=Strict/i);
  assert.match(sc, /Path=\//);
  assert.match(pair(sc), new RegExp(`^rbuddy_console_${port}=`), 'o nome tem a porta: duas consoles no mesmo navegador não se atropelam');
  assert.equal(sc.includes(token), false, 'o cookie nunca é o próprio token');
});

test('com o cookie, página, catálogo e marca respondem sem ?t=; o ?t= não autoriza mais recurso nem API (critério 16)', async () => {
  const { port, token, calls } = await setup();
  const cookie = pair(cookieOf(await request(port, 'GET', `/?t=${token}`)));
  for (const path of ['/', '/i18n/pt-BR.json', '/brand/emblema-64.png']) {
    assert.equal((await request(port, 'GET', path, { cookie })).status, 200, `${path} com cookie`);
    assert.equal((await request(port, 'GET', path)).status, 401, `${path} sem cookie`);
  }
  assert.equal((await request(port, 'GET', `/brand/emblema-64.png?t=${token}`)).status, 401, 'recurso pelo ?t=');
  assert.equal((await request(port, 'GET', '/', { cookie: `rbuddy_console_${port}=forjado` })).status, 401, 'cookie forjado');
  assert.equal((await request(port, 'POST', `/api/run.list?t=${token}`, { 'content-type': 'application/json' }, '{}')).status, 401, 'API pelo ?t=');
  assert.equal(calls(), 0);
});

test('POST pelo cookie só com Origin exato e JSON; de outra porta do 127.0.0.1, 403 e nada acontece; o cabeçalho do cliente local continua (critério 16)', async () => {
  const { port, token, calls } = await setup();
  const cookie = pair(cookieOf(await request(port, 'GET', `/?t=${token}`)));
  const json = { cookie, 'content-type': 'application/json' };
  assert.equal((await request(port, 'POST', '/api/run.list', json, '{}')).status, 403, 'sem Origin');
  assert.equal((await request(port, 'POST', '/api/run.list', { ...json, origin: `http://127.0.0.1:${port + 1}` }, '{}')).status, 403, 'outra porta');
  assert.equal((await request(port, 'POST', '/api/run.list', { cookie, 'content-type': 'text/plain', origin: `http://127.0.0.1:${port}` }, '{}')).status, 403, 'corpo sem JSON (pedido simples, sem preflight)');
  assert.equal(calls(), 0, 'nada chegou ao núcleo');
  const ok = await request(port, 'POST', '/api/run.list', { ...json, origin: `http://127.0.0.1:${port}` }, '{}');
  assert.equal(ok.status, 200);
  assert.deepEqual(JSON.parse(ok.body), { result: [] });
  assert.equal((await request(port, 'POST', '/api/run.list', { 'x-rbuddy-token': token, 'content-type': 'application/json' }, '{}')).status, 200, 'cliente local pelo cabeçalho');
  assert.equal(calls(), 2);
});

test('o bilhete do rbuddy ui é de uso único e vale 60 s; vira o mesmo cookie, e o token não aparece nele (critério 16)', async () => {
  let clock = 1_000_000;
  const { srv, port, token } = await setup(() => clock);
  const direct = pair(cookieOf(await request(port, 'GET', `/?t=${token}`)));

  const t1 = srv.ticket();
  const m = /^http:\/\/127\.0\.0\.1:(\d+)\/entrar\?c=([A-Za-z0-9_-]{32,})$/.exec(t1);
  assert.ok(m, t1);
  assert.equal(Number(m[1]), port);
  assert.equal(t1.includes(token), false, 'o bilhete não é o token');
  const path = new URL(t1).pathname + new URL(t1).search;
  const r = await request(port, 'GET', path);
  assert.equal(r.status, 303);
  assert.equal(r.headers.location, '/');
  assert.equal(pair(cookieOf(r)), direct, 'o mesmo cookie do token');
  assert.equal((await request(port, 'GET', path)).status, 401, 'reusado');

  const t2 = srv.ticket();
  clock += 61_000;
  assert.equal((await request(port, 'GET', new URL(t2).pathname + new URL(t2).search)).status, 401, 'vencido');
  assert.equal((await request(port, 'GET', '/entrar?c=inventado-inventado-inventado-inventado')).status, 401, 'inventado');
});

test('a página não guarda nem envia o token: sem ?t=, sem cabeçalho de token (critério 16)', () => {
  assert.doesNotMatch(PAGE, /x-rbuddy-token/);
  assert.doesNotMatch(PAGE, /get\('t'\)/);
  assert.doesNotMatch(PAGE, /'\?t='/);
});
