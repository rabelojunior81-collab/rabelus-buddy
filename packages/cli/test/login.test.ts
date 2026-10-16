// rbuddy login chatgpt / logout chatgpt (SPEC 0001, critério 19), contra o servidor OAuth falso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../src/main.ts';
import { createI18n } from '../../client/src/i18n.ts';
import { browse, fakeAuth } from '../../core/test/fake-auth.ts';
import { loadCredentials } from '../../core/src/providers/siwc.ts';

const t = createI18n('pt-BR').t;

test('rbuddy login chatgpt --no-browser: mostra a URL, espera o retorno e guarda as credenciais', async () => {
  const { fake, st, endpoints } = await fakeAuth();
  const home = mkdtempSync(join(tmpdir(), 'rbuddy-login-'));
  const out: string[] = [];
  const err: string[] = [];
  let browsed: Promise<unknown> | undefined;
  let opened = 0;
  const code = await run(['login', 'chatgpt', '--no-browser'], { RBUDDY_HOME: home }, {
    out: (s) => {
      out.push(s);
      const url = /https?:\/\/\S+authorize\?\S+/.exec(s)?.[0];
      if (url) browsed = browse(url, st, { client_id: 'oaiapp_cli' });
    },
    err: (s) => err.push(s),
  }, { siwcEndpoints: endpoints, loginPort: 0, openUrl: () => { opened++; } });
  await browsed;
  assert.equal(code, 0, err.join('\n'));
  assert.equal(opened, 0, '--no-browser não abre o navegador');
  assert.ok(out.some((s) => s.startsWith(t('login.openUrl', { url: '' }).trim())));
  assert.ok(out.includes(t('login.done', { email: 'pai@example.com' })));
  assert.equal(loadCredentials(home)?.clientId, 'oaiapp_cli');

  // Logout: revoga e informa.
  const out2: string[] = [];
  assert.equal(await run(['logout', 'chatgpt'], { RBUDDY_HOME: home }, { out: (s) => out2.push(s), err: () => {} }, { siwcEndpoints: endpoints }), 0);
  assert.deepEqual(out2, [t('login.logoutDone')]);
  assert.equal(loadCredentials(home)?.refreshToken, undefined);
  await fake.close();
});

test('rbuddy login sem provedor conhecido mostra o uso e sai com erro; recusa no navegador sai com o código', async () => {
  const err: string[] = [];
  assert.equal(await run(['login'], {}, { out: () => {}, err: (s) => err.push(s) }), 1);
  assert.equal(await run(['login', 'gemini'], {}, { out: () => {}, err: (s) => err.push(s) }), 1);
  assert.deepEqual(err, [t('login.usage'), t('login.usage')]);

  const { fake, st, endpoints } = await fakeAuth();
  const home = mkdtempSync(join(tmpdir(), 'rbuddy-login-'));
  const e2: string[] = [];
  let browsed: Promise<unknown> | undefined;
  let opened = '';
  const code = await run(['login', 'chatgpt'], { RBUDDY_HOME: home }, {
    out: () => {},
    err: (s) => e2.push(s),
  }, { siwcEndpoints: endpoints, loginPort: 0, openUrl: (u) => { opened = u; browsed = browse(u, st, { error: 'access_denied' }); } });
  await browsed;
  assert.equal(code, 1);
  assert.match(opened, /authorize\?/, 'sem --no-browser, abre o navegador');
  assert.deepEqual(e2, [t('login.failed', { code: 'access_denied' })]);
  await fake.close();
});
