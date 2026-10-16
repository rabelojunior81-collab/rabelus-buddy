// Critério 23: toda string mostrada pela CLI vem do catálogo. Varredura estática das chaves usadas no
// código da CLI (literais e as montadas por estado), contra pt-BR e en; e a troca de idioma muda a saída.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createI18n, LOCALES_DIR, SUPPORTED_LANGS } from '../../client/src/i18n.ts';

const SRC = join(import.meta.dirname, '..', 'src');
const BIN = join(import.meta.dirname, '..', 'bin', 'rbuddy.mjs');

function catalog(lang: string): Set<string> {
  const keys = new Set<string>();
  const walk = (o: Record<string, unknown>, prefix: string) => {
    for (const [k, v] of Object.entries(o)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object') walk(v as Record<string, unknown>, key);
      else keys.add(key.replace(/_(one|other|zero|two|few|many)$/, ''));
    }
  };
  for (const f of readdirSync(join(LOCALES_DIR, lang)).filter((x) => x.endsWith('.json'))) walk(JSON.parse(readFileSync(join(LOCALES_DIR, lang, f), 'utf8')) as Record<string, unknown>, '');
  return keys;
}

// Primeiro argumento de cada chamada t(...): a chave (literal, ternário ou montada).
function firstArgsOfT(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/(?<![\w$.])t\(/g)) {
    let depth = 0;
    let i = m.index! + 2;
    const start = i;
    for (; i < code.length; i++) {
      const c = code[i];
      if (c === '(' || c === '{' || c === '[') depth++;
      else if (c === ')' || c === '}' || c === ']') { if (depth === 0) break; depth--; }
      else if (c === ',' && depth === 0) break;
    }
    out.push(code.slice(start, i));
  }
  return out;
}

const NAMESPACES =['cli', 'daemon', 'approvals', 'budget', 'login', 'run', 'status', 'log', 'providers', 'keys'];

test('critério 23: toda chave usada no código da CLI existe em pt-BR e en', () => {
  const used = new Set<string>();
  const literal = new RegExp(`'((?:${NAMESPACES.join('|')})\\.[A-Za-z0-9_.]+)'`, 'g');
  for (const f of readdirSync(SRC).filter((x) => x.endsWith('.ts'))) {
    for (const arg of firstArgsOfT(readFileSync(join(SRC, f), 'utf8'))) for (const m of arg.matchAll(literal)) used.add(m[1]!);
  }
  // Chave montada por estado (status.state.<estado>): todos os estados de execução do domínio.
  for (const s of ['running', 'done', 'interrupted', 'stopped']) used.add(`status.state.${s}`);
  assert.ok(used.size > 60, `varredura achou ${used.size} chaves`);
  for (const lang of SUPPORTED_LANGS) {
    const keys = catalog(lang);
    const missing = [...used].filter((k) => !keys.has(k)).sort();
    assert.deepEqual(missing, [], `${lang}: chaves usadas e ausentes`);
  }
});

test('critério 23: chaves montadas no código só por estado conhecido (nenhuma outra montagem escapa da varredura)', () => {
  for (const f of readdirSync(SRC).filter((x) => x.endsWith('.ts'))) {
    const dyn = [...readFileSync(join(SRC, f), 'utf8').matchAll(/\bt\(`([^`]*)`/g)].map((m) => m[1]);
    for (const d of dyn) assert.equal(d, 'status.state.${r.state}', `${f}: chave montada não coberta: ${d}`);
  }
});

test('critério 23: --lang en e RBUDDY_LANG=pt-BR mudam a saída de status (sem dono, pela mensagem do catálogo)', () => {
  const home = mkdtempSync(join(tmpdir(), 'rbuddy-cat-'));
  const env = { ...process.env, RBUDDY_HOME: home } as NodeJS.ProcessEnv;
  delete env.RBUDDY_LANG;
  const en = spawnSync(process.execPath, [BIN, 'status', '--lang', 'en'], { env, encoding: 'utf8' });
  const pt = spawnSync(process.execPath, [BIN, 'status'], { env: { ...env, RBUDDY_LANG: 'pt-BR' }, encoding: 'utf8' });
  assert.equal(en.stderr.trim(), createI18n('en').t('daemon.notRunning'));
  assert.equal(pt.stderr.trim(), createI18n('pt-BR').t('daemon.notRunning'));
  assert.notEqual(en.stderr.trim(), pt.stderr.trim());
});
