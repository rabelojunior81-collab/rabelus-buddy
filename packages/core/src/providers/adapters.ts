// Adaptadores por rota (ficha bibliotecas-do-nucleo; SDKs aprovados na SPEC 0001, decisão 9).
// Cada um converte o contrato único para a API da rota, desliga as novas tentativas
// automáticas (o núcleo decide, pelos efeitos com identidade) e normaliza o usage.

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import type { Usage } from '../budget.ts';
import { ProviderLimitError, ProviderRejectedError, type CallContext, type ChatMessage, type Effort, type ModelRequest, type ModelResponse, type Provider, type ToolCall } from './types.ts';

export type HeadersFor = (ctx: CallContext) => Record<string, string>;
export interface AdapterOptions { id: string; apiKey: string; baseURL: string; headers: HeadersFor }

const DEFAULT_LIMIT_WAIT_MS = 5 * 60_000;
// Orçamento de pensamento por nível, para as rotas que medem esforço em tokens (Messages, Google).
// Orçamento de pensamento (Messages, Gemini) por nível: none desliga; minimal usa o menor aceito (1024); acima de high
// cresce (M1.5c). Os valores acima de high são HIPÓTESE nossa: se o provedor recusar, a chamada se repete sem esforço.
export const THINKING_BUDGET: Record<Effort, number> = { none: 0, minimal: 1024, low: 1024, medium: 4096, high: 16_000, xhigh: 32_000, max: 48_000, ultra: 64_000 };
const MESSAGES_MAX_BUDGET = 20_000;

// Resposta HTTP é conclusiva (o provedor recebeu e respondeu): 429 esgota a janela; 401, 403 e os
// demais 4xx são recusa (não se repete igual); 5xx deixa o provedor indisponível por um tempo.
// Só a falta de resposta (conexão, stream cortado) segue como erro inconclusivo. Lacuna de
// 2026-10-17: um 403 ("assinatura Go ativa exigida") virava efeito desconhecido e parava a tarefa.
const TEMPORARY_WAIT_MS = 5 * 60_000;
// Mensagem do provedor vai para o log: nada com cara de chave ou token.
export const scrub = (m: string): string => m.replace(/[A-Za-z0-9_\-.]{32,}/g, '[…]').slice(0, 300);

function mapError(id: string, e: unknown): never {
  const err = e as { status?: number; headers?: Headers | Record<string, string>; message?: string; error?: { message?: string } };
  if (typeof err?.status !== 'number') throw e;
  const h = err.headers;
  const secs = Number(h instanceof Headers ? h.get('retry-after') : h?.['retry-after']);
  const wait = (fallback: number) => Date.now() + (Number.isFinite(secs) && secs > 0 ? secs * 1000 : fallback);
  const message = scrub(err.error?.message ?? String(err.message ?? '').replace(/^\d{3}\s*/, ''));
  if (err.status === 429) throw new ProviderLimitError(id, wait(DEFAULT_LIMIT_WAIT_MS), message || 'limite do provedor');
  // 402: conta sem saldo (observado no Go em 2026-10-17). Não se resolve na próxima mensagem: sai da frente por 1 h.
  // É da conta, não do modelo: todos os modelos do provedor (escopo provider, M1.5c).
  if (err.status === 402) throw new ProviderLimitError(id, wait(60 * 60_000), message || 'conta sem saldo', 'provider');
  if (err.status >= 500) throw new ProviderLimitError(id, wait(TEMPORARY_WAIT_MS), message || `provedor indisponível (${err.status})`);
  throw new ProviderRejectedError(id, `http_${err.status}`, message || `recusado (${err.status})`);
}

export const systemOf = (msgs: ChatMessage[]): string => msgs.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
const parseArgs = (a: string): Record<string, unknown> => { try { return JSON.parse(a || '{}') as Record<string, unknown>; } catch { return {}; } };

// ---------- OpenAI Chat Completions (Go chat, Ollama Cloud, OpenRouter) ----------
// Anexos (M1.3, critério 9): o texto anexado vai como parte de texto com o nome; a imagem, no formato de cada API.
type File = NonNullable<ChatMessage['files']>[number];
const fileText = (f: File) => `Anexo ${f.name} (${f.mime}):\n${f.text ?? ''}`;
const dataUrl = (f: File) => `data:${f.mime};base64,${f.data ?? ''}`;

