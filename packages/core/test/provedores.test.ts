import { test } from 'node:test';
import assert from 'node:assert/strict';
import tls from 'node:tls';
import { fakeHttp, type Captured } from './fake-http.ts';
import { createGoProvider, createOllamaProvider, createOpenRouterProvider, goRoute, ProviderLimitError, ProviderRejectedError, trustSystemCAs, USER_AGENT } from '../src/providers/index.ts';
import type { ModelRequest } from '../src/providers/types.ts';

const req = (model: string): ModelRequest => ({
  model,
  messages: [{ role: 'system', content: 'Você é o buddy.' }, { role: 'user', content: 'Oi' }],
  tools: [{ name: 'read_file', description: 'lê um arquivo', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }],
});

// Respostas canônicas de cada rota, com usage conhecido.
function canned(c: Captured) {
  if (c.path.endsWith('/responses')) {
    return { json: { id: 'resp_1', object: 'response', status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'olá (responses)' }] }], usage: { input_tokens: 100, input_tokens_details: { cached_tokens: 40, cache_write_tokens: 10 }, output_tokens: 20, output_tokens_details: { reasoning_tokens: 5 }, total_tokens: 120 } } };
  }
  if (c.path.endsWith('/chat/completions')) {
    return { json: { id: 'c1', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'olá (chat)' } }], usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120, prompt_tokens_details: { cached_tokens: 30 } } } };
  }
  if (c.path.endsWith('/messages')) {
    return { json: { id: 'm1', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: 'olá (messages)' }], usage: { input_tokens: 50, cache_read_input_tokens: 40, cache_creation_input_tokens: 10, output_tokens: 20 } } };
  }
  if (c.path.includes(':generateContent')) {
    return { json: { candidates: [{ content: { role: 'model', parts: [{ text: 'olá (google)' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 100, cachedContentTokenCount: 25, candidatesTokenCount: 15, thoughtsTokenCount: 5 } } };
  }
  return { status: 404, json: { error: 'rota desconhecida' } };
}

test('Go: cada modelo vai pela rota e pelo SDK certos, com User-Agent próprio e x-opencode-session estável (critério 17)', async () => {
  const fake = await fakeHttp(canned);
  const go = createGoProvider({ apiKey: 'chave-go', baseURL: fake.url });
  const cases: [string, string, string][] = [
    ['gpt-6-luna', 'responses', '/responses'],
    ['kimi-k3', 'chat', '/chat/completions'],
    ['claude-haiku-5-5', 'messages', '/messages'],
    ['gemini-4-argon-contributor', 'google', ':generateContent'],
  ];
  for (const [model, route, path] of cases) {
    assert.equal(goRoute(model), route);
    const before = fake.requests.length;
    const r = await go.call(req(model), { session: 'sessao-123' });
    const sent = fake.requests.slice(before);
    assert.equal(sent.length, 1, `${model}: uma requisição, sem nova tentativa escondida`);
    const c = sent[0]!;
    assert.ok(c.path.includes(path), `${model} → ${c.path}`);
    assert.match(String(c.headers['user-agent']), new RegExp(`^${USER_AGENT.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`));
    assert.equal(c.headers['x-opencode-session'], 'sessao-123');
    assert.match(r.text, /olá/);
  }
  await fake.close();
});

test('Go/Responses: store:false em toda chamada e usage normalizado (critério 20)', async () => {
  const fake = await fakeHttp(canned);
  const go = createGoProvider({ apiKey: 'k', baseURL: fake.url });
  const r = await go.call(req('gpt-6-luna'), { session: 's' });
  assert.equal(fake.requests[0]?.body.store, false);
  assert.deepEqual(r.usage, { input_tokens: 100, cached_tokens: 40, cache_write_tokens: 10, output_tokens: 20 });
  await fake.close();
});

test('usage normalizado nas outras rotas: chat, messages (soma das entradas) e google (saída inclui pensamentos)', async () => {
  const fake = await fakeHttp(canned);
  const go = createGoProvider({ apiKey: 'k', baseURL: fake.url });
  assert.deepEqual((await go.call(req('kimi-k3'), { session: 's' })).usage, { input_tokens: 100, cached_tokens: 30, cache_write_tokens: 0, output_tokens: 20 });
  assert.deepEqual((await go.call(req('claude-haiku-5-5'), { session: 's' })).usage, { input_tokens: 100, cached_tokens: 40, cache_write_tokens: 10, output_tokens: 20 });
  assert.deepEqual((await go.call(req('gemini-4-argon-contributor'), { session: 's' })).usage, { input_tokens: 100, cached_tokens: 25, cache_write_tokens: 0, output_tokens: 20 });
  await fake.close();
});

test('chamada de ferramenta: chega como toolCall e o resultado volta no formato de cada rota', async () => {
  let turn = 0;
  const fake = await fakeHttp((c) => {
    turn++;
    if (turn === 1) return { json: { id: 'c1', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'read_file', arguments: '{"path":"a.ts"}' } }] } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } } };
    return canned(c);
  });
  const go = createGoProvider({ apiKey: 'k', baseURL: fake.url });
  const first = await go.call(req('kimi-k3'), { session: 's' });
  assert.deepEqual(first.toolCalls, [{ id: 'call_1', name: 'read_file', arguments: '{"path":"a.ts"}' }]);
  assert.equal(first.finish, 'tool_calls');
  const r2 = req('kimi-k3');
  r2.messages.push({ role: 'assistant', content: '', toolCalls: first.toolCalls }, { role: 'tool', content: 'conteúdo de a.ts', toolCallId: 'call_1' });
  await go.call(r2, { session: 's' });
  const msgs = fake.requests[1]?.body.messages as { role: string; tool_call_id?: string; tool_calls?: unknown[] }[];
  assert.ok(msgs.some((m) => m.role === 'assistant' && Array.isArray(m.tool_calls)));
  assert.ok(msgs.some((m) => m.role === 'tool' && m.tool_call_id === 'call_1'));
  await fake.close();
});

