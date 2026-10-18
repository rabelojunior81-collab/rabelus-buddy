// SPEC 0002, critério 13 (parte do núcleo): catálogo provedor → lab → modelo com capacidades e a fonte de cada
// uma. Servidores falsos na forma medida em 2026-10-17 (ChatGPT /models, Ollama /api/tags + /api/show,
// OpenRouter /api/v1/models, OpenCode Go /v1/models, models.dev /api.json).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { CONSOLE_METHODS } from '../src/console.ts';
import { buildModelCatalog, type ModelCatalog } from '../src/models/catalog.ts';
import { fakeHttp, type Captured } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });

const CHATGPT = { models: [
  { slug: 'gpt-6.1-sol', display_name: 'GPT-6.1 Sol', description: 'Frontier model. Second sentence.', visibility: 'list', input_modalities: ['text', 'image'], supported_reasoning_levels: [{ effort: 'low', description: 'x' }, { effort: 'high', description: 'y' }, { effort: 'xhigh', description: 'z' }], context_window: 400000 },
  { slug: 'interno', display_name: 'Interno', visibility: 'hide', input_modalities: ['text'], supported_reasoning_levels: [], context_window: 1000 },
] };
const OLLAMA_SHOW: Record<string, unknown> = {
  'qwen3-vl:235b': { capabilities: ['completion', 'vision', 'tools', 'thinking'], model_info: { 'qwen3vl.context_length': 262144 }, details: { family: 'qwen3vl' } },
  'gpt-oss:20b': { capabilities: ['completion', 'tools', 'thinking'], model_info: { 'gptoss.context_length': 131072 }, details: { family: 'gptoss' } },
};
const OPENROUTER = { data: [
  { id: 'nvidia/nemotron-3.5-super-vl:free', name: 'NVIDIA: Nemotron 3.5 Super VL (free)', description: 'Vision model. More text.', context_length: 262144, architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] }, supported_parameters: ['tools', 'reasoning', 'reasoning_effort'], pricing: { prompt: '0', completion: '0' } },
  { id: 'acme/pago', name: 'Acme: Pago', context_length: 32000, architecture: { input_modalities: ['text'], output_modalities: ['text'] }, supported_parameters: ['tools'], pricing: { prompt: '0.000001', completion: '0.000012' } },
  { id: 'openai/gpt-image-x', name: 'OpenAI: Image', architecture: { input_modalities: ['text'], output_modalities: ['image'] }, supported_parameters: [], pricing: { prompt: '0', completion: '0' } },
] };
const GO = { data: [{ id: 'kimi-k3', owned_by: 'opencode' }, { id: 'minimax-m3', owned_by: 'opencode' }, { id: 'misterio-1', owned_by: 'opencode' }] };
const MODELS_DEV = {
  'opencode-go': { models: {
    'kimi-k3': { id: 'kimi-k3', name: 'Kimi K3', description: 'Multimodal Kimi model.', reasoning: true, reasoning_options: [{ type: 'effort', values: ['max'] }], tool_call: true, modalities: { input: ['text', 'image', 'video'], output: ['text'] }, open_weights: true, limit: { context: 1048576 }, cost: { input: 3, output: 15 }, canonical_model_id: 'moonshotai/kimi-k3' },
    'minimax-m3': { id: 'minimax-m3', name: 'MiniMax M3', reasoning: true, tool_call: true, modalities: { input: ['text'], output: ['text'] }, open_weights: true, limit: { context: 204800 }, canonical_model_id: 'minimax/minimax-m3' },
  } },
  'ollama-cloud': { models: {
    // O models.dev diz que gpt-oss enxerga imagem; o Ollama declara que não: vale o provedor.
    'gpt-oss:20b': { id: 'gpt-oss:20b', name: 'gpt-oss 20B', reasoning: true, reasoning_options: [{ type: 'effort', values: ['low', 'medium', 'high'] }], modalities: { input: ['text', 'image'] }, canonical_model_id: 'openai/gpt-oss-20b' },
  } },
};

async function fakeProviders(opts: { ollamaDown?: boolean } = {}) {
  return fakeHttp((c: Captured) => {
    if (c.path === '/chatgpt/models') return { json: CHATGPT };
    if (c.path === '/ollama/api/tags') return opts.ollamaDown ? { status: 500 } : { json: { models: Object.keys(OLLAMA_SHOW).map((name) => ({ name, model: name })) } };
    if (c.path === '/ollama/api/show') return { json: OLLAMA_SHOW[String(c.body.model)] ?? {} };
    if (c.path === '/openrouter/api/v1/models') return { json: OPENROUTER };
    if (c.path === '/go/v1/models') return { json: GO };
    if (c.path === '/api.json') return { json: MODELS_DEV };
    return { status: 404 };
  });
}

const find = (cat: ModelCatalog, p: string, id: string) => cat.providers.find((x) => x.id === p)!.models.find((m) => m.id === id)!;

