// Console web local (SPEC 0001 rev. 5, escopo 19; critérios 27, 28 e 30; ADR 0017).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { consolePath, CONSOLE_METHODS } from '../src/console.ts';
import { fakeHttp, type Captured } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });

interface Res { status: number; body: string; type: string }
function request(port: number, method: string, path: string, { host = `127.0.0.1:${port}`, token, body }: { host?: string; token?: string; body?: unknown } = {}): Promise<Res> {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : JSON.stringify(body);
    const r = http.request({ host: '127.0.0.1', port, method, path, headers: { host, ...(token ? { 'x-rbuddy-token': token } : {}), ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}) } }, (res) => {
      let b = '';
      res.setEncoding('utf8');
      res.on('data', (c: string) => { b += c; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: b, type: String(res.headers['content-type'] ?? '') }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
const api = async (port: number, token: string, method: string, params: unknown = {}) => {
  const r = await request(port, 'POST', `/api/${method}`, { token, body: params });
  const j = JSON.parse(r.body) as { result?: unknown; error?: { message: string } };
  if (r.status !== 200) throw new Error(`${r.status} ${j.error?.message}`);
  return j.result;
};
async function until<T>(f: () => Promise<T | undefined>, ms = 20_000): Promise<T> {
  const t0 = Date.now();
  for (;;) { const v = await f(); if (v !== undefined) return v; if (Date.now() - t0 > ms) throw new Error('tempo esgotado'); await new Promise((r) => setTimeout(r, 50)); }
}
const consoleOf = (home: string) => JSON.parse(readFileSync(consolePath(home), 'utf8')) as { port: number; token: string };

test('console: só 127.0.0.1, com token e Host exato; sem token 401, Host estranho 403, nada acontece (critério 27)', async () => {
  const home = tempHome();
  owners.push(await spawnOwner(home, { RBUDDY_CONSOLE_PORT: '0' }));
  const { port, token } = consoleOf(home);
  if (process.platform !== 'win32') assert.equal(statSync(consolePath(home)).mode & 0o777, 0o600);
  const st = (await call(endpointFor(home), 'daemon.status', {})) as { console?: { url: string } };
  assert.equal(st.console?.url, `http://127.0.0.1:${port}/`, 'endereço limpo, sem token (critério 16)');

  assert.equal((await request(port, 'GET', '/')).status, 401);
  assert.equal((await request(port, 'GET', `/?t=errado`)).status, 401);
  assert.equal((await request(port, 'GET', '/', { token, host: `evil.example:${port}` })).status, 403);
  assert.equal((await request(port, 'GET', '/', { token, host: `localhost:${port}` })).status, 403, 'só o Host exato');
  assert.equal((await request(port, 'GET', `/?t=${token}`)).status, 303, 'o ?t= vira cookie e volta à URL limpa (critério 16)');
  const page = await request(port, 'GET', '/', { token });
  assert.equal(page.status, 200);
  assert.match(page.type, /text\/html/);

  // API: sem token, com Host estranho e método fora da lista não fazem nada.
  const secret = `canario-${Date.now()}`;
  assert.equal((await request(port, 'POST', '/api/keys.set', { body: { provider: 'ollama-cloud', key: secret } })).status, 401);
  assert.equal((await request(port, 'POST', '/api/keys.set', { token, host: `evil.example:${port}`, body: { provider: 'ollama-cloud', key: secret } })).status, 403);
  assert.equal((await request(port, 'POST', '/api/event.append', { token, body: { session: 'x', kind: 'y', payload: {} } })).status, 404);
  assert.equal((await request(port, 'POST', '/api/daemon.stop', { token })).status, 404);
  const prov = (await api(port, token, 'providers.status')) as { provider: string; source: unknown }[];
  assert.equal(prov.length, 4, 'com token, a API responde');
  assert.equal(prov.some((p) => JSON.stringify(p).includes(secret)), false, 'a chave recusada não entrou');
  assert.equal(CONSOLE_METHODS.includes('event.append' as never), false);
});

// O inverso (auditoria de organização pedida pelo Pai em 2026-10-25): chave do catálogo da console que a página não
// usa, nem por montagem ("console.effort." + nível), é texto órfão. Em 2026-10-25 havia 12, da console antiga.
test('console: o catálogo não guarda chave que a página não usa (órfãos)', () => {
  const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  const flat = (o: Record<string, unknown>, p = ''): string[] => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));
  const used = new Set([...PAGE.matchAll(/['"`]((?:console|status)\.[a-zA-Z0-9_.]+)/g)].map((m) => m[1]!));
  const montadas = [...used].filter((k) => k.endsWith('.'));
  for (const lang of ['pt-BR', 'en']) {
    const cat = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'locales', lang, 'console.json'), 'utf8')) as Record<string, unknown>;
    const orfas = flat(cat).filter((k) => !used.has(k) && !montadas.some((p) => k.startsWith(p)));
    assert.deepEqual(orfas, [], `${lang}: chaves sem uso`);
  }
});

test('console: toda chave de catálogo usada pela página existe em pt-BR e en (critério 28)', async () => {
  const home = tempHome();
  owners.push(await spawnOwner(home, { RBUDDY_CONSOLE_PORT: '0' }));
  const { port, token } = consoleOf(home);
  const page = (await request(port, 'GET', '/', { token })).body;
  const used = new Set<string>([...page.matchAll(/data-i18n(?:-[a-z]+)?="([a-zA-Z0-9_.]+)"/g), ...page.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)].map((m) => m[1]!));
  assert.ok(used.size > 30, `a página usa ${used.size} chaves`);
  for (const lang of ['pt-BR', 'en']) {
    const r = await request(port, 'GET', `/i18n/${lang}.json`, { token });
    assert.equal(r.status, 200);
    const cat = JSON.parse(r.body) as Record<string, unknown>;
    const has = (k: string) => k.split('.').reduce<unknown>((o, p) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[p] : undefined), cat) !== undefined;
    // Chave montada (termina em "."): todos os valores possíveis precisam existir; outra montagem reprova.
    // Esforço: os oito níveis que os provedores declaram (M1.5c) e o padrão.
    const DYN: Record<string, string[]> = { 'console.effort.': ['default', 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'], 'status.state.': ['running', 'done', 'interrupted', 'stopped'],
      // Ferramenta no texto do cartão de aprovação (camada de inglês, 2026-10-21): as que approvalParts reconhece.
      'console.approvals.tool.': ['write_file', 'archive', 'run_command', 'read_file', 'list_dir', 'delegate', 'network'],
      // Postura do agente (2026-10-25): pelo Buddy ou do próprio agente.
      'console.posture.': ['buddy', 'native'] };
    const expanded = [...used].flatMap((k) => (k.endsWith('.') ? (DYN[k] ?? [`${k}<montagem desconhecida>`]).map((v) => k + v) : [k]));
    assert.deepEqual(expanded.filter((k) => !has(k)).sort(), [], `${lang}: chaves ausentes`);
  }
  assert.equal((await request(port, 'GET', '/i18n/pt-BR.json')).status, 401, 'catálogo também exige token');
});

