// Loop do agente (SPEC 0001, escopos 6, 10 e 11; critérios 5, 16, 20 e 21), com provedores roteirizados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../src/db.ts';
import { EventLog } from '../src/log.ts';
import { Domain } from '../src/domain.ts';
import { Policy } from '../src/policy.ts';
import { Budget, type WindowDef } from '../src/budget.ts';
import { FsTools } from '../src/tools/fs.ts';
import { CommandTool, type Exec } from '../src/tools/command.ts';
import { Agent, AGENT_TOOLS, compact, estimateTokens, CONTEXT_LIMIT, type Route } from '../src/agent.ts';
import { ProviderLimitError, ProviderRejectedError, ProviderUnknownError, type ChatMessage, type ModelRequest, type ModelResponse, type Provider } from '../src/providers/types.ts';

const usage = { input_tokens: 100, cached_tokens: 0, cache_write_tokens: 0, output_tokens: 10 };
const say = (text: string): ModelResponse => ({ text, toolCalls: [], usage, finish: 'stop' });
const tool = (id: string, name: string, args: Record<string, unknown>): ModelResponse => ({ text: '', toolCalls: [{ id, name, arguments: JSON.stringify(args) }], usage, finish: 'tool_calls' });

// Provedor roteirizado: cada chamada consome um passo (resposta ou erro) e guarda a requisição.
function scripted(id: string, steps: (ModelResponse | Error)[]): Provider & { seen: ModelRequest[] } {
  const seen: ModelRequest[] = [];
  return {
    id,
    seen,
    async call(req) {
      seen.push(structuredClone(req));
      const s = steps.shift();
      if (!s) throw new Error(`${id}: roteiro acabou`);
      if (s instanceof Error) throw s;
      return s;
    },
  };
}

function setup({ routes, windows = [], interactive = false, exec, awaitApproval }: { routes: Route[]; windows?: WindowDef[]; interactive?: boolean; exec?: Exec; awaitApproval?: ConstructorParameters<typeof Agent>[0]['awaitApproval'] }) {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-agente-'));
  const workspace = join(dir, 'ws');
  const log = new EventLog(openDatabase(join(dir, 'nucleo.db')));
  const domain = new Domain(log);
  const policy = new Policy(log, { workspace });
  const budget = new Budget(log, { windows });
  const fs = new FsTools(policy, { workspace });
  const cmd = new CommandTool(policy, { workspace, ...(exec ? { exec } : {}) });
  writeFileSync(join(dir, '.keep'), '');
  const agent = new Agent({ log, domain, policy, budget, fs, cmd, routes, interactive, ...(awaitApproval ? { awaitApproval } : {}) });
  return { dir, workspace, log, domain, policy, budget, agent };
}

const kinds = (log: EventLog, session: string): string[] => log.events(session).map((e) => e.kind);

test('loop: lê, escreve com concessão e termina; cada chamada de modelo e cada escrita é efeito com identidade e recibo', async () => {
  const p = scripted('opencode-go', [
    tool('c1', 'list_dir', { path: '.' }),
    tool('c2', 'write_file', { path: 'nota.txt', content: 'olá' }),
    say('pronto'),
  ]);
  const { log, domain, policy, agent, workspace } = setup({ routes: [{ provider: p, model: 'kimi-k3' }] });
  await import('node:fs').then((f) => f.mkdirSync(workspace, { recursive: true }));
  policy.grant('project', { tool: 'write_file', pattern: '*.txt' }, { session: 's1' });
  const r = await agent.run('s1', 'escreva uma nota');
  assert.equal(r.outcome, 'done');
  assert.equal(r.text, 'pronto');
  assert.equal(r.steps, 3);
  assert.equal(readFileSync(join(workspace, 'nota.txt'), 'utf8'), 'olá');
  assert.equal(domain.getRun(r.run).state, 'done');

  const effects = log.db.prepare('SELECT kind, state FROM proj_effects WHERE run = ?').all(r.run) as { kind: string; state: string }[];
  assert.deepEqual(effects.filter((e) => e.kind === 'model.call').map((e) => e.state), ['done', 'done', 'done']);
  assert.deepEqual(effects.filter((e) => e.kind === 'file.write').map((e) => e.state), ['done']);
  // Reserva e liquidação por chamada.
  const k = kinds(log, 's1');
  assert.equal(k.filter((x) => x === 'budget.reserved').length, 3);
  assert.equal(k.filter((x) => x === 'budget.settled').length, 3);
  // As ferramentas do agente vão em toda chamada; o resultado da ferramenta volta ligado ao id.
  assert.deepEqual(p.seen[0]?.tools?.map((t) => t.name), AGENT_TOOLS.map((t) => t.name));
  const toolMsg = p.seen[1]?.messages.find((m) => m.role === 'tool');
  assert.equal(toolMsg?.toolCallId, 'c1');
});

