// A2: quem fala na conversa. A fala de um harness (OpenCode, Codex...) não é do Buddy: o balão mostra o ícone e o nome
// do harness que respondeu; a execução do próprio Buddy continua com o rótulo "BUDDY". A decisão é uma função pura
// (speakerOf), testada pelo mesmo mecanismo das outras funções puras da página, e usada na resposta final e no ao vivo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');

// Funções puras da página (mesmo mecanismo de console-harness.test.ts).
function pure<T>(names: string[]): T {
  const a = PAGE.indexOf('// <puras>');
  const b = PAGE.indexOf('// </puras>');
  return new Function(`${PAGE.slice(a, b)}; return { ${names.join(', ')} };`)() as T;
}

type Speaker = { kind: 'buddy' } | { kind: 'harness'; id: string; name: string };
type SpeakerOf = (runHarness: string | null, list: { id: string; name: string }[]) => Speaker;

test('quem fala: execução do próprio Buddy é "buddy"; harness conhecido dá o nome da lista (A2)', () => {
  const { speakerOf } = pure<{ speakerOf: SpeakerOf }>(['speakerOf']);
  assert.deepEqual(speakerOf(null, [{ id: 'opencode', name: 'OpenCode' }]), { kind: 'buddy' });
  assert.deepEqual(speakerOf('opencode', [{ id: 'opencode', name: 'OpenCode' }]), { kind: 'harness', id: 'opencode', name: 'OpenCode' });
});

test('quem fala: id de harness desconhecido vira o próprio id como nome (A2)', () => {
  const { speakerOf } = pure<{ speakerOf: SpeakerOf }>(['speakerOf']);
  assert.deepEqual(speakerOf('codex', []), { kind: 'harness', id: 'codex', name: 'codex' });
});

test('página: a resposta final e o texto ao vivo decidem o rótulo com speakerOf (A2)', () => {
  const calls = PAGE.match(/speakerOf\(/g) || [];
  assert.ok(calls.length >= 2, `speakerOf usado na resposta final e no ao vivo (achados: ${calls.length})`);
  assert.ok(PAGE.includes("t('console.feed.harnessSays'"), 'o harness fala com a chave console.feed.harnessSays');
});

test('chave console.feed.harnessSays existe nos dois idiomas, com {{name}} (A2)', () => {
  for (const lang of ['pt-BR', 'en']) {
    const cat = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', 'locales', lang, 'console.json'), 'utf8')) as { console: { feed: Record<string, unknown> } };
    const v = cat.console.feed.harnessSays;
    assert.equal(typeof v, 'string', `${lang}: chave ausente`);
    assert.ok(String(v).includes('{{name}}'), `${lang}: o valor usa {{name}}`);
  }
});
