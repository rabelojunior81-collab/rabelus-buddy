// SPEC 0002, critério 3: sonda de disponibilidade. O harness falso é um agente ACP de verdade (o SDK oficial),
// na forma medida nos harnesses reais do Pai em 2026-10-18.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { CONSOLE_METHODS } from '../src/console.ts';
import { launchFor, probeHarness, LOCAL_ACP } from '../src/harness/client.ts';
import type { HarnessView } from '../src/harness/catalog.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';
import { fakeHttp } from './fake-http.ts';

const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });

const FAKE = join(import.meta.dirname, 'fake-acp-agent.mjs');
const fake = (mode: string) => ({ cmd: process.execPath, args: [FAKE], env: { FAKE_ACP_MODE: mode }, source: 'local' as const, needsApproval: false });
const alive = (pid?: number) => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch { return false; } };
const cwd = mkdtempSync(join(tmpdir(), 'rbuddy-sonda-'));

const view = (over: Partial<HarnessView>): HarnessView => ({ id: 'x', name: 'X', version: '1.0.0', description: '', license: 'MIT', website: null, icon: false, found: false, offRegistry: false, launch: { kind: 'npx', package: 'x@1.0.0', args: [], env: {} }, ...over });

test('como iniciar: o executável local quando instalado e fala ACP; npx com aprovação e pacote exato; não instalado sem lançamento local (critérios 3 e 4)', () => {
  const oc = launchFor(view({ id: 'opencode', found: true, path: '/bin/opencode', launch: { kind: 'binary', platforms: {} } }));
  assert.deepEqual(oc, { cmd: '/bin/opencode', args: LOCAL_ACP.opencode, env: {}, source: 'local', needsApproval: false });
  const claude = launchFor(view({ id: 'claude-acp', found: true, path: '/bin/claude', launch: { kind: 'npx', package: '@agentclientprotocol/claude-agent-acp@0.93.0', args: [], env: {} } }));
  assert.deepEqual(claude, { cmd: 'npx', args: ['-y', '@agentclientprotocol/claude-agent-acp@0.93.0'], env: {}, source: 'npx', needsApproval: true, package: '@agentclientprotocol/claude-agent-acp@0.93.0' });
  const fa = launchFor(view({ id: 'fast-agent', launch: { kind: 'uvx', package: 'fast-agent-acp==0.10.1', args: ['-x'], env: { FAST_AGENT_MODEL: 'codexplan' } } }));
  assert.deepEqual(fa, { cmd: 'uvx', args: ['fast-agent-acp==0.10.1', '-x'], env: { FAST_AGENT_MODEL: 'codexplan' }, source: 'uvx', needsApproval: true, package: 'fast-agent-acp==0.10.1' });
  assert.equal(launchFor(view({ id: 'hermes', found: false, offRegistry: true, launch: { kind: 'local', cmd: 'hermes', args: ['acp'] } })), null, 'fora do registro e não instalado: nada a iniciar');
  assert.equal(launchFor(view({ id: 'goose', found: false, launch: { kind: 'binary', platforms: {} } })), null, 'binário do registro exige baixar: fora do M1.2a');
  assert.deepEqual(LOCAL_ACP.hermes, ['acp']);
  assert.deepEqual(LOCAL_ACP['github-copilot-cli'], ['--acp']);
});

test('sonda: pronto, com quem é, o que aceita e como entra (critério 3)', async () => {
  const r = await probeHarness(fake('ok'), { cwd });
  assert.equal(r.state, 'pronto');
  assert.deepEqual([r.agent?.name, r.agent?.version], ['Fake', '0.0.1']);
  assert.equal(r.image, true);
  assert.deepEqual(r.authMethods.map((m) => m.id), ['fake-login']);
  assert.equal(alive(r.pid), false, 'o processo da sonda não fica vivo');
});

test('sonda: precisa de login quando a sessão recusa com auth_required (critério 3)', async () => {
  const r = await probeHarness(fake('auth'), { cwd });
  assert.equal(r.state, 'login');
  assert.deepEqual(r.authMethods.map((m) => m.name), ['Login with Fake']);
  assert.equal(alive(r.pid), false);
});

test('sonda: mudo → falhou por tempo-limite; saindo → falhou com o motivo dele (critério 3)', async () => {
  const mute = await probeHarness(fake('mute'), { cwd, timeoutMs: 1500 });
  assert.equal(mute.state, 'falhou');
  assert.match(mute.reason ?? '', /tempo-limite/);
  assert.equal(alive(mute.pid), false, 'o mudo é encerrado');
  const crash = await probeHarness(fake('crash'), { cwd });
  assert.equal(crash.state, 'falhou');
  assert.match(crash.reason ?? '', /saiu com código 3/);
  assert.match(crash.reason ?? '', /configuração ausente/);
  const missing = await probeHarness({ cmd: join(cwd, 'nao-existe'), args: [], env: {}, source: 'local', needsApproval: false }, { cwd });
  assert.equal(missing.state, 'falhou');
});

test('harness.probe pelo núcleo: o opencode do PATH (no Windows, um .cmd pelo cmd.exe), sem janela e sem sobra (critério 3)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-path-'));
  if (process.platform === 'win32') writeFileSync(join(dir, 'opencode.cmd'), `@echo off\r\n"${process.execPath}" "${FAKE}" %*\r\n`);
  else { writeFileSync(join(dir, 'opencode'), `#!/bin/sh\nexec "${process.execPath}" "${FAKE}" "$@"\n`); chmodSync(join(dir, 'opencode'), 0o755); }
  const home = tempHome();
  // O registro traz o OpenCode por binário (forma medida); encontrado no PATH, entra pelo lançamento local, sem baixar nada.
  const reg = await fakeHttp(() => ({ json: { version: '1.0.0', agents: [{ id: 'opencode', name: 'OpenCode', version: '1.19.3', description: 'x', license: 'MIT', distribution: { binary: { 'windows-x86_64': { archive: 'https://example.invalid/o.zip', cmd: './opencode.exe', args: ['acp'] } } } }] } }));
  owners.push(await spawnOwner(home, { PATH: dir, FAKE_ACP_MODE: 'ok', RBUDDY_ACP_REGISTRY: `${reg.url}/registry.json` }));
  const r = (await call(endpointFor(home), 'harness.probe', { id: 'opencode' })) as { state: string; agent?: { name: string } };
  assert.equal(r.state, 'pronto');
  assert.equal(r.agent?.name, 'Fake');
  assert.ok((CONSOLE_METHODS as readonly string[]).includes('harness.probe'));
  await reg.close();
});
