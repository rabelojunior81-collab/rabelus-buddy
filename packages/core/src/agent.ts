// Loop do agente (SPEC 0001, escopos 6, 10 e 11; critérios 5, 16, 20 e 21).
// Cada passo: compacta o contexto se preciso, escolhe o provedor pela ordem (política e orçamento),
// chama o modelo como efeito com identidade e executa as ferramentas pedidas pela política.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { EventLog } from './log.ts';
import { DomainError, ERR, type Approval, type Domain } from './domain.ts';
import type { Policy, Scope, Tool } from './policy.ts';
import { BudgetError, costOf, type Budget, type Usage } from './budget.ts';
import { PRICES, type Price } from './prices.ts';
import type { FsTools } from './tools/fs.ts';
import type { CommandTool } from './tools/command.ts';
import { scrub } from './providers/adapters.ts';
import { AttachmentError, loadAttachment, type Attachment } from './attachments.ts';
import { ProviderLimitError, ProviderRejectedError, ProviderUnknownError, type ChatMessage, type Effort, type ModelRequest, type ModelResponse, type Progress, type Provider, type ToolCall, type ToolSpec } from './providers/types.ts';

export const CONTEXT_LIMIT = 100_000;
export const SYSTEM_PROMPT = 'Você é o Rabelus Buddy, um agente de código governado. Use as ferramentas para cumprir a tarefa.';
// Modelos de raciocínio gastam saída antes do texto: teto generoso (registro 2026-10-16 da sonda real).
export const DEFAULT_MAX_OUTPUT = 16_000;
const DEFAULT_MAX_STEPS = 50;
// Preço conservador para modelo da API paga sem preço na tabela: superestima, nunca fura o teto.
export const CONSERVATIVE_PRICE: Price = { input: 15, cachedInput: 15, cacheWrite: 15, output: 75 };
const PAID = new Set(['openrouter']);
// Códigos de recusa que podem ser do campo de esforço (corpo inválido), não da conta.
// Recusa do esforço pelo provedor: a chamada se repete sem ele. invalid_value e unsupported_value medidos no ChatGPT
// real em 2026-10-19 ("ultra"; "none" e "minimal" no gpt-6.1-sol), M1.5c.
const PER_MODEL_LIMIT = new Set(['opencode-go', 'openrouter']);
const EFFORT_REFUSAL = new Set(['http_400', 'http_422', 'subscription_sharing_unsupported_capability', 'invalid_value', 'unsupported_value']);
const FREE: Price = { input: 0, cachedInput: 0, cacheWrite: 0, output: 0 };
// Raciocínio registrado por passo (critério 32): teto para o log não crescer sem limite.
const REASONING_MAX = 20_000;

export interface Route { provider: Provider; model: string }

export interface AgentOptions {
  log: EventLog;
  domain: Domain;
  policy: Policy;
  budget: Budget;
  fs: FsTools;
  cmd: CommandTool;
  routes: Route[];
  interactive: boolean;
  awaitApproval?: (a: Approval) => Promise<'approve' | 'deny'>;
  maxSteps?: number;
  contextLimit?: number;
  maxOutputTokens?: number;
  effort?: Effort; // esforço de raciocínio da execução (rev. 5, critério 29)
  // Rev. 6 (M0.8d): parar aborta a chamada em curso; o andamento vai a quem observa (fora do log);
  // a caixa de direcionamento (steer) entrega mensagens do usuário antes da próxima chamada.
  signal?: AbortSignal;
  onProgress?: (run: string, p: AgentProgress) => void;
  inbox?: (run: string) => string[];
  // Visão por rota (M1.3, critério 9): mensagem com imagem pula a rota que não enxerga. Ausente: todas enxergam.
  vision?: (provider: string, model: string) => boolean;
  // Escopo escolhido no cartão (critério 17): uma vez, nesta conversa, neste projeto ou sempre.
  scopeOf?: (approval: string) => Scope;
  // Delegação (M1.4, critério 8): o núcleo diz quais harnesses estão prontos e roda o turno delegado.
  delegate?: Delegate;
}

export interface Delegate {
  list: () => Promise<string[]>;
  run: (session: string, run: string, a: { harness: string; task: string }) => Promise<Record<string, unknown> & { ok: boolean }>;
}

