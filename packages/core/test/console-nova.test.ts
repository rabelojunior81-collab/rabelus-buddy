// SPEC 0002, critério 11 (M1.5a): a console nova tem a estrutura e os tokens do protótipo v4 aprovado pelo Pai em
// 2026-10-18; o contraste AA dos pares texto e fundo principais é medido aqui, nos dois temas, a partir dos próprios
// tokens OKLCH da página; a marca do Rabelus Lab é servida pela própria console (nada de fora); tudo do M0 continua
// (os testes da console do M0 seguem valendo, com os mesmos ids).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { consolePath } from '../src/console.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });
const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
const CSS = PAGE.slice(PAGE.indexOf('<style>'), PAGE.indexOf('</style>'));

// ---------- cor: OKLCH → sRGB, composição e contraste (WCAG 2.x) ----------
type Rgba = [number, number, number, number]; // sRGB codificado 0..1 e alfa
function oklch(s: string): Rgba {
  const m = /oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)/.exec(s);
  assert.ok(m, `cor OKLCH esperada: ${s}`);
  const L = Number(m[1]) / 100, C = Number(m[2]), h = (Number(m[3]) * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s3, -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s3, -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s3];
  const enc = (x: number) => { const c = Math.min(1, Math.max(0, x)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
  return [enc(lin[0]!), enc(lin[1]!), enc(lin[2]!), m[4] === undefined ? 1 : Number(m[4])];
}
const over = (top: Rgba, base: Rgba): Rgba => [0, 1, 2].map((i) => top[i]! * top[3] + base[i]! * (1 - top[3])).concat(1) as Rgba;
const lum = (c: Rgba) => { const d = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * d(c[0]) + 0.7152 * d(c[1]) + 0.0722 * d(c[2]); };
const contrast = (fg: Rgba, bg: Rgba) => { const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x); return (a! + 0.05) / (b! + 0.05); };

// Tokens de um bloco de CSS: `--nome: valor;`.
function block(selector: string): Record<string, string> {
  const i = CSS.indexOf(selector + ' {');
  assert.ok(i >= 0, `bloco ${selector}`);
  const body = CSS.slice(i + selector.length + 2, CSS.indexOf('}', i));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}
const DARK = block(':root');
const LIGHT = { ...DARK, ...block(':root[data-theme="light"]') };

test('tokens: paleta oliva em OKLCH nos dois temas (matiz 118–125) e vidro com desfoque de 12 a 24 px (critério 11)', () => {
  for (const [name, t] of [['escuro', DARK], ['claro', LIGHT]] as const) {
    const hue = Number(/oklch\([^)]*?\s([\d.]+)\s*\)/.exec(t.bg!)?.[1]);
    assert.ok(hue >= 118 && hue <= 125, `${name}: fundo com matiz oliva (achado: ${t.bg})`);
    for (const k of ['text', 'muted', 'faint', 'accent', 'glass-solid', 'primary-a', 'primary-b', 'primary-ink']) assert.match(t[k] ?? '', /^oklch\(/, `${name}: --${k} em OKLCH`);
  }
  const blurs = [...CSS.matchAll(/backdrop-filter:\s*blur\((\d+)px\)/g)].map((m) => Number(m[1]));
  assert.ok(blurs.length >= 2 && blurs.every((b) => b >= 12 && b <= 24), `desfoque do vidro entre 12 e 24 px (achado: ${blurs.join(', ')})`);
  // O tema Sistema continua seguindo o navegador (critério 35 do M0), com os mesmos tokens do Claro escolhido à mão.
  assert.match(CSS, /@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme="dark"\]\)/);
  assert.deepEqual(block(':root:not([data-theme="dark"])'), block(':root[data-theme="light"]'), 'os dois blocos do tema claro são iguais');
});

test('contraste AA medido: texto, secundário, discreto, destaque e estados sobre o fundo, o brilho e o vidro, nos dois temas (critério 11)', () => {
  for (const [name, t] of [['escuro', DARK], ['claro', LIGHT]] as const) {
    const bg = oklch(t.bg!);
    // Fundos onde o texto mora: a página, a página sob o brilho mais forte do degradê e o vidro sólido dos painéis.
    const grounds: [string, Rgba][] = [['fundo', bg], ['brilho', over(oklch(t['glow-a']!), bg)], ['vidro', over(oklch(t['glass-solid']!), bg)]];
    for (const fg of ['text', 'muted', 'faint', 'accent', 'bad', 'warn', 'ok']) {
      for (const [gName, g] of grounds) {
        const r = contrast(oklch(t[fg]!), g);
        assert.ok(r >= 4.5, `${name}: --${fg} sobre ${gName} = ${r.toFixed(2)} (mínimo 4,5)`);
      }
    }
    // Botão principal: o texto sobre as duas pontas do degradê.
    for (const end of ['primary-a', 'primary-b']) {
      const r = contrast(oklch(t['primary-ink']!), over(oklch(t[end]!), bg));
      assert.ok(r >= 4.5, `${name}: texto do botão principal sobre --${end} = ${r.toFixed(2)}`);
    }
  }
});

