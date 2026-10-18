// Catálogo de modelos provedor → lab → modelo (SPEC 0002, escopo 10, critério 13; medido em 2026-10-17).
// Fonte das capacidades, em ordem de confiança: o que o provedor declara ao vivo; o models.dev (MIT) onde ele
// não declara (OpenCode Go); a família do modelo, só para o lab. A fonte acompanha cada modelo.
// Nenhuma credencial entra no catálogo: chave e token só vão no cabeçalho da busca.

import { trustSystemCAs, USER_AGENT } from '../providers/identity.ts';

export const MODELS_DEV_URL = 'https://models.dev/api.json';

export type CapSource = 'provedor' | 'models.dev' | 'nenhuma';
export type LabSource = 'provedor' | 'models.dev' | 'família' | 'nenhuma';
export interface ModelEntry {
  id: string; name: string; desc: string; lab: string;
  vision: boolean; video: boolean; reasoning: boolean; efforts: string[]; tools: boolean;
  ctx: number | null; free: boolean; open: boolean; tier: number | null;
  sources: { caps: CapSource; lab: LabSource };
}
export type ProviderKey = 'chatgpt' | 'opencode-go' | 'ollama-cloud' | 'openrouter';
export interface ModelCatalog {
  generatedAt: string;
  providers: { id: ProviderKey; name: string; kind: 'assinatura' | 'roteador'; models: ModelEntry[] }[];
  labs: Record<string, { name: string }>;
  errors: Partial<Record<ProviderKey | 'models.dev', string>>;
}
export interface CatalogSources {
  chatgpt?: { token: string; api: string } | null;
  'opencode-go'?: { key: string | null; baseURL: string } | null;
  'ollama-cloud'?: { key: string | null; baseURL: string } | null;
  openrouter?: { baseURL: string } | null;
  modelsDevURL?: string;
}

// Família → lab, só quando ninguém declara (medida no catálogo de 2026-10-17).
const FAMILY: [RegExp, string][] = [
  [/^kimi/, 'moonshotai'], [/^glm/, 'zhipuai'], [/^gpt/, 'openai'], [/^gemma|^gemini/, 'google'], [/^qwen/, 'alibaba'],
  [/^deepseek/, 'deepseek'], [/^mistral|^devstral|^magistral/, 'mistral'], [/^nemotron/, 'nvidia'], [/^minimax/, 'minimax'], [/^mimo/, 'xiaomi'],
  [/^hy\d/, 'tencent'], [/^muse/, 'meta'], [/^llama/, 'meta'], [/^longcat/, 'meituan'], [/^step/, 'stepfun'], [/^grok/, 'xai'], [/^claude/, 'anthropic'],
];
const ALIAS: Record<string, string> = { 'z-ai': 'zhipuai', qwen: 'alibaba', mistralai: 'mistral', 'meta-llama': 'meta', 'x-ai': 'xai' };
const LAB_NAME: Record<string, string> = {
  openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google', moonshotai: 'Moonshot AI', zhipuai: 'Zhipu (Z.ai)', alibaba: 'Alibaba (Qwen)',
  deepseek: 'DeepSeek', nvidia: 'NVIDIA', minimax: 'MiniMax', mistral: 'Mistral', meta: 'Meta', xiaomi: 'Xiaomi', tencent: 'Tencent',
  meituan: 'Meituan', stepfun: 'StepFun', xai: 'xAI', outros: 'Outros',
};
const norm = (lab: string) => ALIAS[lab] ?? lab;
const family = (id: string) => FAMILY.find(([re]) => re.test(id.toLowerCase()))?.[1];

// Primeira frase, curta: a descrição aparece só no modelo em foco.
const short = (d?: string): string => {
  if (!d) return '';
  const t = d.replace(/\s+/g, ' ').trim().split(/(?<=\.)\s/)[0]!;
  return t.length > 96 ? `${t.slice(0, 93)}…` : t;
};
// Faixa de preço por milhão de tokens de saída (como o t3.chat): grátis, $ até 2, $$ até 10, $$$ acima.
const tier = (perMillion: number) => (perMillion === 0 ? 0 : perMillion <= 2 ? 1 : perMillion <= 10 ? 2 : 3);

