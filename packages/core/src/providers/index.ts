// Fábricas dos provedores na ordem da ADR 0015: OpenCode Go → Ollama Cloud → ChatGPT → OpenRouter.

import { anthropicAdapter, googleAdapter, openaiChatAdapter, openaiResponsesAdapter } from './adapters.ts';
import { trustSystemCAs, USER_AGENT } from './identity.ts';
import { ProviderLimitError, type CallContext, type ModelRequest, type ModelResponse, type Provider } from './types.ts';

export { ProviderLimitError, ProviderRejectedError, ProviderUnknownError } from './types.ts';
export type { Provider, ModelRequest, ModelResponse, ChatMessage, ToolCall, ToolSpec, CallContext } from './types.ts';
export { trustSystemCAs, USER_AGENT } from './identity.ts';
export { createChatGptProvider, startLogin, logout, SiwcAuth, SiwcAuthError, loadCredentials, credentialsPath, SIWC_ENDPOINTS, type ChatGptCredentials, type SiwcEndpoints } from './siwc.ts';

export const GO_BASE = 'https://opencode.ai/inference/go/v1';
export const OLLAMA_BASE = 'https://ollama.com/v1';
export const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// Rota de cada modelo no OpenCode Go (ficha assinaturas-de-agentes, página oficial em 2026-10-15).
const GO_RESPONSES = new Set(['gpt-6-luna', 'gpt-5.6-luna', 'grok-4.7', 'grok-4.6', 'muse-spark-1.3-contributor', 'muse-spark-1.2-contributor']);
const GO_MESSAGES = new Set(['claude-haiku-5-5', 'minimax-m3', 'minimax-m2.7', 'qwen3.8-max', 'qwen3.8-flash', 'qwen3.7-plus']);
const GO_GOOGLE = new Set(['gemini-4-argon-contributor']);

export function goRoute(model: string): 'responses' | 'messages' | 'google' | 'chat' {
  if (GO_RESPONSES.has(model)) return 'responses';
  if (GO_MESSAGES.has(model)) return 'messages';
  if (GO_GOOGLE.has(model)) return 'google';
  return 'chat';
}

export function createGoProvider({ apiKey, baseURL = GO_BASE }: { apiKey: string; baseURL?: string }): Provider {
  trustSystemCAs();
  const headers = (ctx: CallContext) => ({ 'User-Agent': USER_AGENT, 'x-opencode-session': ctx.session });
  const root = baseURL.replace(/\/v1\/?$/, '');
  const routes = {
    responses: openaiResponsesAdapter({ id: 'opencode-go', apiKey, baseURL, headers }),
    chat: openaiChatAdapter({ id: 'opencode-go', apiKey, baseURL, headers }),
    messages: anthropicAdapter({ id: 'opencode-go', apiKey, baseURL: root, headers }),
    google: googleAdapter({ id: 'opencode-go', apiKey, baseURL: root, headers, apiVersion: 'v1' }),
  };
  return {
    id: 'opencode-go',
    async call(req: ModelRequest, ctx: CallContext): Promise<ModelResponse> {
      try { return await routes[goRoute(req.model)].call(req, ctx); } catch (e) {
        // Recusa por limite (402 "sem fundos" ou 429): a telemetria diz qual janela travou e quando volta.
        if (!(e instanceof ProviderLimitError)) throw e;
        const blocked = (await goUsage({ apiKey, baseURL }).catch(() => [])).filter((w) => w.status !== 'ok' && Number.isFinite(Date.parse(w.resetsAt)));
        if (!blocked.length) throw e;
        const last = blocked.reduce((a, b) => (Date.parse(b.resetsAt) > Date.parse(a.resetsAt) ? b : a));
        const nomes = blocked.map((w) => WINDOW_NAME[w.window] ?? w.window).join(' e ');
        const pct = blocked.map((w) => `${w.percent}%`).join(', ');
        throw new ProviderLimitError('opencode-go', Date.parse(last.resetsAt), `limite ${nomes} do OpenCode Go (${pct}); volta em ${last.resetsAt}`, 'provider');
      }
    },
  };
}

// Telemetria de uso do OpenCode Go: GET /v1/usage (medido em 2026-10-18; ficha assinaturas-de-agentes).
export interface GoWindow { window: string; status: string; percent: number; resetsAt: string }
const WINDOW_NAME: Record<string, string> = { rolling: 'rolante', weekly: 'semanal', monthly: 'mensal' };
export async function goUsage({ apiKey, baseURL = GO_BASE }: { apiKey: string; baseURL?: string }): Promise<GoWindow[]> {
  trustSystemCAs();
  const r = await fetch(`${baseURL.replace(/\/$/, '')}/usage`, { headers: { Authorization: `Bearer ${apiKey}`, 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`usage ${r.status}`);
  const u = ((await r.json()) as { usage?: Record<string, { status?: string; percent?: number; resetsAt?: string }> }).usage ?? {};
  return Object.entries(u).map(([window, w]) => ({ window, status: String(w.status ?? ''), percent: Number(w.percent ?? 0), resetsAt: String(w.resetsAt ?? '') }));
}

export function createOllamaProvider({ apiKey, baseURL = OLLAMA_BASE }: { apiKey: string; baseURL?: string }): Provider {
  trustSystemCAs();
  return openaiChatAdapter({ id: 'ollama-cloud', apiKey, baseURL, headers: () => ({ 'User-Agent': USER_AGENT }) });
}

export function createOpenRouterProvider({ apiKey, baseURL = OPENROUTER_BASE }: { apiKey: string; baseURL?: string }): Provider {
  trustSystemCAs();
  return openaiChatAdapter({ id: 'openrouter', apiKey, baseURL, headers: () => ({ 'User-Agent': USER_AGENT, 'X-OpenRouter-Title': 'Rabelus Buddy' }) });
}
