// Harness falso por ACP (stdio), feito com o próprio SDK oficial, na forma medida em 2026-10-18 nos harnesses
// reais do Pai (OpenCode 2.0.31, Hermes 0.22.2, Copilot 1.0.97): protocolVersion 1, agentInfo, capacidades com
// promptCapabilities.image e authMethods. Modo por FAKE_ACP_MODE:
//   ok     → pronto
//   auth   → session/new recusa com auth_required (-32000), como o ACP define
//   mute   → nunca responde (tempo-limite)
//   crash  → sai com erro antes de falar
// Conversa (session/prompt), na forma do SDK 1.9.0: raciocínio (agent_thought_chunk), texto em pedaços
// (agent_message_chunk) e uma ferramenta (tool_call e tool_call_update). FAKE_ACP_GAP: ms entre atualizações.
// FAKE_ACP_PROMPT=permission: pede permissão (session/request_permission) e conta a resposta no texto.
// FAKE_ACP_PREAMBLE: texto antes da ferramenta (o OpenCode real anuncia o que vai fazer, 2026-10-18).
// M1.2d, na forma medida em 2026-10-18 no Codex e no OpenCode reais:
//   FAKE_ACP_MODES=1: session/new declara a opção "mode" (read-only, agent) e aceita session/set_config_option;
//                     o texto final conta o modo em vigor ("Modo: <modo>.").
//   FAKE_ACP_ECHO_CONFIG=1: o texto final conta se recebeu OPENCODE_CONFIG_CONTENT com permission ask.
//   FAKE_ACP_PERM_KIND: tipo da ação pedida na permissão (padrão edit, com o caminho em locations).
//   FAKE_ACP_PROMPT=unasked: escreve um arquivo (tool_call edit concluído) sem pedir permissão.
//   FAKE_ACP_GENERIC_TITLE=1: o comando vem antes num tool_call, e o pedido de permissão diz só "Run command" (Codex).
// M1.2e (login do harness):
//   FAKE_ACP_AUTH_FILE: no modo auth, a sessão só abre depois de authenticate, que grava ali a credencial do harness
//                       (só o harness a guarda; ela nunca vai ao cliente).
//   FAKE_ACP_TERMINAL_AUTH=1: declara também um método do tipo terminal, que o cliente não pode passar ao authenticate.
//   FAKE_ACP_AUTH_FAIL=1: authenticate falha (login recusado no navegador).
//   FAKE_ACP_DENY_ENDS=1: a recusa encerra o turno com stopReason "cancelled", como nos harnesses reais.
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { agent, ndJsonStream, PROTOCOL_VERSION, RequestError } from '@agentclientprotocol/sdk';

const mode = process.env.FAKE_ACP_MODE ?? 'ok';
const gap = Number(process.env.FAKE_ACP_GAP ?? 0);
const cancelled = new Set();
const cwds = new Map();
let currentMode = 'agent';
const modeOption = () => ({ id: 'mode', name: 'Mode', category: 'mode', type: 'select', currentValue: currentMode, options: [{ value: 'read-only', name: 'Read-only' }, { value: 'agent', name: 'Auto review' }] });
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