export function openaiChatAdapter(o: AdapterOptions): Provider {
  const client = new OpenAI({ apiKey: o.apiKey, baseURL: o.baseURL, maxRetries: 0 });
  return {
    id: o.id,
    async call(req: ModelRequest, ctx: CallContext): Promise<ModelResponse> {
      const messages = req.messages.map((m) => {
        if (m.role === 'tool') return { role: 'tool' as const, tool_call_id: m.toolCallId ?? '', content: m.content };
        if (m.role === 'assistant' && m.toolCalls?.length) {
          return { role: 'assistant' as const, content: m.content || null, tool_calls: m.toolCalls.map((t) => ({ id: t.id, type: 'function' as const, function: { name: t.name, arguments: t.arguments } })) };
        }
        if (m.role === 'user' && m.files?.length) {
          return { role: 'user' as const, content: [{ type: 'text' as const, text: m.content }, ...m.files.map((f) => (f.kind === 'image' ? { type: 'image_url' as const, image_url: { url: dataUrl(f) } } : { type: 'text' as const, text: fileText(f) }))] };
        }
        return { role: m.role, content: m.content } as { role: 'system' | 'user' | 'assistant'; content: string };
      });
      try {
        // Em fluxo (rev. 6, critério 31): raciocínio e texto chegam enquanto o modelo trabalha, e o uso vem no
        // último pedaço (`include_usage`), formato medido no Ollama e no OpenRouter reais em 2026-10-17.
        const stream = await client.chat.completions.create({
          model: req.model,
          messages,
          stream: true,
          stream_options: { include_usage: true },
          ...(req.tools?.length ? { tools: req.tools.map((t) => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: t.parameters } })) } : {}),
          ...(req.maxOutputTokens ? { max_tokens: req.maxOutputTokens } : {}),
          // OpenRouter normaliza o esforço em `reasoning`; as demais rotas compatíveis usam `reasoning_effort`.
          ...(req.effort ? (o.id === 'openrouter' ? { reasoning: { effort: req.effort } } : { reasoning_effort: req.effort }) : {}),
        } as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming, { headers: o.headers(ctx), ...(ctx.signal ? { signal: ctx.signal } : {}) });
        let text = '';
        let reasoning = '';
        let finishReason: string | null = null;
        let u: OpenAI.Completions.CompletionUsage | undefined;
        const calls: { id: string; name: string; arguments: string }[] = [];
        for await (const chunk of stream) {
          if (chunk.usage) u = chunk.usage;
          const ch = chunk.choices[0];
          if (!ch) continue;
          const d = ch.delta as { content?: string | null; reasoning?: string | null; reasoning_content?: string | null; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] };
          const r = d.reasoning ?? d.reasoning_content;
          if (r) { reasoning += r; ctx.onProgress?.({ kind: 'reasoning', delta: r }); }
          if (d.content) { text += d.content; ctx.onProgress?.({ kind: 'text', delta: d.content }); }
          for (const t of d.tool_calls ?? []) {
            const c = (calls[t.index] ??= { id: '', name: '', arguments: '' });
            if (t.id) c.id = t.id;
            if (t.function?.name) { c.name += t.function.name; ctx.onProgress?.({ kind: 'tool', name: c.name }); }
            if (t.function?.arguments) c.arguments += t.function.arguments;
          }
          if (ch.finish_reason) finishReason = ch.finish_reason;
        }
        // O SDK encerra a iteração em silêncio quando a chamada é abortada: parada não é resposta.
        if (ctx.signal?.aborted) throw Object.assign(new Error('chamada abortada'), { name: 'AbortError' });
        const toolCalls: ToolCall[] = calls.filter((c) => c?.name).map((c) => ({ id: c.id, name: c.name, arguments: c.arguments || '{}' }));
        const usage: Usage = { input_tokens: u?.prompt_tokens ?? 0, cached_tokens: u?.prompt_tokens_details?.cached_tokens ?? 0, cache_write_tokens: 0, output_tokens: u?.completion_tokens ?? 0 };
        const finish = finishReason === 'tool_calls' || (toolCalls.length && finishReason !== 'length') ? 'tool_calls' : finishReason === 'length' ? 'length' : finishReason === 'stop' ? 'stop' : 'other';
        return { text, toolCalls, usage, finish, ...(reasoning ? { reasoning } : {}) };
      } catch (e) { return mapError(o.id, e); }
    },
  };
}

// ---------- OpenAI Responses (Go responses; base do Sign in with ChatGPT) ----------
export function responsesInput(msgs: ChatMessage[]): unknown[] {
  const items: unknown[] = [];
  for (const m of msgs) {
    if (m.role === 'system') continue; // vai em `instructions`
    if (m.role === 'tool') { items.push({ type: 'function_call_output', call_id: m.toolCallId ?? '', output: m.content }); continue; }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      if (m.content) items.push({ role: 'assistant', content: m.content });
      for (const t of m.toolCalls) items.push({ type: 'function_call', call_id: t.id, name: t.name, arguments: t.arguments });
      continue;
    }
    if (m.role === 'user' && m.files?.length) {
      items.push({ role: 'user', content: [{ type: 'input_text', text: m.content }, ...m.files.map((f) => (f.kind === 'image' ? { type: 'input_image', image_url: dataUrl(f) } : { type: 'input_text', text: fileText(f) }))] });
      continue;
    }
    items.push({ role: m.role, content: m.content });
  }
  return items;
}

