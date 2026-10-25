// Processo dono do núcleo (SPEC 0001, escopo 2; R5-1): único escritor do banco,
// servindo JSON-RPC 2.0 por linhas no endpoint local. Instância única pelo próprio
// endpoint: se alguém responde nele, já existe um dono.

import net from 'node:net';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { call } from '@rabelus-buddy/client/ipc';
import { openDatabase } from './db.ts';
import { EventLog } from './log.ts';
import { Domain, DomainError } from './domain.ts';
import { Budget, defaultWindows, type WindowDef } from './budget.ts';
import { Policy, PERM_MODES, type PermMode, type Scope, type Tool } from './policy.ts';
import { FsTools } from './tools/fs.ts';
import { CommandTool } from './tools/command.ts';
import { randomBytes } from 'node:crypto';
import { Agent, type AgentProgress, type AgentResult, type Delegate } from './agent.ts';
import { buddySystem, type AgentLang } from './persona.ts';
import { apiKeyOf, buildRoutes, credentialSource, loadConfig, removeKey, saveKey, type ProviderId } from './config.ts';
import { loadCredentials, logout, startLogin, SiwcAuth, SiwcAuthError, SIWC_ENDPOINTS, type PendingLogin } from './providers/siwc.ts';
import { goUsage, GO_BASE, OLLAMA_BASE, OPENROUTER_BASE, type GoWindow } from './providers/index.ts';
import { buildModelCatalog, CATALOG_VERSION, measuredVision, type ModelCatalog } from './models/catalog.ts';
import { AttachmentError, loadAttachment, storeAttachment, type Attachment, type AttachmentFile } from './attachments.ts';
import { dbPathFor, endpointFor } from './paths.ts';
import { startConsole, type ConsoleServer } from './console.ts';
import { detectHarnesses, readRegistry, refreshRegistry, type RegistryState } from './harness/catalog.ts';
import { HarnessRefusal, launchFor, loginHarness, probeHarness, type LaunchSpec } from './harness/client.ts';
import { describeSession, NeedsLogin, NoImageSupport, postureOption, promptTurn, type HarnessOption, type TurnResult } from './harness/session.ts';
import { scrub } from './providers/adapters.ts';
import { EFFORTS, type Effort } from './providers/types.ts';
import { mxcContainment } from './sandbox/index.ts';

// Janelas do orçamento: budget.json no diretório de estado, ou as padrão (ADR 0015).
function loadWindows(home: string): WindowDef[] {
  const file = join(home, 'budget.json');
  if (!existsSync(file)) return defaultWindows();
  return (JSON.parse(readFileSync(file, 'utf8')) as { windows: WindowDef[] }).windows;
}

export class AlreadyRunningError extends Error {
  readonly endpoint: string;
  constructor(endpoint: string) {
    super(`já existe um dono em ${endpoint}`);
    this.endpoint = endpoint;
  }
}

export interface Owner {
  endpoint: string;
  pid: number;
  closed: Promise<void>;
  close: () => Promise<void>;
}

type Handler = (params: Record<string, unknown>) => unknown;

async function someoneAnswers(endpoint: string): Promise<boolean> {
  try {
    await call(endpoint, 'daemon.status', {});
    return true;
  } catch {
    return false;
  }
}