if (mode === 'crash') { process.stderr.write('fake: configuração ausente\n'); process.exit(3); }
if (mode === 'mute') { process.stdin.resume(); setInterval(() => {}, 1000); }
else {
  const app = agent({ name: 'fake-acp' })
    .onRequest('initialize', () => ({
      protocolVersion: PROTOCOL_VERSION,
      agentInfo: { name: 'Fake', version: '0.0.1' },
      agentCapabilities: { loadSession: false, promptCapabilities: { image: true, embeddedContext: true }, sessionCapabilities: { close: {} } },
      authMethods: [{ id: 'fake-login', name: 'Login with Fake' }, ...(process.env.FAKE_ACP_TERMINAL_AUTH ? [{ id: 'fake-terminal', name: 'Setup in terminal', type: 'terminal', args: ['setup'] }] : [])],
    }))
    .onRequest('authenticate', ({ params }) => {
      if (process.env.FAKE_ACP_AUTH_FAIL) throw RequestError.internalError(undefined, 'login recusado no navegador');
      if (params.methodId !== 'fake-login') throw RequestError.invalidParams({ methodId: params.methodId });
      if (process.env.FAKE_ACP_AUTH_FILE) writeFileSync(process.env.FAKE_ACP_AUTH_FILE, 'credencial-do-harness-fake-7f3a9c');
      return {};
    })
    .onRequest('session/new', ({ params }) => {
      if (mode === 'auth' && !(process.env.FAKE_ACP_AUTH_FILE && existsSync(process.env.FAKE_ACP_AUTH_FILE))) throw RequestError.authRequired();
      const sessionId = `fake-${process.pid}`;
      cwds.set(sessionId, params.cwd);
      return { sessionId, ...(process.env.FAKE_ACP_MODES ? { configOptions: [modeOption()] } : {}) };
    })
    .onRequest('session/set_config_option', ({ params }) => {
      if (params.configId === 'mode') currentMode = String(params.value);
      return { configOptions: [modeOption()] };
    })
    .onRequest('session/close', () => ({}))
    .onNotification('session/cancel', ({ params }) => { cancelled.add(params.sessionId); })
    .onRequest('session/prompt', async ({ params, client }) => {
      const sessionId = params.sessionId;
      const task = params.prompt.map((b) => (b.type === 'text' ? b.text : '')).join(' ');
      const send = async (update) => { await client.notify('session/update', { sessionId, update }); if (gap) await sleep(gap); };
      const stop = () => cancelled.has(sessionId);
      await send({ sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: `Pensando na tarefa: ${task}` } });
      if (stop()) return { stopReason: 'cancelled' };
      if (process.env.FAKE_ACP_PREAMBLE) await send({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: process.env.FAKE_ACP_PREAMBLE } });
      await send({ sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Lendo README.md', kind: 'read', status: 'pending' });
      await send({ sessionUpdate: 'tool_call_update', toolCallId: 't1', status: 'completed' });
      if (stop()) return { stopReason: 'cancelled' };
      let extra = '';
      if (process.env.FAKE_ACP_PROMPT === 'permission') {
        const kind = process.env.FAKE_ACP_PERM_KIND ?? 'edit';
        // Como o Codex real (2026-10-19): o comando vem no tool_call, e o pedido de permissão do mesmo id diz só "Run command".
        const generic = Boolean(process.env.FAKE_ACP_GENERIC_TITLE);
        if (generic) await send({ sessionUpdate: 'tool_call', toolCallId: 't2', title: 'npm install', kind, status: 'in_progress' });
        const r = await client.request('session/request_permission', {
          sessionId,
          toolCall: kind === 'execute'
            ? { toolCallId: 't2', title: generic ? 'Run command' : 'npm install', kind, status: 'pending' }
            : { toolCallId: 't2', title: 'Editar README.md', kind, status: 'pending', locations: [{ path: join(cwds.get(sessionId) ?? '.', 'README.md') }] },
          options: [{ optionId: 'ok', name: 'Permitir', kind: 'allow_once' }, { optionId: 'always', name: 'Sempre', kind: 'allow_always' }, { optionId: 'no', name: 'Negar', kind: 'reject_once' }],
        });
        extra = ` Permissão: ${r.outcome.outcome === 'selected' ? r.outcome.optionId : r.outcome.outcome}.`;
        // Como o OpenCode e o Codex reais (2026-10-18): a recusa encerra o turno com stopReason "cancelled".
        if (process.env.FAKE_ACP_DENY_ENDS && r.outcome.optionId === 'no') return { stopReason: 'cancelled' };
      }
      if (process.env.FAKE_ACP_PROMPT === 'unasked') {
        await send({ sessionUpdate: 'tool_call', toolCallId: 't3', title: 'Escrevendo saida.txt', kind: 'edit', status: 'pending', locations: [{ path: join(cwds.get(sessionId) ?? '.', 'saida.txt') }] });
        await send({ sessionUpdate: 'tool_call_update', toolCallId: 't3', status: 'completed' });
      }
      if (process.env.FAKE_ACP_MODES) extra += ` Modo: ${currentMode}.`;
      if (process.env.FAKE_ACP_ECHO_CONFIG) extra += ` Config: ${/"edit":"ask"/.test(process.env.OPENCODE_CONFIG_CONTENT ?? '') ? 'ask' : 'nenhuma'}.`;
      await send({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'Olá, ' } });
      if (stop()) return { stopReason: 'cancelled' };
      await send({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: `Pai.${extra}` } });
      return { stopReason: 'end_turn' };
    });
  // Conexão fechada pelo cliente: sai em silêncio, como um harness bem-comportado.
  await app.connectWith(ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin)), () => new Promise(() => {})).catch(() => process.exit(0));
}
