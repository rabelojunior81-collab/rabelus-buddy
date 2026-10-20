// SPEC 0002, critérios 1 e 2: catálogo pelo registro oficial do ACP e detecção dos harnesses instalados.
// O servidor falso serve um registry.json na forma medida em 2026-10-18 (42 agentes; npx, binary e uvx).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { ChildProcess } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { consolePath, CONSOLE_METHODS } from '../src/console.ts';
import { refreshRegistry, readRegistry, detectHarnesses, OFF_REGISTRY } from '../src/harness/catalog.ts';
import { fakeHttp, type Captured } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="currentColor" d="M0 0h16v16H0z"/></svg>';

// Três entradas copiadas do registro real (2026-10-18), com o ícone apontando para o servidor falso.
function registry(base: string) {
  return {
    version: '1.0.0',
    agents: [
      { id: 'claude-acp', name: 'Claude Agent', version: '0.93.0', description: 'ACP wrapper for Claude Code', repository: 'https://github.com/agentclientprotocol/claude-agent-acp', authors: ['Anthropic'], license: 'Apache-2.0', license_url: 'https://example.invalid/l', distribution: { npx: { package: '@agentclientprotocol/claude-agent-acp@0.93.0' } }, icon: `${base}/icons/claude-acp.svg` },
      { id: 'opencode', name: 'OpenCode', version: '1.19.3', description: 'The open source coding agent', website: 'https://opencode.ai', authors: ['Anomaly'], license: 'MIT', license_url: 'https://example.invalid/l', distribution: { binary: { 'windows-x86_64': { archive: 'https://example.invalid/opencode-windows-x64.zip', cmd: './opencode.exe', args: ['acp'], sha256: 'e4ce' }, 'linux-x86_64': { archive: 'https://example.invalid/opencode-linux-x64.tar.gz', cmd: './opencode', args: ['acp'], sha256: 'abcd' } } }, icon: `${base}/icons/opencode.svg` },
      { id: 'pi-acp', name: 'pi ACP', version: '0.0.34', description: 'pi', authors: ['x'], license: 'MIT', license_url: 'https://example.invalid/l', distribution: { npx: { package: 'pi-acp@0.0.34' } }, icon: `${base}/icons/pi-acp.svg` },
      { id: 'fast-agent', name: 'fast-agent', version: '0.10.1', description: 'f', authors: ['x'], license: 'Apache-2.0', license_url: 'https://example.invalid/l', distribution: { uvx: { package: 'fast-agent-acp==0.10.1', args: ['-x'], env: { FAST_AGENT_MODEL: 'codexplan' } } }, icon: `${base}/icons/fast-agent.svg` },
    ],
    extensions: [],
  };
}

async function fakeRegistry(mode: { malformed?: boolean } = {}) {
  let base = '';
  const fake = await fakeHttp((c: Captured) => {
    if (c.path === '/registry.json') return mode.malformed ? { text: '{"agents": [quebrado' } : { json: registry(base) };
    if (c.path === '/icons/fast-agent.svg') return { text: '<html>não é ícone</html>', headers: { 'content-type': 'text/html' } };
    if (c.path.startsWith('/icons/')) return { text: SVG, headers: { 'content-type': 'image/svg+xml' } };
    return { status: 404 };
  });
  base = fake.url;
  return fake;
}