test('console: rodar com esforço, aprovar pela console, continuar a conversa, retomar; chave nunca volta (critério 30)', async () => {
  let turn = 0;
  const fake = await fakeHttp((c: Captured) => {
    if (!c.path.endsWith('/chat/completions')) return { status: 404 };
    turn++;
    if (turn === 1) return { json: { id: 'c', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [{ id: 'w1', type: 'function', function: { name: 'write_file', arguments: JSON.stringify({ path: 'nota.txt', content: 'olá' }) } }] } }], usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 } } };
    return { json: { id: 'c', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: `resposta ${turn}` } }], usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 } } };
  });
  const home = tempHome();
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  writeFileSync(join(home, 'config.json'), JSON.stringify({ routes: [{ provider: 'opencode-go', model: 'kimi-k3', baseURL: `${fake.url}/v1` }] }));
  owners.push(await spawnOwner(home, { RBUDDY_CONSOLE_PORT: '0', OPENCODE_GO_API_KEY: '', OLLAMA_CLOUD_API_KEY: '', OPENROUTER_API_KEY: '' }));
  const { port, token } = consoleOf(home);

  // Chave guardada pela console: aparece só como origem.
  const secret = `canario-${Date.now()}-go`;
  await api(port, token, 'keys.set', { provider: 'opencode-go', key: secret });
  const prov = await request(port, 'POST', '/api/providers.status', { token });
  assert.equal(prov.body.includes(secret), false);
  assert.deepEqual((JSON.parse(prov.body).result as { provider: string; source: unknown }[]).find((p) => p.provider === 'opencode-go')?.source, { kind: 'keys' });

  const defaults = (await api(port, token, 'console.defaults')) as { workspace: string; routes: unknown[] };
  assert.ok(defaults.workspace.length > 0);
  const { run } = (await api(port, token, 'agent.run', { session: 'scon', task: 'escreva', workspace, interactive: true, effort: 'low' })) as { run: string };
  const ap = await until(async () => ((await api(port, token, 'approval.list')) as { id: string; session: string }[]).find((a) => a.session === 'scon'));
  await api(port, token, 'approval.resolve', { id: ap.id, decision: 'approve' });
  await until(async () => (((await api(port, token, 'run.get', { id: run })) as { state: string }).state === 'done' ? true : undefined));
  assert.equal(readFileSync(join(workspace, 'nota.txt'), 'utf8'), 'olá');
  const evs = (await api(port, token, 'session.events', { session: 'scon' })) as { kind: string; payload: { effort?: string } }[];
  assert.equal(evs.find((e) => e.kind === 'agent.step')?.payload.effort, 'low');

  const { run: run2 } = (await api(port, token, 'agent.run', { session: 'scon', task: 'e agora?', workspace, interactive: true, continueFrom: run })) as { run: string };
  await until(async () => (((await api(port, token, 'run.get', { id: run2 })) as { state: string }).state === 'done' ? true : undefined));
  await assert.rejects(api(port, token, 'agent.resume', { run: run2, workspace }), /só se retoma/);
  await fake.close();
});

