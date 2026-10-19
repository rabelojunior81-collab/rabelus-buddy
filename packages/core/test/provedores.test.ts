import { test } from 'node:test';
import assert from 'node:assert/strict';
import tls from 'node:tls';
import { fakeHttp, type Captured } from './fake-http.ts';
import { goUsage, createGoProvider, createOllamaProvider, createOpenRouterProvider, goRoute, ProviderLimitError, ProviderRejectedError, trustSystemCAs, USER_AGENT } from '../src/providers/index.ts';
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
  // Uma só chamada ao modelo: a leitura de telemetria (GET /usage, critério 15 da SPEC 0002) não é nova tentativa.
  assert.equal(fake.requests.filter((r) => !r.path.endsWith('/usage')).length, 1);
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

test('esforço de raciocínio chega a cada rota no formato dela; "padrão" não envia nada (critério 29)', async () => {
  const fake = await fakeHttp(canned);
  const go = createGoProvider({ apiKey: 'k', baseURL: fake.url });
  const sent = (i: number) => fake.requests[i]!.body as Record<string, unknown>;
  await go.call({ ...req('gpt-6-luna'), effort: 'high' }, { session: 's' });
  assert.deepEqual(sent(0).reasoning, { effort: 'high' });
  await go.call({ ...req('kimi-k3'), effort: 'low' }, { session: 's' });
  assert.equal(sent(1).reasoning_effort, 'low');
  await go.call({ ...req('claude-haiku-5-5'), effort: 'medium', maxOutputTokens: 2000 }, { session: 's' });
  const th = sent(2).thinking as { type: string; budget_tokens: number };
  assert.equal(th.type, 'enabled');
  assert.ok(th.budget_tokens >= 1024 && (sent(2).max_tokens as number) > th.budget_tokens, 'max_tokens acima do orçamento de pensamento');
  await go.call({ ...req('gemini-4-argon-contributor'), effort: 'high' }, { session: 's' });
  const gc = (sent(3).generationConfig ?? {}) as { thinkingConfig?: { thinkingBudget?: number } };
  assert.ok((gc.thinkingConfig?.thinkingBudget ?? 0) > 0);
  const or = createOpenRouterProvider({ apiKey: 'k', baseURL: `${fake.url}/api/v1` });
  await or.call({ ...req('x/y:free'), effort: 'low' }, { session: 's' });
  assert.deepEqual(sent(4).reasoning, { effort: 'low' });
  assert.equal(sent(4).reasoning_effort, undefined);
  // Padrão: nenhum campo de esforço em nenhuma rota.
  for (const m of ['gpt-6-luna', 'kimi-k3', 'claude-haiku-5-5']) await go.call(req(m), { session: 's' });
  for (const i of [5, 6, 7]) for (const f of ['reasoning', 'reasoning_effort', 'thinking']) assert.equal(sent(i)[f], undefined, `${i}:${f}`);
  await fake.close();
});

// M1.5c (2026-10-19): o catálogo real declara oito níveis (none, minimal, low, medium, high, xhigh, max, ultra), conforme
// o modelo. Quem recebe o esforço como texto o recebe como veio; quem recebe orçamento de pensamento: none desliga,
// minimal usa o menor, e acima de high o orçamento cresce. Recusado, o caminho existente repete sem esforço.
test('níveis de esforço além de baixo, médio e alto chegam a cada rota no formato dela (M1.5c)', async () => {
  const fake = await fakeHttp(canned);
  const go = createGoProvider({ apiKey: 'k', baseURL: fake.url });
  const sent = (i: number) => fake.requests[i]!.body as Record<string, unknown>;
  await go.call({ ...req('gpt-6-luna'), effort: 'xhigh' }, { session: 's' });
  assert.deepEqual(sent(0).reasoning, { effort: 'xhigh' }, 'Responses: como veio');
  await go.call({ ...req('kimi-k3'), effort: 'max' }, { session: 's' });
  assert.equal(sent(1).reasoning_effort, 'max', 'Chat: como veio');
  await go.call({ ...req('kimi-k3'), effort: 'none' }, { session: 's' });
  assert.equal(sent(2).reasoning_effort, 'none', 'Chat: none também é declarado pelo provedor');
  const budget = async (effort: string, i: number) => {
    // maxOutputTokens baixo como no teste do critério 29: o SDK da Anthropic recusa, sem streaming, max_tokens que
    // estime mais de 10 minutos (acima de ~21.333), achado ao rodar este teste em 2026-10-19.
    await go.call({ ...req('claude-haiku-5-5'), effort, maxOutputTokens: 2000 } as never, { session: 's' });
    return (sent(i).thinking as { budget_tokens?: number } | undefined)?.budget_tokens ?? 0;
  };
  const high = await budget('high', 3);
  assert.ok((await budget('xhigh', 4)) > high, 'xhigh pensa mais que high');
  assert.ok((await budget('ultra', 5)) >= (await budget('max', 6)), 'ultra não pensa menos que max');
  assert.equal(await budget('minimal', 7), 1024, 'minimal: o menor orçamento aceito');
  await go.call({ ...req('claude-haiku-5-5'), effort: 'none' } as never, { session: 's' });
  assert.equal(sent(8).thinking, undefined, 'none: sem pensamento');
  await fake.close();
});