export type AgentProgress = Progress | { kind: 'call'; route: string; step: number } | { kind: 'exec'; name: string; step: number };

export interface AgentResult { run: string; outcome: 'done' | 'stopped'; reason?: string; text: string; steps: number }

export const AGENT_TOOLS: ToolSpec[] = [
  { name: 'read_file', description: 'Lê um arquivo de texto do workspace.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'caminho relativo ao workspace' } }, required: ['path'] } },
  { name: 'list_dir', description: 'Lista as entradas de um diretório do workspace.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'caminho relativo ao workspace' } }, required: ['path'] } },
  { name: 'write_file', description: 'Escreve um arquivo no workspace (leia antes, se ele já existir).', parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } },
  { name: 'run_command', description: 'Roda um comando no workspace. Com a contenção do sistema ativa, roda sem pedir aprovação; sem ela, exige aprovação humana (uma vez, ou para o mesmo comando na conversa, no projeto ou sempre). Com contained=true, o comando rodou contido pelo sistema: só lê e escreve a pasta de trabalho, os segredos (.env, chaves) ficam negados, e um acesso negado vem disso. A rede sai só pelo proxy do Buddy (HTTPS_PROXY): cada site novo pede aprovação humana, e um 403 do proxy é um site negado.', parameters: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } },
];

// A ferramenta de delegação só aparece com harness pronto; o enum diz ao modelo quais existem.
export const delegateTool = (harnesses: string[]): ToolSpec => ({
  name: 'delegate',
  description: 'Delega uma subtarefa a outro agente de código instalado (harness, por ACP) e devolve a resposta dele. As permissões que ele pedir passam pelo Pai.',
  parameters: { type: 'object', properties: { harness: { type: 'string', enum: harnesses, description: 'id do harness' }, task: { type: 'string', description: 'a subtarefa, completa e autossuficiente' } }, required: ['harness', 'task'] },
});

// ---------- Contexto ----------

// Estimativa simples e conservadora: ~4 caracteres por token, mais o envelope de cada mensagem.
export function estimateTokens(msgs: ChatMessage[]): number {
  let chars = 0;
  for (const m of msgs) chars += m.content.length + (m.toolCalls ?? []).reduce((a, t) => a + t.name.length + t.arguments.length, 0) + 16;
  return Math.ceil(chars / 4);
}

// Compactação mecânica: mantém sistema e tarefa intactos; descarta grupos antigos inteiros (assistente
// e seus resultados de ferramenta), sempre guardando o último, e avisa numa nota logo depois da tarefa;
// se ainda passar, trunca o maior conteúdo.
export function compact(msgs: ChatMessage[], limit: number): { messages: ChatMessage[]; dropped: number } {
  const head = msgs.slice(0, 2);
  const groups: ChatMessage[][] = [];
  for (const m of msgs.slice(2)) {
    if (m.role === 'tool' && groups.length) groups.at(-1)!.push(m);
    else groups.push([m]);
  }
  let dropped = 0;
  const flat = () => [...head, ...groups.flat()];
  while (groups.length > 1 && estimateTokens(flat()) > limit) dropped += groups.shift()!.length;
  if (dropped) head.push({ role: 'user', content: `[contexto compactado: ${dropped} mensagens antigas removidas]` });
  let out = flat();
  while (estimateTokens(out) > limit) {
    const big = out.reduce((bi, m, i) => (m.role !== 'system' && m.content.length > (out[bi]?.content.length ?? 0) ? i : bi), 1);
    const m = out[big]!;
    const excess = (estimateTokens(out) - limit) * 4 + 64;
    if (m.content.length <= excess) break;
    out = out.map((x, i) => (i === big ? { ...x, content: `${x.content.slice(0, x.content.length - excess)}\n[truncado]` } : x));
  }
  return { messages: out, dropped };
}

// ---------- Loop ----------

type ToolOut = Record<string, unknown> & { ok: boolean };
const sha = (s: string): string => createHash('sha256').update(s).digest('hex');
const parse = (a: string): Record<string, unknown> => { try { return JSON.parse(a || '{}') as Record<string, unknown>; } catch { return {}; } };