interface Dev { name?: string; description?: string; reasoning?: boolean; reasoning_options?: { type?: string; values?: string[] }[]; tool_call?: boolean; modalities?: { input?: string[] }; open_weights?: boolean; limit?: { context?: number }; cost?: { input?: number }; canonical_model_id?: string }
const devEfforts = (d?: Dev) => d?.reasoning_options?.find((o) => o.type === 'effort')?.values ?? [];
const labOf = (id: string, d?: Dev): { lab: string; src: LabSource } => {
  const canon = d?.canonical_model_id?.split('/')[0];
  if (canon) return { lab: norm(canon), src: 'models.dev' };
  const f = family(id);
  return f ? { lab: f, src: 'família' } : { lab: 'outros', src: 'nenhuma' };
};

async function getJson(url: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<any> {
  const r = await fetch(url, { ...init, headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(timeoutMs) });
  if (!r.ok) throw new Error(`${new URL(url).pathname} respondeu ${r.status}`);
  return r.json();
}
const auth = (key: string) => ({ Authorization: `Bearer ${key}` });

async function chatgpt(c: { token: string; api: string }): Promise<ModelEntry[]> {
  const j = await getJson(`${c.api.replace(/\/$/, '')}/models`, { headers: auth(c.token) });
  return ((j.models ?? []) as any[]).filter((m) => m.visibility === 'list').map((m) => ({
    id: String(m.slug), name: String(m.display_name ?? m.slug), desc: short(m.description), lab: 'openai',
    vision: Boolean(m.input_modalities?.includes('image')), video: false,
    reasoning: (m.supported_reasoning_levels ?? []).length > 0, efforts: (m.supported_reasoning_levels ?? []).map((x: any) => String(x.effort ?? x)),
    tools: true, ctx: m.context_window ?? null, free: false, open: false, tier: null, sources: { caps: 'provedor', lab: 'provedor' },
  }));
}

async function go(c: { key: string; baseURL: string }, dev: Record<string, Dev>): Promise<ModelEntry[]> {
  const j = await getJson(`${c.baseURL.replace(/\/$/, '')}/models`, { headers: auth(c.key) });
  return ((j.data ?? []) as any[]).map((x) => {
    const id = String(x.id);
    const d = dev[id];
    const { lab, src } = labOf(id, d);
    return {
      id, name: d?.name ?? id, desc: short(d?.description), lab,
      vision: Boolean(d?.modalities?.input?.includes('image')), video: Boolean(d?.modalities?.input?.includes('video')),
      reasoning: Boolean(d?.reasoning), efforts: devEfforts(d), tools: Boolean(d?.tool_call), ctx: d?.limit?.context ?? null,
      free: d?.cost?.input === 0, open: Boolean(d?.open_weights), tier: null, sources: { caps: d ? 'models.dev' : 'nenhuma', lab: src },
    };
  });
}

async function ollama(c: { key: string; baseURL: string }, dev: Record<string, Dev>): Promise<ModelEntry[]> {
  const root = c.baseURL.replace(/\/v1\/?$/, '');
  const tags = await getJson(`${root}/api/tags`, { headers: auth(c.key) });
  const names: string[] = ((tags.models ?? []) as any[]).map((m) => String(m.name ?? m.model));
  const out: ModelEntry[] = [];
  // /api/show por modelo, poucos por vez.
  for (let i = 0; i < names.length; i += 6) {
    const batch = await Promise.all(names.slice(i, i + 6).map(async (id) => {
      const s = await getJson(`${root}/api/show`, { method: 'POST', headers: { ...auth(c.key), 'Content-Type': 'application/json' }, body: JSON.stringify({ model: id }) }).catch(() => ({}));
      const caps: string[] = s.capabilities ?? [];
      const ctx = Object.entries(s.model_info ?? {}).find(([k]) => k.endsWith('.context_length'))?.[1];
      const d = dev[id];
      const { lab, src } = labOf(id, d);
      const reasoning = caps.includes('thinking');
      return {
        id, name: d?.name ?? id, desc: short(d?.description), lab,
        vision: caps.includes('vision'), video: false, reasoning, efforts: reasoning ? devEfforts(d) : [], tools: caps.includes('tools'),
        ctx: Number(ctx) || null, free: false, open: true, tier: null, sources: { caps: caps.length ? 'provedor' as const : 'nenhuma' as const, lab: src },
      };
    }));
    out.push(...batch);
  }
  return out;
}

async function openrouter(c: { baseURL: string }): Promise<ModelEntry[]> {
  const j = await getJson(`${c.baseURL.replace(/\/$/, '')}/models`, {}, 20_000);
  return ((j.data ?? []) as any[]).filter((m) => m.architecture?.output_modalities?.includes('text')).map((m) => {
    const params: string[] = m.supported_parameters ?? [];
    const inp: string[] = m.architecture?.input_modalities ?? [];
    const out = Number(m.pricing?.completion ?? NaN) * 1e6;
    const free = Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0;
    return {
      id: String(m.id), name: String(m.name ?? m.id).replace(/^[^:]+:\s*/, ''), desc: short(m.description), lab: norm(String(m.id).split('/')[0]!.replace(/^~/, '')),
      vision: inp.includes('image'), video: inp.includes('video'), reasoning: params.includes('reasoning'),
      efforts: params.includes('reasoning_effort') ? ['low', 'medium', 'high'] : [], tools: params.includes('tools'),
      ctx: m.context_length ?? null, free, open: false, tier: Number.isFinite(out) ? tier(out) : null, sources: { caps: 'provedor', lab: 'provedor' },
    };
  });
}

export async function buildModelCatalog(src: CatalogSources): Promise<ModelCatalog> {
  trustSystemCAs();
  const errors: ModelCatalog['errors'] = {};
  const msg = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 120);
  let dev: Record<string, { models?: Record<string, Dev> }> = {};
  try { dev = await getJson(src.modelsDevURL ?? MODELS_DEV_URL, {}, 30_000); } catch (e) { errors['models.dev'] = msg(e); }
  const devOf = (p: string) => dev[p]?.models ?? {};

  const tasks: [ProviderKey, string, 'assinatura' | 'roteador', () => Promise<ModelEntry[]> | null][] = [
    ['chatgpt', 'ChatGPT', 'assinatura', () => (src.chatgpt ? chatgpt(src.chatgpt) : null)],
    ['opencode-go', 'OpenCode Go', 'assinatura', () => (src['opencode-go']?.key ? go({ key: src['opencode-go'].key, baseURL: src['opencode-go'].baseURL }, devOf('opencode-go')) : null)],
    ['ollama-cloud', 'Ollama Cloud', 'assinatura', () => (src['ollama-cloud']?.key ? ollama({ key: src['ollama-cloud'].key, baseURL: src['ollama-cloud'].baseURL }, devOf('ollama-cloud')) : null)],
    ['openrouter', 'OpenRouter', 'roteador', () => (src.openrouter ? openrouter(src.openrouter) : null)],
  ];
  const results = await Promise.all(tasks.map(async ([id, name, kind, run]) => {
    const p = run();
    if (!p) { errors[id] = id === 'chatgpt' ? 'sem login' : id === 'openrouter' ? 'não configurado' : 'sem chave'; return null; }
    try { return { id, name, kind, models: await p }; } catch (e) { errors[id] = msg(e); return null; }
  }));
  const providers = results.filter((r): r is NonNullable<typeof r> => r !== null);
  const labs: ModelCatalog['labs'] = {};
  for (const p of providers) for (const m of p.models) labs[m.lab] ??= { name: LAB_NAME[m.lab] ?? m.lab };
  return { generatedAt: new Date().toISOString(), providers, labs, errors };
}