export async function startOwner(home: string): Promise<Owner> {
  mkdirSync(home, { recursive: true });
  const endpoint = endpointFor(home);
  if (await someoneAnswers(endpoint)) throw new AlreadyRunningError(endpoint);
  // Socket Unix órfão de uma queda: ninguém respondeu, então pode ser removido.
  if (process.platform !== 'win32' && existsSync(endpoint)) unlinkSync(endpoint);

  const log = new EventLog(openDatabase(dbPathFor(home)));
  const domain = new Domain(log);
  const recovered = domain.recover();
  const budget = new Budget(log, { windows: loadWindows(home) });
  const startedAt = new Date().toISOString();
  let resolveClosed: () => void = () => {};
  const closed = new Promise<void>((r) => { resolveClosed = r; });
  const server = net.createServer();

  let consoleSrv: ConsoleServer | null = null;
  // Fechando: as execuções em curso não puxam a fila (o banco vai fechar).
  let closing = false;
  const close = (): Promise<void> => new Promise((resolve) => {
    closing = true;
    void consoleSrv?.close();
    server.close(() => { log.db.close(); resolveClosed(); resolve(); });
    for (const s of sockets) s.destroy();
  });

  // Aprovação pelo IPC: o agente espera até alguém (CLI, outro terminal) resolver.
  // Escopo escolhido no cartão (critério 17), guardado por aprovação; quem pediu o transforma em concessão.
  const approvalScope = new Map<string, Scope>();
  const permModeOf = (v: unknown): PermMode => (PERM_MODES.includes(v as PermMode) ? (v as PermMode) : 'manual');
  const awaitApproval = async (a: { id: string }): Promise<'approve' | 'deny'> => {
    for (;;) {
      const st = domain.getApproval(a.id).state;
      if (st !== 'pending') return st === 'approved' ? 'approve' : 'deny';
      await new Promise((r) => setTimeout(r, 100));
    }
  };
  // Um agente por pedido: workspace e credenciais podem mudar entre tarefas.
  // Parâmetros da execução vindos da console ou do IPC (SPEC 0001 rev. 5).
  // Os oito níveis que os provedores declaram (M1.5c); a console oferece só os do modelo escolhido.
  const effort = (v: unknown): Effort | undefined => {
    if (v === undefined || v === null || v === '' || v === 'default') return undefined;
    if ((EFFORTS as readonly unknown[]).includes(v)) return v as Effort;
    throw new DomainError(-32602, `esforço inválido: ${String(v)}`);
  };
  const PROVIDERS: ProviderId[] = ['opencode-go', 'ollama-cloud', 'chatgpt', 'openrouter'];
  const route = (v: unknown): { provider: ProviderId; model: string } | undefined => {
    if (!v) return undefined;
    const r = v as { provider?: string; model?: string };
    if (!PROVIDERS.includes(r.provider as ProviderId) || !r.model) throw new DomainError(-32602, `rota inválida: ${String(r.provider)}/${String(r.model)}`);
    return { provider: r.provider as ProviderId, model: String(r.model) };
  };
  const keyProvider = (v: unknown): ProviderId => {
    if (v === 'opencode-go' || v === 'ollama-cloud' || v === 'openrouter') return v;
    throw new DomainError(-32602, `provedor sem chave de API: ${String(v)}`);
  };
  // Login do ChatGPT pelo núcleo: um por vez; o resultado fica no estado (nunca tokens no log).
  let login: PendingLogin | null = null;
  let loginError: string | null = null;

  // ---------- Andamento ao vivo, fila, direcionamento e parada (SPEC 0001 rev. 6, critérios 31 e 33) ----------
  // O andamento fica em memória (fragmentos não vão para o log); a fila fica no log (sobrevive à queda).
  // lastEventAt: quando o andamento ganhou o último sinal (ms, Date.now()); a console mede o silêncio de um harness por ele.
  interface LiveRun { run: string; phase: 'thinking' | 'writing' | 'tool' | 'approval'; route: string; step: number; startedAt: string; callStartedAt: string; reasoning: string; text: string; tool: string | null; lastEventAt: number }
  const LIVE_MAX = 200_000;
  const live = new Map<string, LiveRun>();
  const controllers = new Map<string, AbortController>();
  const inboxes = new Map<string, string[]>();
  const nowIso = () => new Date().toISOString();
  const liveOf = (run: string): LiveRun => {
    let l = live.get(run);
    if (!l) { l = { run, phase: 'thinking', route: '', step: 0, startedAt: nowIso(), callStartedAt: nowIso(), reasoning: '', text: '', tool: null, lastEventAt: Date.now() }; live.set(run, l); }
    return l;
  };
  const onProgress = (run: string, x: AgentProgress): void => {
    const l = liveOf(run);
    l.lastEventAt = Date.now();
    if (x.kind === 'call') Object.assign(l, { phase: 'thinking', route: x.route, step: x.step, callStartedAt: nowIso(), reasoning: '', text: '', tool: null });
    else if (x.kind === 'reasoning') l.reasoning = (l.reasoning + x.delta).slice(-LIVE_MAX);
    else if (x.kind === 'text') { l.text = (l.text + x.delta).slice(-LIVE_MAX); l.phase = 'writing'; }
    else if (x.kind === 'tool') { l.tool = x.name; l.phase = 'tool'; }
    // Passo concluído: raciocínio e texto já estão no log (a console mostra de lá); o andamento não repete.
    else if (x.kind === 'exec') { Object.assign(l, { tool: x.name, phase: 'tool', reasoning: '', text: '' }); }
  };
  const runningIn = (session: string) => domain.listRuns().find((r) => r.session === session && r.state === 'running');
  interface Queued { queue: string; task: string; effort?: string | null; route?: unknown; workspace?: string; interactive?: boolean; harness?: string | null }
  const queueOf = (session: string): Queued[] => {
    const q = new Map<string, Queued>();
    for (const e of log.events(session)) {
      if (e.kind === 'run.queued') { const x = e.payload as unknown as Queued; q.set(x.queue, x); }
      if (e.kind === 'run.dequeued') q.delete(String((e.payload as { queue?: string }).queue));
    }
    return [...q.values()];
  };

  // Contenção de execução (M2.1; ADR 0019): uma por núcleo, confirmada na primeira vez que um comando roda.
  const containment = mxcContainment();
  const agentFor = (p: Record<string, unknown>, signal?: AbortSignal): Agent => {
    const workspace = String(p.workspace ?? '');
    if (!workspace) throw new DomainError(-32602, 'workspace obrigatório');
    const policy = new Policy(log, { workspace, mode: permModeOf(p.permMode) });
    return new Agent({
      log, domain, policy, budget,
      fs: new FsTools(policy, { workspace }),
      cmd: new CommandTool(policy, { workspace, containment }),
      routes: buildRoutes(home, loadConfig(home), process.env, route(p.route)),
      interactive: p.interactive === true,
      ...(effort(p.effort) ? { effort: effort(p.effort)! } : {}),
      awaitApproval,
      ...(signal ? { signal } : {}),
      onProgress,
      inbox: (run: string) => inboxes.get(run)?.splice(0) ?? [],
      vision: visionOf(),
      delegate: delegateFor(workspace, p.interactive === true, signal, permModeOf(p.permMode)),
      scopeOf: (id: string) => approvalScope.get(id) ?? 'once',
    });
  };
  // Visão por rota (M1.3, critério 9): o catálogo medido diz por modelo; sem ele, a tabela medida da SPEC.
  const visionOf = (): ((provider: string, model: string) => boolean) => {
    let cat: ModelCatalog | null = null;
    try { cat = JSON.parse(readFileSync(join(home, 'models', 'catalog.json'), 'utf8')) as ModelCatalog; } catch { /* sem catálogo: a tabela */ }
    return (provider, model) => {
      const m = cat?.providers.find((x) => x.id === provider)?.models.find((x) => x.id === model);
      return m ? m.vision : measuredVision(provider, model);
    };
  };
  // Anexos (M1.3): o agent.run traz os hashes; a referência vem do registro attachment.stored da conversa.
  const attachmentsOf = (session: string, v: unknown): Attachment[] => {
    const hashes = Array.isArray(v) ? v.map(String) : [];
    if (!hashes.length) return [];
    const stored = new Map(log.events(session).filter((e) => e.kind === 'attachment.stored').map((e) => [(e.payload as Attachment).hash, e.payload as Attachment]));
    return hashes.map((h) => {
      const a = stored.get(h);
      if (!a) throw new DomainError(-32602, `anexo desconhecido nesta conversa: ${h.slice(0, 12)}…`);
      return { hash: a.hash, name: a.name, mime: a.mime, kind: a.kind, size: a.size };
    });
  };
  // Fim da execução: limpa o andamento e, concluída ou parada, a primeira da fila começa continuando a conversa.
  // Falha inesperada no laço: a execução para com motivo, sem mensagem de erro (pode carregar dados).
  const watch = (session: string, run: string, done: Promise<AgentResult>): void => {
    done.catch((e: unknown) => {
      log.append(session, 'run.error', { run, error: (e as Error)?.name ?? 'Error' });
      if (domain.getRun(run).state === 'running') domain.stopRun(run, 'internalError');
    }).finally(() => {
      live.delete(run);
      controllers.delete(run);
      inboxes.delete(run);
      if (!closing) drain(session, run);
    });
  };
  const startRun = (session: string, task: string, p: Record<string, unknown>, continueFrom?: string): string => {
    const ac = new AbortController();
    const agent = agentFor(p, ac.signal);
    const prior = continueFrom ? agent.transcript(session, continueFrom) : undefined;
    const attachments = attachmentsOf(session, p.attachments);
    // Voz do Buddy no idioma da console (pt-BR por padrão), com a pasta de trabalho; o modelo entra a cada chamada.
    const system = buddySystem((p.lang === 'en' ? 'en' : 'pt-BR') as AgentLang, String(p.workspace ?? ''));
    const { run, done } = agent.begin(session, task, { system, ...(prior?.length ? { prior } : {}), ...(attachments.length ? { attachments } : {}) });
    controllers.set(run, ac);
    inboxes.set(run, inboxes.get(run) ?? []);
    liveOf(run);
    // Opções da execução ficam no log: a retomada usa o mesmo esforço e a mesma rota.
    log.append(session, 'run.options', { run, effort: effort(p.effort) ?? null, route: route(p.route) ?? null });
    watch(session, run, done);
    return run;
  };
  // ---------- Conversa por harness ACP (SPEC 0002, critério 5) ----------
  // A mesma máquina de execução (run, run.live, fila, parar); o turno vai ao harness por session/prompt.
  // Lançamento que baixa código só roda com a primeira execução aprovada (critério 4).
  const harnessFor = async (hid: string): Promise<{ id: string; name: string; spec: LaunchSpec }> => {
    await registryNow();
    const v = detectHarnesses(home, process.env).find((h) => h.id === hid);
    if (!v) throw new DomainError(-32602, `harness desconhecido: ${hid}`);
    const spec = launchFor(v);
    if (!spec) throw new DomainError(-32004, `${v.name} não está disponível: ${v.found ? 'sem lançamento local conhecido' : 'não instalado neste computador'}`, { id: hid });
    if (spec.needsApproval && firstRun(v, spec) !== 'approved') {
      const fr = firstRun(v, spec, true);
      throw new DomainError(-32004, fr === 'denied'
        ? `a primeira execução de ${spec.package} foi negada pelo Pai; a conversa com ${v.name} não roda`
        : `a primeira execução de ${v.name} baixa ${spec.package} (${spec.source}) e precisa da aprovação do Pai, pendente na console`, { id: hid, ...(fr !== 'denied' ? { approval: fr } : {}) });
    }
    return { id: v.id, name: v.name, spec };
  };
  // Permissões do harness pelo núcleo (SPEC 0002, critério 6). Postura ao abrir a sessão, medida em 2026-10-18
  // (docs/20-conhecimento/acp-permissoes-dos-harnesses.md): o OpenCode pergunta com permission ask, recebida só no
  // processo filho (a configuração do Pai não é tocada); harness que declara o modo read-only (Codex) o recebe.
  const OPENCODE_ASK = JSON.stringify({ permission: { edit: 'ask', bash: 'ask', webfetch: 'ask', websearch: 'ask', task: 'ask', external_directory: 'ask' } });
  const postureOf = (h: { id: string; spec: LaunchSpec }): LaunchSpec => (h.id === 'opencode' ? { ...h.spec, env: { ...h.spec.env, OPENCODE_CONFIG_CONTENT: OPENCODE_ASK } } : h.spec);
  // Tipo de ação do ACP → ferramenta da política (ADR 0009). Leitura e busca são leitura; edição, remoção e movimento
  // são escrita; execução e o que não se conhece pedem aprovação de uma vez, como comando.
  const WRITES = ['edit', 'delete', 'move'];
  const toolOfKind = (kind?: string): Tool => (kind === 'read' || kind === 'search' ? 'read_file' : WRITES.includes(kind ?? '') ? 'write_file' : 'run_command');
  type HarnessRef = { id: string; name: string; spec: LaunchSpec };
  // Um turno com o harness, com a postura, as permissões pelo núcleo e o andamento no log da execução. Serve à
  // conversa com o harness (critério 5) e à delegação do Buddy (critério 8); quem chama decide o fim da execução.
  const harnessTurn = async (session: string, run: string, h: HarnessRef, o: { task: string; workspace: string; interactive: boolean; signal: AbortSignal; files?: AttachmentFile[]; liveText?: boolean; configValues?: Record<string, string>; permMode?: PermMode }): Promise<{ r: TurnResult; denied: boolean; reasoning: string }> => {
    const policy = new Policy(log, { workspace: o.workspace, mode: o.permMode ?? 'manual' });
    let reasoning = '';
    const titles = new Map<string, string>();
    const kinds = new Map<string, string>();
    const asked = new Set<string>();
    const warned = new Set<string>();
    let denied = false;
    const r = await promptTurn(postureOf(h), {
      cwd: o.workspace, task: o.task, signal: o.signal, preferMode: 'read-only',
      // Opções escolhidas pelo Pai (critério 18): modelo, esforço e modo do agente, aplicados antes da tarefa.
      ...(o.configValues && Object.keys(o.configValues).length ? { configValues: o.configValues, onApplied: (values: Record<string, string>) => log.append(session, 'harness.options.applied', { run, id: h.id, values }) } : {}),
      // Anexos (M1.3): o conteúdo, lido do arquivo com o hash conferido, vai só no prompt do harness.
      files: o.files ?? [],
      onPosture: ({ mode }) => log.append(session, 'harness.posture', { run, id: h.id, mode, config: h.id === 'opencode' ? 'permission ask' : null }),
      onUpdate: (u) => {
        if (u.kind === 'tool') {
          const title = u.title || titles.get(u.id) || u.id;
          titles.set(u.id, title);
          if (u.toolKind) kinds.set(u.id, u.toolKind);
          log.append(session, 'harness.tool', { run, id: u.id, title, status: u.status });
          onProgress(run, { kind: 'tool', name: title });
          // Escrita ou execução concluída sem pedido de permissão: a postura não valeu (configuração gerenciada,
          // harness sem modo). Fica registrado como aviso.
          const kind = kinds.get(u.id) ?? 'other';
          if (u.status === 'completed' && (WRITES.includes(kind) || kind === 'execute') && !asked.has(u.id) && !warned.has(u.id)) {
            warned.add(u.id);
            log.append(session, 'harness.unasked', { run, id: h.id, title, kind });
          }
        } else {
          if (u.kind === 'reasoning') reasoning += u.delta;
          // Na delegação, o texto do harness não vai ao vivo: ali ele apareceria como fala do Buddy (ensaio real, M1.4).
          // Ele volta ao Buddy como resultado da ferramenta, e o Buddy responde.
          if (u.kind === 'reasoning' || o.liveText !== false) onProgress(run, u);
        }
      },
      onPermission: async (ask) => {
        asked.add(ask.toolCallId);
        const tool = toolOfKind(ask.kind);
        // O Codex pede com o título genérico "Run command"; o comando veio antes no tool_call de mesmo id (2026-10-19).
        const raw = tool === 'run_command' ? titles.get(ask.toolCallId) || ask.title : ask.paths[0] ?? ask.title;
        const target = tool === 'run_command' ? raw : policy.relative(raw) ?? raw;
        const eff = domain.beginEffect(session, run, 'harness.permission', `${run}:perm:${ask.toolCallId}`, target).id;
        const d = policy.decide({ session, tool, target: raw }, { interactive: o.interactive });
        // Fora da pasta de trabalho, com o Pai na conversa, a política pergunta em vez de negar sozinha (A3).
        // Sem o Pai, continua negando. O caminho protegido continua negado sem perguntar.
        const outside = d.effect === 'deny' && d.reason === 'fora do workspace';
        // Fora da pasta, uma concessão exata dada antes no cartão (conversa, projeto ou sempre) libera sem perguntar.
        const outsideGranted = outside && policy.grantedOutside(session, tool, raw);
        const askIt = !outsideGranted && (d.effect === 'ask' || (outside && o.interactive));
        let decision: 'allow' | 'deny' | 'approve' = d.effect === 'allow' || outsideGranted ? 'allow' : 'deny';
        if (askIt) {
          const where = outside ? ` (fora da pasta de trabalho)` : '';
          const ap = domain.requestApproval(session, `Harness ${h.name}: ${tool} ${outside ? raw : target}${where}`);
          decision = (await awaitApproval(ap)) === 'approve' ? 'approve' : 'deny';
          liveOf(run).lastEventAt = Date.now(); // a espera foi do Pai: o relógio do silêncio recomeça
          // Escopo do cartão (critério 17): além de uma vez, vira concessão; comando e caminho de fora, só o exato.
          const sc = approvalScope.get(ap.id);
          if (decision === 'approve' && sc && sc !== 'once') policy.grant(sc, { tool, pattern: outside ? raw : target }, { session });
        }
        const pick = decision === 'deny'
          ? ask.options.find((x) => x.kind === 'reject_once') ?? ask.options.find((x) => x.kind.startsWith('reject'))
          : ask.options.find((x) => x.kind === 'allow_once') ?? ask.options.find((x) => x.kind.startsWith('allow'));
        if (decision === 'deny') denied = true;
        const outcome = pick?.optionId ?? 'cancelled';
        log.append(session, 'harness.permission', { run, id: h.id, title: ask.title, tool, target, decision, reason: d.reason, outcome, outside });
        domain.completeEffect(eff, { decision, outcome });
        return pick ? { outcome: 'selected', optionId: pick.optionId } : { outcome: 'cancelled' };
      },
    });
    return { r, denied, reasoning };
  };
  // Opções do agente (critério 18): só pares texto → texto, curtos; o agente ainda confere se o valor é declarado.
  const optionsCache = new Map<string, { at: number; options: HarnessOption[] }>();
  const harnessOptionsOf = (v: unknown): Record<string, string> => {
    if (!v || typeof v !== 'object') return {};
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k, x]) => typeof x === 'string' && k.length <= 64 && x.length <= 200)) as Record<string, string>;
  };
  const startHarnessRun = (session: string, task: string, p: Record<string, unknown>, h: HarnessRef): string => {
    const workspace = String(p.workspace ?? '');
    if (!workspace) throw new DomainError(-32602, 'workspace obrigatório');
    const interactive = p.interactive === true;
    const ac = new AbortController();
    const attachments = attachmentsOf(session, p.attachments);
    const run = domain.startRun(session, task).id;
    log.append(session, 'agent.message', { run, message: { role: 'user', content: task, ...(attachments.length ? { attachments } : {}) } });
    controllers.set(run, ac);
    inboxes.set(run, []);
    const routeName = `acp:${h.id}`;
    liveOf(run).route = routeName;
    log.append(session, 'run.options', { run, effort: null, route: null, harness: h.id });
    const done = (async (): Promise<AgentResult> => {
      const effect = domain.beginEffect(session, run, 'harness.prompt', `${run}:acp:${h.id}`, h.id).id;
      const stopped = (reason: string, text = ''): AgentResult => { domain.stopRun(run, reason); return { run, outcome: 'stopped', reason, text, steps: 1 }; };
      try {
        const { r, denied, reasoning } = await harnessTurn(session, run, h, { task, workspace, interactive, signal: ac.signal, files: attachments.map((a) => loadAttachment(workspace, a)), configValues: harnessOptionsOf(p.harnessOptions), permMode: permModeOf(p.permMode) });
        domain.completeEffect(effect, { stopReason: r.stopReason, ...(r.agent ? { agent: r.agent } : {}) });
        if (reasoning) log.append(session, 'agent.reasoning', { run, step: 1, route: routeName, text: reasoning.slice(0, 20_000) });
        if (r.text) log.append(session, 'agent.message', { run, message: { role: 'assistant', content: r.text } });
        if (ac.signal.aborted) return stopped('userStopped', r.text);
        // A recusa encerra o turno nos harnesses reais (stopReason "cancelled", medido em 2026-10-18): o motivo é a recusa.
        if (r.stopReason === 'cancelled') return stopped(denied ? 'permissionDenied' : 'harnessCancelled', r.text);
        domain.finishRun(run);
        return { run, outcome: 'done', text: r.text, steps: 1 };
      } catch (e) {
        const reason = scrub((e as Error).message).slice(0, 300);
        domain.failEffect(effect, reason);
        // Harness pede login (critério 7): a conversa para com os métodos que o Pai pode usar para entrar.
        if (e instanceof NeedsLogin) {
          log.append(session, 'harness.login.required', { run, id: h.id, methods: e.methods });
          return stopped('needsLogin');
        }
        // Imagem para um harness que não declara suporte (M1.3, critério 9): para com o motivo, sem mandar.
        if (e instanceof NoImageSupport) {
          log.append(session, 'harness.error', { run, id: h.id, reason });
          return stopped('noVisionRoute');
        }
        log.append(session, 'harness.error', { run, id: h.id, reason });
        return stopped(ac.signal.aborted ? 'userStopped' : 'harnessFailed');
      }
    })();
    watch(session, run, done);
    return run;
  };
  // Delegação do Buddy (SPEC 0002, critério 8): a ferramenta `delegate` abre um turno no harness dentro da execução
  // do Buddy. As permissões passam pelo núcleo como na conversa; parar o Buddy cancela o harness (session/cancel).
  // O resultado volta ao modelo; o efeito com identidade fica com o Agent.
  const delegateFor = (workspace: string, interactive: boolean, signal?: AbortSignal, permMode: PermMode = 'manual'): Delegate => ({
    // Cópia local do registro, sem rede: a lista entra em toda execução do Buddy e não pode atrasá-la (o teste
    // de direcionar pegou o atraso). A delegação em si atualiza o registro pelo harnessFor.
    list: async () => {
      return detectHarnesses(home, process.env).flatMap((v) => {
        const spec = launchFor(v);
        return spec && (!spec.needsApproval || firstRun(v, spec) === 'approved') ? [v.id] : [];
      });
    },
    run: async (session, run, a) => {
      let h: HarnessRef;
      try { h = await harnessFor(a.harness); } catch (e) { return { ok: false, reason: 'harnessUnavailable', message: scrub((e as Error).message).slice(0, 300) }; }
      log.append(session, 'harness.delegated', { run, id: h.id, phase: 'start', task: a.task.slice(0, 2000) });
      const end = (stopReason: string) => log.append(session, 'harness.delegated', { run, id: h.id, phase: 'end', stopReason });
      try {
        const { r, denied, reasoning } = await harnessTurn(session, run, h, { task: a.task, workspace, interactive, signal: signal ?? new AbortController().signal, liveText: false, permMode });
        if (reasoning) log.append(session, 'harness.reasoning', { run, id: h.id, text: reasoning.slice(0, 20_000) });
        end(r.stopReason);
        const text = r.text.slice(0, 20_000);
        if (r.stopReason === 'cancelled') return { ok: false, harness: h.id, reason: signal?.aborted ? 'userStopped' : denied ? 'permissionDenied' : 'harnessCancelled', stopReason: r.stopReason, text };
        return { ok: true, harness: h.id, stopReason: r.stopReason, text };
      } catch (e) {
        const reason = scrub((e as Error).message).slice(0, 300);
        end('error');
        if (e instanceof NeedsLogin) {
          log.append(session, 'harness.login.required', { run, id: h.id, methods: e.methods });
          return { ok: false, harness: h.id, reason: 'needsLogin' };
        }
        log.append(session, 'harness.error', { run, id: h.id, reason });
        return { ok: false, harness: h.id, reason: signal?.aborted ? 'userStopped' : 'harnessFailed', message: reason };
      }
    },
  });
  const drain = (session: string, prev: string): void => {
    if (runningIn(session)) return;
    const next = queueOf(session)[0];
    if (!next) return;
    const started = (run: string) => log.append(session, 'run.dequeued', { queue: next.queue, reason: 'started', run });
    const failed = (e: unknown) => log.append(session, 'run.dequeued', { queue: next.queue, reason: 'failed', error: (e as Error)?.name ?? 'Error' });
    if (next.harness) {
      void harnessFor(next.harness).then((h) => { if (!runningIn(session) && !closing) started(startHarnessRun(session, next.task, next as unknown as Record<string, unknown>, h)); }).catch(failed);
      return;
    }
    try { started(startRun(session, next.task, next as unknown as Record<string, unknown>, prev)); } catch (e) { failed(e); }
  };
  const busy = (session: string) => {
    const r = runningIn(session);
    if (!r) throw new DomainError(-32004, `nenhuma execução rodando na conversa ${session}`, { session });
    return r;
  };

  let usageCache: { at: number; data: unknown } | null = null;
  // Registro do ACP: buscado na primeira consulta e depois no máximo uma vez por dia; uma busca por vez.
  let registryFetch: Promise<RegistryState> | null = null;
  let catalogBuild: Promise<ModelCatalog> | null = null;
  // Primeira execução por pacote@versão (critério 4): 'approved', 'denied', ou o id da aprovação pendente
  // (criada aqui quando `ask`, uma só por pacote). O vínculo pacote → aprovação fica no log.
  // Rever a negação (A1): `harness.approval.reset` posterior ao último pedido do pacote faz de conta que não há pedido,
  // e o próximo `ask` cria um pedido novo. Nada é apagado: a negação antiga continua no log.
  const firstRun = ({ id, name }: { id: string; name: string }, spec: { package?: string; source: string }, ask = false): string => {
    const evs = log.events('harness');
    const ofPackage = (e: { payload: unknown }) => (e.payload as { package?: string }).package === spec.package;
    let reqAt = -1;
    let resetAt = -1;
    evs.forEach((e, i) => {
      if (e.kind === 'harness.approval.requested' && ofPackage(e)) reqAt = i;
      if (e.kind === 'harness.approval.reset' && ofPackage(e)) resetAt = i;
    });
    const req = reqAt >= 0 && reqAt > resetAt ? evs[reqAt] : undefined;
    if (req) {
      const ap = domain.getApproval(String((req.payload as { approval: string }).approval));
      if (ap.state !== 'pending') return ap.state;
      return ap.id;
    }
    if (!ask) return 'none';
    const ap = domain.requestApproval('harness', `Primeira execução de ${name}: baixar e executar ${spec.package} (${spec.source}). Aprovar vale só para esta versão.`);
    log.append('harness', 'harness.approval.requested', { package: spec.package, source: spec.source, approval: ap.id, name, id });
    return ap.id;
  };
  // Sonda por id (critério 3), com a primeira execução aprovada (critério 4). Usada por harness.probe e pela
  // aprovação de primeira execução, que roda a sonda na hora para o Pai ver o resultado.
  const probeById = async (id: string): Promise<Record<string, unknown>> => {
    await registryNow();
    const v = detectHarnesses(home, process.env).find((h) => h.id === id);
    if (!v) throw new DomainError(-32602, `harness desconhecido: ${id}`);
    const spec = launchFor(v);
    let out: Record<string, unknown>;
    if (!spec) out = { state: 'indisponivel', reason: v.found ? 'sem lançamento local conhecido; o registro pede baixar o binário' : 'não instalado neste computador' };
    else if (spec.needsApproval && firstRun(v, spec) !== 'approved') {
      // Primeira execução de pacote que baixa código (SPEC 0002, critério 4): aprovação do Pai por pacote@versão.
      const fr = firstRun(v, spec, true);
      out = fr === 'denied'
        ? { state: 'negado', reason: `a primeira execução de ${spec.package} foi negada pelo Pai; nada roda`, package: spec.package }
        : { state: 'aprovacao', reason: `a primeira execução baixa ${spec.package} (${spec.source}) e precisa da aprovação do Pai`, package: spec.package, approval: fr };
    } else {
      const cwd = join(home, 'area-de-trabalho');
      mkdirSync(cwd, { recursive: true });
      out = { ...(await probeHarness(spec, { cwd })) };
      delete out.pid;
    }
    log.append('harness', 'harness.probed', { id: v.id, state: out.state, ...(out.reason ? { reason: out.reason } : {}), ...(out.agent ? { agent: out.agent } : {}) });
    return { id: v.id, name: v.name, ...out };
  };
  const registryNow = async (force = false): Promise<RegistryState> => {
    const reg = readRegistry(home);
    if (!force && reg.fetchedAt && Date.now() - Date.parse(reg.fetchedAt) <= DAY) return reg;
    registryFetch ??= refreshRegistry({ home }).finally(() => { registryFetch = null; });
    return registryFetch;
  };
  const DAY = 86_400_000;
  const methods: Record<string, Handler> = {
    'agent.run': async (p) => {
      const session = String(p.session);
      // Com harness, a conversa vai ao harness por ACP (critério 5); a recusa (aprovação, indisponível) vem antes de tudo.
      const h = p.harness ? await harnessFor(String(p.harness)) : null;
      const atts = attachmentsOf(session, p.attachments); // anexo desconhecido é recusado antes de tudo (M1.3)
      // Uma execução por conversa (critério 33): com outra rodando, a mensagem entra na fila (decisão do Pai).
      if (runningIn(session)) {
        if (!p.workspace) throw new DomainError(-32602, 'workspace obrigatório');
        effort(p.effort); route(p.route); // valida já, não na hora de rodar
        const queue = `q-${randomBytes(4).toString('hex')}`;
        log.append(session, 'run.queued', { queue, task: String(p.task), effort: effort(p.effort) ?? null, route: route(p.route) ?? null, workspace: String(p.workspace), interactive: p.interactive === true, harness: h?.id ?? null, attachments: atts.map((a) => a.hash), lang: p.lang === 'en' ? 'en' : 'pt-BR', permMode: permModeOf(p.permMode), ...(p.harnessOptions ? { harnessOptions: harnessOptionsOf(p.harnessOptions) } : {}) });
        return { queued: queue };
      }
      if (h) return { run: startHarnessRun(session, String(p.task), p, h) };
      return { run: startRun(session, String(p.task), p, p.continueFrom ? String(p.continueFrom) : undefined) };
    },
    'run.live': (p) => {
      const session = String(p.session);
      const r = runningIn(session);
      const queue = queueOf(session).map((q) => ({ id: q.queue, task: q.task }));
      if (!r) return { running: null, queue };
      const l = { ...liveOf(r.id) };
      if (domain.pendingApprovals().some((a) => a.session === session)) l.phase = 'approval';
      return { running: l, queue };
    },
    'agent.steer': (p) => {
      const session = String(p.session);
      const r = busy(session);
      let text = typeof p.text === 'string' ? p.text.trim() : '';
      if (p.queue) {
        const q = queueOf(session).find((x) => x.queue === String(p.queue));
        if (!q) throw new DomainError(-32602, `mensagem ${String(p.queue)} não está na fila`);
        text = q.task;
        log.append(session, 'run.dequeued', { queue: q.queue, reason: 'steered', run: r.id });
      }
      if (!text) throw new DomainError(-32602, 'direcionamento vazio');
      (inboxes.get(r.id) ?? inboxes.set(r.id, []).get(r.id)!).push(text);
      return { run: r.id };
    },
    'agent.unqueue': (p) => {
      const session = String(p.session);
      const q = queueOf(session).find((x) => x.queue === String(p.queue));
      if (!q) throw new DomainError(-32602, `mensagem ${String(p.queue)} não está na fila`);
      log.append(session, 'run.dequeued', { queue: q.queue, reason: 'cancelled' });
      return { ok: true };
    },
    'agent.stop': (p) => {
      const session = String(p.session);
      const r = busy(session);
      for (const a of domain.pendingApprovals()) if (a.session === session) domain.resolveApproval(a.id, 'deny');
      const ac = controllers.get(r.id);
      if (ac) ac.abort(); else domain.stopRun(r.id, 'userStopped'); // sem laço vivo neste processo
      return { stopping: r.id };
    },
    'agent.resume': (p) => {
      const run = String(p.run);
      const r = domain.getRun(run);
      if (r.state !== 'interrupted' && r.state !== 'stopped') throw new DomainError(-32004, `execução ${run} está ${r.state}: só se retoma interrompida ou parada`, { id: run, state: r.state });
      const opts = log.events(r.session).filter((e) => e.kind === 'run.options' && (e.payload as { run?: string }).run === run).at(-1)?.payload as { effort?: string | null; route?: unknown; harness?: string | null } | undefined;
      // Retomar um turno de harness ainda não existe: o harness não guarda a sessão entre processos (session/load fica para depois).
      if (opts?.harness) throw new DomainError(-32004, `execução ${run} foi uma conversa com o harness ${opts.harness}: envie a mensagem de novo para começar outro turno`, { id: run });
      const ac = new AbortController();
      controllers.set(run, ac);
      inboxes.set(run, []);
      liveOf(run);
      watch(r.session, run, agentFor({ ...p, effort: p.effort ?? opts?.effort ?? undefined, route: p.route ?? opts?.route ?? undefined }, ac.signal).resume(r.session, run));
      return { run };
    },
    'run.list': () => domain.listRuns(),
    // Telemetria de uso dos provedores (SPEC 0002, critério 15). Hoje só o OpenCode Go expõe; a chave não sai daqui.
    'providers.usage': async () => {
      // A console consulta a cada 3 s; a API do Go, no máximo uma vez por minuto.
      if (usageCache && Date.now() - usageCache.at < 60_000) return usageCache.data;
      const out: { provider: string; windows?: GoWindow[]; error?: string }[] = [];
      const r = loadConfig(home).routes.find((x) => x.provider === 'opencode-go');
      const key = apiKeyOf(home, 'opencode-go', process.env);
      if (r && key) {
        try { out.push({ provider: 'opencode-go', windows: await goUsage({ apiKey: key, ...(r.baseURL ? { baseURL: r.baseURL } : {}) }) }); }
        catch (e) { out.push({ provider: 'opencode-go', error: (e as Error).message.slice(0, 80) }); }
      }
      usageCache = { at: Date.now(), data: out };
      return out;
    },
    // Harnesses do registro oficial do ACP e da tabela própria, com o que está instalado (SPEC 0002, critérios 1 e 2).
    'harness.list': async (p) => {
      const reg = await registryNow(p.refresh === true);
      return { registry: { source: reg.source, fetchedAt: reg.fetchedAt, version: reg.version, ...(reg.error ? { error: reg.error } : {}) }, harnesses: detectHarnesses(home, process.env) };
    },
    // Sonda de disponibilidade (SPEC 0002, critério 3): pronto, precisa de login ou falhou, com o motivo.
    // Lançamento que baixa código (npx, uvx) não roda aqui: espera a aprovação da primeira execução (critério 4).
    'harness.probe': (p) => probeById(String(p.id)),
    // Opções que o agente declara ao abrir a sessão (critério 18): abre, lê e fecha, sem tarefa; guardadas 10 min por
    // agente. A opção de modo que serve de postura (read-only do Codex) não é oferecida: a postura vence.
    'harness.options': async (p) => {
      const h = await harnessFor(String(p.id));
      const hit = optionsCache.get(h.id);
      if (hit && Date.now() - hit.at < 10 * 60_000) return { options: hit.options };
      const cwd = join(home, 'area-de-trabalho');
      mkdirSync(cwd, { recursive: true });
      try {
        const all = await describeSession(postureOf(h), cwd);
        const posture = postureOption(all, 'read-only');
        const options = all.filter((o) => o !== posture && o.options.length > 0);
        optionsCache.set(h.id, { at: Date.now(), options });
        return { options };
      } catch (e) {
        if (e instanceof NeedsLogin) throw new DomainError(-32004, `${h.name} pede login antes de mostrar as opções`, { id: h.id, methods: e.methods });
        throw new DomainError(-32004, `não foi possível ler as opções de ${h.name}: ${scrub((e as Error).message).slice(0, 200)}`, { id: h.id });
      }
    },
    // Rever a negação da primeira execução (A1): só quando está negada; pede aprovação nova, sem apagar a antiga.
    'harness.firstRun.reset': async (p) => {
      const id = String(p.id);
      await registryNow();
      const v = detectHarnesses(home, process.env).find((h) => h.id === id);
      if (!v) throw new DomainError(-32602, `harness desconhecido: ${id}`);
      const spec = launchFor(v);
      if (!spec || !spec.needsApproval) throw new DomainError(-32602, `${v.name} não precisa de aprovação da primeira execução`);
      if (firstRun(v, spec) !== 'denied') throw new DomainError(-32602, `a primeira execução de ${v.name} não está negada; nada a rever`);
      const previous = log.events('harness').filter((e) => e.kind === 'harness.approval.requested' && (e.payload as { package?: string }).package === spec.package).at(-1);
      log.append('harness', 'harness.approval.reset', { package: spec.package, id, previous: String((previous?.payload as { approval?: string } | undefined)?.approval ?? '') });
      return { approval: firstRun(v, spec, true) };
    },
    // Anexo (SPEC 0002, critério 9): guardado na pasta de trabalho com o hash no nome; o log fica só com a referência.
    'attachment.put': (p) => {
      const session = String(p.session);
      const workspace = String(p.workspace ?? '');
      if (!workspace) throw new DomainError(-32602, 'workspace obrigatório');
      let a: Attachment;
      try { a = storeAttachment(workspace, { name: String(p.name), mime: String(p.mime), data: String(p.data) }); }
      catch (e) { if (e instanceof AttachmentError) throw new DomainError(-32602, e.message); throw e; }
      log.append(session, 'attachment.stored', { hash: a.hash, name: a.name, mime: a.mime, kind: a.kind, size: a.size });
      return a;
    },
    // Login do harness (SPEC 0002, critério 7): authenticate com o método escolhido; o harness abre o navegador e guarda a
    // própria credencial. Lançamento que baixa código continua exigindo a primeira execução aprovada (critério 4).
    'harness.login': async (p) => {
      const id = String(p.id);
      const method = String(p.method);
      const h = await harnessFor(id);
      const cwd = join(home, 'area-de-trabalho');
      mkdirSync(cwd, { recursive: true });
      let r;
      try { r = await loginHarness(h.spec, { cwd, methodId: method }); }
      catch (e) { if (e instanceof HarnessRefusal) throw new DomainError(-32602, e.message, { id, method }); throw e; }
      log.append('harness', 'harness.login', { id, method, state: r.state, ...(r.reason ? { reason: r.reason } : {}), ...(r.agent ? { agent: r.agent } : {}) });
      return { id, name: h.name, method, ...r };
    },
    // Catálogo de modelos provedor → lab → modelo (SPEC 0002, critério 13): guardado e renovado no máximo uma vez por dia.
    'models.list': async () => {
      const file = join(home, 'models', 'catalog.json');
      try {
        const c = JSON.parse(readFileSync(file, 'utf8')) as ModelCatalog;
        // Cópia de outra versão do catálogo (regras corrigidas) é montada de novo, sem esperar o dia (M1.5c).
        if (c.version === CATALOG_VERSION && Date.now() - Date.parse(c.generatedAt) < DAY) return c;
      } catch { /* sem cópia ainda */ }
      catalogBuild ??= (async () => {
        const routes = loadConfig(home).routes;
        const baseOf = (p: ProviderId, fallback: string) => routes.find((r) => r.provider === p && r.baseURL)?.baseURL ?? fallback;
        let chatgpt: { token: string; api: string } | null = null;
        if (loadCredentials(home)?.refreshToken) {
          const api = baseOf('chatgpt', SIWC_ENDPOINTS.api);
          chatgpt = await new SiwcAuth({ home, endpoints: { ...SIWC_ENDPOINTS, api } }).accessToken().then((token) => ({ token, api }), () => null);
        }
        const cat = await buildModelCatalog({
          chatgpt,
          'opencode-go': { key: apiKeyOf(home, 'opencode-go', process.env) ?? null, baseURL: baseOf('opencode-go', GO_BASE) },
          'ollama-cloud': { key: apiKeyOf(home, 'ollama-cloud', process.env) ?? null, baseURL: baseOf('ollama-cloud', OLLAMA_BASE) },
          openrouter: { baseURL: baseOf('openrouter', OPENROUTER_BASE) },
          ...(process.env.RBUDDY_MODELS_DEV ? { modelsDevURL: process.env.RBUDDY_MODELS_DEV } : {}),
        });
        mkdirSync(join(home, 'models'), { recursive: true });
        writeFileSync(`${file}.tmp`, JSON.stringify(cat));
        renameSync(`${file}.tmp`, file);
        return cat;
      })().finally(() => { catalogBuild = null; });
      return catalogBuild;
    },
    'providers.status': () => loadConfig(home).routes.map((r) => ({ provider: r.provider, model: r.model, source: credentialSource(home, r.provider, process.env) })),
    'keys.set': (p) => { const key = String(p.key ?? '').trim(); if (!key) throw new DomainError(-32602, 'chave vazia'); saveKey(home, keyProvider(p.provider), key); return { ok: true }; },
    'keys.remove': (p) => ({ removed: removeKey(home, keyProvider(p.provider)) }),
    'auth.chatgpt.start': async () => {
      login?.cancel();
      loginError = null;
      const pending = await startLogin({ home });
      login = pending;
      pending.done.then(() => { if (login === pending) login = null; }, (e: unknown) => { if (login === pending) { login = null; loginError = e instanceof SiwcAuthError ? e.code : 'error'; } });
      log.append('auth', 'auth.chatgpt.started', {});
      return { url: pending.url };
    },
    'auth.chatgpt.status': () => {
      const c = loadCredentials(home);
      return { loggedIn: Boolean(c?.refreshToken), planEnabled: c?.planEnabled ?? null, email: c?.email ?? null, pending: login !== null, error: loginError };
    },
    'auth.chatgpt.logout': async () => { login?.cancel(); login = null; return logout(home); },
    'policy.grant': (p) => ({ grant: new Policy(log, { workspace: p.workspace ? String(p.workspace) : home }).grant(String(p.scope) as Scope, { tool: String(p.tool) as Tool, pattern: String(p.pattern) }, { session: String(p.session), bindWorkspace: Boolean(p.workspace) }) }),
    'daemon.status': () => ({ pid: process.pid, endpoint, startedAt, sessions: log.sessions().length, events: log.totalEvents(), recovered, ...(consoleSrv ? { console: { url: consoleSrv.url } } : {}) }),
    // Padrões da console: pasta de trabalho própria (nunca o repositório por acaso) e as rotas configuradas.
    'console.defaults': () => {
      const workspace = join(home, 'area-de-trabalho');
      mkdirSync(workspace, { recursive: true });
      return { workspace, routes: loadConfig(home).routes.map((r) => ({ provider: r.provider, model: r.model })) };
    },
    // Bilhete de uso único para abrir a console (critério 16): só pelo IPC do dono, nunca pela página.
    'console.ticket': () => { if (!consoleSrv) throw new Error('console desligada'); return { url: consoleSrv.ticket(), clean: consoleSrv.url }; },
    'daemon.stop': () => { setImmediate(() => { void close(); }); return { stopping: true }; },
    'event.append': (p) => log.append(String(p.session), String(p.kind), p.payload),
    'session.events': (p) => log.events(String(p.session)),
    'session.list': () => log.sessions(),
    'run.start': (p) => domain.startRun(String(p.session), String(p.task)),
    'run.finish': (p) => domain.finishRun(String(p.id)),
    'run.get': (p) => domain.getRun(String(p.id)),
    'effect.begin': (p) => domain.beginEffect(String(p.session), String(p.run), String(p.kind), String(p.key), String(p.target)),
    'effect.complete': (p) => domain.completeEffect(String(p.id), p.result),
    'effect.reconcile': (p) => domain.reconcileEffect(String(p.id), p.outcome === 'done' ? 'done' : 'not-done'),
    'effect.get': (p) => domain.getEffect(String(p.id)),
    'approval.request': (p) => domain.requestApproval(String(p.session), String(p.action)),
    // Aprovação de primeira execução de harness: roda a sonda na hora e devolve o resultado, para o Pai ver o efeito
    // do clique (achado do Pai em 2026-10-18: "não houve nenhuma entrega ou mudança").
    'approval.resolve': async (p) => {
      if (p.decision === 'approve' && typeof p.scope === 'string') approvalScope.set(String(p.id), p.scope as Scope);
      const a = domain.resolveApproval(String(p.id), p.decision === 'approve' ? 'approve' : 'deny');
      const req = log.events('harness').filter((e) => e.kind === 'harness.approval.requested' && (e.payload as { approval?: string }).approval === a.id).at(-1);
      const hid = (req?.payload as { id?: string } | undefined)?.id;
      if (!hid) return a;
      const r = await probeById(hid);
      return { ...a, harness: { id: hid, name: r.name, state: r.state, ...(r.reason ? { reason: r.reason } : {}), ...(r.agent ? { agent: r.agent } : {}) } };
    },
    'approval.get': (p) => domain.getApproval(String(p.id)),
    'approval.list': () => domain.pendingApprovals(),
    'budget.reserve': (p) => ({ reservation: budget.reserve(String(p.session), { provider: String(p.provider), model: String(p.model), estimateUsd: Number(p.estimateUsd) }) }),
    'budget.settle': (p) => ({ actual: budget.settle(String(p.reservation), (p.usage ?? null) as never, p.actualUsd === undefined ? undefined : Number(p.actualUsd)) }),
    'budget.release': (p) => { budget.release(String(p.reservation), String(p.reason ?? '')); return { released: true }; },
    'budget.exhausted': (p) => { budget.markExhausted(String(p.provider), p.model ? String(p.model) : null, Number(p.until), String(p.reason ?? '')); return { ok: true }; },
    'budget.status': () => budget.status(),
  };

  let lastActivity = Date.now();
  const sockets = new Set<net.Socket>();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    socket.setEncoding('utf8');
    let buffer = '';
    socket.on('data', (chunk: string) => {
      lastActivity = Date.now();
      buffer += chunk;
      let i: number;
      while ((i = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 1);
        let id: number | null = null;
        const fail = (e: unknown) => {
          const error = e instanceof DomainError ? { code: e.code, message: e.message, data: e.data } : { code: -32603, message: (e as Error).message };
          socket.write(`${JSON.stringify({ jsonrpc: '2.0', id, error })}\n`);
        };
        try {
          const req = JSON.parse(line) as { id: number; method: string; params?: Record<string, unknown> };
          id = req.id;
          const handler = methods[req.method];
          if (!handler) socket.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message: `método desconhecido: ${req.method}` } })}\n`);
          else {
            // Síncrono responde na hora (a ordem se mantém); assíncrono (login, logout) responde ao terminar.
            const out = handler(req.params ?? {});
            const reply = (result: unknown) => socket.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
            if (out instanceof Promise) out.then(reply, fail);
            else reply(out);
          }
        } catch (e) {
          fail(e);
        }
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', (e: NodeJS.ErrnoException) => reject(e.code === 'EADDRINUSE' ? new AlreadyRunningError(endpoint) : e));
    server.listen({ path: endpoint, readableAll: false, writableAll: false }, () => resolve());
  });

  // Console web local (ADR 0017): mesma API, lista fechada de métodos; RBUDDY_CONSOLE=0 desliga.
  if (process.env.RBUDDY_CONSOLE !== '0') consoleSrv = await startConsole({ home, methods, touch: () => { lastActivity = Date.now(); } });

  // Ocioso se desliga (padrão 15 min; RBUDDY_IDLE_MS, 0 desliga): o dono sob demanda guardava para
  // sempre as variáveis de ambiente do primeiro terminal, e uma chave trocada não valia (2026-10-17).
  const idleMs = Number(process.env.RBUDDY_IDLE_MS ?? 15 * 60_000);
  if (idleMs > 0) {
    const timer = setInterval(() => {
      const running = domain.listRuns().some((r) => r.state === 'running');
      if (running) lastActivity = Date.now();
      else if (Date.now() - lastActivity >= idleMs) { clearInterval(timer); void close(); }
    }, Math.max(250, Math.min(idleMs / 4, 30_000)));
    timer.unref();
    void closed.then(() => clearInterval(timer));
  }

  return { endpoint, pid: process.pid, closed, close };
}
