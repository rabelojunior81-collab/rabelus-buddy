// Turno ACP direto (harness/session.ts), sem o dono do núcleo. O relógio de inatividade mede o silêncio do harness;
// enquanto o pedido de permissão espera o Pai decidir, quem está em silêncio é o Pai, não o harness (M1.2d, 2026-10-19).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promptTurn } from '../src/harness/session.ts';
import type { LaunchSpec } from '../src/harness/client.ts';

const FAKE = join(import.meta.dirname, 'fake-acp-agent.mjs');
const spec = (env: Record<string, string>): LaunchSpec => ({ cmd: process.execPath, args: [FAKE], env: { FAKE_ACP_MODE: 'ok', ...env }, source: 'local', needsApproval: false });

test('decisão demorada do Pai sobre uma permissão não conta como silêncio do harness', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'rbuddy-turno-'));
  const r = await promptTurn(spec({ FAKE_ACP_PROMPT: 'permission' }), {
    // Relógio de 2 s (acima do custo de iniciar o processo com a suíte inteira rodando) e espera do Pai de 5 s,
    // bem maior que o relógio.
    cwd, task: 'edite', idleMs: 2000,
    onPermission: async () => { await new Promise((ok) => setTimeout(ok, 5000)); return { outcome: 'selected', optionId: 'ok' }; },
  });
  assert.equal(r.stopReason, 'end_turn');
  assert.match(r.text, /Permissão: ok\./);
});

test('harness mudo continua derrubado pelo relógio de inatividade', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'rbuddy-turno-'));
  await assert.rejects(promptTurn(spec({ FAKE_ACP_MODE: 'mute' }), { cwd, task: 'oi', idleMs: 2000 }), /sem resposta do harness/);
});