test('console: uso da console conta como atividade (o dono ocioso não se desliga com ela aberta)', async () => {
  const home = tempHome();
  const o = await spawnOwner(home, { RBUDDY_CONSOLE_PORT: '0', RBUDDY_IDLE_MS: '1500' });
  owners.push(o);
  const { port, token } = consoleOf(home);
  const t0 = Date.now();
  while (Date.now() - t0 < 4000) { await api(port, token, 'run.list'); await new Promise((r) => setTimeout(r, 300)); }
  assert.equal(o.exitCode, null, 'ainda no ar');
  const code = await new Promise<number | null>((r) => { if (o.exitCode !== null) r(o.exitCode); else o.once('exit', (c) => r(c)); });
  assert.equal(code, 0, 'sem a console, desliga');
});

test('console: arquivos da página não carregam nada de fora (sem CDN, sem script externo)', () => {
  const dir = join(import.meta.dirname, '..', 'console');
  for (const f of readdirSync(dir)) {
    const s = readFileSync(join(dir, f), 'utf8');
    assert.doesNotMatch(s, /(src|href)=["']https?:\/\//, `${f} carrega recurso externo`);
  }
});

// Funções puras da página (entre os marcadores `// <puras>` e `// </puras>`), avaliadas sem navegador.
function pure(): { mdBlocks: (s: string) => unknown[]; authView: (a: Record<string, unknown>, t: (k: string, v?: Record<string, unknown>) => string) => { text: string; loginKey: string; loginPrimary: boolean; logoutEnabled: boolean } } {
  const html = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  const a = html.indexOf('// <puras>');
  const b = html.indexOf('// </puras>');
  assert.ok(a > 0 && b > a, 'marcadores das funções puras');
  return new Function(`${html.slice(a, b)}; return { mdBlocks, authView };`)() as ReturnType<typeof pure>;
}

test('console: resposta com bloco de código e lista vira blocos, não texto cru (achado do Pai com o ChatGPT, 2026-10-17)', () => {
  const { mdBlocks } = pure();
  const real = 'Arquivos encontrados na pasta de trabalho:\n- `final.md`\n- `lista.md`\n\nCriei também o arquivo `ola-chatgpt.txt` com o conteúdo:\n```text\nteste do ChatGPT\n```';
  assert.deepEqual(mdBlocks(real), [
    { type: 'p', text: 'Arquivos encontrados na pasta de trabalho:' },
    { type: 'list', ordered: false, items: ['`final.md`', '`lista.md`'] },
    { type: 'p', text: 'Criei também o arquivo `ola-chatgpt.txt` com o conteúdo:' },
    { type: 'code', lang: 'text', text: 'teste do ChatGPT' },
  ]);
  assert.deepEqual(mdBlocks('1. um\n2. dois'), [{ type: 'list', ordered: true, items: ['um', 'dois'] }]);
  assert.deepEqual(mdBlocks('```\nsem fim'), [{ type: 'code', lang: '', text: 'sem fim' }], 'bloco sem fechamento não some');
  assert.deepEqual(mdBlocks('linha 1\nlinha 2'), [{ type: 'p', text: 'linha 1\nlinha 2' }]);
  // Achado no ensaio do tema (2026-10-17): o modelo escreve títulos ("### Compostos excluídos").
  assert.deepEqual(mdBlocks('texto\n### Compostos excluídos\n- 155'), [{ type: 'p', text: 'texto' }, { type: 'h', text: 'Compostos excluídos' }, { type: 'list', ordered: false, items: ['155'] }]);
  assert.deepEqual(mdBlocks('#hashtag sem espaço'), [{ type: 'p', text: '#hashtag sem espaço' }], 'só com espaço depois do #');
});

test('console: ChatGPT conectado — estado legível, "Entrar" vira "Trocar de conta" secundário (achado do Pai, 2026-10-17)', () => {
  const { authView } = pure();
  const t = (k: string, v?: Record<string, unknown>) => (v ? `${k}(${Object.values(v).join(',')})` : k);
  const on = authView({ loggedIn: true, email: 'pai@x', planEnabled: true }, t);
  assert.equal(on.text, 'console.chatgpt.connected(pai@x) · console.chatgpt.planYes');
  assert.deepEqual([on.loginKey, on.loginPrimary, on.logoutEnabled], ['console.chatgpt.switch', false, true]);
  const off = authView({ loggedIn: false }, t);
  assert.deepEqual([off.text, off.loginKey, off.loginPrimary, off.logoutEnabled], ['console.chatgpt.out', 'console.chatgpt.login', true, false]);
  assert.equal(authView({ pending: true }, t).logoutEnabled, true);
  assert.equal(authView({ error: 'x' }, t).text, 'console.chatgpt.error(x)');
});

// ---------- SPEC 0001 rev. 6 (M0.8d): andamento ao vivo, detalhes recolhíveis, fila, console lembra ----------
type Pure2 = {
  restore: (get: (k: string, d: string | null) => string | null) => { session: string | null; details: boolean; route: string; theme: string };
  elapsedText: (ms: number) => string;
  revealStep: (shown: number, total: number, dtMs: number) => number;
  liveLine: (l: { phase: string; route: string; tool: string | null }, ms: number, t: (k: string, v?: Record<string, unknown>) => string) => string;
};
function pure2(): Pure2 {
  const html = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  const a = html.indexOf('// <puras>');
  const b = html.indexOf('// </puras>');
  return new Function(`${html.slice(a, b)}; return { restore, elapsedText, revealStep, liveLine };`)() as Pure2;
}

test('console lembra a conversa aberta e a preferência de detalhes; armazenamento quebrado não derruba a página (critério 34)', () => {
  const { restore } = pure2();
  const route = JSON.stringify({ provider: 'chatgpt', model: 'gpt-6.1-sol' });
  const mem: Record<string, string> = { 'rb.session': 'ses-abc', 'rb.details': 'open', 'rb.route': route };
  assert.deepEqual(restore((k, d) => mem[k] ?? d), { session: 'ses-abc', details: true, route, theme: 'system' }, 'o provedor escolhido também volta (achado no ensaio)');
  assert.deepEqual(restore((_k, d) => d), { session: null, details: false, route: '', theme: 'system' }, 'primeira visita: sem conversa, detalhes recolhidos, rota automática');
  assert.deepEqual(restore(() => { throw new Error('bloqueado'); }), { session: null, details: false, route: '', theme: 'system' });
});

test('tema: Sistema segue o navegador, Claro e Escuro valem acima dele, escolha lembrada (critério 35; pedido do Pai)', () => {
  const html = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  const a = html.indexOf('// <puras>');
  const b = html.indexOf('// </puras>');
  const { themeOf, restore } = new Function(`${html.slice(a, b)}; return { themeOf, restore };`)() as { themeOf: (c: unknown) => string | null; restore: (get: (k: string, d: string | null) => string | null) => { theme: string } };
  assert.equal(themeOf('system'), null, 'Sistema não marca a página');
  assert.equal(themeOf('light'), 'light');
  assert.equal(themeOf('dark'), 'dark');
  assert.equal(themeOf('roxo'), null, 'valor desconhecido cai no Sistema');
  assert.equal(restore((k, d) => (k === 'rb.theme' ? 'dark' : d)).theme, 'dark');
  assert.equal(restore((_k, d) => d).theme, 'system');
  assert.equal(restore(() => { throw new Error('bloqueado'); }).theme, 'system');
  // CSS: escuro por padrão; claro pelo sistema só sem escolha explícita; escolha explícita vale acima do sistema.
  assert.match(html, /@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme="dark"\]\)/);
  assert.match(html, /:root\[data-theme="light"\]/);
  assert.match(html, /<select id="theme"[^>]*>[\s\S]*?data-i18n="console\.theme\.system"[\s\S]*?data-i18n="console\.theme\.light"[\s\S]*?data-i18n="console\.theme\.dark"/);
  assert.match(html, /<label for="theme"[^>]*data-i18n="console\.theme\.title"/);
});