// PATH falso com executáveis que só existem para ser achados (nos três sistemas).
function fakePath(names: string[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-path-'));
  for (const n of names) {
    if (process.platform === 'win32') writeFileSync(join(dir, `${n}.cmd`), '@echo off\r\n');
    else { writeFileSync(join(dir, n), '#!/bin/sh\n'); chmodSync(join(dir, n), 0o755); }
  }
  return dir;
}
const pathEnv = (dir: string): NodeJS.ProcessEnv => ({ PATH: dir, PATHEXT: '.COM;.EXE;.BAT;.CMD' });

test('catálogo do registro: monta id, nome, versão, licença, ícone local e lançamento; fora do ar usa a cópia com data; malformado mantém a anterior (critério 1)', async () => {
  const home = tempHome();
  const fake = await fakeRegistry();
  const s1 = await refreshRegistry({ home, url: `${fake.url}/registry.json` });
  assert.equal(s1.source, 'network');
  assert.equal(s1.agents.length, 4);
  const claude = s1.agents.find((a) => a.id === 'claude-acp')!;
  assert.deepEqual([claude.name, claude.version, claude.license], ['Claude Agent', '0.93.0', 'Apache-2.0']);
  assert.deepEqual(claude.launch, { kind: 'npx', package: '@agentclientprotocol/claude-agent-acp@0.93.0', args: [], env: {} });
  const oc = s1.agents.find((a) => a.id === 'opencode')!;
  assert.equal(oc.launch.kind, 'binary');
  assert.deepEqual(oc.launch.kind === 'binary' ? oc.launch.platforms['windows-x86_64'] : null, { archive: 'https://example.invalid/opencode-windows-x64.zip', cmd: './opencode.exe', args: ['acp'], sha256: 'e4ce' });
  assert.deepEqual(s1.agents.find((a) => a.id === 'fast-agent')!.launch, { kind: 'uvx', package: 'fast-agent-acp==0.10.1', args: ['-x'], env: { FAST_AGENT_MODEL: 'codexplan' } });
  // Ícone baixado e guardado localmente; o que não é SVG não vira ícone.
  assert.equal(claude.icon, true);
  assert.match(readFileSync(join(home, 'acp', 'icons', 'claude-acp.svg'), 'utf8'), /^<svg/);
  assert.equal(s1.agents.find((a) => a.id === 'fast-agent')!.icon, false);
  assert.equal(existsSync(join(home, 'acp', 'icons', 'fast-agent.svg')), false);
  await fake.close();

  // Fora do ar: a última cópia, com a data dela e o motivo.
  const s2 = await refreshRegistry({ home, url: `${fake.url}/registry.json`, timeoutMs: 2000 });
  assert.equal(s2.source, 'cache');
  assert.equal(s2.fetchedAt, s1.fetchedAt);
  assert.equal(s2.agents.length, 4);
  assert.ok(s2.error);

  // Malformado: nada cai, a cópia anterior fica.
  const bad = await fakeRegistry({ malformed: true });
  const s3 = await refreshRegistry({ home, url: `${bad.url}/registry.json` });
  assert.equal(s3.source, 'cache');
  assert.equal(s3.agents.length, 4);
  assert.match(s3.error ?? '', /registro inválido/);
  assert.deepEqual(readRegistry(home).agents.map((a) => a.id), s1.agents.map((a) => a.id));
  await bad.close();

  // Sem rede e sem cópia: catálogo vazio com o motivo, sem exceção.
  const empty = await refreshRegistry({ home: tempHome(), url: 'http://127.0.0.1:9/registry.json', timeoutMs: 2000 });
  assert.equal(empty.source, 'none');
  assert.deepEqual(empty.agents, []);
  assert.ok(empty.error);
});

test('detecção pelo PATH: só os executáveis presentes aparecem como encontrados; Hermes pela tabela própria; o resto não instalado (critério 2)', async () => {
  const home = tempHome();
  const fake = await fakeRegistry();
  await refreshRegistry({ home, url: `${fake.url}/registry.json` });
  await fake.close();
  const dir = fakePath(['claude', 'opencode']);
  const list = detectHarnesses(home, pathEnv(dir));
  const found = list.filter((h) => h.found).map((h) => h.id).sort();
  assert.deepEqual(found, ['claude-acp', 'opencode']);
  assert.equal(list.find((h) => h.id === 'claude-acp')!.signal, 'claude');
  assert.ok(list.find((h) => h.id === 'claude-acp')!.path?.startsWith(dir));
  const hermes = list.find((h) => h.id === 'hermes')!;
  assert.equal(hermes.offRegistry, true);
  assert.equal(hermes.found, false);
  assert.equal(list.find((h) => h.id === 'pi-acp')!.found, false);
  assert.equal(list.find((h) => h.id === 'fast-agent')!.found, false, 'sem sinal conhecido: não instalado');
  // Hermes no PATH: encontrado, com o lançamento local da tabela própria.
  const withHermes = detectHarnesses(home, pathEnv(fakePath(['hermes'])));
  const h2 = withHermes.find((h) => h.id === 'hermes')!;
  assert.equal(h2.found, true);
  assert.deepEqual(h2.launch, OFF_REGISTRY.find((o) => o.id === 'hermes')!.launch);
  // Os encontrados vêm primeiro.
  assert.deepEqual(list.slice(0, 2).map((h) => h.found), [true, true]);
});

test('harness.list pelo núcleo e pela console; ícone servido como imagem isolada, só com token (critérios 1, 2 e 28 do M0)', async () => {
  const home = tempHome();
  const fake = await fakeRegistry();
  const dir = fakePath(['opencode']);
  owners.push(await spawnOwner(home, { RBUDDY_CONSOLE_PORT: '0', RBUDDY_ACP_REGISTRY: `${fake.url}/registry.json`, PATH: dir }));
  const r = (await call(endpointFor(home), 'harness.list', {})) as { registry: { source: string; fetchedAt: string | null }; harnesses: { id: string; found: boolean; offRegistry: boolean }[] };
  assert.equal(r.registry.source, 'network');
  assert.ok(r.harnesses.find((h) => h.id === 'opencode')?.found);
  assert.ok(r.harnesses.some((h) => h.id === 'hermes' && h.offRegistry));
  assert.ok((CONSOLE_METHODS as readonly string[]).includes('harness.list'), 'liberado na console');

  const { port, token } = JSON.parse(readFileSync(consolePath(home), 'utf8')) as { port: number; token: string };
  const get = (path: string, auth = true) => new Promise<{ status: number; type: string; csp: string; body: string }>((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path, headers: { host: `127.0.0.1:${port}`, ...(auth ? { 'x-rbuddy-token': token } : {}) } }, (res) => {
      let b = ''; res.setEncoding('utf8'); res.on('data', (c: string) => { b += c; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, type: String(res.headers['content-type'] ?? ''), csp: String(res.headers['content-security-policy'] ?? ''), body: b }));
    }).on('error', reject);
  });
  const icon = await get('/icons/harness/opencode.svg');
  assert.equal(icon.status, 200);
  assert.match(icon.type, /image\/svg\+xml/);
  assert.match(icon.csp, /sandbox/);
  assert.match(icon.body, /^<svg/);
  assert.equal((await get('/icons/harness/opencode.svg', false)).status, 401, 'sem token');
  assert.equal((await get(`/icons/harness/opencode.svg?t=${token}`, false)).status, 401, 'o ?t= não autoriza recurso (critério 16)');
  assert.equal((await get('/icons/harness/nao-existe.svg')).status, 404);
  assert.equal((await get('/icons/harness/..%2Fconsole.svg')).status, 404, 'sem atravessar pastas');
  await fake.close();
});
