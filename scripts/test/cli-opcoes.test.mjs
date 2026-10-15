import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

// Toda opção que a ajuda do bd anuncia precisa ser aceita pelo parser.
// Nasceu do `bd deps --latest`, documentado mas não declarado (2026-10-15).
const bd = join(dirname(fileURLToPath(import.meta.url)), '..', 'bd.mjs');
const src = readFileSync(bd, 'utf8');
const help = src.slice(src.indexOf('const HELP = `'), src.indexOf('`;', src.indexOf('const HELP = `')));
const flags = [...new Set(help.match(/--[a-z][a-z-]*/g))];

test('a ajuda anuncia opções', () => {
  assert.ok(flags.length >= 10, `poucas opções encontradas: ${flags.join(' ')}`);
});

for (const flag of flags) {
  test(`opção ${flag} é aceita pelo parser`, () => {
    // O valor serve às opções de texto; nas booleanas ele vira posicional. O que importa
    // aqui é o parser aceitar a opção: a ajuda precisa ser impressa e sem erro de parse.
    const r = spawnSync(process.execPath, [bd, '--help', flag, 'valor'], { encoding: 'utf8' });
    assert.doesNotMatch(r.stderr, /ERR_PARSE_ARGS_UNKNOWN_OPTION|Unknown option/, r.stderr);
    assert.match(r.stdout, /^bd — buddy-dev/, r.stderr);
  });
}