test('andamento: tempo legível, texto revelado em cadência (sem pular nem travar) e linha de fase (critério 31)', () => {
  const { elapsedText, revealStep, liveLine } = pure2();
  assert.equal(elapsedText(4_200), '4 s');
  assert.equal(elapsedText(248_000), '4 min 08 s');
  // Cadência: avança aos poucos, alcança o total e nunca passa; atraso grande acelera para não ficar para trás.
  const a = revealStep(0, 1000, 16);
  assert.ok(a > 0 && a < 100, `primeiro quadro mostra pouco (${a})`);
  assert.equal(revealStep(990, 1000, 16), 1000);
  assert.equal(revealStep(1000, 1000, 16), 1000);
  assert.ok(revealStep(0, 20_000, 16) - 0 > revealStep(0, 1000, 16), 'atraso grande, passo maior');
  const t = (k: string, v?: Record<string, unknown>) => (v ? `${k}(${Object.values(v).join(',')})` : k);
  assert.equal(liveLine({ phase: 'thinking', route: 'chatgpt/gpt-6.1-sol', tool: null }, 75_000, t), 'console.live.thinking · 1 min 15 s · chatgpt/gpt-6.1-sol');
  assert.equal(liveLine({ phase: 'tool', route: 'x/y', tool: 'write_file' }, 2_000, t), 'console.live.tool(write_file) · 2 s · x/y');
  assert.equal(liveLine({ phase: 'approval', route: 'x/y', tool: 'write_file' }, 2_000, t), 'console.live.approval · 2 s · x/y');
});