export class Agent {
  private readonly o: AgentOptions;
  constructor(o: AgentOptions) { this.o = o; }

  private priceFor(r: Route): Price | null {
    // Variante :free do OpenRouter não cobra (registro da sonda real: chamada "sem custo").
    if (PAID.has(r.provider.id) && r.model.endsWith(':free')) return FREE;
    return PRICES[r.model] ?? (PAID.has(r.provider.id) ? CONSERVATIVE_PRICE : null);
  }

  // A conversa é evento: cada mensagem entra no log, e a retomada a reconstrói.
  // `prior`: mensagem copiada de uma execução anterior (conversa contínua); a console não a repete.
  private push(session: string, run: string, messages: ChatMessage[], m: ChatMessage, prior = false): void {
    this.o.log.append(session, 'agent.message', { run, message: m, ...(prior ? { prior: true } : {}) });
    messages.push(m);
  }

  transcript(session: string, run: string): ChatMessage[] {
    return this.o.log.events(session)
      .filter((e) => e.kind === 'agent.message' && (e.payload as { run?: string }).run === run)
      .map((e) => (e.payload as { message: ChatMessage }).message);
  }

  run(session: string, task: string, opts: { system?: string } = {}): Promise<AgentResult> {
    return this.begin(session, task, opts).done;
  }

  // Cria a execução já (o id volta na hora para quem chamou) e segue o laço em segundo plano.
  // `prior`: conversa contínua — o histórico de uma execução anterior da sessão vem antes da nova mensagem.
  // `attachments`: anexos já guardados na pasta de trabalho (M1.3); a mensagem do log leva só a referência.
  begin(session: string, task: string, { system = SYSTEM_PROMPT, prior, attachments }: { system?: string; prior?: ChatMessage[]; attachments?: Attachment[] } = {}): { run: string; done: Promise<AgentResult> } {
    const run = this.o.domain.startRun(session, task).id;
    const messages: ChatMessage[] = [];
    if (prior?.length) for (const m of prior) this.push(session, run, messages, m, true);
    else this.push(session, run, messages, { role: 'system', content: system });
    this.push(session, run, messages, { role: 'user', content: task, ...(attachments?.length ? { attachments } : {}) });
    return { run, done: this.loop(session, run, messages, 1) };
  }

  // Retomada depois de queda ou parada: reconcilia os efeitos desconhecidos, completa as ferramentas
  // pendentes do último passo e segue o laço com a conversa do log.
  async resume(session: string, run: string): Promise<AgentResult> {
    const { domain } = this.o;
    domain.resumeRun(run);
    const messages = this.transcript(session, run);
    const calls = new Map(messages.flatMap((m) => m.toolCalls ?? []).map((t) => [`${run}:${t.id}`, t]));
    for (const e of domain.unknownEffects(run)) {
      if (e.kind === 'model.call') { domain.reconcileEffect(e.id, 'not-done'); continue; } // sem efeito no workspace
      if (e.kind === 'file.write') {
        const args = parse(calls.get(e.key)?.arguments ?? '');
        const abs = resolve(this.o.policy.workspace, e.target);
        const same = typeof args.content === 'string' && existsSync(abs) && sha(readFileSync(abs, 'utf8')) === sha(args.content);
        domain.reconcileEffect(e.id, same ? 'done' : 'not-done');
        continue;
      }
      // Comando ou delegação: só o humano sabe se rodou. Aprovar = rodar de novo; negar = considerar feito.
      if (!this.o.interactive || !this.o.awaitApproval) return this.stop(run, 'needsReconciliation', 0);
      const d = await this.approve(session, e.kind === 'harness.delegate' ? `reconcile delegate ${e.target}` : `reconcile run_command ${e.target}`);
      domain.reconcileEffect(e.id, d === 'approve' ? 'not-done' : 'done');
    }
    const last = messages.at(-1);
    if (last?.role === 'assistant' && last.toolCalls?.length) {
      // A mesma chamada do modelo de antes da queda: não conta de novo para o detector de laço.
      for (const tc of last.toolCalls) this.push(session, run, messages, { role: 'tool', toolCallId: tc.id, content: await this.executeTool(session, run, tc, { observe: false }) });
    }
    return this.loop(session, run, messages, messages.filter((m) => m.role === 'assistant').length + 1);
  }

