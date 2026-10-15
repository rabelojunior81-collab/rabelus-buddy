import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { checkDeps, REGISTRY } from '../lib/deps.mjs';

const NOW = new Date('2026-10-15T12:00:00-03:00');

function repo(files) {
  const r = mkdtempSync(join(tmpdir(), 'buddy-deps-'));
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(dirname(join(r, p)), { recursive: true });
    writeFileSync(join(r, p), typeof c === 'string' ? c : JSON.stringify(c, null, 2));
  }
  return r;
}

const entry = (over = {}) => ({
  name: 'openai', version: '7.34.0', license: 'Apache-2.0', kind: 'runtime',
  purpose: 'SDK', ficha: 'docs/20-conhecimento/f.md', verifiedAt: '2026-10-15', approvedBy: 'Pai, 2026-10-15', ...over,
});
const base = (deps, reg, extra = {}) => repo({
  'package.json': { name: 'x', ...deps },
  [REGISTRY]: { reverifyDays: 30, licenses: ['MIT', 'Apache-2.0'], dependencies: reg },
  'docs/20-conhecimento/f.md': 'ficha',
  ...extra,
});

test('sem dependências instaladas e registro válido: aprova', () => {
  assert.deepEqual(checkDeps(base({}, [entry()]), { now: NOW }), []);
});

test('dependência instalada fora do registro: reprova', () => {
  const r = base({ dependencies: { 'left-pad': '1.3.0' } }, [], { 'package-lock.json': '{}' });
  assert.match(checkDeps(r, { now: NOW }).join('\n'), /left-pad.*fora do registro/);
});

test('versão com faixa (^, ~, *, latest) ou diferente do registro: reprova', () => {
  for (const v of ['^7.34.0', '~7.34.0', '*', 'latest', '7.x']) {
    const r = base({ dependencies: { openai: v } }, [entry()], { 'package-lock.json': '{}' });
    assert.match(checkDeps(r, { now: NOW }).join('\n'), /openai.*versão exata/, v);
  }
  const r = base({ dependencies: { openai: '7.33.0' } }, [entry()], { 'package-lock.json': '{}' });
  assert.match(checkDeps(r, { now: NOW }).join('\n'), /openai.*7\.33\.0.*registro diz 7\.34\.0/);
});

test('licença fora da lista permitida: reprova', () => {
  const r = base({}, [entry({ license: 'GPL-3.0' })]);
  assert.match(checkDeps(r, { now: NOW }).join('\n'), /openai.*licença GPL-3\.0/);
});

test('verificação vencida (mais de reverifyDays): reprova com instrução', () => {
  const r = base({}, [entry({ verifiedAt: '2026-09-01' })]);
  assert.match(checkDeps(r, { now: NOW }).join('\n'), /openai.*reverificar/);
});

test('registro incompleto ou ficha inexistente: reprova', () => {
  const r = base({}, [entry({ approvedBy: '', ficha: 'docs/20-conhecimento/nao-existe.md' })]);
  const p = checkDeps(r, { now: NOW }).join('\n');
  assert.match(p, /openai.*approvedBy/);
  assert.match(p, /openai.*ficha .*não existe/);
});

test('dependências instaladas sem package-lock.json: reprova', () => {
  const r = base({ dependencies: { openai: '7.34.0' } }, [entry()]);
  assert.match(checkDeps(r, { now: NOW }).join('\n'), /package-lock\.json/);
});

test('workspaces: dependência de pacote interno também é conferida', () => {
  const r = base({ workspaces: ['packages/*'] }, [entry()], {
    'package-lock.json': '{}',
    'packages/core/package.json': { name: '@x/core', devDependencies: { typescript: '7.0.2' } },
  });
  assert.match(checkDeps(r, { now: NOW }).join('\n'), /packages\/core\/package\.json: typescript.*fora do registro/);
});

test('tipo errado: dependência de runtime registrada como dev (ou o contrário) reprova', () => {
  const r = base({ devDependencies: { openai: '7.34.0' } }, [entry()], { 'package-lock.json': '{}' });
  assert.match(checkDeps(r, { now: NOW }).join('\n'), /openai.*registrada como runtime/);
});

test('dependência proposta (sem aprovação do Pai) não pode ser instalada', () => {
  const r = base({ devDependencies: { typescript: '7.0.2' } },
    [entry({ name: 'typescript', version: '7.0.2', kind: 'dev', status: 'proposta', approvedBy: 'pendente' })],
    { 'package-lock.json': '{}' });
  assert.match(checkDeps(r, { now: NOW }).join('\n'), /typescript.*proposta.*aprovação do Pai/);
});
