// Permissões com modos e escopos (SPEC 0002, critério 17; decisões do Pai em 2026-10-20): o cartão aprova uma vez,
// nesta conversa, neste projeto (a pasta) ou sempre; os modos Manual, Aceitar edições, Plano, Automático e Sem
// perguntas mudam o que pergunta. Em qualquer modo: negação vence, protegido bloqueia, fora da pasta pergunta.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../src/db.ts';
import { EventLog } from '../src/log.ts';
import { Policy, safeCommand } from '../src/policy.ts';
import { checkParams } from '../src/contract.ts';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { fakeHttp } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

function setup(mode?: string) {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-modo-'));
  const workspace = join(dir, 'ws');
  mkdirSync(join(workspace, 'src'), { recursive: true });
  const log = new EventLog(openDatabase(join(dir, 'nucleo.db')));
  return { dir, workspace, log, policy: new Policy(log, { workspace, ...(mode ? { mode: mode as never } : {}) }) };
}
const tty = { interactive: true };
const w = (target: string, session = 's1') => ({ session, tool: 'write_file' as const, target });
const cmd = (target: string, session = 's1') => ({ session, tool: 'run_command' as const, target });

test('Manual (padrão): escrita e comando perguntam; leitura é livre', () => {
  const { policy } = setup();
  assert.equal(policy.decide(w('src/a.ts'), tty).effect, 'ask');
  assert.equal(policy.decide(cmd('npm test'), tty).effect, 'ask');
  assert.equal(policy.decide({ session: 's1', tool: 'read_file', target: 'src/a.ts' }, tty).effect, 'allow');
});

test('Aceitar edições: escreve dentro da pasta sem perguntar; comando ainda pergunta; protegido continua negado', () => {
  const { policy } = setup('acceptEdits');
  assert.equal(policy.decide(w('src/a.ts'), tty).effect, 'allow');
  assert.equal(policy.decide(cmd('npm test'), tty).effect, 'ask');
  assert.equal(policy.decide(w('.env'), tty).effect, 'deny');
});

test('Plano: só lê; escrever e rodar comando são negados com o motivo', () => {
  const { policy } = setup('plan');
  const d = policy.decide(w('src/a.ts'), tty);
  assert.deepEqual([d.effect, d.reason], ['deny', 'modo plano']);
  assert.equal(policy.decide(cmd('ls'), tty).effect, 'deny');
  assert.equal(policy.decide({ session: 's1', tool: 'read_file', target: 'src/a.ts' }, tty).effect, 'allow');
});

test('Automático: escrita dentro da pasta e comando só de leitura passam, com o motivo registrado; o resto pergunta', () => {
  const { policy, log } = setup('auto');
  assert.equal(policy.decide(w('src/a.ts'), tty).effect, 'allow');
  const ls = policy.decide(cmd('git status'), tty);
  assert.equal(ls.effect, 'allow');
  assert.match(ls.reason, /automático/);
  assert.equal(policy.decide(cmd('npm install left-pad'), tty).effect, 'ask');
  assert.equal(policy.decide(cmd('git status && rm -rf src'), tty).effect, 'ask', 'encadear nunca é "só leitura"');
  assert.ok(log.events('s1').some((e) => e.kind === 'policy.decision' && /automático/.test(String((e.payload as { reason?: string }).reason))));
});

test('o classificador do Automático: só leitura, sem encadear nem redirecionar', () => {
  for (const c of ['ls', 'ls -la src', 'dir', 'pwd', 'cat README.md', 'git status', 'git diff', 'git log --oneline -5', 'npm test', 'node --test', 'rg foo']) assert.equal(safeCommand(c), true, c);
  for (const c of ['rm -rf x', 'git push', 'npm install x', 'ls; rm x', 'cat a > b', 'echo $(whoami)', 'git status | sh', 'find . -delete', 'curl http://x']) assert.equal(safeCommand(c), false, c);
});

test('Sem perguntas: tudo dentro da pasta passa; protegido continua negado; regra de negação vence', () => {
  const { policy } = setup('yolo');
  assert.equal(policy.decide(w('src/a.ts'), tty).effect, 'allow');
  assert.equal(policy.decide(cmd('npm install x'), tty).effect, 'allow');
  assert.equal(policy.decide(w('.git/config'), tty).effect, 'deny');
  policy.addRule({ tool: 'write_file', effect: 'deny', pattern: 'src/**' });
  assert.equal(policy.decide(w('src/a.ts'), tty).effect, 'deny', 'negação vence o modo');
});