  private stop(run: string, reason: string, steps: number, text = ''): AgentResult {
    this.o.domain.stopRun(run, reason);
    return { run, outcome: 'stopped', reason, text, steps };
  }

  private async loop(session: string, run: string, messages: ChatMessage[], first: number): Promise<AgentResult> {
    const { domain, log, policy } = this.o;
    const rejected = new Set<string>();
    const noEffort = new Set<string>(); // rotas que recusaram o esforço nesta execução
    const limit = this.o.contextLimit ?? CONTEXT_LIMIT;
    const max = first - 1 + (this.o.maxSteps ?? DEFAULT_MAX_STEPS);
    const harnesses = this.o.delegate ? await this.o.delegate.list().catch(() => []) : [];
    const tools = harnesses.length ? [...AGENT_TOOLS, delegateTool(harnesses)] : AGENT_TOOLS;
    for (let step = first; step <= max; step++) {
      if (this.o.signal?.aborted) return this.stop(run, 'userStopped', step - 1);
      if (policy.isPaused(session)) return this.stop(run, 'sessionPaused', step - 1);
      this.steer(session, run, messages);
      // A compactação vale para a chamada; a conversa completa continua no log.
      let sent = messages;
      const before = estimateTokens(messages);
      if (before > limit) {
        const c = compact(messages, limit);
        sent = c.messages;
        log.append(session, 'context.compacted', { run, step, before, after: estimateTokens(sent), dropped: c.dropped });
      }
      const call = await this.callModel(session, run, step, sent, rejected, noEffort, tools);
      if ('stop' in call) return this.stop(run, call.stop, step - 1);
      const res = call.response;
      log.append(session, 'agent.step', { run, step, route: call.route, effort: call.effort ?? null, finish: res.finish, toolCalls: res.toolCalls.length, usage: res.usage });
      // O raciocínio exposto fica registrado (critério 32), fora da conversa enviada ao modelo.
      if (res.reasoning) log.append(session, 'agent.reasoning', { run, step, route: call.route, text: res.reasoning.slice(0, REASONING_MAX) });
      this.push(session, run, messages, { role: 'assistant', content: res.text, ...(res.toolCalls.length ? { toolCalls: res.toolCalls } : {}) });
      if (!res.toolCalls.length) {
        // Direcionamento que chegou durante a chamada: a execução segue em vez de terminar (critério 33).
        if (this.steer(session, run, messages)) continue;
        domain.finishRun(run);
        return { run, outcome: 'done', text: res.text, steps: step };
      }
      for (const tc of res.toolCalls) {
        this.o.onProgress?.(run, { kind: 'exec', name: tc.name, step });
        this.push(session, run, messages, { role: 'tool', toolCallId: tc.id, content: await this.executeTool(session, run, tc) });
      }
    }
    return this.stop(run, 'maxSteps', max);
  }

  // Mensagens de direcionamento (steer) entram como mensagens do usuário, marcadas no log.
  private steer(session: string, run: string, messages: ChatMessage[]): number {
    const msgs = this.o.inbox?.(run) ?? [];
    for (const content of msgs) {
      this.o.log.append(session, 'agent.message', { run, message: { role: 'user', content }, steer: true });
      messages.push({ role: 'user', content });
    }
    return msgs.length;
  }