test('console: raciocínio, comandos e resultados em blocos recolhíveis com a preferência do usuário; fila com Direcionar e Cancelar; Parar (critérios 32 e 33)', () => {
  const html = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  assert.match(html, /case 'agent\.reasoning':/, 'o raciocínio do log aparece na conversa');
  assert.match(html, /id="detailsToggle"/, 'escolha de mostrar ou recolher os detalhes');
  assert.match(html, /id="stop"/, 'botão Parar');
  assert.match(html, /reason\.scrollTop = reason\.scrollHeight/, 'o raciocínio ao vivo acompanha o fim enquanto cresce (achado no ensaio)');
  for (const m of ['run.live', 'agent.steer', 'agent.unqueue', 'agent.stop']) assert.ok(html.includes(`'${m}'`), `a página usa ${m}`);
  for (const m of ['run.live', 'agent.steer', 'agent.unqueue', 'agent.stop']) assert.ok((CONSOLE_METHODS as readonly string[]).includes(m), `${m} liberado na console`);
});

// Achados do ensaio da M0.8d (2026-10-17), com o ChatGPT real no esforço Alto.
test('console: matemática em LaTeX vira texto legível (o ChatGPT escreve \\(30 \\times 1\\) e \\mathbf{…})', () => {
  const html = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  const a = html.indexOf('// <puras>');
  const b = html.indexOf('// </puras>');
  const { delatex, REASONS } = new Function(`${html.slice(a, b)}; return { delatex, REASONS };`)() as { delatex: (s: string) => string; REASONS: Record<string, string> };
  assert.equal(delatex('reduz em \\(30 \\times 1=30\\) km'), 'reduz em 30 × 1=30 km');
  assert.equal(delatex('está a \\(60 \\times 4=\\mathbf{240\\text{ km}}\\) da origem'), 'está a 60 × 4=**240 km** da origem');
  assert.equal(delatex('\\(50 \\div 30=5/3\\) e \\(\\frac{8}{3}\\) h, \\(a \\le b \\cdot c \\approx d \\neq e\\)'), '50 ÷ 30=5/3 e 8/3 h, a ≤ b · c ≈ d ≠ e');
  assert.equal(delatex('\\[ v = \\frac{d}{t} \\]'), 'v = d/t');
  assert.equal(delatex('taxa \\(v_{perseguidor}-v_{líder}\\)'), 'taxa v(perseguidor)-v(líder)', 'subscrito legível');
  assert.equal(delatex('preço R$ 10 \\ sem fórmula'), 'preço R$ 10 \\ sem fórmula', 'texto sem LaTeX não muda');
  // Motivo de parada legível: todo motivo conhecido tem frase nos dois catálogos.
  for (const lang of ['pt-BR', 'en']) {
    const cat = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'locales', lang, 'console.json'), 'utf8')) as Record<string, unknown>;
    for (const [code, key] of Object.entries(REASONS)) {
      const v = key.split('.').reduce<unknown>((o, p) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[p] : undefined), cat);
      assert.equal(typeof v, 'string', `${lang}: ${code} → ${key}`);
    }
  }
  for (const code of ['userStopped', 'maxSteps', 'sessionPaused', 'budget.windowExhausted', 'provider.unavailable', 'provider.emptyResponse', 'effect.unknown', 'needsReconciliation', 'internalError']) assert.ok(REASONS[code], `motivo ${code}`);
  // O aviso "entrou na fila" sai quando a fila esvazia.
  assert.match(html, /if \(!\(l\.queue \|\| \[\]\)\.length && \$\('runMsg'\)\.textContent === t\('console\.queue\.queued'\)\) \$\('runMsg'\)\.textContent = '';/);
});

test('console: rótulos acessíveis traduzidos (nada de "provider" em inglês na tela pt-BR)', () => {
  const html = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /aria-label="[a-z]+"/, 'aria-label fixo sem catálogo');
  assert.match(html, /id="keyProvider"[^>]*data-i18n-aria="console\.keys\.provider"/);
  // Achado no ensaio da M0.8d: o seletor da chave e o da rota se chamavam "Provedor" (leitor de tela não distingue).
  for (const lang of ['pt-BR', 'en']) {
    const c = (JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'locales', lang, 'console.json'), 'utf8')) as { console: { keys: { provider: string }; task: { route: string } } }).console;
    assert.notEqual(c.keys.provider, c.task.route, `${lang}: rótulos iguais para controles diferentes`);
  }
});

test('console: o script da página é JavaScript válido (um script quebrado deixaria o Pai sem console)', () => {
  const html = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  assert.ok(js.length > 1000);
  assert.doesNotThrow(() => new Function(js));
});
