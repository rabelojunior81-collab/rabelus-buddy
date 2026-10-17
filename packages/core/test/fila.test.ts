// SPEC 0001 rev. 6 (M0.8d), critérios 31 e 33 pelo dono: andamento ao vivo, fila por conversa,
// direcionar (steer), cancelar e parar. Pedido do Pai em 2026-10-17: "primariamente queued, com opção para steer".
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { fakeHttp, chatChunks, type Captured } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });

interface Run { id: string; session: string; state: string }
interface Live { running: { run: string; phase: string; route: string; reasoning: string; text: string; startedAt: string; callStartedAt: string } | null; queue: { id: string; task: string }[] }
type Msg = { role: string; content: string | null };

const chat = (content: string, reasoning?: string) => ({ id: 'c', choices: [{ finish_reason: 'stop', message: { role: 'assistant', content, ...(reasoning ? { reasoning } : {}) } }], usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 } });
const writeCall = { id: 'c', choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [{ id: 'w1', type: 'function', function: { name: 'write_file', arguments: '{"path":"a.txt","content":"x"}' } }] } }], usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 } };
const lastUser = (c: Captured) => ((c.body.messages as Msg[]).filter((m) => m.role === 'user').at(-1)?.content ?? '');

async function until<T>(f: () => Promise<T | undefined>, ms = 20_000): Promise<T> {
  const t0 = Date.now();
  for (;;) { const v = await f(); if (v !== undefined) return v; if (Date.now() - t0 > ms) throw new Error('tempo esgotado'); await new Promise((r) => setTimeout(r, 40)); }
}
function homeWithFake(url: string) {
  const home = tempHome();
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  writeFileSync(join(home, 'config.json'), JSON.stringify({ routes: [{ provider: 'opencode-go', model: 'kimi-k3', baseURL: `${url}/v1` }] }));
  return { home, workspace };
}
async function owner(url: string) {
  const { home, workspace } = homeWithFake(url);
  const o = await spawnOwner(home, { OPENCODE_GO_API_KEY: 'chave-falsa' });
  owners.push(o);
  const ep = endpointFor(home);
  return { home, workspace, ep, o, waitDone: (run: string) => until(async () => { const r = (await call(ep, 'run.get', { id: run })) as Run; return r.state === 'running' ? undefined : r; }) };
}

test('andamento: run.live mostra fase, rota, raciocínio e texto parciais durante a chamada, e nada depois (critério 31)', async () => {
  const fake = await fakeHttp(() => ({ sse: chatChunks(chat('resposta final aqui', 'pensando com calma no problema')), gapMs: 120 }));
  const { ep, workspace, waitDone } = await owner(fake.url);
  const { run } = (await call(ep, 'agent.run', { session: 'l1', task: 'pense', workspace, interactive: true })) as { run: string };
  const thinking = await until(async () => { const l = (await call(ep, 'run.live', { session: 'l1' })) as Live; return l.running?.reasoning ? l : undefined; });
  assert.equal(thinking.running!.run, run);
  assert.equal(thinking.running!.phase, 'thinking');
  assert.equal(thinking.running!.route, 'opencode-go/kimi-k3');
  assert.ok(thinking.running!.startedAt && thinking.running!.callStartedAt);
  const writing = await until(async () => { const l = (await call(ep, 'run.live', { session: 'l1' })) as Live; return l.running?.text ? l : undefined; });
  assert.equal(writing.running!.phase, 'writing');
  assert.equal(writing.running!.reasoning, 'pensando com calma no problema');
  assert.ok('resposta final aqui'.startsWith(writing.running!.text));
  await waitDone(run);
  assert.deepEqual(await call(ep, 'run.live', { session: 'l1' }), { running: null, queue: [] });
  const reasoning = ((await call(ep, 'session.events', { session: 'l1' })) as { kind: string; payload: { text?: string } }[]).find((e) => e.kind === 'agent.reasoning');
  assert.equal(reasoning?.payload.text, 'pensando com calma no problema', 'raciocínio no log (critério 32)');
  await fake.close();
});

