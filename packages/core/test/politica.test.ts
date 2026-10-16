import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../src/db.ts';
import { EventLog } from '../src/log.ts';
import { Policy, PROTECTED, TRAINING_MODELS } from '../src/policy.ts';
import { FsTools } from '../src/tools/fs.ts';
import { CommandTool } from '../src/tools/command.ts';

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-pol-'));
  const workspace = join(dir, 'ws');
  mkdirSync(join(workspace, 'src'), { recursive: true });
  writeFileSync(join(workspace, 'src', 'a.ts'), 'original');
  const dbPath = join(dir, 'nucleo.db');
  const log = new EventLog(openDatabase(dbPath));
  return { workspace, dbPath, log, policy: new Policy(log, { workspace }) };
}
const read = (target: string, session = 's1') => ({ session, tool: 'read_file' as const, target });
const write = (target: string, session = 's1') => ({ session, tool: 'write_file' as const, target });
const tty = { interactive: true };
const noTty = { interactive: false };

test('padrões do M0: leitura no workspace é allow; escrita e arquivo são ask; fora do workspace é deny', () => {
  const { policy } = setup();
  assert.equal(policy.decide(read('src/a.ts'), tty).effect, 'allow');
  assert.equal(policy.decide({ session: 's1', tool: 'list_dir', target: 'src' }, tty).effect, 'allow');
  assert.equal(policy.decide(write('src/a.ts'), tty).effect, 'ask');
  assert.equal(policy.decide({ session: 's1', tool: 'archive', target: 'src/a.ts' }, tty).effect, 'ask');
  const out = policy.decide(read('../fora.txt'), tty);
  assert.equal(out.effect, 'deny');
  assert.match(out.reason, /workspace/);
});

test('critério 7: caminhos protegidos negados para ler, escrever, listar e arquivar, mesmo com concessão de projeto', () => {
  const { policy } = setup();
  for (const tool of ['read_file', 'write_file', 'list_dir', 'archive'] as const) policy.grant('project', { tool, pattern: '**' }, { session: 's1' });
  const targets = ['.git/config', '.buddy-dev/STATUS.md', 'archive/x.md', '.env', '.env.local', 'certs/x.pem', 'id.key', 'sub/.git/HEAD'];
  assert.ok(PROTECTED.length >= 6);
  for (const tool of ['read_file', 'write_file', 'list_dir', 'archive'] as const) {
    for (const target of targets) {
      const d = policy.decide({ session: 's1', tool, target }, tty);
      assert.equal(d.effect, 'deny', `${tool} ${target}`);
      assert.match(d.reason, /protegido/);
    }
  }
});

test('critério 8: regra deny e regra allow para a mesma ação → deny', () => {
  const { policy } = setup();
  policy.addRule({ effect: 'allow', tool: 'write_file', pattern: 'src/**' });
  policy.addRule({ effect: 'deny', tool: 'write_file', pattern: 'src/a.ts' });
  assert.equal(policy.decide(write('src/a.ts'), tty).effect, 'deny');
  assert.equal(policy.decide(write('src/b.ts'), tty).effect, 'allow');
});

test('critério 9: ask sem terminal interativo vira deny, e o evento registra o motivo', () => {
  const { policy, log } = setup();
  const d = policy.decide(write('src/a.ts'), noTty);
  assert.equal(d.effect, 'deny');
  assert.equal(d.reason, 'nonInteractive');
  const ev = log.events('s1').filter((e) => e.kind === 'policy.decision').at(-1);
  assert.deepEqual((ev?.payload as { effect: string; reason: string }).reason, 'nonInteractive');
});

test('critério 10: concessão de uma vez é consumida; de sessão não vale em outra; de projeto persiste e é auditada', () => {
  const { policy, log, dbPath, workspace } = setup();
  policy.grant('once', { tool: 'write_file', pattern: 'src/a.ts' }, { session: 's1' });
  assert.equal(policy.decide(write('src/a.ts'), tty).effect, 'allow');
  assert.equal(policy.decide(write('src/a.ts'), tty).effect, 'ask', 'once é consumida');

  policy.grant('session', { tool: 'write_file', pattern: 'src/**' }, { session: 's1' });
  assert.equal(policy.decide(write('src/a.ts', 's1'), tty).effect, 'allow');
  assert.equal(policy.decide(write('src/a.ts', 's2'), tty).effect, 'ask');

  policy.grant('project', { tool: 'archive', pattern: 'src/**' }, { session: 's1' });
  log.db.close();
  const again = new Policy(new EventLog(openDatabase(dbPath)), { workspace });
  assert.equal(again.decide({ session: 's9', tool: 'archive', target: 'src/a.ts' }, tty).effect, 'allow', 'projeto vale depois de reiniciar e em outra sessão');
  const audit = again.log.events('s1').filter((e) => e.kind === 'policy.grant.created');
  assert.ok(audit.some((e) => (e.payload as { scope: string }).scope === 'project'));
});