test('402 (conta sem saldo) esgota o provedor por uma hora, em vez de ser recusado a cada mensagem', async () => {
  const f = await fakeHttp(() => ({ status: 402, json: { error: { message: 'Upstream request failed: Insufficient account funds' } } }));
  const t0 = Date.now();
  await assert.rejects(createGoProvider({ apiKey: 'k', baseURL: f.url }).call(req('kimi-k3'), { session: 's' }), (e: unknown) => {
    assert.ok(e instanceof ProviderLimitError, String(e));
    assert.ok(e.until >= t0 + 59 * 60_000 && e.until <= Date.now() + 61 * 60_000);
    assert.match(e.message, /Insufficient account funds/);
    return true;
  });
  await f.close();
});

// Critério 31 (rev. 6): Chat Completions em fluxo, no formato medido no Ollama e no OpenRouter reais (2026-10-17).
test('chat em fluxo: raciocínio, texto e ferramenta chegam em fragmentos na ordem; o resultado final é o mesmo (critério 31)', async () => {
  const usage = { prompt_tokens: 40, completion_tokens: 311, total_tokens: 351, prompt_tokens_details: { cached_tokens: 8 } };
  const answer = { id: 'c1', choices: [{ finish_reason: 'stop', message: { role: 'assistant', reasoning: 'O usuário quer 17 × 23; 340 + 51.', content: '17 × 23 = 391.' } }], usage };
  const call = { id: 'c2', choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'read_file', arguments: '{"path":"README.md"}' } }] } }], usage };
  let n = 0;
  const fake = await fakeHttp(() => ({ json: ++n === 1 ? answer : call }));
  const or = createOpenRouterProvider({ apiKey: 'k', baseURL: `${fake.url}/api/v1` });
  const seen: { kind: string; delta?: string; name?: string }[] = [];
  const r = await or.call({ ...req('x/y:free'), effort: 'medium' }, { session: 's', onProgress: (p) => seen.push(p) });
  const body = fake.requests[0]!.body;
  assert.equal(body.stream, true);
  assert.deepEqual(body.stream_options, { include_usage: true });
  assert.equal(r.text, '17 × 23 = 391.');
  assert.equal(r.reasoning, 'O usuário quer 17 × 23; 340 + 51.');
  assert.deepEqual(r.usage, { input_tokens: 40, cached_tokens: 8, cache_write_tokens: 0, output_tokens: 311 });
  assert.equal(r.finish, 'stop');
  assert.equal(seen.filter((p) => p.kind === 'reasoning').map((p) => p.delta).join(''), 'O usuário quer 17 × 23; 340 + 51.');
  assert.equal(seen.filter((p) => p.kind === 'text').map((p) => p.delta).join(''), '17 × 23 = 391.');
  assert.ok(seen.findIndex((p) => p.kind === 'text') > seen.findLastIndex((p) => p.kind === 'reasoning'), 'raciocínio antes do texto');

  const seen2: { kind: string; name?: string }[] = [];
  const t = await or.call(req('x/y:free'), { session: 's', onProgress: (p) => seen2.push(p) });
  assert.deepEqual(t.toolCalls, [{ id: 'call_1', name: 'read_file', arguments: '{"path":"README.md"}' }], 'argumentos montados das partes');
  assert.equal(t.finish, 'tool_calls');
  assert.deepEqual(seen2.filter((p) => p.kind === 'tool'), [{ kind: 'tool', name: 'read_file' }]);
  assert.equal(t.reasoning, undefined, 'sem raciocínio, nenhum campo');
  await fake.close();
});