test('fila: mensagem com a conversa ocupada entra na fila e roda depois, com o histórico; cancelar tira da fila (critério 33)', async () => {
  const seen: Captured[] = [];
  const fake = await fakeHttp((c) => { seen.push(c); return { sse: chatChunks(chat(`resposta a "${lastUser(c)}"`)), gapMs: seen.length === 1 ? 150 : 0 }; });
  const { ep, workspace, waitDone } = await owner(fake.url);
  const { run } = (await call(ep, 'agent.run', { session: 'q1', task: 'primeira', workspace, interactive: true })) as { run: string };
  const q = (await call(ep, 'agent.run', { session: 'q1', task: 'segunda', workspace, interactive: true, continueFrom: run })) as { queued?: string; run?: string };
  assert.ok(q.queued && !q.run, 'enfileirada, sem execução nova');
  const q3 = (await call(ep, 'agent.run', { session: 'q1', task: 'terceira (cancelada)', workspace, interactive: true })) as { queued: string };
  assert.deepEqual(((await call(ep, 'run.live', { session: 'q1' })) as Live).queue.map((x) => x.task), ['segunda', 'terceira (cancelada)']);
  await call(ep, 'agent.unqueue', { session: 'q1', queue: q3.queued });
  await waitDone(run);
  const second = await until(async () => ((await call(ep, 'run.list', {})) as (Run & { task: string })[]).find((r) => r.session === 'q1' && r.task === 'segunda' && r.state === 'done'));
  assert.ok(second);
  const sent = seen.find((c) => lastUser(c) === 'segunda')!.body.messages as Msg[];
  assert.deepEqual(sent.filter((m) => m.role !== 'system').map((m) => m.content), ['primeira', 'resposta a "primeira"', 'segunda'], 'a fila continua a conversa');
  assert.equal(seen.some((c) => lastUser(c).startsWith('terceira')), false, 'cancelada não roda');
  const kinds = ((await call(ep, 'session.events', { session: 'q1' })) as { kind: string; payload: { reason?: string } }[]).filter((e) => e.kind === 'run.dequeued').map((e) => e.payload.reason);
  assert.deepEqual(kinds.sort(), ['cancelled', 'started']);
  assert.equal(((await call(ep, 'run.list', {})) as Run[]).filter((r) => r.session === 'q1' && r.state === 'running').length, 0);
  await fake.close();
});

test('direcionar: a mensagem da fila entra na execução em curso antes da próxima chamada (critério 33)', async () => {
  const seen: Captured[] = [];
  const fake = await fakeHttp((c) => { seen.push(c); return { sse: chatChunks(chat(`resposta ${seen.length}`)), gapMs: seen.length === 1 ? 200 : 0 }; });
  const { ep, workspace, waitDone } = await owner(fake.url);
  const { run } = (await call(ep, 'agent.run', { session: 'd1', task: 'escreva um poema', workspace, interactive: true })) as { run: string };
  const { queued } = (await call(ep, 'agent.run', { session: 'd1', task: 'em inglês, por favor', workspace, interactive: true })) as { queued: string };
  await call(ep, 'agent.steer', { session: 'd1', queue: queued });
  const done = await waitDone(run);
  assert.equal(done.state, 'done');
  assert.equal(seen.length, 2, 'uma chamada a mais, na mesma execução');
  assert.deepEqual((seen[1]!.body.messages as Msg[]).slice(-2).map((m) => m.content), ['resposta 1', 'em inglês, por favor']);
  assert.deepEqual(((await call(ep, 'run.live', { session: 'd1' })) as Live).queue, []);
  assert.equal(((await call(ep, 'run.list', {})) as Run[]).filter((r) => r.session === 'd1').length, 1, 'nenhuma execução nova');
  await assert.rejects(call(ep, 'agent.steer', { session: 'd1', text: 'sem execução' }), /nenhuma execução/);
  await fake.close();
});

