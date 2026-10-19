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
import { Readable, Writable } from 'node:stream';
import { agent, ndJsonStream, PROTOCOL_VERSION, RequestError } from '@agentclientprotocol/sdk';

const mode = process.env.FAKE_ACP_MODE ?? 'ok';
const gap = Number(process.env.FAKE_ACP_GAP ?? 0);
const cancelled = new Set();
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

if (mode === 'crash') { process.stderr.write('fake: configuração ausente\n'); process.exit(3); }
if (mode === 'mute') { process.stdin.resume(); setInterval(() => {}, 1000); }
else {
  const app = agent({ name: 'fake-acp' })
    .onRequest('initialize', () => ({
      protocolVersion: PROTOCOL_VERSION,
      agentInfo: { name: 'Fake', version: '0.0.1' },
      agentCapabilities: { loadSession: false, promptCapabilities: { image: true, embeddedContext: true }, sessionCapabilities: { close: {} } },
      authMethods: [{ id: 'fake-login', name: 'Login with Fake' }],
    }))
    .onRequest('session/new', () => {
      if (mode === 'auth') throw RequestError.authRequired();
      return { sessionId: `fake-${process.pid}` };
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
        const r = await client.request('session/request_permission', {
          sessionId,
          toolCall: { toolCallId: 't2', title: 'Editar README.md', kind: 'edit', status: 'pending' },
          options: [{ optionId: 'ok', name: 'Permitir', kind: 'allow_once' }, { optionId: 'no', name: 'Negar', kind: 'reject_once' }],
        });
        extra = ` Permissão: ${r.outcome.outcome === 'selected' ? r.outcome.optionId : r.outcome.outcome}.`;
      }
      await send({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'Olá, ' } });
      if (stop()) return { stopReason: 'cancelled' };
      await send({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: `Pai.${extra}` } });
      return { stopReason: 'end_turn' };
    });
  // Conexão fechada pelo cliente: sai em silêncio, como um harness bem-comportado.
  await app.connectWith(ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin)), () => new Promise(() => {})).catch(() => process.exit(0));
}
