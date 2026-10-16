// Fábricas dos provedores na ordem da ADR 0015: OpenCode Go → Ollama Cloud → ChatGPT → OpenRouter.

import { anthropicAdapter, googleAdapter, openaiChatAdapter, openaiResponsesAdapter } from './adapters.ts';
import { trustSystemCAs, USER_AGENT } from './identity.ts';
import type { CallContext, ModelRequest, ModelResponse, Provider } from './types.ts';

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
  return { id: 'opencode-go', call: (req: ModelRequest, ctx: CallContext): Promise<ModelResponse> => routes[goRoute(req.model)].call(req, ctx) };
}

export function createOllamaProvider({ apiKey, baseURL = OLLAMA_BASE }: { apiKey: string; baseURL?: string }): Provider {
  trustSystemCAs();
  return openaiChatAdapter({ id: 'ollama-cloud', apiKey, baseURL, headers: () => ({ 'User-Agent': USER_AGENT }) });
}

export function createOpenRouterProvider({ apiKey, baseURL = OPENROUTER_BASE }: { apiKey: string; baseURL?: string }): Provider {
  trustSystemCAs();
  return openaiChatAdapter({ id: 'openrouter', apiKey, baseURL, headers: () => ({ 'User-Agent': USER_AGENT, 'X-OpenRouter-Title': 'Rabelus Buddy' }) });
}
