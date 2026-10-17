// Retomada do loop do agente depois de uma queda (SPEC 0001, escopos 10 e 12; critérios 4–6 e 26).
// A conversa é evento no log; ao retomar, efeitos desconhecidos são reconciliados antes de seguir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../src/db.ts';
import { EventLog } from '../src/log.ts';
import { Domain, DomainError } from '../src/domain.ts';
import { Policy } from '../src/policy.ts';
import { Budget } from '../src/budget.ts';
import { FsTools } from '../src/tools/fs.ts';
import { CommandTool, type Exec } from '../src/tools/command.ts';
import { Agent, type AgentOptions } from '../src/agent.ts';
import type { ChatMessage, ModelResponse, Provider, ModelRequest } from '../src/providers/types.ts';

const usage = { input_tokens: 10, cached_tokens: 0, cache_write_tokens: 0, output_tokens: 5 };
const say = (text: string): ModelResponse => ({ text, toolCalls: [], usage, finish: 'stop' });
const tool = (id: string, name: string, args: Record<string, unknown>): ModelResponse => ({ text: '', toolCalls: [{ id, name, arguments: JSON.stringify(args) }], usage, finish: 'tool_calls' });

function scripted(id: string, steps: (ModelResponse | 'hang')[]): Provider & { seen: ModelRequest[] } {
  const seen: ModelRequest[] = [];
  return {
    id,
    seen,
    call(req) {
      seen.push(structuredClone(req));
      const s = steps.shift();
      if (s === 'hang') return new Promise<ModelResponse>(() => {}); // o processo "morre" esperando
      if (!s) return Promise.reject(new Error('roteiro acabou'));
      return Promise.resolve(s);
    },
  };
}

// Um "processo": abre o banco e monta o agente. Reabrir o mesmo diretório simula o reinício do dono.
function boot(dir: string, provider: Provider, extra: Partial<AgentOptions> = {}) {
  const workspace = join(dir, 'ws');
  mkdirSync(workspace, { recursive: true });
  const log = new EventLog(openDatabase(join(dir, 'nucleo.db')));
  const domain = new Domain(log);
  const policy = new Policy(log, { workspace });
  const agent = new Agent({ log, domain, policy, budget: new Budget(log, { windows: [] }), fs: new FsTools(policy, { workspace }), cmd: new CommandTool(policy, { workspace }), routes: [{ provider, model: 'kimi-k3' }], interactive: false, ...extra });
  return { log, domain, policy, agent, workspace };
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

test('a conversa vira evento: a transcrição reconstruída é a mesma que foi ao modelo', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-ret-'));
  const p = scripted('opencode-go', [tool('c1', 'list_dir', { path: '.' }), say('fim')]);
  const { agent } = boot(dir, p);
  const r = await agent.run('s1', 'listar');
  const t = agent.transcript('s1', r.run);
  assert.deepEqual(t.slice(0, p.seen[1]!.messages.length), p.seen[1]!.messages);
  assert.deepEqual(t.at(-1), { role: 'assistant', content: 'fim' });
});

test('queda no meio da chamada ao modelo: resume reconcilia a chamada (sem efeito no workspace) e leva a tarefa ao fim, sem escrita duplicada', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-ret-'));
  const p1 = scripted('opencode-go', [tool('w1', 'write_file', { path: 'a.txt', content: 'um' }), 'hang']);
  const a = boot(dir, p1);
  a.policy.grant('project', { tool: 'write_file', pattern: '*.txt' }, { session: 's2' });
  void a.agent.run('s2', 'escrever');
  // Espera o passo 2 começar (a escrita do passo 1 já aconteceu).
  while (p1.seen.length < 2) await new Promise((r) => setImmediate(r));
  const run = (a.log.db.prepare("SELECT id FROM proj_runs WHERE session = 's2'").get() as { id: string }).id;

  // kill -9 e reinício: novo processo sobre o mesmo banco.
  const p2 = scripted('opencode-go', [say('fim')]);
  const b = boot(dir, p2);
  b.domain.recover();
  assert.equal(b.domain.getRun(run).state, 'interrupted');
  const r = await b.agent.resume('s2', run);
  assert.equal(r.outcome, 'done');
  assert.equal(r.text, 'fim');
  assert.equal(b.domain.getRun(run).state, 'done');
  assert.equal(readFileSync(join(b.workspace, 'a.txt'), 'utf8'), 'um');
  assert.equal(b.log.events('s2').filter((e) => e.kind === 'file.written').length, 1, 'escrita uma vez');
  const states = (b.log.db.prepare("SELECT state FROM proj_effects WHERE run = ? AND kind = 'model.call' ORDER BY rowid").all(run) as { state: string }[]).map((x) => x.state);
  assert.deepEqual(states, ['done', 'failed', 'done'], 'a chamada desconhecida foi reconciliada como não feita e refeita');
  // O modelo recebe, na retomada, a conversa inteira até a queda.
  assert.deepEqual(p2.seen[0]!.messages.map((m) => m.role), ['system', 'user', 'assistant', 'tool']);
});

