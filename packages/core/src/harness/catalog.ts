// Catálogo de harnesses pelo registro oficial do ACP e detecção sem configuração (SPEC 0002, critérios 1 e 2).
// O registro (medido em 2026-10-18: 42 agentes; npx 23, binary 19, uvx 2) não diz como saber se um harness
// está instalado: a tabela de sinais (o binário que o denuncia no PATH) é nossa. Nada é instalado aqui.

import { accessSync, constants, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { z } from 'zod';
import { trustSystemCAs, USER_AGENT } from '../providers/identity.ts';

export const REGISTRY_URL = 'https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json';
const ICON_MAX = 100_000;

export type Launch =
  | { kind: 'npx' | 'uvx'; package: string; args: string[]; env: Record<string, string> }
  | { kind: 'binary'; platforms: Record<string, { archive: string; cmd: string; args: string[]; sha256?: string }> }
  | { kind: 'local'; cmd: string; args: string[] };

export interface CatalogEntry { id: string; name: string; version: string | null; description: string; license: string | null; website: string | null; icon: boolean; launch: Launch }
export interface RegistryState { source: 'network' | 'cache' | 'none'; fetchedAt: string | null; version: string | null; agents: CatalogEntry[]; error?: string }
export interface HarnessView extends CatalogEntry { found: boolean; path?: string; signal?: string; offRegistry: boolean }

// Sinais de instalação: o executável que denuncia o harness no PATH. Confirmados no computador do Pai em
// 2026-10-18: claude, codex, opencode, copilot, pi e hermes; os demais, pelo nome do executável de cada CLI.
export const SIGNALS: Record<string, string[]> = {
  'claude-acp': ['claude'], 'codex-acp': ['codex'], opencode: ['opencode'], 'github-copilot-cli': ['copilot'],
  'pi-acp': ['pi'], gemini: ['gemini'], goose: ['goose'], cursor: ['cursor-agent'], 'qwen-code': ['qwen'],
  kimi: ['kimi'], 'amp-acp': ['amp'], auggie: ['auggie'], cline: ['cline'], 'factory-droid': ['droid'], 'mistral-vibe': ['vibe'],
};

// Fora do registro oficial: tabela curta nossa, com ícone genérico.
export const OFF_REGISTRY: (CatalogEntry & { signals: string[] })[] = [
  // Hermes Agent (Nous Research, MIT): servidor ACP próprio em `hermes acp` (acp_adapter/entry.py, lido em 2026-10-18).
  { id: 'hermes', name: 'Hermes Agent', version: null, description: 'Agente da Nous Research, fora do registro oficial do ACP', license: 'MIT', website: 'https://github.com/NousResearch/hermes-agent', icon: false, launch: { kind: 'local', cmd: 'hermes', args: ['acp'] }, signals: ['hermes'] },
];

const pkg = z.looseObject({ package: z.string().min(1), args: z.array(z.string()).optional(), env: z.record(z.string(), z.string()).optional() });
const AgentSchema = z.looseObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,63}$/),
  name: z.string().min(1).max(100),
  version: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
  license: z.string().max(100).optional(),
  website: z.string().max(500).optional(),
  repository: z.string().max(500).optional(),
  icon: z.string().max(500).optional(),
  distribution: z.looseObject({
    npx: pkg.optional(),
    uvx: pkg.optional(),
    binary: z.record(z.string(), z.looseObject({ archive: z.string(), cmd: z.string(), args: z.array(z.string()).optional(), sha256: z.string().optional() })).optional(),
  }),
});
const RegistrySchema = z.looseObject({ version: z.string().optional(), agents: z.array(z.unknown()) });

const dir = (home: string) => join(home, 'acp');
const cacheFile = (home: string) => join(dir(home), 'registry.json');
export const iconPath = (home: string, id: string): string | null => (/^[a-z0-9][a-z0-9._-]{0,63}$/.test(id) ? join(dir(home), 'icons', `${id}.svg`) : null);

function launchOf(d: z.infer<typeof AgentSchema>['distribution']): Launch | null {
  // Preferência: npx, uvx, binário (o binário baixa um arquivo inteiro; os outros, só o pacote).
  for (const kind of ['npx', 'uvx'] as const) {
    const p = d[kind];
    if (p) return { kind, package: p.package, args: p.args ?? [], env: p.env ?? {} };
  }
  if (d.binary && Object.keys(d.binary).length) {
    return { kind: 'binary', platforms: Object.fromEntries(Object.entries(d.binary).map(([k, v]) => [k, { archive: v.archive, cmd: v.cmd, args: v.args ?? [], ...(v.sha256 ? { sha256: v.sha256 } : {}) }])) };
  }
  return null;
}

