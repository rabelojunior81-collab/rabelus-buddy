// Contrato único dos provedores (SPEC 0001, escopo 7; ADRs 0014 e 0015).
import type { Usage } from '../budget.ts';

export interface ToolCall { id: string; name: string; arguments: string }
export interface ToolSpec { name: string; description: string; parameters: Record<string, unknown> }
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  // Anexos (M1.3): no log, só a referência; no pedido, o conteúdo lido do arquivo, em `files` (nunca registrado).
  attachments?: { hash: string; name: string; mime: string; kind: 'image' | 'text'; size: number }[];
  files?: { kind: 'image' | 'text'; name: string; mime: string; data?: string; text?: string }[];
}
// Esforço de raciocínio por execução (SPEC 0001 rev. 5, critério 29); ausente = padrão do provedor.
// Os oito níveis que os provedores declaram no catálogo real (M1.5c, medido em 2026-10-19), conforme o modelo.
export const EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'] as const;
export type Effort = (typeof EFFORTS)[number];
export interface ModelRequest { model: string; messages: ChatMessage[]; tools?: ToolSpec[]; maxOutputTokens?: number; effort?: Effort }
// reasoning: o raciocínio que o provedor expõe (resumo no SIWC; bruto no Ollama e no OpenRouter), para o log (critério 32).
export interface ModelResponse { text: string; toolCalls: ToolCall[]; usage: Usage; finish: 'stop' | 'tool_calls' | 'length' | 'other'; reasoning?: string }
// Andamento da chamada, em fragmentos, para quem observa (SPEC 0001 rev. 6, critério 31). Não vai para o log.
export type Progress = { kind: 'reasoning' | 'text'; delta: string } | { kind: 'tool'; name: string };
// signal: parar pela console aborta a chamada em curso (critério 33).
export interface CallContext { session: string; signal?: AbortSignal; onProgress?: (p: Progress) => void }
export interface Provider {
  id: string;
  call: (req: ModelRequest, ctx: CallContext) => Promise<ModelResponse>;
}

// Limite do provedor atingido (HTTP 429 ou erro de limite): esgota a janela até `until`.
// scope: 'provider' quando o limite é da conta (todos os modelos), como a janela semanal do Go (SPEC 0002, critério 15).
export class ProviderLimitError extends Error {
  readonly until: number;
  readonly provider: string;
  readonly scope?: 'provider' | 'model';
  constructor(provider: string, until: number, message: string, scope?: 'provider' | 'model') {
    super(message);
    this.provider = provider;
    this.until = until;
    if (scope) this.scope = scope;
  }
}

// Recusa conclusiva do provedor (permissão, elegibilidade, corpo inválido): não se repete igual.
export class ProviderRejectedError extends Error {
  readonly provider: string;
  readonly code: string;
  constructor(provider: string, code: string, message: string) {
    super(message);
    this.provider = provider;
    this.code = code;
  }
}

// Falha sem resposta conclusiva (queda, stream interrompido): o efeito fica desconhecido.
export class ProviderUnknownError extends Error {}