test('janela esgotada por erro de limite troca para o próximo provedor da ordem e registra a troca (critério 16)', async () => {
  const go = scripted('opencode-go', [new ProviderLimitError('opencode-go', Date.now() + 3_600_000, '429')]);
  const chatgpt = scripted('chatgpt', [say('feito pelo ChatGPT')]);
  const { log, budget, agent } = setup({ routes: [{ provider: go, model: 'kimi-k3' }, { provider: chatgpt, model: 'gpt-6.1-sol' }] });
  const r = await agent.run('s2', 'tarefa');
  assert.equal(r.outcome, 'done');
  assert.equal(r.text, 'feito pelo ChatGPT');
  const ev = log.events('s2');
  const sw = ev.find((e) => e.kind === 'provider.switched');
  assert.deepEqual(sw?.payload, { from: 'opencode-go/kimi-k3', to: 'chatgpt/gpt-6.1-sol', reason: 'windowExhausted' });
  // O esgotamento mora na sessão do orçamento (M0.5), com o provedor e o modelo.
  assert.ok(log.events('budget').some((e) => e.kind === 'budget.exhausted' && (e.payload as { provider: string; model: string }).provider === 'opencode-go' && (e.payload as { model: string }).model === 'kimi-k3'));
  assert.equal(ev.filter((e) => e.kind === 'budget.released').length, 1, 'reserva do Go devolvida');
  // A janela continua esgotada: a próxima tarefa nem tenta o Go.
  const r2 = await setupReuse(budget, log, [{ provider: go, model: 'kimi-k3' }, { provider: scripted('chatgpt', [say('de novo')]), model: 'gpt-6.1-sol' }]).run('s3', 'outra');
  assert.equal(r2.text, 'de novo');
  assert.equal(go.seen.length, 1, 'Go esgotado não é chamado de novo');
});

function setupReuse(budget: Budget, log: EventLog, routes: Route[]): Agent {
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-agente-ws-'));
  const policy = new Policy(log, { workspace });
  return new Agent({ log, domain: new Domain(log), policy, budget, fs: new FsTools(policy, { workspace }), cmd: new CommandTool(policy, { workspace }), routes, interactive: false });
}

test('janela própria sem saldo também troca; sem provedor disponível a execução para com budget.windowExhausted (critério 16)', async () => {
  const windows: WindowDef[] = [
    { id: 'go/gpt-6-luna/5h', provider: 'opencode-go', model: 'gpt-6-luna', capacity: 0, periodHours: 5 },
    { id: 'openrouter/mes', provider: 'openrouter', model: null, capacity: 0, periodHours: 720 },
  ];
  const go = scripted('opencode-go', [say('não deveria')]);
  const or = scripted('openrouter', [say('não deveria')]);
  const { log, domain, agent } = setup({ routes: [{ provider: go, model: 'gpt-6-luna' }, { provider: or, model: 'openai/gpt-6-luna' }], windows });
  // Go com preço conhecido e OpenRouter sem preço na tabela (vale o preço conservador): estimativa positiva,
  // e a janela de capacidade 0 recusa antes de qualquer consumo.
  const r = await agent.run('s4', 'tarefa');
  assert.equal(r.outcome, 'stopped');
  assert.equal(r.reason, 'budget.windowExhausted');
  assert.equal(go.seen.length + or.seen.length, 0, 'nenhuma chamada sai sem saldo');
  assert.equal(domain.getRun(r.run).state, 'stopped');
  assert.ok(log.events('s4').some((e) => e.kind === 'run.stopped'));
});

