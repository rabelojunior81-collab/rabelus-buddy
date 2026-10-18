// Entrada da CLI do Rabelus Buddy (SPEC 0001, escopo 16; ADR 0011).
// M0.1: --help, --version, --lang. M0.2: daemon start|status|stop. M0.6b: login|logout chatgpt. M0.7b: run, resume, status, log, providers, login por chave.

import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createI18n, resolveLang, type I18n } from '@rabelus-buddy/client/i18n';
import { call, RpcError, RPC_ERR } from '@rabelus-buddy/client/ipc';
import { runCmd, resumeCmd, statusCmd, logCmd, providersCmd, uiCmd, keyLogin, keyLogout, isKeyProvider, type Prompt } from './agente.ts';
import { startOwner, AlreadyRunningError, stateHome, endpointFor, startLogin, logout, loadCredentials, SiwcAuthError, SIWC_ENDPOINTS, type SiwcEndpoints } from '@rabelus-buddy/core';

const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')) as { version: string };

export interface Io {
  out: (text: string) => void;
  err: (text: string) => void;
}

// Dependências trocáveis nos testes: servidor OAuth falso, porta livre, navegador simulado.
export interface Deps { siwcEndpoints?: SiwcEndpoints; loginPort?: number; openUrl?: (url: string) => void; cwd?: string; interactive?: boolean; prompt?: Prompt }

// Abre a URL no navegador padrão; se falhar, a URL já está na tela.
function openBrowser(url: string): void {
  const [cmd, args] = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try {
    // rundll32, open e xdg-open: programa sem console (abre o navegador); esconder esconderia o navegador.
    const child = spawn(cmd as string, args as string[], { detached: true, stdio: 'ignore' });
    child.on('error', () => {});
    child.unref();
  } catch { /* sem navegador: segue com a URL impressa */ }
}

async function login(provider: string | undefined, noBrowser: boolean, env: NodeJS.ProcessEnv, io: Io, { t }: I18n, deps: Deps): Promise<number> {
  if (provider !== 'chatgpt') {
    io.err(t('login.usage'));
    return 1;
  }
  const pending = await startLogin({
    home: stateHome(env),
    endpoints: deps.siwcEndpoints ?? SIWC_ENDPOINTS,
    ...(deps.loginPort !== undefined ? { port: deps.loginPort } : {}),
    page: { ok: t('login.pageOk'), fail: t('login.pageFail') },
  });
  io.out(t('login.openUrl', { url: pending.url }));
  if (!noBrowser) (deps.openUrl ?? openBrowser)(pending.url);
  io.out(t('login.waiting'));
  try {
    const c = await pending.done;
    io.out(t(c.planEnabled ? 'login.done' : 'login.planDisabled', { email: c.email ?? c.sub ?? '?' }));
    return 0;
  } catch (e) {
    io.err(t('login.failed', { code: e instanceof SiwcAuthError ? e.code : (e as NodeJS.ErrnoException).code ?? 'error' }));
    return 1;
  }
}

async function signOut(provider: string | undefined, env: NodeJS.ProcessEnv, io: Io, { t }: I18n, deps: Deps): Promise<number> {
  if (provider !== 'chatgpt') {
    io.err(t('login.usage'));
    return 1;
  }
  const home = stateHome(env);
  if (!loadCredentials(home)?.refreshToken) {
    io.out(t('login.logoutNone'));
    return 0;
  }
  const { revoked } = await logout(home, deps.siwcEndpoints ?? SIWC_ENDPOINTS);
  io.out(t(revoked ? 'login.logoutDone' : 'login.logoutUnconfirmed'));
  return 0;
}

interface OwnerStatus { pid: number; startedAt: string; sessions: number; events: number; endpoint: string }

async function daemon(sub: string | undefined, env: NodeJS.ProcessEnv, io: Io, { t }: I18n): Promise<number> {
  const home = stateHome(env);
  const endpoint = endpointFor(home);
  if (sub === 'start') {
    try {
      const owner = await startOwner(home);
      io.out(t('daemon.started', { endpoint: owner.endpoint, pid: owner.pid }));
      const stop = () => { void owner.close(); };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
      await owner.closed;
      return 0;
    } catch (e) {
      if (e instanceof AlreadyRunningError) {
        io.err(t('daemon.alreadyRunning', { endpoint: e.endpoint }));
        return 1;
      }
      throw e;
    }
  }
  if (sub === 'status' || sub === 'stop') {
    let status: OwnerStatus;
    try {
      status = (await call(endpoint, 'daemon.status', {})) as OwnerStatus;
    } catch {
      io.err(t('daemon.notRunning'));
      return 1;
    }
    if (sub === 'status') {
      io.out(t('daemon.status', { ...status }));
      return 0;
    }
    await call(endpoint, 'daemon.stop', {});
    io.out(t('daemon.stopped'));
    return 0;
  }
  io.err(t('daemon.usage'));
  return 1;
}

interface Approval { id: string; session: string; action: string; state: string }