  // Percorre a ordem de provedores; cada tentativa é um efeito com identidade e uma reserva.
  private async callModel(session: string, run: string, step: number, messages: ChatMessage[], rejected: Set<string>, noEffort: Set<string>, tools: ToolSpec[] = AGENT_TOOLS): Promise<{ response: ModelResponse; route: string; effort?: Effort } | { stop: string }> {
    const { domain, budget, policy, log, routes } = this.o;
    const maxOut = this.o.maxOutputTokens ?? DEFAULT_MAX_OUTPUT;
    let budgetBlocked = false;
    let emptyResponse = false;
    let visionSkipped = false;
    // Anexos (M1.3): o conteúdo é lido do arquivo, com o hash conferido, só para este pedido; o log fica com a referência.
    let sent: ChatMessage[];
    try {
      sent = messages.map((m) => (m.attachments?.length ? { ...m, files: m.attachments.map((a) => loadAttachment(policy.workspace, a)) } : m));
    } catch (e) {
      if (!(e instanceof AttachmentError)) throw e;
      log.append(session, 'attachment.missing', { run, reason: e.message });
      return { stop: 'attachmentMissing' };
    }
    const needsVision = messages.some((m) => m.attachments?.some((a) => a.kind === 'image'));
    for (let i = 0; i < routes.length; i++) {
      const r = routes[i]!;
      const name = `${r.provider.id}/${r.model}`;
      const next = routes[i + 1];
      const skip = (reason: string) => { if (next) log.append(session, 'provider.switched', { from: name, to: `${next.provider.id}/${next.model}`, reason }); };
      if (rejected.has(r.provider.id)) continue; // a recusa e a troca já estão no log desta execução
      if (policy.decide({ session, tool: 'model.use', target: r.model }, { interactive: false }).effect !== 'allow') { skip('policy'); continue; }
      // Mensagem com imagem: a rota sem visão é pulada com o motivo, sem chamada (critério 9).
      if (needsVision && this.o.vision && !this.o.vision(r.provider.id, r.model)) { visionSkipped = true; skip('noVision'); continue; }

      const price = this.priceFor(r);
      const estimate = price ? costOf({ input_tokens: estimateTokens(messages), cached_tokens: 0, cache_write_tokens: 0, output_tokens: maxOut }, price) : 0;
      let reservation: string;
      try {
        reservation = budget.reserve(session, { provider: r.provider.id, model: r.model, estimateUsd: estimate });
      } catch (e) {
        if (!(e instanceof BudgetError)) throw e;
        budgetBlocked = true;
        skip(e.reason);
        continue;
      }

      const effect = domain.beginEffect(session, run, 'model.call', `${run}:step${step}:${name}`, name).id;
      const effort = this.o.effort && !noEffort.has(name) ? this.o.effort : undefined;
      // O modelo em uso entra na instrução de sistema a cada tentativa: a resposta "qual modelo é você" sai verdadeira.
      const named = sent.map((m) => (m.role === 'system' && m.content.includes('{{route}}') ? { ...m, content: m.content.replaceAll('{{route}}', name) } : m));
      const req: ModelRequest = { model: r.model, messages: named, tools, maxOutputTokens: maxOut, ...(effort ? { effort } : {}) };
      try {
        this.o.onProgress?.(run, { kind: 'call', route: name, step });
        const response = await r.provider.call(req, { session, ...(this.o.signal ? { signal: this.o.signal } : {}), ...(this.o.onProgress ? { onProgress: (p: Progress) => this.o.onProgress!(run, p) } : {}) });
        domain.completeEffect(effect, { finish: response.finish, usage: response.usage });
        budget.settle(reservation, response.usage, price ? costOf(response.usage as Usage, price) : 0);
        // Resposta vazia (nenhum texto, nenhuma ferramenta, 0 tokens de saída): falha da rota, não "concluída"
        // muda (achado no ensaio do M1.0). Fica no log, e a ordem segue para o próximo provedor. Também vazia: sem
        // texto e sem ferramenta, cortada pelo limite depois de gastá-lo em raciocínio (Nemotron VL real, M1.3).
        const cutOff = response.finish === 'length';
        if (!response.text.trim() && !response.toolCalls.length && (!(response.usage?.output_tokens ?? 0) || cutOff)) {
          log.append(session, 'provider.error', { route: name, code: 'emptyResponse', message: cutOff ? 'resposta vazia: o limite de saída acabou antes do texto (gasto em raciocínio)' : 'resposta vazia: nenhum texto, nenhuma ferramenta, 0 tokens de saída' });
          rejected.add(r.provider.id);
          emptyResponse = true;
          skip('emptyResponse');
          continue;
        }
        return { response, route: name, ...(effort ? { effort } : {}) };
      } catch (e) {
        // Parada pedida pelo usuário: não é efeito desconhecido; o consumo é incerto e liquida pela estimativa.
        if (this.o.signal?.aborted) {
          domain.failEffect(effect, 'userStopped');
          budget.settle(reservation, null, estimate);
          return { stop: 'userStopped' };
        }
        if (e instanceof ProviderLimitError) {
          log.append(session, 'provider.error', { route: name, code: 'limit', message: scrub(e.message) });
          domain.failEffect(effect, 'providerLimit');
          budget.release(reservation, 'providerLimit');
          // No Go e no OpenRouter o limite comum é do modelo (um grátis ocupado não bloqueia os outros, achado da M1.5c);
          // limite da conta (escopo provider: janela semanal, sem saldo) esgota o provedor inteiro.
          budget.markExhausted(r.provider.id, PER_MODEL_LIMIT.has(r.provider.id) && e.scope !== 'provider' ? r.model : null, e.until, 'providerLimit');
          budgetBlocked = true;
          skip('windowExhausted');
          continue;
        }
        // Recusa do esforço (corpo inválido): a mesma rota tenta de novo, uma vez, sem ele (critério 29).
        if (e instanceof ProviderRejectedError && effort && EFFORT_REFUSAL.has(e.code)) {
          log.append(session, 'effort.dropped', { route: name, effort, code: e.code });
          domain.failEffect(effect, e.code);
          budget.release(reservation, 'effortDropped');
          noEffort.add(name);
          i--;
          continue;
        }
        if (e instanceof ProviderRejectedError) {
          // O motivo fica no log (sem segredo): sem ele, um 403 de assinatura vira mistério.
          log.append(session, 'provider.error', { route: name, code: e.code, message: scrub(e.message) });
          domain.failEffect(effect, e.code);
          budget.release(reservation, e.code);
          rejected.add(r.provider.id);
          skip('rejected');
          continue;
        }
        // Sem resposta conclusiva: o consumo é incerto (liquida pela estimativa) e repetir exige reconciliação.
        domain.markUnknown(effect);
        budget.settle(reservation, null, estimate);
        const ex = e as { name?: string; code?: string; cause?: { code?: string } };
        log.append(session, 'provider.error', { route: name, code: String(ex.code ?? ex.cause?.code ?? ex.name ?? 'unknown'), message: 'sem resposta conclusiva' });
        return { stop: 'effect.unknown' };
      }
    }
    return { stop: budgetBlocked ? 'budget.windowExhausted' : emptyResponse ? 'provider.emptyResponse' : visionSkipped ? 'noVisionRoute' : 'provider.unavailable' };
  }