test('modelo que treina com os dados é pulado sem concessão de projeto (critério 20); recusa do provedor pula para o próximo', async () => {
  const gem = scripted('opencode-go', [say('não deveria')]);
  const rej = scripted('chatgpt', [new ProviderRejectedError('chatgpt', 'subscription_sharing_user_not_eligible', 'não elegível')]);
  const ok = scripted('openrouter', [say('ok')]);
  const { log, agent } = setup({ routes: [{ provider: gem, model: 'gemini-4-argon-contributor' }, { provider: rej, model: 'gpt-6.1-sol' }, { provider: ok, model: 'openai/gpt-6-luna' }] });
  const r = await agent.run('s5', 'tarefa');
  assert.equal(r.text, 'ok');
  assert.equal(gem.seen.length, 0);
  const sw = log.events('s5').filter((e) => e.kind === 'provider.switched').map((e) => (e.payload as { reason: string }).reason);
  assert.deepEqual(sw, ['policy', 'rejected']);
});

test('stream interrompido deixa a chamada desconhecida e para a execução; a nova tentativa espera reconciliação (critério 6 no loop)', async () => {
  const p = scripted('chatgpt', [new ProviderUnknownError('cortado')]);
  const { log, domain, agent } = setup({ routes: [{ provider: p, model: 'gpt-6.1-sol' }] });
  const r = await agent.run('s6', 'tarefa');
  assert.equal(r.outcome, 'stopped');
  assert.equal(r.reason, 'effect.unknown');
  const eff = log.db.prepare("SELECT state FROM proj_effects WHERE run = ? AND kind = 'model.call'").get(r.run) as { state: string };
  assert.equal(eff.state, 'unknown');
  assert.equal(domain.getRun(r.run).state, 'stopped');
  // Consumo incerto: liquidado pela estimativa, nunca devolvido.
  assert.equal(log.events('s6').filter((e) => e.kind === 'budget.released').length, 0);
});

test('a escrita acontece uma vez: o mesmo pedido de escrita (mesma identidade) não escreve de novo; desconhecido bloqueia até reconciliar (critério 5)', async () => {
  const { log, domain, policy, agent, workspace } = setup({ routes: [] });
  await import('node:fs').then((f) => f.mkdirSync(workspace, { recursive: true }));
  policy.grant('project', { tool: 'write_file', pattern: '*.txt' }, { session: 's7' });
  const run = domain.startRun('s7', 'escrever').id;
  const call = { id: 'w1', name: 'write_file', arguments: JSON.stringify({ path: 'a.txt', content: 'um' }) };
  const first = JSON.parse(await agent.executeTool('s7', run, call)) as { ok: boolean };
  assert.equal(first.ok, true);
  writeFileSync(join(workspace, 'a.txt'), 'mexido por humano');
  const again = JSON.parse(await agent.executeTool('s7', run, call)) as { ok: boolean; replayed?: boolean };
  assert.equal(again.ok, true);
  assert.equal(again.replayed, true);
  assert.equal(readFileSync(join(workspace, 'a.txt'), 'utf8'), 'mexido por humano', 'não escreveu de novo');
  assert.equal(kinds(log, 's7').filter((k) => k === 'file.written').length, 1);

  // Queda no meio de outra escrita: o efeito fica desconhecido e bloqueia a repetição.
  const call2 = { id: 'w2', name: 'write_file', arguments: JSON.stringify({ path: 'b.txt', content: 'dois' }) };
  const eff = domain.beginEffect('s7', run, 'file.write', `${run}:w2`, 'b.txt');
  domain.recover();
  assert.equal(domain.getEffect(eff.id).state, 'unknown');
  const blocked = JSON.parse(await agent.executeTool('s7', run, call2)) as { ok: boolean; reason?: string };
  assert.deepEqual(blocked, { ok: false, reason: 'needsReconciliation', effect: eff.id });
  domain.reconcileEffect(eff.id, 'not-done');
  const after = JSON.parse(await agent.executeTool('s7', run, call2)) as { ok: boolean };
  assert.equal(after.ok, true);
  assert.equal(readFileSync(join(workspace, 'b.txt'), 'utf8'), 'dois');
});