export function parseResponsesOutput(r: { output?: unknown[]; usage?: Record<string, unknown> | null; status?: string }): ModelResponse {
  let text = '';
  let reasoning = '';
  const toolCalls: ToolCall[] = [];
  for (const item of (r.output ?? []) as { type: string; content?: { type: string; text?: string }[]; summary?: { type: string; text?: string }[]; call_id?: string; name?: string; arguments?: string }[]) {
    if (item.type === 'message') text += (item.content ?? []).filter((c) => c.type === 'output_text').map((c) => c.text ?? '').join('');
    if (item.type === 'function_call') toolCalls.push({ id: item.call_id ?? '', name: item.name ?? '', arguments: item.arguments ?? '{}' });
    // Resumo do raciocínio (SIWC com `reasoning.summary`; rev. 6, critério 32).
    if (item.type === 'reasoning') reasoning += (item.summary ?? []).map((s) => s.text ?? '').filter(Boolean).join('\n\n');
  }
  const u = (r.usage ?? {}) as { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number } };
  const usage: Usage = { input_tokens: u.input_tokens ?? 0, cached_tokens: u.input_tokens_details?.cached_tokens ?? 0, cache_write_tokens: u.input_tokens_details?.cache_write_tokens ?? 0, output_tokens: u.output_tokens ?? 0 };
  return { text, toolCalls, usage, finish: toolCalls.length ? 'tool_calls' : r.status === 'incomplete' ? 'length' : 'stop', ...(reasoning ? { reasoning } : {}) };
}

export const responsesTools = (req: ModelRequest): unknown[] => (req.tools ?? []).map((t) => ({ type: 'function', name: t.name, description: t.description, parameters: t.parameters, strict: false }));

export function openaiResponsesAdapter(o: AdapterOptions): Provider {
  const client = new OpenAI({ apiKey: o.apiKey, baseURL: o.baseURL, maxRetries: 0 });
  return {
    id: o.id,
    async call(req: ModelRequest, ctx: CallContext): Promise<ModelResponse> {
      try {
        const params = {
          model: req.model,
          instructions: systemOf(req.messages) || undefined,
          input: responsesInput(req.messages),
          store: false, // a Responses API guarda 30 dias por padrão (SPEC 0001, escopo 13)
          ...(req.tools?.length ? { tools: responsesTools(req) } : {}),
          ...(req.maxOutputTokens ? { max_output_tokens: req.maxOutputTokens } : {}),
          ...(req.effort ? { reasoning: { effort: req.effort } } : {}),
        };
        const r = await client.responses.create(params as unknown as Parameters<typeof client.responses.create>[0], { headers: o.headers(ctx) });
        return parseResponsesOutput(r as unknown as { output?: unknown[]; usage?: Record<string, unknown> | null; status?: string });
      } catch (e) { return mapError(o.id, e); }
    },
  };
}