// Chamada ao dono; sem dono no ar, a mensagem é a do catálogo.
async function owner(env: NodeJS.ProcessEnv, io: Io, { t }: I18n, method: string, params: Record<string, unknown>): Promise<{ ok: true; value: unknown } | { ok: false; error?: RpcError }> {
  try {
    return { ok: true, value: await call(endpointFor(stateHome(env)), method, params) };
  } catch (e) {
    if (e instanceof RpcError) return { ok: false, error: e };
    io.err(t('daemon.notRunning'));
    return { ok: false };
  }
}

async function approvals(env: NodeJS.ProcessEnv, io: Io, i18n: I18n): Promise<number> {
  const r = await owner(env, io, i18n, 'approval.list', {});
  if (!r.ok) return 1;
  const list = r.value as Approval[];
  if (!list.length) {
    io.out(i18n.t('approvals.none'));
    return 0;
  }
  io.out([i18n.t('approvals.header', { count: list.length }), ...list.map((a) => i18n.t('approvals.item', { ...a }))].join('\n'));
  return 0;
}

async function resolve(decision: 'approve' | 'deny', id: string | undefined, env: NodeJS.ProcessEnv, io: Io, i18n: I18n): Promise<number> {
  const { t } = i18n;
  if (!id) {
    io.err(t('approvals.usage'));
    return 1;
  }
  const r = await owner(env, io, i18n, 'approval.resolve', { id, decision });
  if (r.ok) {
    io.out(t(decision === 'approve' ? 'approvals.approved' : 'approvals.denied', { id }));
    return 0;
  }
  if (r.error?.code === RPC_ERR.notFound) io.err(t('approvals.notFound', { id }));
  else if (r.error?.code === RPC_ERR.alreadyResolved) io.err(t('approvals.alreadyResolved', { id, state: String(r.error.data.state) }));
  else if (r.error) io.err(t('cli.rpcError', { code: r.error.code }));
  return 1;
}

interface WindowStatus { id: string; capacity: number | null; periodHours: number; used: number; exhaustedUntil: string | null }

async function budget(env: NodeJS.ProcessEnv, io: Io, i18n: I18n): Promise<number> {
  const { t } = i18n;
  const r = await owner(env, io, i18n, 'budget.status', {});
  if (!r.ok) return 1;
  const lines = (r.value as WindowStatus[]).map((w) => {
    if (w.exhaustedUntil) return t('budget.exhausted', { id: w.id, until: w.exhaustedUntil });
    const used = w.used.toFixed(4);
    return w.capacity === null
      ? t('budget.itemNoCap', { id: w.id, used, hours: w.periodHours })
      : t('budget.item', { id: w.id, used, capacity: w.capacity.toFixed(2), hours: w.periodHours });
  });
  io.out([t('budget.header'), ...lines].join('\n'));
  return 0;
}

export async function run(argv: string[], env: NodeJS.ProcessEnv, io: Io, deps: Deps = {}): Promise<number> {
  // O idioma vem antes de tudo, para que até o erro de opção saia no idioma pedido.
  const langIdx = argv.indexOf('--lang');
  const i18n = createI18n(resolveLang({ flag: langIdx >= 0 ? argv[langIdx + 1] : undefined, env: env.RBUDDY_LANG }));
  const { t } = i18n;

  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
        lang: { type: 'string' },
        'no-browser': { type: 'boolean' },
      },
    });
  } catch (e) {
    const option = /'(-[^']+)'/.exec((e as Error).message)?.[1] ?? argv.find((a) => a.startsWith('-')) ?? '';
    io.err(t('cli.unknownOption', { option }));
    return 1;
  }

  const { values, positionals } = parsed;
  if (values.version) {
    io.out(t('cli.version', { version: pkg.version }));
    return 0;
  }
  const command = positionals[0];
  if (values.help || !command) {
    io.out(t('cli.help'));
    return 0;
  }
  if (command === 'daemon') return daemon(positionals[1], env, io, i18n);
  if (command === 'login') return isKeyProvider(positionals[1]) ? keyLogin(positionals[1], env, io, i18n, deps) : login(positionals[1], values['no-browser'] === true, env, io, i18n, deps);
  if (command === 'logout') return isKeyProvider(positionals[1]) ? keyLogout(positionals[1], env, io, i18n) : signOut(positionals[1], env, io, i18n, deps);
  if (command === 'run') return runCmd(positionals.slice(1).join(' ') || undefined, env, io, i18n, deps);
  if (command === 'resume') return resumeCmd(positionals[1], env, io, i18n, deps);
  if (command === 'status') return statusCmd(env, io, i18n);
  if (command === 'log') return logCmd(positionals[1], env, io, i18n);
  if (command === 'providers') return providersCmd(env, io, i18n);
  if (command === 'ui') return uiCmd(env, io, i18n, deps.openUrl ?? openBrowser);
  if (command === 'approvals') return approvals(env, io, i18n);
  if (command === 'budget') return budget(env, io, i18n);
  if (command === 'approve' || command === 'deny') return resolve(command, positionals[1], env, io, i18n);
  io.err(t('cli.unknownCommand', { command }));
  return 1;
}