test('aprovação humana: write_file pede, o humano aprova uma vez e a escrita acontece; negar devolve a recusa ao modelo', async () => {
  const decisions: ('approve' | 'deny')[] = ['approve', 'deny'];
  const asked: string[] = [];
  const p = scripted('opencode-go', [
    tool('c1', 'write_file', { path: 'x.txt', content: '1' }),
    tool('c2', 'write_file', { path: 'y.txt', content: '2' }),
    say('fim'),
  ]);
  const { workspace, agent, log } = setup({
    routes: [{ provider: p, model: 'kimi-k3' }],
    interactive: true,
    awaitApproval: async (a) => { asked.push(a.action); return decisions.shift() ?? 'deny'; },
  });
  await import('node:fs').then((f) => f.mkdirSync(workspace, { recursive: true }));
  const r = await agent.run('s8', 'duas escritas');
  assert.equal(r.outcome, 'done');
  assert.deepEqual(asked, ['write_file x.txt', 'write_file y.txt']);
  assert.equal(readFileSync(join(workspace, 'x.txt'), 'utf8'), '1');
  assert.throws(() => readFileSync(join(workspace, 'y.txt'), 'utf8'));
  const denied = p.seen[2]?.messages.find((m) => m.role === 'tool' && m.toolCallId === 'c2');
  assert.match(denied?.content ?? '', /"reason":"deniedByHuman"/);
  assert.equal(kinds(log, 's8').filter((k) => k === 'approval.resolved').length, 2);
});

test('run_command: efeito com identidade, só com aprovação de uma vez; sem terminal é negado', async () => {
  let ran = 0;
  const exec: Exec = () => { ran++; return { code: 0, stdout: 'ok', stderr: '' }; };
  const p = scripted('opencode-go', [tool('c1', 'run_command', { command: 'npm test' }), say('fim')]);
  const { agent, log } = setup({ routes: [{ provider: p, model: 'kimi-k3' }], interactive: true, exec, awaitApproval: async () => 'approve' });
  const r = await agent.run('s9', 'testar');
  assert.equal(r.outcome, 'done');
  assert.equal(ran, 1);
  const eff = (log.db.prepare("SELECT state, key FROM proj_effects WHERE run = ? AND kind = 'command'").all(r.run) as { state: string; key: string }[]).map((e) => ({ ...e }));
  assert.deepEqual(eff, [{ state: 'done', key: `${r.run}:c1` }]);

  const p2 = scripted('opencode-go', [tool('c1', 'run_command', { command: 'npm test' }), say('fim')]);
  let ran2 = 0;
  const s2 = setup({ routes: [{ provider: p2, model: 'kimi-k3' }], interactive: false, exec: () => { ran2++; return { code: 0, stdout: '', stderr: '' }; } });
  await s2.agent.run('s10', 'testar');
  assert.equal(ran2, 0);
  assert.match(p2.seen[1]?.messages.find((m) => m.role === 'tool')?.content ?? '', /nonInteractive/);
});

test('compactação: nenhuma chamada sai acima de 100k tokens estimados; pares chamada/resultado preservados; vira evento (critério 21)', async () => {
  assert.equal(CONTEXT_LIMIT, 100_000);
  const big = 'x'.repeat(60_000 * 4); // ~60k tokens por resultado
  const msgs: ChatMessage[] = [
    { role: 'system', content: 'sistema' },
    { role: 'user', content: 'tarefa original' },
  ];
  for (let i = 0; i < 4; i++) {
    msgs.push({ role: 'assistant', content: '', toolCalls: [{ id: `t${i}`, name: 'read_file', arguments: '{}' }] });
    msgs.push({ role: 'tool', content: big, toolCallId: `t${i}` });
  }
  assert.ok(estimateTokens(msgs) > CONTEXT_LIMIT);
  const c = compact(msgs, CONTEXT_LIMIT);
  assert.ok(estimateTokens(c.messages) <= CONTEXT_LIMIT, `depois: ${estimateTokens(c.messages)}`);
  assert.equal(c.messages[0]?.content, 'sistema');
  assert.equal(c.messages[1]?.content, 'tarefa original');
  assert.ok(c.dropped > 0);
  const ids = new Set(c.messages.flatMap((m) => m.toolCalls?.map((t) => t.id) ?? []));
  for (const m of c.messages) if (m.role === 'tool') assert.ok(ids.has(m.toolCallId ?? ''), 'resultado sem a chamada');

  // No loop: o histórico cresce além do limite e a chamada seguinte sai compactada, com evento.
  const huge = 'y'.repeat(70_000 * 4);
  const p = scripted('opencode-go', [tool('a', 'read_file', { path: 'g.txt' }), tool('b', 'read_file', { path: 'g.txt' }), say('fim')]);
  const { agent, log, workspace } = setup({ routes: [{ provider: p, model: 'kimi-k3' }] });
  await import('node:fs').then((f) => { f.mkdirSync(workspace, { recursive: true }); f.writeFileSync(join(workspace, 'g.txt'), huge); });
  const r = await agent.run('s11', 'ler grande');
  assert.equal(r.outcome, 'done');
  for (const req of p.seen) assert.ok(estimateTokens(req.messages) <= CONTEXT_LIMIT, `chamada com ${estimateTokens(req.messages)} tokens`);
  const ev = log.events('s11').find((e) => e.kind === 'context.compacted');
  assert.ok(ev, 'compactação vira evento');
  const pl = ev.payload as { before: number; after: number; dropped: number };
  assert.ok(pl.before > CONTEXT_LIMIT && pl.after <= CONTEXT_LIMIT && pl.dropped > 0);
});

