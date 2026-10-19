// Conversa por ACP (SPEC 0002, critério 5): um turno com o harness. initialize, session/new e session/prompt; as
// atualizações (raciocínio, texto, ferramenta) chegam por session/update e vão a quem observa. Parar envia
// session/cancel e espera o harness devolver stopReason "cancelled", como o ACP define. Permissão pedida pelo
// harness: quem chama decide (até a M1.2d, sempre "cancelled", registrada).

import type { ChildProcess } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import { client, ndJsonStream, PROTOCOL_VERSION } from '@agentclientprotocol/sdk';
import { scrub } from '../providers/adapters.ts';
import { killTree, loginMethods, spawnHarness, type LaunchSpec } from './client.ts';

export type TurnUpdate =
  | { kind: 'reasoning' | 'text'; delta: string }
  | { kind: 'tool'; id: string; title: string; status: string; toolKind?: string };

export interface PermissionAsk { toolCallId: string; title: string; kind?: string; paths: string[]; options: { optionId: string; name: string; kind: string }[] }
export type PermissionAnswer = { outcome: 'cancelled' } | { outcome: 'selected'; optionId: string };

export interface TurnOptions {
  cwd: string;
  task: string;
  signal?: AbortSignal;
  onUpdate?: (u: TurnUpdate) => void;
  onPermission?: (ask: PermissionAsk) => PermissionAnswer | Promise<PermissionAnswer>;
  // Postura (M1.2d): se o harness declara a opção de modo com este valor (o Codex declara "read-only"), o turno
  // a liga por session/set_config_option antes da tarefa. onPosture conta o modo em vigor (null: não declarado).
  preferMode?: string;
  onPosture?: (p: { mode: string | null }) => void;
  // Sem nenhuma mensagem do harness por este tempo, o turno falha (o harness pode pensar por minutos: o relógio
  // reinicia a cada atualização).
  idleMs?: number;
}

export interface TurnResult { stopReason: string; text: string; agent?: { name: string; version?: string } }

export class TurnError extends Error {}
// O harness pede login (auth_required no session/new): leva os métodos que o Pai pode usar (critério 7).
export class NeedsLogin extends TurnError {
  readonly methods: { id: string; name: string }[];
  constructor(methods: { id: string; name: string }[]) { super('o harness pede login (auth_required)'); this.methods = methods; }
}

