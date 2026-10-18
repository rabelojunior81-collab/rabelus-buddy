// Harness falso por ACP (stdio), feito com o próprio SDK oficial, na forma medida em 2026-10-18 nos harnesses
// reais do Pai (OpenCode 2.0.31, Hermes 0.22.2, Copilot 1.0.97): protocolVersion 1, agentInfo, capacidades com
// promptCapabilities.image e authMethods. Modo por FAKE_ACP_MODE:
//   ok     → pronto
//   auth   → session/new recusa com auth_required (-32000), como o ACP define
//   mute   → nunca responde (tempo-limite)
//   crash  → sai com erro antes de falar
import { Readable, Writable } from 'node:stream';
import { agent, ndJsonStream, PROTOCOL_VERSION, RequestError } from '@agentclientprotocol/sdk';

const mode = process.env.FAKE_ACP_MODE ?? 'ok';
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
    .onRequest('session/close', () => ({}));
  // Conexão fechada pelo cliente: sai em silêncio, como um harness bem-comportado.
  await app.connectWith(ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin)), () => new Promise(() => {})).catch(() => process.exit(0));
}