test('parar: aborta a chamada pendurada e encerra como userStopped; parar na aprovação nega a pendente; retomar depois funciona (critério 33)', async () => {
  let n = 0;
  const writeWithReasoning = { ...writeCall, choices: [{ ...writeCall.choices[0]!, message: { ...writeCall.choices[0]!.message, reasoning: 'vou escrever o arquivo' } }] };
  const fake = await fakeHttp(() => { n++; if (n === 1) return { sse: chatChunks(chat('nunca termina', 'pensando')).slice(0, 2), hold: true }; if (n === 2) return { json: writeWithReasoning }; return { json: chat('fim') }; });
  const { ep, workspace, waitDone } = await owner(fake.url);
  const { run } = (await call(ep, 'agent.run', { session: 'p1', task: 'longa', workspace, interactive: true })) as { run: string };
  await until(async () => (((await call(ep, 'run.live', { session: 'p1' })) as Live).running?.reasoning ? true : undefined));
  await call(ep, 'agent.stop', { session: 'p1' });
  const stopped = await waitDone(run);
  assert.equal(stopped.state, 'stopped');
  const evs = (await call(ep, 'session.events', { session: 'p1' })) as { kind: string; payload: { reason?: string } }[];
  assert.equal(evs.find((e) => e.kind === 'run.stopped')?.payload.reason, 'userStopped');
  assert.equal(evs.some((e) => e.kind === 'effect.unknown'), false);

  // Retomar: o modelo pede uma escrita; parar com a aprovação pendente nega a aprovação e para.
  await call(ep, 'agent.resume', { run, workspace, interactive: true });
  const ap = await until(async () => ((await call(ep, 'approval.list', {})) as { id: string; session: string }[]).find((a) => a.session === 'p1'));
  // Achado no ensaio: o raciocínio do passo já está no log; a área ao vivo não o repete na espera da aprovação.
  const waiting = (await call(ep, 'run.live', { session: 'p1' })) as Live;
  assert.equal(waiting.running?.phase, 'approval');
  assert.equal(waiting.running?.reasoning, '', 'raciocínio do passo concluído sai do andamento');
  await call(ep, 'agent.stop', { session: 'p1' });
  const again = await waitDone(run);
  assert.equal(again.state, 'stopped');
  assert.deepEqual(((await call(ep, 'approval.list', {})) as { session: string }[]).filter((a) => a.session === 'p1'), []);
  const resolved = ((await call(ep, 'session.events', { session: 'p1' })) as { kind: string; payload: { approval?: string; decision?: string } }[]).find((e) => e.kind === 'approval.resolved' && e.payload.approval === ap.id);
  assert.equal(resolved?.payload.decision, 'deny');
  await assert.rejects(call(ep, 'agent.stop', { session: 'p1' }), /nenhuma execução/);
  await fake.close();
});

test('fila sobrevive à queda do núcleo: depois de reiniciar, a fila está lá e roda quando a execução retomada termina (critério 33)', async () => {
  let n = 0;
  let hang = true;
  const fake = await fakeHttp((c) => { n++; if (n === 1 && hang) return { hang: true }; return { json: chat(`resposta a "${lastUser(c)}"`) }; });
  const { home, ep, workspace, o, waitDone } = await owner(fake.url);
  const { run } = (await call(ep, 'agent.run', { session: 'k1', task: 'primeira', workspace, interactive: true })) as { run: string };
  await call(ep, 'agent.run', { session: 'k1', task: 'na fila', workspace, interactive: true });
  await until(async () => (n >= 1 ? true : undefined));
  await killHard(o);
  hang = false;
  owners.push(await spawnOwner(home, { OPENCODE_GO_API_KEY: 'chave-falsa' }));
  assert.deepEqual(((await call(ep, 'run.live', { session: 'k1' })) as Live).queue.map((x) => x.task), ['na fila']);
  await call(ep, 'agent.resume', { run, workspace, interactive: true });
  await waitDone(run);
  const queuedRun = await until(async () => ((await call(ep, 'run.list', {})) as (Run & { task: string })[]).find((r) => r.session === 'k1' && r.task === 'na fila' && r.state === 'done'));
  assert.ok(queuedRun);
  await fake.close();
});