test('critério 11: três chamadas idênticas seguidas pausam a sessão', () => {
  const { policy } = setup();
  const call = { tool: 'read_file', target: 'src/a.ts' };
  assert.equal(policy.observeCall('s1', call).paused, false);
  assert.equal(policy.observeCall('s1', call).paused, false);
  const third = policy.observeCall('s1', call);
  assert.equal(third.paused, true);
  const d = policy.decide(read('src/a.ts'), tty);
  assert.equal(d.effect, 'deny');
  assert.equal(d.reason, 'sessionPaused');
  assert.equal(policy.decide(read('src/a.ts', 's2'), tty).effect, 'allow', 'pausa é da sessão');
  policy.resume('s1');
  assert.equal(policy.decide(read('src/a.ts'), tty).effect, 'allow');
});

test('critério 11 (controle): chamadas diferentes intercaladas não pausam', () => {
  const { policy } = setup();
  for (let i = 0; i < 6; i++) assert.equal(policy.observeCall('s1', { tool: 'read_file', target: `src/${i % 2}.ts` }).paused, false);
});

test('critério 12: escrita com compare-and-set; humano alterou depois da leitura → conflito', () => {
  const { policy, workspace } = setup();
  const fs = new FsTools(policy, { workspace });
  policy.grant('session', { tool: 'write_file', pattern: 'src/**' }, { session: 's1' });
  assert.equal(fs.readFile('s1', 'src/a.ts', tty).content, 'original');
  writeFileSync(join(workspace, 'src', 'a.ts'), 'humano mexeu');
  const w = fs.writeFile('s1', 'src/a.ts', 'agente', tty);
  assert.equal(w.ok, false);
  assert.equal(w.ok === false && w.reason, 'file.changedSinceRead');
  assert.equal(readFileSync(join(workspace, 'src', 'a.ts'), 'utf8'), 'humano mexeu');
  assert.equal(fs.readFile('s1', 'src/a.ts', tty).content, 'humano mexeu');
  assert.equal(fs.writeFile('s1', 'src/a.ts', 'agente', tty).ok, true);
  assert.equal(readFileSync(join(workspace, 'src', 'a.ts'), 'utf8'), 'agente');
});

test('critério 12 (complemento): escrever arquivo existente sem ter lido também é conflito', () => {
  const { policy, workspace } = setup();
  const fs = new FsTools(policy, { workspace });
  policy.grant('session', { tool: 'write_file', pattern: 'src/**' }, { session: 's1' });
  const w = fs.writeFile('s1', 'src/a.ts', 'às cegas', tty);
  assert.equal(w.ok === false && w.reason, 'file.notReadBeforeWrite');
  assert.equal(fs.writeFile('s1', 'src/novo.ts', 'arquivo novo', tty).ok, true, 'arquivo novo não precisa de leitura');
});

test('critério 13: run_command nunca executa sem aprovação explícita, nem com concessões de sessão ou projeto', () => {
  const { policy, workspace } = setup();
  const spawned: string[] = [];
  const cmd = new CommandTool(policy, { workspace, exec: (c) => { spawned.push(c); return { code: 0, stdout: '', stderr: '' }; } });
  policy.grant('session', { tool: 'run_command', pattern: '**' }, { session: 's1' });
  policy.grant('project', { tool: 'run_command', pattern: '**' }, { session: 's1' });
  policy.addRule({ effect: 'allow', tool: 'run_command', pattern: '**' });
  assert.equal(cmd.run('s1', 'npm test', noTty).ok, false);
  assert.equal(policy.decide({ session: 's1', tool: 'run_command', target: 'npm test' }, tty).effect, 'ask');
  assert.deepEqual(spawned, [], 'nenhum processo sem aprovação explícita');
  policy.grant('once', { tool: 'run_command', pattern: 'npm test' }, { session: 's1' });
  assert.equal(cmd.run('s1', 'npm test', noTty).ok, true, 'aprovação explícita de uma vez libera aquela execução');
  assert.deepEqual(spawned, ['npm test']);
  assert.equal(cmd.run('s1', 'npm test', noTty).ok, false, 'e só uma vez');
});

test('critério 20: modelos que treinam com os dados negados por padrão; só concessão de projeto libera, auditada', () => {
  const { policy, log } = setup();
  assert.ok(TRAINING_MODELS.includes('gemini-4-argon-contributor'));
  const use = (target: string) => ({ session: 's1', tool: 'model.use' as const, target });
  assert.equal(policy.decide(use('gpt-6-luna'), noTty).effect, 'allow');
  const d = policy.decide(use('gemini-4-argon-contributor'), noTty);
  assert.equal(d.effect, 'deny');
  assert.match(d.reason, /treina/);
  policy.grant('session', { tool: 'model.use', pattern: 'gemini-4-argon-contributor' }, { session: 's1' });
  assert.equal(policy.decide(use('gemini-4-argon-contributor'), noTty).effect, 'deny', 'sessão não basta');
  policy.grant('project', { tool: 'model.use', pattern: 'gemini-4-argon-contributor' }, { session: 's1' });
  assert.equal(policy.decide(use('gemini-4-argon-contributor'), noTty).effect, 'allow');
  assert.ok(log.events('s1').some((e) => e.kind === 'policy.grant.created' && (e.payload as { pattern: string }).pattern === 'gemini-4-argon-contributor'));
});
