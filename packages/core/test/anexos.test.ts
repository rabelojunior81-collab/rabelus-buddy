// SPEC 0002, critério 9 (M1.3a, núcleo): anexos. Imagem e texto ficam na pasta de trabalho com o hash no nome; o log
// tem a referência (hash, nome, tipo), nunca o conteúdo; o conteúdo é lido do arquivo só para montar o pedido; cada
// rota recebe a imagem no formato dela; a rota sem visão é pulada com o motivo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../src/db.ts';
import { EventLog } from '../src/log.ts';
import { Domain } from '../src/domain.ts';
import { Policy } from '../src/policy.ts';
import { Budget } from '../src/budget.ts';
import { FsTools } from '../src/tools/fs.ts';
import { CommandTool } from '../src/tools/command.ts';
import { Agent, type Route } from '../src/agent.ts';
import { storeAttachment, loadAttachment, AttachmentError } from '../src/attachments.ts';
import { createGoProvider } from '../src/providers/index.ts';
import type { ModelRequest, ModelResponse, Provider } from '../src/providers/types.ts';
import { fakeHttp, type Captured } from './fake-http.ts';

// PNG de 1×1 pixel, válido.
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const ws = () => mkdtempSync(join(tmpdir(), 'rbuddy-anexos-'));

test('anexo guardado na pasta de trabalho com o hash no nome; tipos e tamanhos da SPEC; nome sem caminho (critério 9)', () => {
  const w = ws();
  const a = storeAttachment(w, { name: '../../foto.png', mime: 'image/png', data: PNG });
  assert.equal(a.hash, sha(Buffer.from(PNG, 'base64')));
  assert.deepEqual([a.name, a.mime, a.kind, a.size], ['foto.png', 'image/png', 'image', Buffer.from(PNG, 'base64').length]);
  assert.ok(existsSync(join(w, 'anexos', `${a.hash}.png`)), 'arquivo com o hash no nome');
  const t = storeAttachment(w, { name: 'nota.md', mime: 'text/markdown', data: Buffer.from('# Olá\nconteúdo secreto').toString('base64') });
  assert.equal(t.kind, 'text');
  assert.throws(() => storeAttachment(w, { name: 'x.pdf', mime: 'application/pdf', data: 'AAAA' }), (e: unknown) => e instanceof AttachmentError && /tipo/.test(e.message));
  assert.throws(() => storeAttachment(w, { name: 'grande.png', mime: 'image/png', data: Buffer.alloc(5 * 1024 * 1024 + 1).toString('base64') }), /tamanho/);
  assert.throws(() => storeAttachment(w, { name: 'bin.txt', mime: 'text/plain', data: Buffer.from([0xff, 0xfe, 0x00, 0xc3]).toString('base64') }), /texto/);
});

test('anexo lido do arquivo confere o hash; arquivo trocado é recusado (critério 9)', () => {
  const w = ws();
  const a = storeAttachment(w, { name: 'f.png', mime: 'image/png', data: PNG });
  assert.equal(loadAttachment(w, a).data, PNG);
  writeFileSync(join(w, 'anexos', `${a.hash}.png`), 'outra coisa');
  assert.throws(() => loadAttachment(w, a), /não confere/);
});

const usage = { input_tokens: 100, cached_tokens: 0, cache_write_tokens: 0, output_tokens: 10 };
const say = (text: string): ModelResponse => ({ text, toolCalls: [], usage, finish: 'stop' });
function scripted(id: string, steps: ModelResponse[]): Provider & { seen: ModelRequest[] } {
  const seen: ModelRequest[] = [];
  return { id, seen, async call(req) { seen.push(structuredClone(req)); return steps.shift()!; } };
}
function setup(routes: Route[], vision: (provider: string, model: string) => boolean) {
  const dir = mkdtempSync(join(tmpdir(), 'rbuddy-anexos-ag-'));
  const workspace = join(dir, 'ws');
  const log = new EventLog(openDatabase(join(dir, 'nucleo.db')));
  const policy = new Policy(log, { workspace });
  const agent = new Agent({ log, domain: new Domain(log), policy, budget: new Budget(log, { windows: [] }), fs: new FsTools(policy, { workspace }), cmd: new CommandTool(policy, { workspace }), routes, interactive: false, vision });
  return { log, agent, workspace };
}

test('mensagem com imagem e texto anexados: o pedido leva o conteúdo; o log leva só a referência (critério 9)', async () => {
  const p = scripted('chatgpt', [say('vi a imagem')]);
  const { log, agent, workspace } = setup([{ provider: p, model: 'gpt-6.1-sol' }], () => true);
  const img = storeAttachment(workspace, { name: 'tela.png', mime: 'image/png', data: PNG });
  const txt = storeAttachment(workspace, { name: 'notas.md', mime: 'text/markdown', data: Buffer.from('conteúdo-do-anexo-7731').toString('base64') });
  const r = await agent.begin('s1', 'o que tem aqui?', { attachments: [img, txt] }).done;
  assert.equal(r.text, 'vi a imagem');
  const user = p.seen[0]!.messages.at(-1)!;
  assert.deepEqual(user.files?.map((f) => [f.kind, f.name, f.mime]), [['image', 'tela.png', 'image/png'], ['text', 'notas.md', 'text/markdown']]);
  assert.equal(user.files?.[0]?.data, PNG);
  assert.equal(user.files?.[1]?.text, 'conteúdo-do-anexo-7731');
  const logged = JSON.stringify(log.events('s1'));
  assert.ok(!logged.includes(PNG) && !logged.includes('conteúdo-do-anexo-7731'), 'o log nunca tem o conteúdo');
  const msg = log.events('s1').find((e) => e.kind === 'agent.message' && (e.payload as { message: { role: string } }).message.role === 'user')!.payload as { message: { attachments: { hash: string }[] } };
  assert.deepEqual(msg.message.attachments.map((a) => a.hash), [img.hash, txt.hash]);
});