// Monta à mão o estado de uma queda entre a escrita e o recibo.
function crashMidWrite(dir: string, { written }: { written: boolean }) {
  const a = boot(dir, scripted('opencode-go', []));
  a.policy.grant('project', { tool: 'write_file', pattern: '*.txt' }, { session: 's3' });
  const run = a.domain.startRun('s3', 'escrever').id;
  const msgs: ChatMessage[] = [
    { role: 'system', content: 'sistema' },
    { role: 'user', content: 'escrever' },
    { role: 'assistant', content: '', toolCalls: [{ id: 'w1', name: 'write_file', arguments: JSON.stringify({ path: 'b.txt', content: 'dois' }) }] },
  ];
  for (const m of msgs) a.log.append('s3', 'agent.message', { run, message: m });
  const eff = a.domain.beginEffect('s3', run, 'file.write', `${run}:w1`, 'b.txt').id;
  if (written) writeFileSync(join(a.workspace, 'b.txt'), 'dois');
  return { run, eff };
}

test('queda entre a escrita e o recibo: com o arquivo já igual ao pedido, resume reconcilia como feito e não escreve de novo (critério 5)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-ret-'));
  const { run, eff } = crashMidWrite(dir, { written: true });
  const p = scripted('opencode-go', [say('fim')]);
  const b = boot(dir, p);
  b.domain.recover();
  assert.equal(b.domain.getEffect(eff).state, 'unknown');
  const r = await b.agent.resume('s3', run);
  assert.equal(r.outcome, 'done');
  assert.equal(b.domain.getEffect(eff).state, 'done');
  assert.equal(b.log.events('s3').filter((e) => e.kind === 'file.written').length, 0, 'não escreveu de novo');
  const toolMsg = p.seen[0]!.messages.find((m) => m.role === 'tool' && m.toolCallId === 'w1');
  assert.match(toolMsg?.content ?? '', /"ok":true/);
  assert.equal(sha(readFileSync(join(b.workspace, 'b.txt'), 'utf8')), sha('dois'));
});

test('queda antes da escrita: resume reconcilia como não feito e escreve uma vez', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-ret-'));
  const { run, eff } = crashMidWrite(dir, { written: false });
  const b = boot(dir, scripted('opencode-go', [say('fim')]));
  b.domain.recover();
  const r = await b.agent.resume('s3', run);
  assert.equal(r.outcome, 'done');
  assert.equal(b.domain.getEffect(eff).state, 'failed');
  assert.equal(readFileSync(join(b.workspace, 'b.txt'), 'utf8'), 'dois');
  assert.equal(b.log.events('s3').filter((e) => e.kind === 'file.written').length, 1);
});