test('compactação: um resultado sozinho acima do limite é truncado até caber, sem perder a tarefa', () => {
  const msgs: ChatMessage[] = [
    { role: 'system', content: 'sistema' },
    { role: 'user', content: 'tarefa' },
    { role: 'assistant', content: '', toolCalls: [{ id: 't', name: 'read_file', arguments: '{}' }] },
    { role: 'tool', content: 'z'.repeat(150_000 * 4), toolCallId: 't' },
  ];
  const c = compact(msgs, CONTEXT_LIMIT);
  assert.ok(estimateTokens(c.messages) <= CONTEXT_LIMIT);
  assert.equal(c.messages[1]?.content, 'tarefa');
  assert.match(c.messages.at(-1)?.content ?? '', /\[truncado\]$/);
  assert.equal(c.messages.at(-1)?.toolCallId, 't');
});

test('recusa do provedor fica no log com rota, código e motivo, e a tarefa segue no próximo; sem custo da chamada recusada', async () => {
  const go = scripted('opencode-go', [new ProviderRejectedError('opencode-go', 'http_403', 'An active OpenCode Go subscription is required to use Go models.')]);
  const or = scripted('openrouter', [say('feito pelo OpenRouter')]);
  const { log, agent } = setup({ routes: [{ provider: go, model: 'kimi-k3' }, { provider: or, model: 'nvidia/nemotron-3.5-super-vl:free' }] });
  const r = await agent.run('s20', 'tarefa');
  assert.equal(r.text, 'feito pelo OpenRouter');
  const err = log.events('s20').find((e) => e.kind === 'provider.error');
  assert.deepEqual(err?.payload, { route: 'opencode-go/kimi-k3', code: 'http_403', message: 'An active OpenCode Go subscription is required to use Go models.' });
  const settled = log.events('s20').filter((e) => e.kind === 'budget.settled');
  assert.equal(settled.length, 1, 'só a chamada que respondeu é liquidada');
});

test('modelo :free do OpenRouter não consome o teto da API paga; provedor recusado é pulado sem repetir a troca a cada passo', async () => {
  const go = scripted('opencode-go', [new ProviderRejectedError('opencode-go', 'http_403', 'sem assinatura')]);
  const or = scripted('openrouter', [tool('c1', 'list_dir', { path: '.' }), say('fim')]);
  const { log, agent, workspace } = setup({ routes: [{ provider: go, model: 'kimi-k3' }, { provider: or, model: 'nvidia/nemotron-3.5-super-vl:free' }] });
  await import('node:fs').then((f) => f.mkdirSync(workspace, { recursive: true }));
  const r = await agent.run('s21', 'tarefa');
  assert.equal(r.outcome, 'done');
  const ev = log.events('s21');
  assert.equal(ev.filter((e) => e.kind === 'provider.switched').length, 1, 'a troca aparece uma vez');
  // A reserva do Go (modelo com preço) é devolvida na recusa; as do modelo gratuito e toda liquidação valem 0.
  const orRes = ev.filter((x) => x.kind === 'budget.reserved' && (x.payload as { provider: string }).provider === 'openrouter');
  assert.equal(orRes.length, 2);
  for (const e of orRes) assert.equal((e.payload as { estimate: number }).estimate, 0);
  const settled = ev.filter((x) => x.kind === 'budget.settled');
  assert.equal(settled.length, 2);
  for (const e of settled) assert.equal((e.payload as { actual: number }).actual, 0);
  assert.equal(ev.filter((x) => x.kind === 'budget.released').length, 1, 'a reserva do Go volta');
  assert.equal(go.seen.length, 1);
});

