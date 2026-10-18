// Nenhum processo do produto abre janela de console no Windows (achado do Pai em 2026-10-18: janelas do Windows
// Terminal abertas e esquecidas). O núcleo sobe desligado do console (ensureOwner detached); todo programa de
// console que ele iniciar sem windowsHide ganha um console visível. Varredura: toda criação de processo no código
// do produto passa windowsHide, ou declara na linha anterior por que é programa sem console.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const files = ['core/src', 'cli/src', 'client/src'].flatMap((d) => readdirSync(join(ROOT, d), { recursive: true }).map(String).filter((f) => f.endsWith('.ts')).map((f) => join(d, f)));

test('todo processo do produto é criado com windowsHide (ou declara que é programa sem console)', () => {
  const offenders: string[] = [];
  for (const f of files) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    const lines = src.split('\n');
    // Só os nomes importados de node:child_process (uma função local chamada exec não cria processo).
    const imported = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'node:child_process'/g)].flatMap((m) => m[1]!.split(',').map((s) => s.trim().replace(/^type\s+/, '').split(/\s+as\s+/).at(-1)!)).filter((n) => /^(spawn|spawnSync|execFile|execFileSync|exec|execSync|fork)$/.test(n));
    if (!imported.length) continue;
    for (const m of src.matchAll(new RegExp(`(?<![.\\w])(${imported.join('|')})\\(`, 'g'))) {
      const before = src.slice(0, m.index);
      const line = before.split('\n').length;
      const call = src.slice(m.index, m.index + 400);
      const declared = /sem console/.test(lines[line - 2] ?? '') || /sem console/.test(lines[line - 1] ?? '');
      if (!/windowsHide/.test(call) && !declared) offenders.push(`${f}:${line} ${lines[line - 1]!.trim().slice(0, 100)}`);
    }
  }
  assert.ok(files.length > 10, 'varreu os fontes');
  assert.deepEqual(offenders, []);
});
