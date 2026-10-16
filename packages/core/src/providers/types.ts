// Contrato único dos provedores (SPEC 0001, escopo 7; ADRs 0014 e 0015).
import type { Usage } from '../budget.ts';

export interface ToolCall { id: string; name: string; arguments: string }
export interface ToolSpec { name: string; description: string; parameters: Record<string, unknown> }
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}
export interface ModelRequest { model: string; messages: ChatMessage[]; tools?: ToolSpec[]; maxOutputTokens?: number }
export interface ModelResponse { text: string; toolCalls: ToolCall[]; usage: Usage; finish: 'stop' | 'tool_calls' | 'length' | 'other' }
export interface CallContext { session: string }
export interface Provider {
  id: string;
  call: (req: ModelRequest, ctx: CallContext) => Promise<ModelResponse>;
}

// Limite do provedor atingido (HTTP 429 ou erro de limite): esgota a janela até `until`.
export class ProviderLimitError extends Error {
  readonly until: number;
  readonly provider: string;
  constructor(provider: string, until: number, message: string) {
    super(message);
    this.provider = provider;
    this.until = until;
  }
}

// Falha sem resposta conclusiva (queda, stream interrompido): o efeito fica desconhecido.
export class ProviderUnknownError extends Error {}
