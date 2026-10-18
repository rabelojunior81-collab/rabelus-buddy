// Regra do Pai (2026-10-18): varrer o projeto por ligações, lógicas e arquivos órfãos ou quebrados é rotina.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { findOrphans } from '../lib/orfaos.mjs';

function repo(files) {
  const r = mkdtempSync(join(tmpdir(), 'buddy-orf-'));
  execFileSync('git', ['init', '-q', '-b', 'main', r]);
  for (const [p, c] of Object.entries(files)) { mkdirSync(dirname(join(r, p)), { recursive: true }); writeFileSync(join(r, p), c); }
  execFileSync('git', ['-C', r, 'add', '-A']);
  return r;
}

test('bd orfaos: link quebrado, arquivo de documentação sem referência e exportação sem uso; o que está ligado passa', () => {
  const r = repo({
    'README.md': '[spec](./docs/spec.md) · [quebrado](./docs/nao-existe.md) · [fora](https://example.com) · [âncora](#topo) · ![captura](docs/img/usada.png) · [protótipo](docs/proto.html)',
    'docs/spec.md': '# Spec\n[volta](../README.md) e [sumiu](./sumiu/README.md#parte)',
    'docs/img/usada.png': 'x',
    'docs/img/esquecida.png': 'x',
    'docs/icones/labs/openai.svg': '<svg/>',
    'docs/proto.js': "const src = 'icones/labs/' + lab + '.svg';",
    'docs/proto.html': '<script src="proto.js"></script><img src="img/quebrada.png">',
    'packages/core/src/a.ts': 'export function usada() {}\nexport function morta() {}\nexport const local = 1;\nconsole.log(local);',
    'packages/core/src/b.ts': "import { usada } from './a.ts';\nusada();",
    'archive/2026-velho/README.md': '[antigo](./nao-existe-mais.md)',
  });
  const p = findOrphans(r);
  const txt = p.join('\n');
  assert.match(txt, /README\.md → \.\/docs\/nao-existe\.md/);
  assert.match(txt, /docs\/spec\.md → \.\/sumiu\/README\.md/);
  assert.match(txt, /docs\/proto\.html → img\/quebrada\.png/);
  assert.match(txt, /docs\/img\/esquecida\.png/);
  assert.match(txt, /packages\/core\/src\/a\.ts: exportação sem uso: morta/);
  assert.doesNotMatch(txt, /usada\.png|openai\.svg|example\.com|#topo|: usada\b|: local\b|archive\//);
  assert.equal(p.length, 5, txt);
});

test('bd orfaos: repositório limpo não acusa nada', () => {
  const r = repo({ 'README.md': '[a](./a.md)', 'a.md': '[volta](README.md)' });
  assert.deepEqual(findOrphans(r), []);
});
