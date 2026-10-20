// SPEC 0002, critério 9 (M1.3a, pelo caminho da console): attachment.put guarda o anexo e registra só a referência;
// agent.run leva os anexos ao Buddy (rota com visão) e ao harness (bloco image só se ele declarar suporte); o que não
// serve é recusado com motivo claro, antes de chamar.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { ChildProcess } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { consolePath } from '../src/console.ts';
import { checkParams } from '../src/contract.ts';
import { fakeHttp, type Captured } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const FAKE = join(import.meta.dirname, 'fake-acp-agent.mjs');
function fakeOpencode(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-oc-'));
  if (process.platform === 'win32') writeFileSync(join(dir, 'opencode.cmd'), `@echo off\r\n"${process.execPath}" "${FAKE}" %*\r\n`);
  else { writeFileSync(join(dir, 'opencode'), `#!/bin/sh\nexec "${process.execPath}" "${FAKE}" "$@"\n`); chmodSync(join(dir, 'opencode'), 0o755); }
  return dir;
}
const REG = { version: '1.0.0', agents: [{ id: 'opencode', name: 'OpenCode', version: '1', description: 'x', license: 'MIT', distribution: { binary: { 'windows-x86_64': { archive: 'https://example.invalid/o.zip', cmd: './o.exe', args: ['acp'] } } } }] };
const chat = (content: string) => ({ json: { id: 'c', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }], usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 } } });
type Ev = { kind: string; payload: any };

async function consoleWith(model: string, env: NodeJS.ProcessEnv = {}) {
  const seen: Captured[] = [];
  const llm = await fakeHttp((c) => { if (c.path.endsWith('/registry.json')) return { json: REG }; seen.push(c); return chat('vi o anexo'); });
  const home = tempHome();
  writeFileSync(join(home, 'config.json'), JSON.stringify({ routes: [{ provider: 'openrouter', model, baseURL: `${llm.url}/api/v1` }] }));
  owners.push(await spawnOwner(home, { RBUDDY_CONSOLE_PORT: '0', OPENROUTER_API_KEY: 'chave-falsa', PATH: fakeOpencode(), RBUDDY_ACP_REGISTRY: `${llm.url}/registry.json`, FAKE_ACP_MODE: 'ok', FAKE_ACP_ECHO_BLOCKS: '1', ...env }));
  const { port, token } = JSON.parse(readFileSync(consolePath(home), 'utf8')) as { port: number; token: string };
  const api = (method: string, params: unknown = {}) => new Promise<any>((resolve, reject) => {
    const data = JSON.stringify(params);
    const r = http.request({ host: '127.0.0.1', port, method: 'POST', path: `/api/${method}`, headers: { host: `127.0.0.1:${port}`, 'x-rbuddy-token': token, 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } }, (res) => {
      let b = ''; res.setEncoding('utf8'); res.on('data', (c: string) => { b += c; });
      res.on('end', () => { let j: { result?: unknown; error?: { message: string } } = {}; try { j = JSON.parse(b); } catch { /* corpo vazio */ } if (res.statusCode === 200) resolve(j.result); else reject(new Error(`${res.statusCode} ${j.error?.message ?? ''}`)); });
    });
    r.on('error', reject); r.write(data); r.end();
  });
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const done = async (run: string) => { for (let i = 0; i < 400; i++) { const r = await api('run.get', { id: run }); if (r.state !== 'running') return r; await new Promise((ok) => setTimeout(ok, 50)); } throw new Error('tempo esgotado'); };
  return { api, workspace, seen, llm, done };
}

test('pela console: anexo guardado com só a referência no log; a imagem chega à rota com visão (critério 9)', async () => {
  const { api, workspace, seen, done } = await consoleWith('nvidia/nemotron-3.5-super-vl:free');
  const a = await api('attachment.put', { session: 'a1', workspace, name: 'tela.png', mime: 'image/png', data: PNG });
  assert.match(a.hash, /^[0-9a-f]{64}$/);
  const { run } = await api('agent.run', { session: 'a1', task: 'o que é isto?', workspace, interactive: true, attachments: [a.hash] });
  assert.equal((await done(run)).state, 'done');
  const body = seen.at(-1)!.body as { messages: { content: unknown }[] };
  assert.ok(JSON.stringify(body.messages.at(-1)!.content).includes(`data:image/png;base64,${PNG}`), 'a imagem chegou à rota');
  const ev = (await api('session.events', { session: 'a1' })) as Ev[];
  assert.ok(ev.some((e) => e.kind === 'attachment.stored' && e.payload.hash === a.hash && e.payload.name === 'tela.png'));
  assert.ok(!JSON.stringify(ev).includes(PNG), 'o log nunca tem o conteúdo');
});