test('esforço da execução chega ao provedor; recusado, a chamada se repete uma vez sem ele, com evento (critério 29)', async () => {
  const p = scripted('openrouter', [new ProviderRejectedError('openrouter', 'http_400', 'reasoning not supported'), say('ok sem esforço')]);
  const { log, agent } = setup({ routes: [{ provider: p, model: 'x/y:free' }] });
  (agent as unknown as { o: { effort?: string } }).o.effort = 'high';
  const r = await agent.run('s30', 'tarefa');
  assert.equal(r.text, 'ok sem esforço');
  assert.equal(p.seen[0]?.effort, 'high');
  assert.equal(p.seen[1]?.effort, undefined);
  const ev = log.events('s30').find((e) => e.kind === 'effort.dropped');
  assert.deepEqual(ev?.payload, { route: 'openrouter/x/y:free', effort: 'high', code: 'http_400' });
  const step = log.events('s30').find((e) => e.kind === 'agent.step');
  assert.equal((step?.payload as { effort?: string }).effort, null);
});

test('conversa contínua: a nova mensagem leva o histórico da execução anterior ao modelo (critério 30)', async () => {
  const p = scripted('opencode-go', [say('primeira resposta'), say('segunda resposta')]);
  const { agent } = setup({ routes: [{ provider: p, model: 'kimi-k3' }] });
  const r1 = await agent.run('s31', 'primeira pergunta');
  const r2 = await agent.begin('s31', 'segunda pergunta', { prior: agent.transcript('s31', r1.run) }).done;
  assert.equal(r2.text, 'segunda resposta');
  assert.deepEqual(p.seen[1]!.messages.map((m) => `${m.role}:${m.content}`).slice(1), ['user:primeira pergunta', 'assistant:primeira resposta', 'user:segunda pergunta']);
  assert.notEqual(r2.run, r1.run);
  // O histórico copiado para a nova execução fica marcado (a console não o mostra de novo).
  const copied = agent['o'].log.events('s31').filter((e) => e.kind === 'agent.message' && (e.payload as { run: string }).run === r2.run);
  assert.deepEqual(copied.map((e) => Boolean((e.payload as { prior?: boolean }).prior)), [true, true, true, false, false], "histórico (sistema, pergunta, resposta) marcado; nova pergunta e nova resposta não");
});

test('limite do provedor também deixa o motivo no log', async () => {
  const go = scripted('opencode-go', [new ProviderLimitError('opencode-go', Date.now() + 3_600_000, 'Upstream request failed: Insufficient account funds')]);
  const or = scripted('openrouter', [say('ok')]);
  const { log, agent } = setup({ routes: [{ provider: go, model: 'kimi-k3' }, { provider: or, model: 'x/y:free' }] });
  await agent.run('s40', 'tarefa');
  const err = log.events('s40').find((e) => e.kind === 'provider.error');
  assert.deepEqual(err?.payload, { route: 'opencode-go/kimi-k3', code: 'limit', message: 'Upstream request failed: Insufficient account funds' });
});

test('a repetição interna depois da aprovação não conta para o detector de laço (achado no ensaio da console)', async () => {
  const p = scripted('opencode-go', [tool('c1', 'write_file', { path: 'x.txt', content: '1' }), say('fim')]);
  const { log, agent, workspace } = setup({ routes: [{ provider: p, model: 'kimi-k3' }], interactive: true, awaitApproval: async () => 'approve' });
  await import('node:fs').then((f) => f.mkdirSync(workspace, { recursive: true }));
  await agent.run('s41', 'escrever');
  const calls = log.events('s41').filter((e) => e.kind === 'tool.called' && (e.payload as { sig: string }).sig === 'write_file x.txt');
  assert.equal(calls.length, 1, 'uma chamada do modelo, uma contagem');
});

// ---------- SPEC 0001 rev. 6 (M0.8d): andamento, raciocínio, direcionamento e parada ----------

