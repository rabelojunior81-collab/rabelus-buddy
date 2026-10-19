// SPEC 0002, critérios 11 e 13 (M1.5c): o seletor de modelo da console nova, pelo protótipo v4 aprovado pelo Pai.
// Provedor → lab → modelo, com busca, filtros por capacidade e o esforço que o modelo escolhido declara. A escolha vira
// a rota da execução; "Automático" segue a ordem dos provedores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONSOLE_SCHEMAS } from '../src/contract.ts';

const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
function pure<T>(names: string[]): T {
  const a = PAGE.indexOf('// <puras>');
  const b = PAGE.indexOf('// </puras>');
  return new Function(`${PAGE.slice(a, b)}; return { ${names.join(', ')} };`)() as T;
}
type M = { id: string; name: string; lab: string; vision?: boolean; reasoning?: boolean; tools?: boolean; free?: boolean; ctx?: number | null; efforts?: string[] };
const CAT = {
  providers: [
    { id: 'chatgpt', name: 'ChatGPT', kind: 'assinatura', models: [
      { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', lab: 'openai', vision: true, reasoning: true, tools: true, ctx: 400000, efforts: ['low', 'medium', 'high', 'xhigh', 'max'] },
      { id: 'gpt-6-luna', name: 'GPT-6 Luna', lab: 'openai', vision: false, reasoning: true, tools: true, ctx: 128000, efforts: ['low', 'high'] },
    ] },
    { id: 'openrouter', name: 'OpenRouter', kind: 'roteador', models: [
      { id: 'nvidia/nemotron:free', name: 'Nemotron', lab: 'nvidia', vision: true, reasoning: false, tools: true, free: true, ctx: 1000000, efforts: [] },
      { id: 'moonshot/kimi-k3', name: 'Kimi K3', lab: 'moonshot', vision: false, reasoning: true, tools: true, free: false, ctx: 256000, efforts: ['low', 'medium', 'high'] },
      { id: 'moonshot/kimi-k2', name: 'Kimi K2', lab: 'moonshot', vision: false, reasoning: false, tools: true, free: false, ctx: 128000, efforts: [] },
    ] },
  ],
  labs: { openai: { name: 'OpenAI' }, nvidia: { name: 'NVIDIA' }, moonshot: { name: 'Moonshot AI' } },
};

test('lista do provedor: agrupada por lab (o maior grupo primeiro), com busca por nome, id ou lab, e filtros por capacidade (critério 13)', () => {
  const { modelGroups } = pure<{ modelGroups: (cat: typeof CAT, o: { provider: string; query?: string; filters?: string[] }) => { lab: string; title: string; models: M[] }[] }>(['modelGroups']);
  const all = modelGroups(CAT, { provider: 'openrouter' });
  assert.deepEqual(all.map((g) => [g.lab, g.title, g.models.map((m) => m.id)]), [['moonshot', 'Moonshot AI', ['moonshot/kimi-k3', 'moonshot/kimi-k2']], ['nvidia', 'NVIDIA', ['nvidia/nemotron:free']]]);
  assert.deepEqual(modelGroups(CAT, { provider: 'openrouter', query: 'moonshot' }).flatMap((g) => g.models.map((m) => m.id)), ['moonshot/kimi-k3', 'moonshot/kimi-k2'], 'busca pelo lab');
  assert.deepEqual(modelGroups(CAT, { provider: 'openrouter', query: 'K3' }).flatMap((g) => g.models.map((m) => m.id)), ['moonshot/kimi-k3'], 'busca sem caixa');
  assert.deepEqual(modelGroups(CAT, { provider: 'openrouter', filters: ['vision'] }).flatMap((g) => g.models.map((m) => m.id)), ['nvidia/nemotron:free']);
  assert.deepEqual(modelGroups(CAT, { provider: 'openrouter', filters: ['reasoning', 'tools'] }).flatMap((g) => g.models.map((m) => m.id)), ['moonshot/kimi-k3'], 'filtros somam');
  assert.deepEqual(modelGroups(CAT, { provider: 'openrouter', filters: ['free', 'big'] }).flatMap((g) => g.models.map((m) => m.id)), ['nvidia/nemotron:free'], 'grátis e contexto de 1M+');
  assert.deepEqual(modelGroups(CAT, { provider: 'nenhum' }), []);
});

test('esforço oferecido conforme o modelo escolhido; Automático oferece os três básicos (critérios 11 e 29)', () => {
  const { effortsFor } = pure<{ effortsFor: (m: M | null) => string[] }>(['effortsFor']);
  assert.deepEqual(effortsFor(null), ['default', 'low', 'medium', 'high'], 'Automático');
  assert.deepEqual(effortsFor(CAT.providers[0]!.models[0]!), ['default', 'low', 'medium', 'high', 'xhigh', 'max']);
  assert.deepEqual(effortsFor({ id: 'x', name: 'x', lab: 'x', efforts: ['max', 'low', 'none'] }), ['default', 'none', 'low', 'max'], 'na ordem do mais leve ao mais pesado');
  assert.deepEqual(effortsFor({ id: 'x', name: 'x', lab: 'x', efforts: [] }), ['default'], 'sem esforço declarado: só o padrão');
  assert.deepEqual(effortsFor({ id: 'x', name: 'x', lab: 'x', efforts: ['low', 'turbo'] }), ['default', 'low'], 'nível que o núcleo não conhece não aparece');
});

test('contexto em texto curto (critério 13)', () => {
  const { ctxText } = pure<{ ctxText: (n: number | null) => string }>(['ctxText']);
  assert.equal(ctxText(1000000), '1M');
  assert.equal(ctxText(1048576), '1M');
  assert.equal(ctxText(400000), '400k');
  assert.equal(ctxText(null), '');
});

test('página: pílula de modelo com painel acessível, Ctrl+K, catálogo do núcleo e a escolha como rota; o seletor antigo saiu (critério 11)', () => {
  assert.match(PAGE, /id="mBtn"[^>]*aria-haspopup="dialog"[^>]*aria-expanded="false"/, 'pílula de modelo');
  assert.match(PAGE, /id="mPop"[^>]*role="dialog"/, 'painel do seletor');
  assert.match(PAGE, /id="mSearch"/, 'busca');
  assert.match(PAGE, /id="mTabs"[^>]*role="tablist"/, 'abas por provedor');
  assert.ok(PAGE.includes("api('models.list')"), 'catálogo vem do núcleo');
  assert.match(PAGE, /ev\.key\.toLowerCase\(\) === 'k'/, 'Ctrl+K abre o seletor');
  assert.match(PAGE, /params\.route = picked/, 'a escolha vai como rota');
  assert.doesNotMatch(PAGE, /<select id="route"/, 'o seletor de provedor antigo foi substituído');
  // O esforço que a página oferece passa pelo contrato.
  const eff = (CONSOLE_SCHEMAS['agent.run'] as unknown as { shape: { effort: { safeParse: (v: unknown) => { success: boolean } } } }).shape.effort;
  for (const e of ['xhigh', 'max', 'none']) assert.ok(eff.safeParse(e).success, e);
});