  // Executa uma chamada de ferramenta e devolve o resultado (JSON) para o modelo.
  async executeTool(session: string, run: string, tc: ToolCall, { observe = true }: { observe?: boolean } = {}): Promise<string> {
    const a = parse(tc.arguments);
    const ctx = { interactive: this.o.interactive, observe };
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const out = (o: ToolOut) => JSON.stringify(o);
    try {
      switch (tc.name) {
        case 'read_file': {
          const r = this.o.fs.readFile(session, str(a.path), ctx);
          return out(r.ok ? { ok: true, content: r.content } : { ok: false, reason: r.reason });
        }
        case 'list_dir': {
          const r = this.o.fs.listDir(session, str(a.path) || '.', ctx);
          return out(r.ok ? { ok: true, entries: r.entries } : { ok: false, reason: r.reason });
        }
        case 'write_file': {
          const path = str(a.path);
          const target = this.o.policy.relative(path) ?? path;
          return out(await this.effect(session, run, tc, 'file.write', target, 'write_file', observe, (obs) => {
            const r = this.o.fs.writeFile(session, path, str(a.content), { ...ctx, observe: obs });
            return r.ok ? { ok: true, hash: r.hash } : { ok: false, reason: r.reason };
          }));
        }
        case 'run_command': {
          const command = str(a.command);
          return out(await this.effect(session, run, tc, 'command', command, 'run_command', observe, async (obs) => {
            const askNetwork = ctx.interactive ? (host: string) => this.askNetwork(session, host) : undefined;
            const r = await this.o.cmd.run(session, command, { ...ctx, observe: obs, ...(askNetwork ? { askNetwork } : {}) });
            return r.ok ? { ok: true, ...r.result } : { ok: false, reason: r.reason };
          }));
        }
        case 'delegate': {
          if (!this.o.delegate) return out({ ok: false, reason: 'unknownTool', tool: tc.name });
          return out(await this.delegated(session, run, tc, str(a.harness), str(a.task)));
        }
        default:
          return out({ ok: false, reason: 'unknownTool', tool: tc.name });
      }
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      return out({ ok: false, reason: code === 'ENOENT' ? 'notFound' : code === 'EISDIR' ? 'isDirectory' : 'toolError' });
    }
  }