test('estrutura do protótipo v4: barra lateral com marca, conversas e harnesses; início; caixa ancorada; Ajustes; tudo do M0 com os mesmos ids (critério 11)', () => {
  // 'route' (select de provedor) foi substituído pelo seletor de modelo 'mBtn' na M1.5c (decisão registrada).
  for (const id of ['side', 'brandMark', 'newChat', 'threads', 'agents', 'menuBtn', 'home', 'feed', 'task', 'effort', 'mBtn', 'run', 'stop', 'settingsBtn', 'settings',
    'approvals', 'providers', 'login', 'logout', 'chatgptState', 'keyProvider', 'keyValue', 'keySave', 'keyRemove', 'budget', 'budgetToggle', 'runs',
    'lang', 'theme', 'workspace', 'detailsToggle', 'conn']) {
    assert.match(PAGE, new RegExp(`id="${id}"`), `id ${id}`);
  }
  assert.match(PAGE, /<aside[^>]*id="side"/, 'barra lateral');
  assert.match(PAGE, /class="composer glass"/, 'caixa de mensagem de vidro');
  assert.match(PAGE, /id="settingsBtn"[^>]*aria-controls="settings"[^>]*aria-expanded="false"/, 'Ajustes abre e fecha com estado acessível');
  assert.match(PAGE, /@media \(max-width: 720px\)/, 'celular: a barra lateral vira gaveta');
  assert.match(PAGE, /id="menuBtn"[^>]*aria-expanded="false"/, 'botão da gaveta no celular');
  assert.match(PAGE, /prefers-reduced-motion: reduce/, 'movimento reduzido respeitado');
  assert.match(PAGE, /:focus-visible/, 'foco visível');
});

// Achados do ensaio no navegador real (2026-10-19): (1) a tela inicial sai do documento quando há conversa aberta,
// então a página nunca a procura por id; (2) os ícones do registro são SVG pretos: desenhados como máscara na cor do
// texto (como no protótipo), aparecem nos dois temas; <img> os deixava invisíveis no escuro.
test('ensaio: a tela inicial é atualizada pela referência guardada, e os ícones de harness seguem a cor do texto (critério 11)', () => {
  for (const id of ['homeEyebrow', 'starters']) assert.doesNotMatch(PAGE, new RegExp(`\\$\\('${id}'\\)`), `${id} buscado por id com a tela inicial fora do documento`);
  assert.doesNotMatch(PAGE, /el\('img', \{ class: 'ico'/, 'ícone de harness como <img> some no tema escuro');
  assert.match(CSS, /\.ico \{[^}]*background: currentColor[^}]*mask: var\(--src\)/, 'ícone desenhado como máscara na cor do texto');
});

// Funções puras da página (os mesmos marcadores do M0).
function pure<T>(names: string[]): T {
  const a = PAGE.indexOf('// <puras>');
  const b = PAGE.indexOf('// </puras>');
  return new Function(`${PAGE.slice(a, b)}; return { ${names.join(', ')} };`)() as T;
}

test('conversas na barra lateral: uma por sessão, com o título da primeira tarefa, agrupadas por dia, a mais recente primeiro (critério 11)', () => {
  type Thread = { day: string; items: { session: string; title: string; state: string }[] };
  // O dia é o do relógio de quem olha: a página passa o fuso do navegador; aqui, o de Curitiba (−180 min), em qualquer CI.
  const { threadsOf } = pure<{ threadsOf: (runs: Record<string, string>[], sessions: Record<string, string>[], now: Date, offsetMin: number) => Thread[] }>(['threadsOf']);
  const now = new Date('2026-10-19T15:00:00-03:00');
  // run.list traz a tarefa e o estado; session.list traz quando a conversa começou (o log não precisa mudar).
  const runs = [
    { id: 'r1', session: 's1', task: 'Revisar o README', state: 'done' },
    { id: 'r2', session: 's1', task: 'e agora os testes', state: 'running' },
    { id: 'r3', session: 's2', task: 'Primos entre 100 e 220', state: 'stopped' },
    { id: 'r4', session: 's3', task: 'Problema dos trens', state: 'done' },
  ];
  const sessions = [
    { id: 's3', createdTs: '2026-10-10T11:00:00.000Z' },
    { id: 's1', createdTs: '2026-10-19T12:00:00.000Z' },
    { id: 's2', createdTs: '2026-10-19T00:30:00.000Z' }, // 21:30 de 18/10 em Curitiba: ontem
    { id: 'harness', createdTs: '2026-10-19T12:30:00.000Z' }, // sessão interna, sem execução: não é conversa
  ];
  const g = threadsOf(runs, sessions, now, -180);
  assert.deepEqual(g.map((x) => x.day), ['today', 'yesterday', '2026-10-10']);
  assert.deepEqual(g[0]!.items, [{ session: 's1', title: 'Revisar o README', state: 'running' }], 'título da primeira tarefa; estado da última');
  assert.equal(g[1]!.items[0]!.session, 's2');
});

test('a marca do Rabelus Lab é servida pela própria console, com token, e a página não aponta para fora (critério 11)', async () => {
  const home = tempHome();
  owners.push(await spawnOwner(home, { RBUDDY_CONSOLE_PORT: '0' }));
  const c = JSON.parse(readFileSync(consolePath(home), 'utf8')) as { port: number; token: string };
  const get = (path: string) => new Promise<{ status: number; type: string; size: number }>((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: c.port, path, headers: { host: `127.0.0.1:${c.port}` } }, (res) => {
      let n = 0; res.on('data', (d: Buffer) => { n += d.length; }); res.on('end', () => resolve({ status: res.statusCode ?? 0, type: String(res.headers['content-type']), size: n }));
    }).on('error', reject);
  });
  for (const f of ['emblema-256.png', 'emblema-64.png']) {
    const ok = await get(`/brand/${f}?t=${c.token}`);
    assert.deepEqual([ok.status, ok.type], [200, 'image/png'], f);
    assert.ok(ok.size > 1000, `${f} tem a imagem`);
    assert.equal((await get(`/brand/${f}`)).status, 401, `${f} exige token`);
  }
  assert.equal((await get(`/brand/../../package.json?t=${c.token}`)).status, 404, 'só os arquivos da marca');
  assert.match(PAGE, /\/brand\/emblema-256\.png/);
  assert.match(PAGE, /\/brand\/emblema-64\.png/, 'ícone da aba');
});