test('escopos: conversa vale só na conversa; projeto só na pasta em que foi dado; sempre vale em qualquer pasta', () => {
  const { log, workspace, dir } = setup();
  const p1 = new Policy(log, { workspace });
  p1.grant('session', { tool: 'write_file', pattern: 'src/**' }, { session: 's1' });
  assert.equal(p1.decide(w('src/a.ts', 's1'), tty).effect, 'allow');
  assert.equal(p1.decide(w('src/a.ts', 's2'), tty).effect, 'ask', 'outra conversa');
  p1.grant('project', { tool: 'write_file', pattern: 'docs/**' }, { session: 's1' });
  assert.equal(p1.decide(w('docs/x.md', 's9'), tty).effect, 'allow', 'qualquer conversa da mesma pasta');
  const other = join(dir, 'outra');
  mkdirSync(other, { recursive: true });
  const p2 = new Policy(log, { workspace: other });
  assert.equal(p2.decide(w('docs/x.md', 's9'), tty).effect, 'ask', 'projeto não vaza para outra pasta');
  p1.grant('always', { tool: 'write_file', pattern: 'notas/**' }, { session: 's1' });
  assert.equal(p2.decide(w('notas/a.md', 's7'), tty).effect, 'allow', 'sempre: qualquer pasta');
  p1.grant('session', { tool: 'run_command', pattern: 'npm test' }, { session: 's1' });
  assert.equal(p1.decide(cmd('npm test', 's1'), tty).effect, 'ask', 'comando: só uma vez, até o sandbox (critério 13 do M0)');
});

test('contrato: agent.run aceita o modo; approval.resolve aceita o escopo', () => {
  const base = { session: 's', task: 't', workspace: 'C:/w' };
  for (const m of ['manual', 'acceptEdits', 'plan', 'auto', 'yolo']) assert.equal(checkParams('agent.run', { ...base, permMode: m }).ok, true, m);
  assert.equal(checkParams('agent.run', { ...base, permMode: 'root' }).ok, false);
  for (const s of ['once', 'session', 'project', 'always']) assert.equal(checkParams('approval.resolve', { id: 'ap-1', decision: 'approve', scope: s }).ok, true, s);
  assert.equal(checkParams('approval.resolve', { id: 'ap-1', decision: 'approve', scope: 'forever' }).ok, false);
});

// Pelo núcleo, com um harness falso: aprovar "nesta conversa" faz o pedido igual seguinte passar sem cartão.
const owners: ChildProcess[] = [];
const servers: { close: () => Promise<void> }[] = [];
after(async () => { for (const o of owners) await killHard(o); for (const s of servers) await s.close().catch(() => {}); });
const FAKE = join(import.meta.dirname, 'fake-acp-agent.mjs');
function fakeOpencode(): string {
  const d = mkdtempSync(join(tmpdir(), 'rbuddy-oc-'));
  if (process.platform === 'win32') writeFileSync(join(d, 'opencode.cmd'), `@echo off\r\n"${process.execPath}" "${FAKE}" %*\r\n`);
  else { writeFileSync(join(d, 'opencode'), `#!/bin/sh\nexec "${process.execPath}" "${FAKE}" "$@"\n`); chmodSync(join(d, 'opencode'), 0o755); }
  return d;
}
const REG = { version: '1.0.0', agents: [{ id: 'opencode', name: 'OpenCode', version: '1.19.3', description: 'x', license: 'MIT', distribution: { binary: { 'windows-x86_64': { archive: 'https://example.invalid/o.zip', cmd: './opencode.exe', args: ['acp'] } } } }] };

test('aprovar "nesta conversa" no cartão: o pedido igual seguinte do agente, na mesma conversa, passa sem cartão (critério 17)', async () => {
  const reg = await fakeHttp(() => ({ json: REG }));
  servers.push(reg);
  const home = tempHome();
  owners.push(await spawnOwner(home, { PATH: fakeOpencode(), RBUDDY_ACP_REGISTRY: `${reg.url}/registry.json`, FAKE_ACP_MODE: 'ok', FAKE_ACP_PROMPT: 'permission' }));
  const ipc = (m: string, p: Record<string, unknown> = {}) => call(endpointFor(home), m, p) as Promise<any>;
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const wait = async (run: string) => { for (;;) { const r = await ipc('run.get', { id: run }); if (r.state !== 'running') return r; await new Promise((x) => setTimeout(x, 50)); } };
  const first = await ipc('agent.run', { session: 'c1', task: 'edite', workspace, harness: 'opencode', interactive: true });
  let ap: any;
  for (;;) { ap = ((await ipc('approval.list')) as any[]).find((a) => a.session === 'c1'); if (ap) break; await new Promise((x) => setTimeout(x, 50)); }
  await ipc('approval.resolve', { id: ap.id, decision: 'approve', scope: 'session' });
  assert.equal((await wait(first.run)).state, 'done');
  const second = await ipc('agent.run', { session: 'c1', task: 'edite de novo', workspace, harness: 'opencode', interactive: true });
  assert.equal((await wait(second.run)).state, 'done', 'sem cartão: a concessão da conversa valeu');
  const ev = (await ipc('session.events', { session: 'c1' })) as any[];
  assert.deepEqual(ev.filter((e) => e.kind === 'harness.permission').map((e) => e.payload.decision), ['approve', 'allow']);
});

test('página: o cartão oferece os quatro escopos e negar; a caixa tem o seletor de modo e o aviso do modo sem perguntas', () => {
  const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  for (const s of ['once', 'session', 'project', 'always']) assert.ok(PAGE.includes(`t('console.approvals.scope.${s}')`), s);
  assert.ok(PAGE.includes('id="permMode"'), 'seletor de modo');
  assert.match(PAGE, /params\.permMode = /);
  assert.ok(PAGE.includes("t('console.perm.yoloWarn')"), 'aviso do modo sem perguntas');
});