test('pela console: imagem sem rota com visão para com motivo antes de chamar; texto anexado segue; tipo e hash inválidos são recusados (critério 9)', async () => {
  const { api, workspace, seen, done } = await consoleWith('openai/gpt-oss-120b');
  const img = await api('attachment.put', { session: 'a2', workspace, name: 'x.png', mime: 'image/png', data: PNG });
  const { run } = await api('agent.run', { session: 'a2', task: 'descreva', workspace, interactive: true, attachments: [img.hash] });
  const r = await done(run);
  assert.equal(r.state, 'stopped');
  assert.equal(((await api('session.events', { session: 'a2' })) as Ev[]).find((e) => e.kind === 'run.stopped')!.payload.reason, 'noVisionRoute');
  assert.equal(seen.length, 0, 'nenhuma chamada à rota sem visão');
  const txt = await api('attachment.put', { session: 'a3', workspace, name: 'n.md', mime: 'text/markdown', data: Buffer.from('linha').toString('base64') });
  const t = await api('agent.run', { session: 'a3', task: 'leia', workspace, interactive: true, attachments: [txt.hash] });
  assert.equal((await done(t.run)).state, 'done');
  await assert.rejects(api('attachment.put', { session: 'a4', workspace, name: 'x.pdf', mime: 'application/pdf', data: 'AAAA' }), /tipo de anexo/);
  await assert.rejects(api('agent.run', { session: 'a4', task: 'x', workspace, attachments: ['f'.repeat(64)] }), /anexo desconhecido/);
});

test('pela console: imagem de 3 MB passa (o limite do corpo cresceu só para o anexo) (critério 9)', async () => {
  const { api, workspace } = await consoleWith('nvidia/nemotron-3.5-super-vl:free');
  const big = Buffer.alloc(3 * 1024 * 1024, 7).toString('base64');
  const a = await api('attachment.put', { session: 'a5', workspace, name: 'grande.png', mime: 'image/png', data: big });
  assert.equal(a.size, 3 * 1024 * 1024);
});

test('harness: a imagem vai como bloco image se ele declarar suporte; senão, a conversa para com o motivo (critério 9)', async () => {
  const yes = await consoleWith('nvidia/nemotron-3.5-super-vl:free');
  const a = await yes.api('attachment.put', { session: 'h1', workspace: yes.workspace, name: 'x.png', mime: 'image/png', data: PNG });
  const { run } = await yes.api('agent.run', { session: 'h1', task: 'veja', workspace: yes.workspace, interactive: true, harness: 'opencode', attachments: [a.hash] });
  assert.equal((await yes.done(run)).state, 'done');
  const last = ((await yes.api('session.events', { session: 'h1' })) as Ev[]).filter((e) => e.kind === 'agent.message').at(-1)!.payload.message.content as string;
  assert.match(last, new RegExp(`Blocos: text,image:image/png:${PNG.length}\\.`));
  const no = await consoleWith('nvidia/nemotron-3.5-super-vl:free', { FAKE_ACP_NO_IMAGE: '1' });
  const b = await no.api('attachment.put', { session: 'h2', workspace: no.workspace, name: 'x.png', mime: 'image/png', data: PNG });
  const r2 = await no.api('agent.run', { session: 'h2', task: 'veja', workspace: no.workspace, interactive: true, harness: 'opencode', attachments: [b.hash] });
  assert.equal((await no.done(r2.run)).state, 'stopped');
  assert.equal(((await no.api('session.events', { session: 'h2' })) as Ev[]).find((e) => e.kind === 'run.stopped')!.payload.reason, 'noVisionRoute');
});

test('contrato: attachment.put e os anexos do agent.run (critérios 9 e 10)', () => {
  assert.equal(checkParams('attachment.put', { session: 's', workspace: 'w', name: 'a.png', mime: 'image/png', data: 'AAAA' }).ok, true);
  assert.equal(checkParams('attachment.put', { session: 's', workspace: 'w', name: 'a.png', mime: 'image/png' }).ok, false, 'sem dados');
  assert.equal(checkParams('agent.run', { session: 's', task: 't', workspace: 'w', attachments: ['a'.repeat(64)] }).ok, true);
  assert.equal(checkParams('agent.run', { session: 's', task: 't', workspace: 'w', attachments: ['../x'] }).ok, false, 'só hash');
});
