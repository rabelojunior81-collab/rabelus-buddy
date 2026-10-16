import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { checkValidations, VALIDACOES } from '../lib/validacoes.mjs';

function repo(files) {
  const r = mkdtempSync(join(tmpdir(), 'buddy-val-'));
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(dirname(join(r, p)), { recursive: true });
    writeFileSync(join(r, p), typeof c === 'string' ? c : JSON.stringify(c, null, 2));
  }
  return r;
}
const BD = "const HELP = `\n  deps [--latest]   x\n  prune   y\n`;\nconst commands = {\n  deps() {},\n  prune() {},\n};";
const CI = 'jobs:\n  a:\n    steps:\n      - name: Dependências conforme o protocolo\n        run: node scripts/bd.mjs deps\n';
const v = (over) => ({ id: 'deps', descricao: 'd', quem: 'maquina', onde: ['bd post', 'CI'], mecanismo: { bd: 'deps', ci: 'node scripts/bd.mjs deps' }, origem: 'Pai, 2026-10-15', ...over });
const files = (vals) => ({ 'scripts/bd.mjs': BD, '.github/workflows/ci.yml': CI, [VALIDACOES]: { validacoes: vals } });

test('validação de máquina com comando e passo de CI existentes: aprova', () => {
  const r = checkValidations(repo(files([v()])));
  assert.deepEqual(r.problems, []);
});

test('comando bd inexistente ou fora da ajuda: reprova', () => {
  const r = checkValidations(repo(files([v({ mecanismo: { bd: 'naoexiste' } })])));
  assert.match(r.problems.join(), /naoexiste/);
});

test('passo de CI declarado e ausente no workflow: reprova', () => {
  const r = checkValidations(repo(files([v({ mecanismo: { bd: 'deps', ci: 'node scripts/bd.mjs prune' } })])));
  assert.match(r.problems.join(), /CI/);
});

test('validação do Pai pendente aparece na lista de espera, não como problema', () => {
  const r = checkValidations(repo(files([v(), v({ id: 'demo-m0', quem: 'pai', mecanismo: {}, estado: 'pendente', onde: ['M0.8'] })])));
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.aguardaPai.map((x) => x.id), ['demo-m0']);
});

test('entrada incompleta ou id repetido: reprova', () => {
  const r = checkValidations(repo(files([v(), v(), v({ id: 'x', origem: '' })])));
  const p = r.problems.join('\n');
  assert.match(p, /deps.*repetid/);
  assert.match(p, /x.*origem/);
});

test('validação de máquina sem mecanismo: reprova (regra sem mecanismo é desejo)', () => {
  const r = checkValidations(repo(files([v({ mecanismo: {} })])));
  assert.match(r.problems.join(), /sem mecanismo/);
});