export async function promptTurn(spec: LaunchSpec, o: TurnOptions): Promise<TurnResult> {
  const idleMs = o.idleMs ?? 10 * 60_000;
  let child: ChildProcess;
  try { child = spawnHarness(spec, o.cwd); } catch (e) { throw new TurnError(`não foi possível iniciar: ${(e as Error).message}`); }
  let stderr = '';
  child.stderr?.on('data', (d) => { stderr = (stderr + String(d)).slice(-2000); });
  const lastLine = () => scrub(stderr.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? '');
  const ended = new Promise<never>((_, no) => {
    child.on('error', (e) => no(new TurnError(`não foi possível iniciar: ${e.message}`)));
    child.on('exit', (code, signal) => no(new TurnError(`saiu com código ${code ?? signal}${lastLine() ? `: ${lastLine()}` : ''}`)));
  });
  ended.catch(() => { /* tratado na corrida */ });
  let timer: NodeJS.Timeout | undefined;
  let idleFail: (e: Error) => void = () => {};
  const idle = new Promise<never>((_, no) => { idleFail = no; });
  idle.catch(() => { /* tratado na corrida */ });
  const touch = () => { clearTimeout(timer); timer = setTimeout(() => idleFail(new TurnError(`${+(idleMs / 1000).toFixed(1)} s sem resposta do harness`)), idleMs); };
  const race = <T>(p: Promise<T>) => Promise.race([p, ended, idle]);

  let text = '';
  // Texto antes e depois de uma ferramenta são falas separadas: sem isso chegavam coladas (OpenCode real, 2026-10-18).
  let afterTool = false;
  const app = client({ name: 'rabelus-buddy' })
    .onNotification('session/update', ({ params }) => {
      touch();
      const u = params.update;
      if (u.sessionUpdate === 'agent_message_chunk' && u.content.type === 'text') {
        const delta = (afterTool && text && !/\n\s*$/.test(text) ? '\n\n' : '') + u.content.text;
        afterTool = false;
        text += delta;
        o.onUpdate?.({ kind: 'text', delta });
      }
      else if (u.sessionUpdate === 'agent_thought_chunk' && u.content.type === 'text') o.onUpdate?.({ kind: 'reasoning', delta: u.content.text });
      else if (u.sessionUpdate === 'tool_call') { afterTool = true; o.onUpdate?.({ kind: 'tool', id: u.toolCallId, title: u.title, status: u.status ?? 'pending', ...(u.kind ? { toolKind: u.kind } : {}) }); }
      else if (u.sessionUpdate === 'tool_call_update') { afterTool = true; o.onUpdate?.({ kind: 'tool', id: u.toolCallId, title: u.title ?? '', status: u.status ?? '', ...(u.kind ? { toolKind: u.kind } : {}) }); }
    })
    .onRequest('session/request_permission', async ({ params }) => {
      touch();
      const tc = params.toolCall;
      const ask: PermissionAsk = { toolCallId: tc.toolCallId, title: tc.title ?? '', ...(tc.kind ? { kind: tc.kind } : {}), paths: (tc.locations ?? []).map((l) => l.path), options: params.options.map((x) => ({ optionId: x.optionId, name: x.name, kind: x.kind })) };
      // Enquanto o Pai decide, o silêncio é dele, não do harness: o relógio para e volta depois da resposta.
      clearTimeout(timer);
      try {
        const answer = o.onPermission ? await o.onPermission(ask) : { outcome: 'cancelled' as const };
        return { outcome: answer };
      } finally { touch(); }
    });
  const conn = app.connect(ndJsonStream(Writable.toWeb(child.stdin!) as WritableStream<Uint8Array>, Readable.toWeb(child.stdout!) as ReadableStream<Uint8Array>));
  conn.closed.catch(() => { /* fim da conexão */ });
  let sessionId: string | undefined;
  const cancel = () => { if (sessionId) void conn.agent.notify('session/cancel', { sessionId }).catch(() => {}); };
  try {
    touch();
    const init = await race(conn.agent.request('initialize', { protocolVersion: PROTOCOL_VERSION, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } }));
    const agent = init.agentInfo ? { name: init.agentInfo.name, ...(init.agentInfo.version ? { version: init.agentInfo.version } : {}) } : undefined;
    touch();
    let created;
    try { created = await race(conn.agent.request('session/new', { cwd: o.cwd, mcpServers: [] })); }
    catch (e) { if ((e as { code?: number }).code === -32000) throw new NeedsLogin(loginMethods(init)); throw e; }
    sessionId = created.sessionId;
    // Opção de modo declarada (id "mode" ou categoria "mode"); as config options substituem a API antiga de modos.
    const modeOpt = (created.configOptions ?? []).find((c) => c.id === 'mode' || c.category === 'mode') as { id: string; currentValue?: unknown; options?: unknown[] } | undefined;
    const values = (modeOpt?.options ?? []).flatMap((x) => (typeof x === 'object' && x && 'value' in x ? [String((x as { value: unknown }).value)] : []));
    let mode: string | null = modeOpt ? String(modeOpt.currentValue ?? '') || null : null;
    if (modeOpt && o.preferMode && values.includes(o.preferMode) && mode !== o.preferMode) {
      touch();
      await race(conn.agent.request('session/set_config_option', { sessionId, configId: modeOpt.id, value: o.preferMode }));
      mode = o.preferMode;
    }
    o.onPosture?.({ mode });
    if (o.signal?.aborted) return { stopReason: 'cancelled', text, ...(agent ? { agent } : {}) };
    o.signal?.addEventListener('abort', cancel, { once: true });
    touch();
    const r = await race(conn.agent.request('session/prompt', { sessionId, prompt: [{ type: 'text', text: o.task }] }));
    if (init.agentCapabilities?.sessionCapabilities?.close) await race(conn.agent.request('session/close', { sessionId })).catch(() => {});
    return { stopReason: r.stopReason, text, ...(agent ? { agent } : {}) };
  } catch (e) {
    if (e instanceof TurnError) throw e;
    let why = (e as Error).message;
    if (/connection closed/i.test(why)) why = await Promise.race([ended.catch((x: Error) => x.message), new Promise<string>((ok) => setTimeout(() => ok(why), 2000))]);
    throw new TurnError(scrub(why));
  } finally {
    o.signal?.removeEventListener('abort', cancel);
    clearTimeout(timer);
    try { conn.close(); } catch { /* já fechada */ }
    killTree(child);
    for (let i = 0; i < 60 && child.exitCode === null && child.signalCode === null; i++) await new Promise((ok) => setTimeout(ok, 50));
  }
}