  // Efeito com identidade (run + id da chamada): feito uma vez, repete o recibo; desconhecido exige reconciliação.
  private async effect(session: string, run: string, tc: ToolCall, kind: string, target: string, tool: Tool, observe: boolean, exec: (observe: boolean) => ToolOut | Promise<ToolOut>): Promise<ToolOut> {
    const { domain, policy } = this.o;
    const key = `${run}:${tc.id}`;
    const prev = domain.effectByKey(key);
    // Reconciliado como feito não tem recibo: o resultado é só o sucesso.
    if (prev?.state === 'done') return { ok: true, ...(domain.receiptOf(prev.id) as ToolOut | undefined), replayed: true };
    let effect: string;
    try {
      effect = domain.beginEffect(session, run, kind, key, target).id;
    } catch (e) {
      if (e instanceof DomainError && e.code === ERR.needsReconciliation) return { ok: false, reason: 'needsReconciliation', effect: e.data.effect };
      throw e;
    }
    let r = await exec(observe);
    if (!r.ok && r.reason === 'needsApproval') {
      const decision = await this.approve(session, `${tool} ${target}`);
      if (decision === 'approve') {
        policy.grant((this.lastApproval && this.o.scopeOf?.(this.lastApproval)) || 'once', { tool, pattern: target }, { session });
        r = await exec(false);
      } else r = { ok: false, reason: 'deniedByHuman' };
    }
    if (r.ok) domain.completeEffect(effect, r);
    else domain.failEffect(effect, String(r.reason));
    return r;
  }

  // Delegação com identidade (run + id da chamada): feita uma vez, repete o recibo; desconhecida exige reconciliação.
  private async delegated(session: string, run: string, tc: ToolCall, harness: string, task: string): Promise<ToolOut> {
    const { domain } = this.o;
    const key = `${run}:${tc.id}`;
    const prev = domain.effectByKey(key);
    if (prev?.state === 'done') return { ok: true, ...(domain.receiptOf(prev.id) as ToolOut | undefined), replayed: true };
    let effect: string;
    try {
      effect = domain.beginEffect(session, run, 'harness.delegate', key, harness).id;
    } catch (e) {
      if (e instanceof DomainError && e.code === ERR.needsReconciliation) return { ok: false, reason: 'needsReconciliation', effect: e.data.effect };
      throw e;
    }
    const r = await this.o.delegate!.run(session, run, { harness, task });
    if (r.ok) domain.completeEffect(effect, r);
    else domain.failEffect(effect, String(r.reason));
    return r;
  }

  // Cartão "rede" (M2.3): o destino novo de um comando contido pede aprovação; o escopo escolhido vira concessão do host.
  private async askNetwork(session: string, host: string): Promise<boolean> {
    const decision = await this.approve(session, `network ${host}`);
    if (decision !== 'approve') return false;
    const scope = (this.lastApproval && this.o.scopeOf?.(this.lastApproval)) || 'once';
    // "Uma vez" vale para esta conexão: o proxy já libera, e a concessão não precisa ficar.
    if (scope !== 'once') this.o.policy.grant(scope, { tool: 'network', pattern: host }, { session });
    return true;
  }

  private lastApproval: string | undefined;
  private async approve(session: string, action: string): Promise<'approve' | 'deny'> {
    const { domain } = this.o;
    // Pendente da mesma sessão e ação (sobreviveu a uma queda): é a mesma pergunta, não se repete.
    const ap = domain.pendingApprovals().find((x) => x.session === session && x.action === action) ?? domain.requestApproval(session, action);
    this.lastApproval = ap.id;
    if (!this.o.awaitApproval) return 'deny';
    const decision = await this.o.awaitApproval(ap);
    if (domain.getApproval(ap.id).state === 'pending') domain.resolveApproval(ap.id, decision);
    return domain.getApproval(ap.id).state === 'approved' ? 'approve' : 'deny';
  }
}
