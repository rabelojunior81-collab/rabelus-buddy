// Voz do Buddy (produto): a instrução de sistema mora no catálogo de idiomas (locales/<idioma>/agent.json), como
// toda string do produto. A pasta de trabalho entra aqui; o modelo em uso ({{route}}) entra a cada chamada, no Agent.
// Pedido do Pai (2026-10-20): resposta e personalidade estavam cruas; camada de inglês sob o app inteiro.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = join(import.meta.dirname, '..', '..', '..', 'locales');
export const AGENT_LANGS = ['pt-BR', 'en'] as const;
export type AgentLang = (typeof AGENT_LANGS)[number];

export function buddySystem(lang: AgentLang, workspace: string): string {
  const l = (AGENT_LANGS as readonly string[]).includes(lang) ? lang : 'pt-BR';
  const p = join(LOCALES, l, 'agent.json');
  const text = existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as { agent?: { system?: string } }).agent?.system : undefined;
  if (!text) throw new Error(`instrução do Buddy ausente em locales/${l}/agent.json`);
  return text.replaceAll('{{workspace}}', workspace);
}
