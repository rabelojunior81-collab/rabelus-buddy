// Camada de inglês sob o app inteiro (Pai, 2026-10-20: "uma camada de Inglês, sob o APP inteiro"). O núcleo manda
// motivos e textos de aprovação em português; a tela os reconhece e mostra pelo catálogo do idioma escolhido. Este
// teste cobre os furos achados em 2026-10-21: os motivos dos modos de permissão e o texto dos cartões de aprovação.
// O texto cru continua sendo a chave dos dados (escopos, ícone do harness); só a exibição é traduzida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
const LOCALES = join(import.meta.dirname, '..', '..', '..', 'locales');
function pure<T>(names: string[]): T {
  const a = PAGE.indexOf('// <puras>');
  const b = PAGE.indexOf('// </puras>');
  return new Function(`${PAGE.slice(a, b)}; return { ${names.join(', ')} };`)() as T;
}
const cat = (lang: string) => JSON.parse(readFileSync(join(LOCALES, lang, 'console.json'), 'utf8'));
const has = (c: unknown, key: string) => typeof key.split('.').reduce<any>((o, p) => (o && typeof o === 'object' ? o[p] : undefined), c) === 'string';
const { reasonKey, approvalParts } = pure<{ reasonKey: (r: unknown) => string | null; approvalParts: (a: string) => { key: string; vars: Record<string, string>; tool?: string } | null }>(['reasonKey', 'approvalParts']);

test('motivos dos modos de permissão e do modelo que treina viram chave do catálogo', () => {
  const casos: [string, string][] = [
    ['modo plano', 'console.reason.planMode'],
    ['modo sem perguntas', 'console.reason.yoloMode'],
    ['modo aceitar edições', 'console.reason.acceptEditsMode'],
    ['automático: escrita dentro da pasta', 'console.reason.autoWrite'],
    ['automático: comando só de leitura', 'console.reason.autoCommand'],
    ['modelo treina com os dados: exige concessão de projeto', 'console.reason.trainingModel'],
  ];
  for (const [r, k] of casos) {
    assert.equal(reasonKey(r), k, r);
    for (const lang of ['pt-BR', 'en']) assert.ok(has(cat(lang), k), `${lang}: ${k}`);
  }
});

test('o texto do cartão de aprovação é montado pelo catálogo; o desconhecido fica cru', () => {
  const first = approvalParts('Primeira execução de Claude Agent: baixar e executar @agentclientprotocol/claude-agent-acp@0.94.0 (npx). Aprovar vale só para esta versão.');
  assert.deepEqual(first, { key: 'console.approvals.text.firstRun', vars: { name: 'Claude Agent', pkg: '@agentclientprotocol/claude-agent-acp@0.94.0', src: 'npx' } });
  assert.deepEqual(approvalParts('Harness OpenCode: write_file escopo.txt'), { key: 'console.approvals.text.harness', vars: { name: 'OpenCode', target: 'escopo.txt' }, tool: 'write_file' });
  assert.deepEqual(approvalParts('Harness Codex: read_file C:/Users/x/a b.txt (fora da pasta de trabalho)'), { key: 'console.approvals.text.harnessOutside', vars: { name: 'Codex', target: 'C:/Users/x/a b.txt' }, tool: 'read_file' });
  assert.deepEqual(approvalParts('run_command npm test'), { key: 'console.approvals.text.plain', vars: { target: 'npm test' }, tool: 'run_command' });
  assert.deepEqual(approvalParts('reconcile delegate opencode'), { key: 'console.approvals.text.reconcile', vars: { target: 'opencode' }, tool: 'delegate' });
  assert.equal(approvalParts('algo que ninguém conhece'), null);
  for (const lang of ['pt-BR', 'en']) {
    const c = cat(lang);
    for (const k of ['firstRun', 'harness', 'harnessOutside', 'plain', 'reconcile']) assert.ok(has(c, `console.approvals.text.${k}`), `${lang}: ${k}`);
    for (const tool of ['write_file', 'archive', 'run_command', 'read_file', 'list_dir', 'delegate']) assert.ok(has(c, `console.approvals.tool.${tool}`), `${lang}: ${tool}`);
  }
});

test('o cartão mostra o texto traduzido, e os escopos continuam lendo o texto cru', () => {
  assert.ok(PAGE.includes("el('span', { class: 'a', title: a.action }, approvalText(a.action))"), 'exibição traduzida, com o texto original no título');
  assert.ok(PAGE.includes('scopesFor(a.action)'), 'escopos pelo texto cru');
});