test('imagem: rota sem visão é pulada com o motivo; sem nenhuma com visão, a execução para com motivo (critério 9)', async () => {
  const blind = scripted('ollama-cloud', [say('não devia')]);
  const sees = scripted('chatgpt', [say('vi')]);
  const v = (_p: string, m: string) => !m.startsWith('gpt-oss');
  const a = setup([{ provider: blind, model: 'gpt-oss:120b' }, { provider: sees, model: 'gpt-6.1-sol' }], v);
  const img = storeAttachment(a.workspace, { name: 'x.png', mime: 'image/png', data: PNG });
  const r = await a.agent.begin('s2', 'descreva', { attachments: [img] }).done;
  assert.equal(r.text, 'vi');
  assert.equal(blind.seen.length, 0, 'rota sem visão nem é chamada');
  const sw = a.log.events('s2').find((e) => e.kind === 'provider.switched')!.payload as { from: string; reason: string };
  assert.deepEqual([sw.from, sw.reason], ['ollama-cloud/gpt-oss:120b', 'noVision']);
  const b = setup([{ provider: scripted('ollama-cloud', []), model: 'gpt-oss:120b' }], v);
  const img2 = storeAttachment(b.workspace, { name: 'x.png', mime: 'image/png', data: PNG });
  const r2 = await b.agent.begin('s3', 'descreva', { attachments: [img2] }).done;
  assert.deepEqual([r2.outcome, r2.reason], ['stopped', 'noVisionRoute']);
  // Texto anexado não exige visão.
  const c = setup([{ provider: scripted('ollama-cloud', [say('li')]), model: 'gpt-oss:120b' }], v);
  const t = storeAttachment(c.workspace, { name: 'n.txt', mime: 'text/plain', data: Buffer.from('oi').toString('base64') });
  assert.equal((await c.agent.begin('s4', 'leia', { attachments: [t] }).done).text, 'li');
});

// Respostas canônicas de cada rota do Go (formato medido em 2026-10-17).
function canned(c: Captured) {
  if (c.path.endsWith('/responses')) return { json: { id: 'r', object: 'response', status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'ok' }] }], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } } };
  if (c.path.endsWith('/chat/completions')) return { json: { id: 'c', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'ok' } }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } } };
  if (c.path.endsWith('/messages')) return { json: { id: 'm', type: 'message', role: 'assistant', model: 'x', stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 1, output_tokens: 1 } } };
  if (c.path.includes(':generateContent')) return { json: { candidates: [{ content: { role: 'model', parts: [{ text: 'ok' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } } };
  return { status: 404 };
}

test('cada rota recebe a imagem no formato dela e o texto anexado como texto (critério 9)', async () => {
  const fake = await fakeHttp(canned);
  const go = createGoProvider({ apiKey: 'k', baseURL: fake.url });
  const msg = (model: string): ModelRequest => ({ model, messages: [{ role: 'user', content: 'veja', files: [{ kind: 'image', name: 'a.png', mime: 'image/png', data: PNG }, { kind: 'text', name: 'n.md', mime: 'text/markdown', text: 'linha do anexo' }] }] });
  const body = (i: number) => fake.requests[i]!.body as Record<string, any>;
  await go.call(msg('gpt-6-luna'), { session: 's' }); // Responses
  const ri = body(0).input.at(-1).content;
  assert.deepEqual(ri.map((p: any) => p.type), ['input_text', 'input_image', 'input_text']);
  assert.equal(ri[1].image_url, `data:image/png;base64,${PNG}`);
  assert.match(ri[2].text, /n\.md[\s\S]*linha do anexo/);
  await go.call(msg('kimi-k3'), { session: 's' }); // Chat
  const ci = body(1).messages.at(-1).content;
  assert.deepEqual(ci.map((p: any) => p.type), ['text', 'image_url', 'text']);
  assert.equal(ci[1].image_url.url, `data:image/png;base64,${PNG}`);
  await go.call(msg('claude-haiku-5-5'), { session: 's' }); // Messages
  const mi = body(2).messages.at(-1).content;
  assert.deepEqual(mi.map((p: any) => p.type), ['text', 'image', 'text']);
  assert.deepEqual(mi[1].source, { type: 'base64', media_type: 'image/png', data: PNG });
  await go.call(msg('gemini-4-argon-contributor'), { session: 's' }); // Gemini
  const gi = body(3).contents.at(-1).parts;
  assert.deepEqual(gi[1].inlineData, { mimeType: 'image/png', data: PNG });
  assert.match(gi[2].text, /linha do anexo/);
  // Sem anexos, a mensagem continua texto simples (nada muda para quem não anexa).
  await go.call({ model: 'kimi-k3', messages: [{ role: 'user', content: 'oi' }] }, { session: 's' });
  assert.equal(body(4).messages.at(-1).content, 'oi');
  await fake.close();
});