test('Ollama Cloud e OpenRouter: rota compatível com OpenAI, chave no Authorization e identificação própria', async () => {
  const fake = await fakeHttp(canned);
  const ollama = createOllamaProvider({ apiKey: 'chave-ollama', baseURL: `${fake.url}/v1` });
  await ollama.call(req('gpt-oss:20b'), { session: 's' });
  assert.equal(fake.requests[0]?.path, '/v1/chat/completions');
  assert.equal(fake.requests[0]?.headers.authorization, 'Bearer chave-ollama');
  const or = createOpenRouterProvider({ apiKey: 'chave-or', baseURL: `${fake.url}/api/v1` });
  await or.call(req('openai/gpt-6-luna'), { session: 's' });
  assert.equal(fake.requests[1]?.path, '/api/v1/chat/completions');
  assert.equal(fake.requests[1]?.headers.authorization, 'Bearer chave-or');
  assert.equal(fake.requests[1]?.headers['x-openrouter-title'], 'Rabelus Buddy');
  await fake.close();
});

test('HTTP 429 vira esgotamento com horário (retry-after), sem nova tentativa escondida', async () => {
  const fake = await fakeHttp(() => ({ status: 429, headers: { 'retry-after': '120' }, json: { error: { message: 'limite' } } }));
  const go = createGoProvider({ apiKey: 'k', baseURL: fake.url });
  const t0 = Date.now();
  await assert.rejects(go.call(req('kimi-k3'), { session: 's' }), (e: unknown) => {
    assert.ok(e instanceof ProviderLimitError);
    assert.ok(e.until >= t0 + 119_000 && e.until <= Date.now() + 121_000);
    return true;
  });
  assert.equal(fake.requests.length, 1);
  await fake.close();
});

test('certificados do sistema somados aos embutidos, sem tirar nenhum', () => {
  const before = new Set(tls.getCACertificates('default'));
  trustSystemCAs();
  const after = new Set(tls.getCACertificates('default'));
  for (const c of before) assert.ok(after.has(c), 'nenhum certificado embutido removido');
  for (const c of tls.getCACertificates('system')) assert.ok(after.has(c), 'certificado do sistema incluído');
});

test('resposta HTTP conclusiva não é efeito desconhecido: 401/403/4xx viram recusa com motivo; 5xx, indisponível por um tempo', async () => {
  const msg = 'Upstream request failed: An active OpenCode Go subscription is required to use Go models.';
  for (const route of ['kimi-k3', 'gpt-6-luna', 'claude-haiku-5-5']) {
    const f403 = await fakeHttp(() => ({ status: 403, json: { error: { message: msg, type: 'permission_error' } } }));
    await assert.rejects(createGoProvider({ apiKey: 'k', baseURL: f403.url }).call(req(route), { session: 's' }), (e: unknown) => {
      assert.ok(e instanceof ProviderRejectedError, `${route}: ${String(e)}`);
      assert.equal(e.code, 'http_403');
      assert.match(e.message, /active OpenCode Go subscription/);
      return true;
    });
    assert.equal(f403.requests.length, 1);
    await f403.close();
  }
  const f401 = await fakeHttp(() => ({ status: 401, json: { error: { message: 'invalid api key' } } }));
  await assert.rejects(createOpenRouterProvider({ apiKey: 'k', baseURL: f401.url }).call(req('x/y'), { session: 's' }), (e: unknown) => e instanceof ProviderRejectedError && e.code === 'http_401');
  await f401.close();
  const f500 = await fakeHttp(() => ({ status: 500, json: { error: { message: 'boom' } } }));
  const t0 = Date.now();
  await assert.rejects(createGoProvider({ apiKey: 'k', baseURL: f500.url }).call(req('kimi-k3'), { session: 's' }), (e: unknown) => e instanceof ProviderLimitError && e.until > t0 && e.until <= Date.now() + 6 * 60_000);
  await f500.close();
});

test('sem resposta (conexão recusada) continua inconclusivo: nem recusa nem limite', async () => {
  const f = await fakeHttp(() => ({ status: 200 }));
  const url = f.url;
  await f.close();
  await assert.rejects(createGoProvider({ apiKey: 'k', baseURL: url }).call(req('kimi-k3'), { session: 's' }), (e: unknown) => !(e instanceof ProviderRejectedError) && !(e instanceof ProviderLimitError));
});