test('catálogo de modelos: provedor → lab → modelo, com capacidades e a fonte de cada uma (critério 13)', async () => {
  const f = await fakeProviders();
  const cat = await buildModelCatalog({
    chatgpt: { token: 'tok-chatgpt', api: `${f.url}/chatgpt` },
    'opencode-go': { key: 'chave-go', baseURL: `${f.url}/go/v1` },
    'ollama-cloud': { key: 'chave-ollama', baseURL: `${f.url}/ollama/v1` },
    openrouter: { baseURL: `${f.url}/openrouter/api/v1` },
    modelsDevURL: `${f.url}/api.json`,
  });
  assert.deepEqual(cat.providers.map((p) => p.id), ['chatgpt', 'opencode-go', 'ollama-cloud', 'openrouter']);
  assert.deepEqual(cat.errors, {});

  // ChatGPT: só os visíveis; visão e esforços declarados pelo provedor.
  assert.deepEqual(cat.providers[0]!.models.map((m) => m.id), ['gpt-6.1-sol']);
  const sol = find(cat, 'chatgpt', 'gpt-6.1-sol');
  assert.deepEqual([sol.name, sol.lab, sol.vision, sol.efforts, sol.ctx, sol.sources.caps, sol.desc], ['GPT-6.1 Sol', 'openai', true, ['low', 'high', 'xhigh'], 400000, 'provedor', 'Frontier model.']);

  // OpenCode Go: a lista é do provedor; as capacidades, do models.dev; lab pelo id canônico.
  const kimi = find(cat, 'opencode-go', 'kimi-k3');
  assert.deepEqual([kimi.name, kimi.lab, kimi.vision, kimi.video, kimi.reasoning, kimi.efforts, kimi.tools, kimi.open, kimi.ctx, kimi.sources.caps, kimi.sources.lab], ['Kimi K3', 'moonshotai', true, true, true, ['max'], true, true, 1048576, 'models.dev', 'models.dev']);
  const mist = find(cat, 'opencode-go', 'misterio-1');
  assert.deepEqual([mist.name, mist.lab, mist.vision, mist.sources.caps, mist.sources.lab], ['misterio-1', 'outros', false, 'nenhuma', 'nenhuma']);

  // Ollama: capacidades declaradas ao vivo vencem o models.dev.
  const oss = find(cat, 'ollama-cloud', 'gpt-oss:20b');
  assert.deepEqual([oss.vision, oss.reasoning, oss.tools, oss.ctx, oss.sources.caps, oss.lab, oss.sources.lab], [false, true, true, 131072, 'provedor', 'openai', 'models.dev']);
  assert.deepEqual(oss.efforts, ['low', 'medium', 'high'], 'níveis de esforço do models.dev onde o provedor não declara');
  const vl = find(cat, 'ollama-cloud', 'qwen3-vl:235b');
  assert.deepEqual([vl.vision, vl.lab, vl.sources.lab], [true, 'alibaba', 'família']);

  // OpenRouter: lab pelo prefixo; preço por faixa; só modelos que respondem texto.
  const nem = find(cat, 'openrouter', 'nvidia/nemotron-3.5-super-vl:free');
  assert.deepEqual([nem.name, nem.lab, nem.vision, nem.tools, nem.free, nem.tier, nem.efforts, nem.sources.caps], ['Nemotron 3.5 Super VL (free)', 'nvidia', true, true, true, 0, ['low', 'medium', 'high'], 'provedor']);
  assert.equal(find(cat, 'openrouter', 'acme/pago').tier, 3, 'US$ 12 por milhão de saída: $$$');
  assert.equal(cat.providers[3]!.models.some((m) => m.id === 'openai/gpt-image-x'), false);
  assert.equal(cat.labs.moonshotai?.name, 'Moonshot AI');

  // A chave e o token nunca entram no catálogo.
  assert.doesNotMatch(JSON.stringify(cat), /chave-go|chave-ollama|tok-chatgpt/);
  // O provedor recebeu a credencial certa.
  assert.equal(f.requests.find((r) => r.path === '/ollama/api/tags')?.headers.authorization, 'Bearer chave-ollama');
  await f.close();
});

test('catálogo de modelos: um provedor fora do ar não derruba os outros; sem credencial, o provedor fica de fora com o motivo (critério 13)', async () => {
  const f = await fakeProviders({ ollamaDown: true });
  const cat = await buildModelCatalog({
    'ollama-cloud': { key: 'k', baseURL: `${f.url}/ollama/v1` },
    openrouter: { baseURL: `${f.url}/openrouter/api/v1` },
    'opencode-go': { key: null, baseURL: `${f.url}/go/v1` },
    chatgpt: null,
    modelsDevURL: `${f.url}/api.json`,
  });
  assert.deepEqual(cat.providers.map((p) => p.id), ['openrouter']);
  assert.match(cat.errors['ollama-cloud'] ?? '', /500/);
  assert.match(cat.errors['opencode-go'] ?? '', /sem chave/);
  assert.match(cat.errors.chatgpt ?? '', /sem login/);
  await f.close();
});

test('models.list pelo núcleo: guarda o catálogo e não busca de novo no mesmo dia; liberado na console (critério 13)', async () => {
  const f = await fakeProviders();
  const home = tempHome();
  writeFileSync(join(home, 'config.json'), JSON.stringify({ routes: [{ provider: 'ollama-cloud', model: 'gpt-oss:20b', baseURL: `${f.url}/ollama/v1` }, { provider: 'openrouter', model: 'acme/pago', baseURL: `${f.url}/openrouter/api/v1` }] }));
  owners.push(await spawnOwner(home, { OLLAMA_CLOUD_API_KEY: 'chave-ollama-dono', OPENROUTER_API_KEY: '', OPENCODE_GO_API_KEY: '', RBUDDY_MODELS_DEV: `${f.url}/api.json` }));
  const cat = (await call(endpointFor(home), 'models.list', {})) as ModelCatalog;
  assert.ok(cat.providers.some((p) => p.id === 'ollama-cloud' && p.models.length === 2));
  assert.ok(cat.providers.some((p) => p.id === 'openrouter'));
  assert.ok(cat.generatedAt);
  const n = f.requests.length;
  const again = (await call(endpointFor(home), 'models.list', {})) as ModelCatalog;
  assert.equal(again.generatedAt, cat.generatedAt);
  assert.equal(f.requests.length, n, 'nenhuma busca nova no mesmo dia');
  assert.doesNotMatch(JSON.stringify(cat), /chave-ollama-dono/);
  assert.ok((CONSOLE_METHODS as readonly string[]).includes('models.list'));
  await f.close();
});
