// Contrato tipado da console (SPEC 0002, critério 10; axioma T3 "tipagem não é opcional").
// Cada método que a página pode chamar tem um esquema estrito: campo desconhecido, tipo errado ou valor fora
// da lista volta como erro -32602 (HTTP 400) com mensagem em português, antes de chegar ao núcleo.

import { z } from 'zod';
import type { CONSOLE_METHODS } from './console.ts';
import { EFFORTS } from './providers/types.ts';

type ConsoleMethod = (typeof CONSOLE_METHODS)[number];

const id = z.string().min(1).max(200);
const path = z.string().min(1).max(4096);
const text = z.string().max(100_000);
const empty = z.strictObject({});
const effort = z.enum([...EFFORTS, 'default', '']).nullable().optional();
const route = z.strictObject({ provider: z.enum(['opencode-go', 'ollama-cloud', 'chatgpt', 'openrouter']), model: z.string().min(1).max(200) }).nullable().optional();
const keyProvider = z.enum(['opencode-go', 'ollama-cloud', 'openrouter']);

export const CONSOLE_SCHEMAS = {
  'daemon.status': empty,
  'console.defaults': empty,
  'session.events': z.strictObject({ session: id }),
  'session.list': empty,
  'run.get': z.strictObject({ id }),
  'run.list': empty,
  'agent.run': z.strictObject({ session: id, task: text.min(1), workspace: path, interactive: z.boolean().optional(), effort, route, continueFrom: id.optional(), harness: id.nullable().optional(), attachments: z.array(z.string().regex(/^[0-9a-f]{64}$/)).max(10).optional(), lang: z.enum(['pt-BR', 'en']).optional() }),
  // Anexo (M1.3): o conteúdo em base64; teto de 7,2 milhões de caracteres (imagem de até 5 MB).
  'attachment.put': z.strictObject({ session: id, workspace: path, name: z.string().min(1).max(200), mime: z.string().min(1).max(100), data: z.string().min(1).max(7_200_000) }),
  'agent.resume': z.strictObject({ run: id, workspace: path, interactive: z.boolean().optional(), effort, route }),
  'run.live': z.strictObject({ session: id }),
  'agent.steer': z.strictObject({ session: id, text: text.optional(), queue: id.optional() }),
  'agent.unqueue': z.strictObject({ session: id, queue: id }),
  'agent.stop': z.strictObject({ session: id }),
  'approval.list': empty,
  'approval.resolve': z.strictObject({ id, decision: z.enum(['approve', 'deny']) }),
  'budget.status': empty,
  'providers.status': empty,
  'providers.usage': empty,
  'harness.list': z.strictObject({ refresh: z.boolean().optional() }),
  'harness.probe': z.strictObject({ id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/) }),
  'harness.firstRun.reset': z.strictObject({ id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/) }),
  'harness.login': z.strictObject({ id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/), method: id }),
  'models.list': empty,
  'keys.set': z.strictObject({ provider: keyProvider, key: z.string().min(1).max(4096) }),
  'keys.remove': z.strictObject({ provider: keyProvider }),
  'auth.chatgpt.start': empty,
  'auth.chatgpt.status': empty,
  'auth.chatgpt.logout': empty,
} satisfies Record<ConsoleMethod, z.ZodType>;

const TYPE: Record<string, string> = { string: 'texto', number: 'número', boolean: 'verdadeiro ou falso', object: 'um objeto', array: 'uma lista' };

// Uma frase por problema: "campo: motivo". Nunca ecoa o valor recebido (pode ser uma chave de API).
function describe(issue: z.core.$ZodIssue): string {
  const where = issue.path.length ? `${issue.path.join('.')}: ` : '';
  switch (issue.code) {
    case 'invalid_type':
      if (issue.input === undefined) return `${where}obrigatório`;
      return `${where}esperado ${TYPE[issue.expected] ?? issue.expected}`;
    case 'invalid_value': return `${where}deve ser um de: ${issue.values.map(String).join(', ')}`;
    case 'unrecognized_keys': return `campo desconhecido: ${issue.keys.join(', ')}`;
    case 'too_small': return `${where}vazio ou curto demais`;
    case 'too_big': return `${where}longo demais`;
    default: return `${where}inválido`;
  }
}

export type ParamsCheck = { ok: true; params: Record<string, unknown> } | { ok: false; message: string };

export function checkParams(method: ConsoleMethod, input: unknown): ParamsCheck {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return { ok: false, message: `parâmetros de ${method}: esperado um objeto` };
  // reportInput: só para separar "faltou" de "tipo errado"; o valor nunca vai para a mensagem.
  const r = CONSOLE_SCHEMAS[method].safeParse(input, { reportInput: true });
  if (r.success) return { ok: true, params: r.data as Record<string, unknown> };
  return { ok: false, message: `parâmetros de ${method}: ${r.error.issues.map(describe).join('; ')}` };
}
