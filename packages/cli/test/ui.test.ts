// Abrir a console sem terminal (ADR 0017): `rbuddy ui` sobe o núcleo se preciso e abre o navegador;
// o atalho de duplo clique chama exatamente isso.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/main.ts';
import { createI18n } from '../../client/src/i18n.ts';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../../core/src/paths.ts';

const pt = createI18n('pt-BR').t;
const homes: string[] = [];
after(async () => { for (const h of homes) { try { await call(endpointFor(h), 'daemon.stop', {}); } catch { /* parado */ } } });

test('rbuddy ui: sobe o núcleo, abre a console por um bilhete de uso único; o token não aparece no endereço nem na saída', async () => {
  const home = mkdtempSync(join(tmpdir(), 'rbuddy-ui-'));
  homes.push(home);
  const env = { ...process.env, RBUDDY_HOME: home, RBUDDY_CONSOLE_PORT: '0' } as NodeJS.ProcessEnv;
  delete env.RBUDDY_LANG;
  const out: string[] = [];
  let opened = '';
  assert.equal(await run(['ui'], env, { out: (s) => out.push(s), err: (s) => out.push(s) }, { openUrl: (u) => { opened = u; } }), 0);
  const { port, token } = JSON.parse(readFileSync(join(home, 'console.json'), 'utf8')) as { port: number; token: string };
  assert.match(opened, new RegExp(String.raw`^http://127\.0\.0\.1:${port}/entrar\?c=[A-Za-z0-9_-]{32,}$`));
  assert.equal(opened.includes(token), false, 'o bilhete não é o token');
  assert.ok(out.includes(pt('ui.opened', { url: `http://127.0.0.1:${port}/` })), 'a saída mostra só o endereço limpo');
  assert.equal(out.some((s) => s.includes(token) || s.includes('entrar?c=')), false, 'nem o token nem o bilhete na saída');
  const r = await fetch(opened, { redirect: 'manual' });
  assert.equal(r.status, 303);
  assert.match(r.headers.get('set-cookie') ?? '', /HttpOnly/i);
  assert.equal((await fetch(opened, { redirect: 'manual' })).status, 401, 'uso único');
});

test('atalho de duplo clique no Windows chama rbuddy ui a partir da pasta do repositório', () => {
  const cmd = join(import.meta.dirname, '..', '..', '..', 'abrir-rabelus-buddy.cmd');
  assert.ok(existsSync(cmd));
  const s = readFileSync(cmd, 'utf8');
  assert.ok(s.includes('cd /d "%~dp0"'), s);
  const sep = String.fromCharCode(92); // barra invertida do Windows
  assert.ok(s.includes(`start "" /min node packages${sep}cli${sep}bin${sep}rbuddy.mjs ui`), s);
  assert.equal(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s), false, 'sem caractere de controle perdido no caminho');
});
