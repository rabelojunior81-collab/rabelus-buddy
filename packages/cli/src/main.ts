// Entrada da CLI do Rabelus Buddy (SPEC 0001, escopo 16; ADR 0011).
// M0.1: --help, --version, --lang. M0.2: daemon start|status|stop.

import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createI18n, resolveLang, type I18n } from '@rabelus-buddy/client/i18n';
import { call, RpcError, RPC_ERR } from '@rabelus-buddy/client/ipc';
import { startOwner, AlreadyRunningError, stateHome, endpointFor } from '@rabelus-buddy/core';

const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')) as { version: string };

export interface Io {
  out: (text: string) => void;
  err: (text: string) => void;
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
  else if (r.error) io.err(r.error.message);
  return 1;
}

export async function run(argv: string[], env: NodeJS.ProcessEnv, io: Io): Promise<number> {
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
  if (command === 'approvals') return approvals(env, io, i18n);
  if (command === 'approve' || command === 'deny') return resolve(command, positionals[1], env, io, i18n);
  io.err(t('cli.unknownCommand', { command }));
  return 1;
}
