// Comando com escopos (decisão do Pai em 2026-10-21, pendência "escopo-de-comando"): o cartão de um comando oferece
// uma vez, nesta conversa, neste projeto (a pasta) e sempre, como a escrita. A concessão vale só para o comando
// exatamente igual: nunca por padrão (um "**" não libera nada), nunca para outro comando parecido ou encadeado.
// Regra de permissão continua sem valer para comando (critério 13 do M0), e a negação continua vencendo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../src/db.ts';
import { EventLog } from '../src/log.ts';
import { Policy } from '../src/policy.ts';

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-cmd-'));
  const workspace = join(dir, 'ws');
  mkdirSync(workspace, { recursive: true });
  const log = new EventLog(openDatabase(join(dir, 'nucleo.db')));
  return { dir, log, workspace, policy: new Policy(log, { workspace }) };
}
const tty = { interactive: true };
const cmd = (target: string, session = 's1') => ({ session, tool: 'run_command' as const, target });

test('os quatro escopos valem para comando; uma vez é consumida', () => {
  const { policy } = setup();
  assert.equal(policy.decide(cmd('npm test'), tty).effect, 'ask');
  for (const [scope, c] of [['session', 'a'], ['project', 'b'], ['always', 'c']] as const) {
    policy.grant(scope, { tool: 'run_command', pattern: `echo ${c}` }, { session: 's1' });
    assert.equal(policy.decide(cmd(`echo ${c}`), tty).effect, 'allow', scope);
  }
  policy.grant('once', { tool: 'run_command', pattern: 'echo d' }, { session: 's1' });
  assert.equal(policy.decide(cmd('echo d'), tty).effect, 'allow');
  assert.equal(policy.decide(cmd('echo d'), tty).effect, 'ask', 'uma vez: consumida');
});

test('nesta conversa: o mesmo comando passa de novo; outro comando, parecido ou encadeado, pergunta', () => {
  const { policy } = setup();
  policy.grant('session', { tool: 'run_command', pattern: 'npm test' }, { session: 's1' });
  assert.equal(policy.decide(cmd('npm test'), tty).effect, 'allow');
  assert.equal(policy.decide(cmd('npm test'), tty).effect, 'allow', 'continua valendo');
  assert.equal(policy.decide(cmd('npm test -- --watch'), tty).effect, 'ask');
  assert.equal(policy.decide(cmd('npm test; rm -rf .'), tty).effect, 'ask');
  assert.equal(policy.decide(cmd('npm test', 's2'), tty).effect, 'ask', 'outra conversa pergunta');
});

test('a concessão de comando é exata: curinga não vira padrão', () => {
  const { policy } = setup();
  policy.grant('session', { tool: 'run_command', pattern: '**' }, { session: 's1' });
  policy.grant('always', { tool: 'run_command', pattern: 'ls *' }, { session: 's1' });
  assert.equal(policy.decide(cmd('npm test'), tty).effect, 'ask');
  assert.equal(policy.decide(cmd('ls src'), tty).effect, 'ask');
  policy.grant('session', { tool: 'run_command', pattern: 'ls *.ts' }, { session: 's1' });
  assert.equal(policy.decide(cmd('ls *.ts'), tty).effect, 'allow', 'o texto exato, com o asterisco, é o comando aprovado');
});

test('neste projeto vale só na pasta; sempre vale em qualquer pasta', () => {
  const { dir, log, policy } = setup();
  const other = join(dir, 'outra');
  mkdirSync(other, { recursive: true });
  const p2 = new Policy(log, { workspace: other });
  policy.grant('project', { tool: 'run_command', pattern: 'git status' }, { session: 's1' });
  assert.equal(policy.decide(cmd('git status', 's9'), tty).effect, 'allow');
  assert.equal(p2.decide(cmd('git status', 's9'), tty).effect, 'ask', 'projeto não vaza para outra pasta');
  policy.grant('always', { tool: 'run_command', pattern: 'node -v' }, { session: 's1' });
  assert.equal(p2.decide(cmd('node -v', 's7'), tty).effect, 'allow');
});

test('regra de permissão continua sem liberar comando, e a negação vence a concessão', () => {
  const { policy } = setup();
  policy.addRule({ effect: 'allow', tool: 'run_command', pattern: '**' });
  assert.equal(policy.decide(cmd('npm test'), tty).effect, 'ask');
  const plan = new Policy(setup().log, { workspace: setup().workspace, mode: 'plan' });
  plan.grant('always', { tool: 'run_command', pattern: 'npm test' }, { session: 's1' });
  assert.equal(plan.decide(cmd('npm test'), tty).effect, 'deny', 'Plano nega, mesmo com concessão');
});

test('console: o cartão de comando mostra os quatro escopos (só a primeira execução fica em uma vez)', () => {
  const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  const line = PAGE.split('\n').find((l) => l.startsWith('const scopesFor')) ?? '';
  assert.ok(line.includes('Primeira execução'), 'primeira execução continua só uma vez');
  assert.ok(!line.includes('run_command'), 'comando não fica mais preso a uma vez');
});
