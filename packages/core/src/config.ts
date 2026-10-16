// Configuração do dono: ordem de provedores (ADR 0015) e credenciais (SPEC 0001, escopo 8).
// config.json no diretório de estado escolhe modelos e, nos testes, endereços; as chaves vêm de
// credentials/keys.json (gravado pelo login, só do dono) ou de variáveis de ambiente.

import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Route } from './agent.ts';
import { createGoProvider, createOllamaProvider, createOpenRouterProvider } from './providers/index.ts';
import { createChatGptProvider, loadCredentials, SIWC_ENDPOINTS } from './providers/siwc.ts';

export type ProviderId = 'opencode-go' | 'ollama-cloud' | 'chatgpt' | 'openrouter';
export interface RouteConfig { provider: ProviderId; model: string; baseURL?: string }
export interface Config { routes: RouteConfig[] }

// Modelos verificados ao vivo (registro da sonda real, 2026-10-16; exemplo oficial do SIWC).
// OpenRouter: modelo gratuito por padrão; modelo pago só por escolha explícita em config.json.
export const DEFAULT_ROUTES: RouteConfig[] = [
  { provider: 'opencode-go', model: 'kimi-k3' },
  { provider: 'ollama-cloud', model: 'gpt-oss:20b' },
  { provider: 'chatgpt', model: 'gpt-6.1-sol' },
  { provider: 'openrouter', model: 'nvidia/nemotron-3.5-super-vl:free' },
];

export const ENV_KEYS: Record<Exclude<ProviderId, 'chatgpt'>, string> = {
  'opencode-go': 'OPENCODE_GO_API_KEY',
  'ollama-cloud': 'OLLAMA_CLOUD_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};

export const keysPath = (home: string): string => join(home, 'credentials', 'keys.json');

export function loadConfig(home: string): Config {
  const file = join(home, 'config.json');
  if (!existsSync(file)) return { routes: DEFAULT_ROUTES };
  const c = JSON.parse(readFileSync(file, 'utf8')) as Partial<Config>;
  return { routes: c.routes ?? DEFAULT_ROUTES };
}

function loadKeys(home: string): Record<string, string> {
  const p = keysPath(home);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as Record<string, string>) : {};
}

// Rotas utilizáveis, na ordem configurada: só entra provedor com credencial.
export function buildRoutes(home: string, config: Config, env: NodeJS.ProcessEnv = process.env): Route[] {
  const keys = loadKeys(home);
  const routes: Route[] = [];
  for (const r of config.routes) {
    if (r.provider === 'chatgpt') {
      if (!loadCredentials(home)?.refreshToken) continue;
      routes.push({ provider: createChatGptProvider({ home, ...(r.baseURL ? { endpoints: { ...SIWC_ENDPOINTS, api: r.baseURL } } : {}) }), model: r.model });
      continue;
    }
    const apiKey = keys[r.provider] ?? env[ENV_KEYS[r.provider]];
    if (!apiKey) continue;
    const base = r.baseURL ? { baseURL: r.baseURL } : {};
    const provider = r.provider === 'opencode-go' ? createGoProvider({ apiKey, ...base })
      : r.provider === 'ollama-cloud' ? createOllamaProvider({ apiKey, ...base })
        : createOpenRouterProvider({ apiKey, ...base });
    routes.push({ provider, model: r.model });
  }
  return routes;
}

// Chave guardada pelo login: arquivo só do dono, escrita atômica (mesma guarda das credenciais OAuth).
export function saveKey(home: string, provider: string, key: string): void {
  writeOwnerOnly(keysPath(home), { ...loadKeys(home), [provider]: key });
}

export function removeKey(home: string, provider: string): boolean {
  const keys = loadKeys(home);
  if (!(provider in keys)) return false;
  delete keys[provider];
  writeOwnerOnly(keysPath(home), keys);
  return true;
}

export function hasCredential(home: string, provider: ProviderId, env: NodeJS.ProcessEnv = process.env): boolean {
  if (provider === 'chatgpt') return Boolean(loadCredentials(home)?.refreshToken);
  return Boolean(loadKeys(home)[provider] ?? env[ENV_KEYS[provider]]);
}

function writeOwnerOnly(p: string, data: unknown): void {
  mkdirSync(dirname(p), { recursive: true, mode: 0o700 });
  const tmp = `${p}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  renameSync(tmp, p);
  chmodSync(p, 0o600);
}
