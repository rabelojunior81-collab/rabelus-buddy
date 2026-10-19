// Higiene dos testes (2026-10-18): com um teste vermelho, a asserção falha antes do close() do servidor falso, e o
// servidor (ou uma conexão pendurada) mantinha o processo de teste vivo para sempre. O servidor falso nunca segura
// o processo sozinho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

// Um fetch ainda pendente do próprio processo o segura de propósito (o teste espera por ele); o caso real era o
// servidor já atendido e esquecido aberto, com a conexão mantida viva.
test('servidor falso esquecido aberto depois de atender não segura o processo', () => {
  const mod = pathToFileURL(join(import.meta.dirname, 'fake-http.ts')).href;
  const code = `const { fakeHttp } = await import(${JSON.stringify(mod)});
const s = await fakeHttp(() => ({ json: { ok: true } }));
const r = await fetch(s.url + '/registry.json');
if (!(await r.json()).ok) process.exit(2);`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { timeout: 15_000, encoding: 'utf8', windowsHide: true });
  assert.equal(r.error, undefined, 'o processo terminou sozinho');
  assert.equal(r.status, 0, r.stderr);
});