test('comando desconhecido: sem humano a retomada para pedindo reconciliação; com humano, aprovar roda de novo uma vez', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-ret-'));
  const a = boot(dir, scripted('opencode-go', []));
  const run = a.domain.startRun('s4', 'testar').id;
  for (const m of [
    { role: 'system', content: 'sistema' },
    { role: 'user', content: 'testar' },
    { role: 'assistant', content: '', toolCalls: [{ id: 'k1', name: 'run_command', arguments: JSON.stringify({ command: 'npm test' }) }] },
  ] as ChatMessage[]) a.log.append('s4', 'agent.message', { run, message: m });
  const eff = a.domain.beginEffect('s4', run, 'command', `${run}:k1`, 'npm test').id;

  const b = boot(dir, scripted('opencode-go', [say('não deveria')]));
  b.domain.recover();
  const stopped = await b.agent.resume('s4', run);
  assert.equal(stopped.outcome, 'stopped');
  assert.equal(stopped.reason, 'needsReconciliation');
  assert.equal(b.domain.getEffect(eff).state, 'unknown');

  let ran = 0;
  const exec: Exec = () => { ran++; return { code: 0, stdout: 'ok', stderr: '' }; };
  const asked: string[] = [];
  const c = boot(dir, scripted('opencode-go', [say('fim')]), { interactive: true, awaitApproval: async (ap) => { asked.push(ap.action); return 'approve'; } });
  // O CommandTool do boot usa o exec padrão; aqui o comando é falso.
  const cc = new CommandTool(c.policy, { workspace: c.workspace, exec });
  const agent = new Agent({ log: c.log, domain: c.domain, policy: c.policy, budget: new Budget(c.log, { windows: [] }), fs: new FsTools(c.policy, { workspace: c.workspace }), cmd: cc, routes: [{ provider: scripted('opencode-go', [say('fim')]), model: 'kimi-k3' }], interactive: true, awaitApproval: async (ap) => { asked.push(ap.action); return 'approve'; } });
  const r = await agent.resume('s4', run);
  assert.equal(r.outcome, 'done');
  assert.deepEqual(asked, ['reconcile run_command npm test', 'run_command npm test']);
  assert.equal(ran, 1);
  assert.equal(c.domain.getEffect(eff).state, 'failed');
});

test('só se retoma execução interrompida ou parada', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-ret-'));
  const { agent, domain } = boot(dir, scripted('opencode-go', [say('fim')]));
  const r = await agent.run('s5', 'tarefa');
  assert.equal(domain.getRun(r.run).state, 'done');
  await assert.rejects(agent.resume('s5', r.run), (e: unknown) => e instanceof DomainError);
  assert.equal(existsSync(join(dir, 'ws')), true);
});

test('queda com aprovação pendente: a retomada reaproveita a mesma aprovação, sem duplicar (achado no ensaio da console)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-ret-'));
  const a = boot(dir, scripted('opencode-go', []));
  const run = a.domain.startRun('s6', 'escrever').id;
  for (const m of [
    { role: 'system', content: 'sistema' },
    { role: 'user', content: 'escrever' },
    { role: 'assistant', content: '', toolCalls: [{ id: 'w9', name: 'write_file', arguments: JSON.stringify({ path: 'r.md', content: 'resumo' }) }] },
  ] as ChatMessage[]) a.log.append('s6', 'agent.message', { run, message: m });
  a.domain.beginEffect('s6', run, 'file.write', `${run}:w9`, 'r.md');
  const pend = a.domain.requestApproval('s6', 'write_file r.md');

  let asked = 0;
  const b = boot(dir, scripted('opencode-go', [say('fim')]), { interactive: true, awaitApproval: async () => { asked++; return 'approve'; } });
  b.domain.recover();
  const r = await b.agent.resume('s6', run);
  assert.equal(r.outcome, 'done');
  assert.equal(b.domain.pendingApprovals().length, 0, 'nada pendurado');
  assert.equal(b.domain.getApproval(pend.id).state, 'approved', 'a aprovação antiga foi a usada');
  assert.equal(b.log.events('s6').filter((e) => e.kind === 'approval.requested').length, 1, 'nenhuma aprovação nova');
  assert.equal(readFileSync(join(b.workspace, 'r.md'), 'utf8'), 'resumo');
  assert.equal(asked, 1);
});

test('a reexecução na retomada não conta de novo para o detector de laço', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-ret-'));
  const { run } = crashMidWrite(dir, { written: false });
  const b = boot(dir, scripted('opencode-go', [say('fim')]));
  b.domain.recover();
  await b.agent.resume('s3', run);
  assert.equal(b.log.events('s3').filter((e) => e.kind === 'tool.called').length, 0, 'a chamada é a mesma de antes da queda');
});
