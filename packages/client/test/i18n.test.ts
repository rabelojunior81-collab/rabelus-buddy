import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES_DIR, SUPPORTED_LANGS, resolveLang, createI18n } from '../src/i18n.ts';

const ROOT = join(import.meta.dirname, '..', '..', '..');

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]);
}
function catalog(lang: string): Map<string, string[]> {
  const dir = join(LOCALES_DIR, lang);
  return new Map(readdirSync(dir).filter((f) => f.endsWith('.json'))
    .map((f) => [f, flatten(JSON.parse(readFileSync(join(dir, f), 'utf8'))).sort()]));
}
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) return e === 'node_modules' || e === 'test' ? [] : sources(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}

test('os idiomas do produto são exatamente pt-BR e en (ADR 0002)', () => {
  assert.deepEqual([...SUPPORTED_LANGS].sort(), ['en', 'pt-BR']);
  assert.deepEqual(readdirSync(LOCALES_DIR).filter((d) => statSync(join(LOCALES_DIR, d)).isDirectory()).sort(), ['en', 'pt-BR']);
});

test('pt-BR e en têm os mesmos arquivos e as mesmas chaves', () => {
  const pt = catalog('pt-BR');
  const en = catalog('en');
  assert.deepEqual([...pt.keys()].sort(), [...en.keys()].sort());
  assert.ok(pt.size > 0, 'nenhum catálogo encontrado');
  for (const [file, keys] of pt) assert.deepEqual(en.get(file), keys, `chaves diferentes em ${file}`);
});

test('toda chave usada no código existe nos dois idiomas', () => {
  const used = new Set<string>();
  for (const f of sources(join(ROOT, 'packages'))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*'([\w.:-]+)'/g)) used.add(m[1]);
  }
  assert.ok(used.size > 0, 'nenhuma chave de catálogo usada no código');
  for (const lang of SUPPORTED_LANGS) {
    const { t } = createI18n(lang);
    for (const key of used) assert.notEqual(t(key), key, `chave ${key} ausente em ${lang}`);
  }
});

test('idioma: opção vence ambiente, ambiente vence o padrão, e o padrão é pt-BR', () => {
  assert.equal(resolveLang({}), 'pt-BR');
  assert.equal(resolveLang({ env: 'en' }), 'en');
  assert.equal(resolveLang({ flag: 'pt-BR', env: 'en' }), 'pt-BR');
  assert.equal(resolveLang({ flag: 'en', env: 'pt-BR' }), 'en');
  assert.equal(resolveLang({ env: 'fr' }), 'pt-BR');
});

test('plural pelo Intl, com count', () => {
  const pt = createI18n('pt-BR');
  const en = createI18n('en');
  assert.notEqual(pt.t('cli.approvalsPending', { count: 1 }), pt.t('cli.approvalsPending', { count: 2 }));
  assert.match(en.t('cli.approvalsPending', { count: 2 }), /2/);
});