// ---------- Anthropic Messages (Go messages) ----------
export function anthropicAdapter(o: AdapterOptions & { maxTokens?: number }): Provider {
  const client = new Anthropic({ apiKey: o.apiKey, baseURL: o.baseURL, maxRetries: 0 });
  return {
    id: o.id,
    async call(req: ModelRequest, ctx: CallContext): Promise<ModelResponse> {
      const messages = req.messages.filter((m) => m.role !== 'system').map((m) => {
        if (m.role === 'tool') return { role: 'user' as const, content: [{ type: 'tool_result' as const, tool_use_id: m.toolCallId ?? '', content: m.content }] };
        if (m.role === 'assistant' && m.toolCalls?.length) {
          return { role: 'assistant' as const, content: [...(m.content ? [{ type: 'text' as const, text: m.content }] : []), ...m.toolCalls.map((t) => ({ type: 'tool_use' as const, id: t.id, name: t.name, input: parseArgs(t.arguments) }))] };
        }
        if (m.role === 'user' && m.files?.length) {
          return { role: 'user' as const, content: [{ type: 'text' as const, text: m.content }, ...m.files.map((f) => (f.kind === 'image'
            ? { type: 'image' as const, source: { type: 'base64' as const, media_type: f.mime as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp', data: f.data ?? '' } }
            : { type: 'text' as const, text: fileText(f) }))] };
        }
        return { role: m.role as 'user' | 'assistant', content: m.content };
      });
      try {
        // Messages: o esforço vira orçamento de pensamento, e max_tokens precisa ficar acima dele. Sem streaming, o SDK
        // recusa max_tokens que estime mais de 10 minutos (acima de ~21.333): o orçamento fica em até 20.000 (M1.5c).
        const budget = req.effort ? Math.min(THINKING_BUDGET[req.effort], MESSAGES_MAX_BUDGET) : 0;
        const r = await client.messages.create({
          model: req.model,
          max_tokens: Math.max(req.maxOutputTokens ?? o.maxTokens ?? 4096, budget + 1024),
          ...(budget ? { thinking: { type: 'enabled' as const, budget_tokens: budget } } : {}),
          ...(systemOf(req.messages) ? { system: systemOf(req.messages) } : {}),
          messages,
          ...(req.tools?.length ? { tools: req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters as { type: 'object' } })) } : {}),
        }, { headers: o.headers(ctx) });
        let text = '';
        const toolCalls: ToolCall[] = [];
        for (const b of r.content) {
          if (b.type === 'text') text += b.text;
          if (b.type === 'tool_use') toolCalls.push({ id: b.id, name: b.name, arguments: JSON.stringify(b.input ?? {}) });
        }
        const u = r.usage;
        const read = u.cache_read_input_tokens ?? 0;
        const write = u.cache_creation_input_tokens ?? 0;
        // "Total input tokens ... is the summation of input_tokens, cache_creation_input_tokens, and cache_read_input_tokens."
        const usage: Usage = { input_tokens: u.input_tokens + read + write, cached_tokens: read, cache_write_tokens: write, output_tokens: u.output_tokens };
        const finish = r.stop_reason === 'tool_use' ? 'tool_calls' : r.stop_reason === 'max_tokens' ? 'length' : r.stop_reason === 'end_turn' ? 'stop' : 'other';
        return { text, toolCalls, usage, finish };
      } catch (e) { return mapError(o.id, e); }
    },
  };
}

// ---------- Google (Go google) ----------
export function googleAdapter(o: AdapterOptions & { apiVersion?: string }): Provider {
  return {
    id: o.id,
    async call(req: ModelRequest, ctx: CallContext): Promise<ModelResponse> {
      const ai = new GoogleGenAI({ apiKey: o.apiKey, httpOptions: { baseUrl: o.baseURL, apiVersion: o.apiVersion ?? 'v1', headers: o.headers(ctx), retryOptions: { attempts: 1 } } });
      const names = new Map<string, string>();
      for (const m of req.messages) for (const t of m.toolCalls ?? []) names.set(t.id, t.name);
      const contents = req.messages.filter((m) => m.role !== 'system').map((m) => {
        if (m.role === 'tool') return { role: 'user', parts: [{ functionResponse: { name: names.get(m.toolCallId ?? '') ?? 'tool', response: { output: m.content } } }] };
        if (m.role === 'assistant') return { role: 'model', parts: [...(m.content ? [{ text: m.content }] : []), ...(m.toolCalls ?? []).map((t) => ({ functionCall: { name: t.name, args: parseArgs(t.arguments) } }))] };
        return { role: 'user', parts: [{ text: m.content }, ...(m.files ?? []).map((f) => (f.kind === 'image' ? { inlineData: { mimeType: f.mime, data: f.data ?? '' } } : { text: fileText(f) }))] };
      });
      try {
        const r = await ai.models.generateContent({
          model: req.model,
          contents,
          config: {
            ...(systemOf(req.messages) ? { systemInstruction: systemOf(req.messages) } : {}),
            ...(req.tools?.length ? { tools: [{ functionDeclarations: req.tools.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.parameters })) }] } : {}),
            ...(req.maxOutputTokens ? { maxOutputTokens: req.maxOutputTokens } : {}),
            ...(req.effort ? { thinkingConfig: { thinkingBudget: THINKING_BUDGET[req.effort] } } : {}),
          },
        });
        let text = '';
        const toolCalls: ToolCall[] = [];
        let i = 0;
        for (const p of r.candidates?.[0]?.content?.parts ?? []) {
          if (p.text) text += p.text;
          if (p.functionCall) toolCalls.push({ id: p.functionCall.id ?? `gcall_${i++}`, name: p.functionCall.name ?? '', arguments: JSON.stringify(p.functionCall.args ?? {}) });
        }
        const u = r.usageMetadata;
        const usage: Usage = { input_tokens: u?.promptTokenCount ?? 0, cached_tokens: u?.cachedContentTokenCount ?? 0, cache_write_tokens: 0, output_tokens: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0) };
        const fr = r.candidates?.[0]?.finishReason;
        return { text, toolCalls, usage, finish: toolCalls.length ? 'tool_calls' : fr === 'MAX_TOKENS' ? 'length' : fr === 'STOP' ? 'stop' : 'other' };
      } catch (e) { return mapError(o.id, e); }
    },
  };
}