test('chat em fluxo: "reasoning_content" também é raciocínio; parar aborta a chamada em curso (critérios 31 e 33)', async () => {
  const fake = await fakeHttp(() => ({ sse: [{ id: 'c', object: 'chat.completion.chunk', choices: [{ index: 0, delta: { reasoning_content: 'pensando' }, finish_reason: null }] }], hold: true }));
  const ollama = createOllamaProvider({ apiKey: 'k', baseURL: `${fake.url}/v1` });
  const ac = new AbortController();
  const seen: { kind: string; delta?: string }[] = [];
  const p = ollama.call(req('gpt-oss:20b'), { session: 's', signal: ac.signal, onProgress: (x) => { seen.push(x); if (x.kind === 'reasoning') ac.abort(); } });
  await assert.rejects(p, (e: unknown) => (e as Error).name === 'AbortError' || /abort/i.test((e as Error).message));
  assert.deepEqual(seen, [{ kind: 'reasoning', delta: 'pensando' }]);
  await fake.close();
});

// Critério 15 (SPEC 0002): telemetria do OpenCode Go, no formato medido em 2026-10-18 (GET /v1/usage).
const GO_USAGE = { usage: {
  rolling: { status: 'ok', percent: 0, resetsAt: '2026-10-18T09:22:19.241Z' },
  weekly: { status: 'rate-limited', percent: 100, resetsAt: '2026-10-19T00:00:00.000Z' },
  monthly: { status: 'ok', percent: 52, resetsAt: '2026-11-04T05:00:34.000Z' },
} };

test('telemetria do Go: 402 com a semanal bloqueada esgota o provedor inteiro até o reinício informado, com motivo legível (critério 15)', async () => {
  const f = await fakeHttp((c) => c.path.endsWith('/usage') ? { json: GO_USAGE } : { status: 402, json: { error: { message: 'Upstream request failed: Insufficient account funds' } } });
  await assert.rejects(createGoProvider({ apiKey: 'chave-go', baseURL: `${f.url}/v1` }).call(req('kimi-k3'), { session: 's' }), (e: unknown) => {
    assert.ok(e instanceof ProviderLimitError, String(e));
    assert.equal(e.until, Date.parse('2026-10-19T00:00:00.000Z'));
    assert.equal(e.scope, 'provider', 'limite da conta vale para todos os modelos do Go');
    assert.match(e.message, /limite semanal do OpenCode Go \(100%\)/);
    return true;
  });
  const usageReq = f.requests.find((r) => r.path.endsWith('/usage'))!;
  assert.equal(usageReq.method, 'GET');
  assert.equal(usageReq.headers.authorization, 'Bearer chave-go');
  await f.close();
});

test('telemetria do Go: goUsage lê as janelas; sem janela bloqueada, a recusa segue como antes (critério 15)', async () => {
  const ok = { usage: { ...GO_USAGE.usage, weekly: { status: 'ok', percent: 40, resetsAt: '2026-10-19T00:00:00.000Z' } } };
  const f = await fakeHttp((c) => c.path.endsWith('/usage') ? { json: ok } : { status: 429, headers: { 'retry-after': '30' }, json: { error: { message: 'rate limited' } } });
  const w = await goUsage({ apiKey: 'k', baseURL: `${f.url}/v1` });
  assert.deepEqual(w.map((x) => [x.window, x.status, x.percent]), [['rolling', 'ok', 0], ['weekly', 'ok', 40], ['monthly', 'ok', 52]]);
  const t0 = Date.now();
  await assert.rejects(createGoProvider({ apiKey: 'k', baseURL: `${f.url}/v1` }).call(req('kimi-k3'), { session: 's' }), (e: unknown) => {
    assert.ok(e instanceof ProviderLimitError);
    assert.ok(e.until >= t0 + 29_000 && e.until <= Date.now() + 31_000, 'vale o retry-after da recusa');
    assert.notEqual(e.scope, 'provider');
    return true;
  });
  await f.close();
});