export function readRegistry(home: string): RegistryState {
  try {
    const c = JSON.parse(readFileSync(cacheFile(home), 'utf8')) as RegistryState;
    return { source: 'cache', fetchedAt: c.fetchedAt, version: c.version, agents: c.agents };
  } catch {
    return { source: 'none', fetchedAt: null, version: null, agents: [] };
  }
}

async function fetchIcon(url: string, timeoutMs: number): Promise<string | null> {
  if (!/^https?:\/\//.test(url)) return null;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok || !/image\/svg\+xml/i.test(r.headers.get('content-type') ?? '')) return null;
    const t = await r.text();
    // SVG sem script nem handler: servido como imagem isolada, mas o que entra já vem limpo.
    if (t.length > ICON_MAX || !/^\s*(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(t) || /<script|\son\w+\s*=|javascript:/i.test(t)) return null;
    return t;
  } catch {
    return null;
  }
}

function save(path: string, data: string): void {
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}

// Busca o registro, valida, guarda a cópia e os ícones. Nunca lança: falha volta como a cópia anterior e o motivo.
export async function refreshRegistry({ home, url = process.env.RBUDDY_ACP_REGISTRY ?? REGISTRY_URL, timeoutMs = 10_000 }: { home: string; url?: string; timeoutMs?: number }): Promise<RegistryState> {
  const previous = readRegistry(home);
  const fail = (error: string): RegistryState => ({ ...previous, error });
  trustSystemCAs();
  let raw: unknown;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return fail(`registro respondeu ${r.status}`);
    const text = await r.text();
    try { raw = JSON.parse(text); } catch { return fail('registro inválido: JSON malformado'); }
  } catch (e) {
    return fail(`registro fora do alcance: ${(e as Error).name}`);
  }
  const top = RegistrySchema.safeParse(raw);
  if (!top.success) return fail('registro inválido: sem a lista de agentes');
  mkdirSync(join(dir(home), 'icons'), { recursive: true });
  const agents: CatalogEntry[] = [];
  // Entrada fora da forma é pulada; o resto do catálogo segue.
  const parsed = top.data.agents.map((a) => AgentSchema.safeParse(a)).filter((r) => r.success).map((r) => r.data);
  const icons = await Promise.all(parsed.map((a) => (a.icon ? fetchIcon(a.icon, Math.min(timeoutMs, 5000)) : Promise.resolve(null))));
  parsed.forEach((a, i) => {
    const launch = launchOf(a.distribution);
    if (!launch) return;
    const svg = icons[i];
    const ip = iconPath(home, a.id)!;
    if (svg) save(ip, svg);
    agents.push({ id: a.id, name: a.name, version: a.version ?? null, description: a.description ?? '', license: a.license ?? null, website: a.website ?? a.repository ?? null, icon: Boolean(svg) || existsSync(ip), launch });
  });
  const state: RegistryState = { source: 'network', fetchedAt: new Date().toISOString(), version: top.data.version ?? null, agents };
  save(cacheFile(home), `${JSON.stringify({ fetchedAt: state.fetchedAt, version: state.version, agents }, null, 2)}\n`);
  return state;
}

// Procura um executável no PATH como o sistema faria (no Windows, pelas extensões do PATHEXT).
export function findOnPath(name: string, env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string | null {
  const dirs = (env.PATH ?? env.Path ?? '').split(delimiter).filter(Boolean);
  const exts = platform === 'win32' ? (env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean) : [''];
  for (const d of dirs) {
    for (const ext of exts) {
      const p = join(d, name + ext.toLowerCase());
      try {
        if (!statSync(p).isFile()) continue;
        if (platform !== 'win32') accessSync(p, constants.X_OK);
        return p;
      } catch { /* não está aqui */ }
    }
  }
  return null;
}

export function detectHarnesses(home: string, env: NodeJS.ProcessEnv = process.env): HarnessView[] {
  const views: HarnessView[] = [];
  const look = (signals: string[]) => {
    for (const s of signals) { const p = findOnPath(s, env); if (p) return { found: true, path: p, signal: s }; }
    return { found: false };
  };
  for (const a of readRegistry(home).agents) views.push({ ...a, ...look(SIGNALS[a.id] ?? []), offRegistry: false });
  for (const { signals, ...o } of OFF_REGISTRY) views.push({ ...o, ...look(signals), offRegistry: true });
  // Encontrados primeiro; dentro de cada grupo, a ordem do registro.
  return [...views.filter((v) => v.found), ...views.filter((v) => !v.found)];
}