test('raciocínio do passo vai para o log como agent.reasoning; sem raciocínio, nenhum evento (critério 32)', async () => {
  const p = scripted('openrouter', [{ ...tool('c1', 'list_dir', { path: '.' }), reasoning: 'vou olhar a pasta' }, say('pronto')]);
  const { log, agent, workspace } = setup({ routes: [{ provider: p, model: 'x/y:free' }] });
  (await import('node:fs')).mkdirSync(workspace, { recursive: true });
  const r = await agent.run('s40', 'tarefa');
  const ev = log.events('s40').filter((e) => e.kind === 'agent.reasoning');
  assert.deepEqual(ev.map((e) => e.payload), [{ run: r.run, step: 1, route: 'openrouter/x/y:free', text: 'vou olhar a pasta' }]);
  // O raciocínio não entra na conversa enviada ao modelo.
  assert.equal(p.seen[1]!.messages.some((m) => m.content.includes('vou olhar a pasta')), false);
});

test('andamento: o agente repassa os fragmentos do provedor e as fases (chamada, ferramenta) a quem observa (critério 31)', async () => {
  const p: Provider = { id: 'openrouter', async call(_req, ctx) { ctx.onProgress?.({ kind: 'reasoning', delta: 'pens' }); ctx.onProgress?.({ kind: 'text', delta: 'olá' }); return say('olá'); } };
  const seen: unknown[] = [];
  const { agent } = setup({ routes: [{ provider: p, model: 'x/y:free' }] });
  (agent as unknown as { o: Record<string, unknown> }).o.onProgress = (run: string, x: unknown) => seen.push(x);
  await agent.run('s41', 'tarefa');
  assert.deepEqual(seen, [{ kind: 'call', route: 'openrouter/x/y:free', step: 1 }, { kind: 'reasoning', delta: 'pens' }, { kind: 'text', delta: 'olá' }]);
});

test('direcionar (steer): a mensagem entra antes da próxima chamada; resposta final não encerra enquanto houver direcionamento (critério 33)', async () => {
  const inbox: string[] = [];
  const p = scripted('opencode-go', [say('resposta à primeira'), say('resposta ao direcionamento')]);
  const { log, agent } = setup({ routes: [{ provider: p, model: 'kimi-k3' }] });
  (agent as unknown as { o: Record<string, unknown> }).o.inbox = () => inbox.splice(0);
  const orig = p.call.bind(p);
  p.call = async (req, ctx) => { const r = await orig(req, ctx); if (p.seen.length === 1) inbox.push('na verdade, em inglês'); return r; };
  const r = await agent.run('s42', 'tarefa');
  assert.equal(r.text, 'resposta ao direcionamento');
  assert.deepEqual(p.seen[1]!.messages.slice(-2).map((m) => `${m.role}:${m.content}`), ['assistant:resposta à primeira', 'user:na verdade, em inglês']);
  const steer = log.events('s42').find((e) => e.kind === 'agent.message' && (e.payload as { steer?: boolean }).steer);
  assert.deepEqual((steer?.payload as { message: unknown }).message, { role: 'user', content: 'na verdade, em inglês' });
});

test('parar: o sinal aborta a chamada em curso; a execução fica parada com userStopped, sem efeito desconhecido (critério 33)', async () => {
  const ac = new AbortController();
  const p: Provider = { id: 'opencode-go', call: (_req, ctx) => new Promise((_res, rej) => { ctx.signal?.addEventListener('abort', () => rej(Object.assign(new Error('Request was aborted.'), { name: 'AbortError' }))); setTimeout(() => ac.abort(), 20); }) };
  const { log, domain, agent } = setup({ routes: [{ provider: p, model: 'kimi-k3' }] });
  (agent as unknown as { o: Record<string, unknown> }).o.signal = ac.signal;
  const r = await agent.run('s43', 'tarefa longa');
  assert.deepEqual([r.outcome, r.reason], ['stopped', 'userStopped']);
  assert.equal(domain.getRun(r.run).state, 'stopped');
  assert.equal(log.events('s43').some((e) => e.kind === 'effect.unknown'), false, 'parada pedida não é efeito desconhecido');
  const failed = log.events('s43').find((e) => e.kind === 'effect.failed');
  assert.equal((failed?.payload as { reason?: string }).reason, 'userStopped');
});
