import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createI18n } from '../../client/src/i18n.ts';

const PKG_DIR = join(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8'));
const BIN = join(PKG_DIR, 'bin', 'rbuddy.mjs');

function rbuddy(args: string[], env: Record<string, string> = {}) {
  const clean = { ...process.env };
  delete clean.RBUDDY_LANG;
  return spawnSync(process.execPath, [BIN, ...args], { encoding: 'utf8', env: { ...clean, ...env } });
}

test('os binários rabelus-buddy e rbuddy apontam para a mesma entrada (ADR 0011)', () => {
  assert.equal(pkg.bin['rabelus-buddy'], './bin/rbuddy.mjs');
  assert.equal(pkg.bin.rbuddy, './bin/rbuddy.mjs');
});

test('--version mostra o nome e a versão do pacote, pelo catálogo', () => {
  const r = rbuddy(['--version']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), createI18n('pt-BR').t('cli.version', { version: pkg.version }));
  assert.match(r.stdout, new RegExp(`rabelus-buddy ${pkg.version.replace(/\./g, '\\.')}`));
});

test('--help sai do catálogo em pt-BR por padrão', () => {
  const r = rbuddy(['--help']);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), createI18n('pt-BR').t('cli.help').trim());
});

test('sem comando, mostra a ajuda', () => {
  const r = rbuddy([]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), createI18n('pt-BR').t('cli.help').trim());
});

test('--lang en e RBUDDY_LANG=en mudam o idioma; a opção vence o ambiente', () => {
  const en = createI18n('en').t('cli.help').trim();
  const pt = createI18n('pt-BR').t('cli.help').trim();
  assert.notEqual(en, pt);
  assert.equal(rbuddy(['--lang', 'en', '--help']).stdout.trim(), en);
  assert.equal(rbuddy(['--help'], { RBUDDY_LANG: 'en' }).stdout.trim(), en);
  assert.equal(rbuddy(['--lang', 'pt-BR', '--help'], { RBUDDY_LANG: 'en' }).stdout.trim(), pt);
});

test('comando desconhecido: saída 1 e mensagem do catálogo, com o nome do comando', () => {
  const r = rbuddy(['voar']);
  assert.equal(r.status, 1);
  assert.equal(r.stderr.trim(), createI18n('pt-BR').t('cli.unknownCommand', { command: 'voar' }));
  const en = rbuddy(['voar', '--lang', 'en']);
  assert.equal(en.stderr.trim(), createI18n('en').t('cli.unknownCommand', { command: 'voar' }));
});

test('opção desconhecida: saída 1 e mensagem do catálogo, sem pilha de erro', () => {
  const r = rbuddy(['--voar']);
  assert.equal(r.status, 1);
  assert.equal(r.stderr.trim(), createI18n('pt-BR').t('cli.unknownOption', { option: '--voar' }));
  assert.doesNotMatch(r.stderr, /at .*\.ts:\d+/);
});
