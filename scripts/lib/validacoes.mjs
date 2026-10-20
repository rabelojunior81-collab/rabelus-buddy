// Registro de validações: toda validação tem dono (máquina, buddy-dev ou Pai),
// lugar onde roda e mecanismo. Ordem do Pai em 2026-10-16: ampliar a governança
// para garantir o enforcement, sabendo que algumas validações só ele constata.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const VALIDACOES = 'docs/30-governanca/validacoes.json';
const QUEM = ['maquina', 'buddy', 'pai'];
const CAMPOS = ['id', 'descricao', 'quem', 'onde', 'origem'];
// Regra do Pai (2026-10-20): o que precisa dele vem explicado em linguagem comum, sem código interno.
const EXPLICACAO_MIN = 120;
const CODIGO_INTERNO = [
  /\bM\d+(\.\d+)?[a-z]?\b/,
  /\bcrit[ée]rio\s+\d+/i,
  /\bADR\s*\d{3,4}\b/,
  /\bSPEC\s*\d{3,4}\b/,
  /[\w.-]+\/[\w./-]+\.(md|json|ts|mjs|html)\b/,
];

function explicacaoProblems(who, v) {
  const ex = typeof v.explicacao === 'string' ? v.explicacao.trim() : '';
  if (!ex) return [`${who}: entrada do Pai sem a explicação em linguagem comum (campo explicacao)`];
  const out = [];
  if (ex.length < EXPLICACAO_MIN) out.push(`${who}: a explicação tem ${ex.length} caracteres (mínimo ${EXPLICACAO_MIN}); explique em linguagem comum o que o Pai precisa fazer ou decidir`);
  for (const re of CODIGO_INTERNO) {
    const m = ex.match(re);
    if (m) out.push(`${who}: a explicação cita código interno ("${m[0]}"); escreva em linguagem comum`);
  }
  return out;
}

function workflows(root) {
  const dir = join(root, '.github/workflows');
  if (!existsSync(dir)) return '';
  return readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
}

export function checkValidations(root) {
  const problems = [];
  if (!existsSync(join(root, VALIDACOES))) return { problems: [`registro ${VALIDACOES} ausente`], aguardaPai: [], total: 0 };
  const list = JSON.parse(readFileSync(join(root, VALIDACOES), 'utf8')).validacoes ?? [];
  const bd = existsSync(join(root, 'scripts/bd.mjs')) ? readFileSync(join(root, 'scripts/bd.mjs'), 'utf8') : '';
  const help = bd.slice(bd.indexOf('const HELP = `'), bd.indexOf('`;', bd.indexOf('const HELP = `')));
  const ci = workflows(root);
  const seen = new Set();

  for (const v of list) {
    const who = v.id ?? '(sem id)';
    for (const c of CAMPOS) if (!v[c] || (Array.isArray(v[c]) && !v[c].length)) problems.push(`${who}: sem o campo ${c}`);
    if (seen.has(v.id)) problems.push(`${who}: id repetido`);
    seen.add(v.id);
    if (v.quem && !QUEM.includes(v.quem)) problems.push(`${who}: quem "${v.quem}" (use ${QUEM.join(', ')})`);
    const m = v.mecanismo ?? {};
    if (v.quem === 'maquina' && !m.bd && !m.ci && !m.teste) problems.push(`${who}: validação de máquina sem mecanismo (regra sem mecanismo é desejo)`);
    if (m.bd) {
      const cmd = m.bd.split(' ')[0];
      const inHelp = new RegExp(`^\\s{2}${cmd.replace(/[-]/g, '\\-')}\\b`, 'm').test(help);
      const inCode = new RegExp(`(^|\\s|')${cmd.replace(/[-]/g, '\\-')}'?\\s*\\(`, 'm').test(bd);
      if (!inHelp || !inCode) problems.push(`${who}: o comando "bd ${cmd}" não existe na ajuda ou no código do bd`);
    }
    if (m.ci && !ci.includes(m.ci)) problems.push(`${who}: o passo de CI "${m.ci}" não existe em .github/workflows/`);
    if (m.teste && !existsSync(join(root, m.teste))) problems.push(`${who}: o teste ${m.teste} não existe`);
  }
  // Regra do Pai (2026-10-17): "nunca mais cogite me pedir teste que não funciona", e nunca por CLI:
  // o produto é um agente com UX/UI. Ação do Pai só aguarda ele depois de ensaiada por mim, com os
  // mesmos passos e no ambiente dele, e o "como" não passa por terminal.
  const prontaParaOPai = new Set();
  for (const v of list.filter((x) => x.quem === 'pai')) {
    const who = v.id ?? '(sem id)';
    // Toda entrada do Pai que não está concluída precisa de explicação em linguagem comum.
    const porExplicacao = v.estado !== 'feito' ? explicacaoProblems(who, v) : [];
    problems.push(...porExplicacao);
    const comExplicacao = porExplicacao.length === 0;
    if (!['decisao', 'acao'].includes(v.tipo)) { problems.push(`${who}: validação do Pai sem tipo (decisao ou acao)`); continue; }
    if (v.estado === 'bloqueada') { if (!v.motivo) problems.push(`${who}: bloqueada sem motivo`); continue; }
    if (v.tipo === 'decisao') { if (comExplicacao) prontaParaOPai.add(v.id); continue; }
    const before = problems.length;
    if (!v.como) problems.push(`${who}: ação do Pai sem "como"`);
    else if (/\b(terminal|cli|powershell|prompt de comando)\b|\brbuddy\s/i.test(`${v.como} ${v.descricao}`)) problems.push(`${who}: ação do Pai por terminal ou CLI (o Pai usa UX/UI)`);
    if (!v.ensaio) problems.push(`${who}: ação do Pai sem ensaio registrado (docs/registros/…)`);
    else if (!existsSync(join(root, v.ensaio))) problems.push(`${who}: o ensaio ${v.ensaio} não existe`);
    if (comExplicacao && problems.length === before) prontaParaOPai.add(v.id);
  }
  // "aguarda o Pai" mostra a explicação no lugar da descrição, quando existe.
  const aguardaPai = list
    .filter((v) => v.quem === 'pai' && v.estado === 'pendente' && prontaParaOPai.has(v.id))
    .map((v) => ({ ...v, descricao: v.explicacao ?? v.descricao }));
  return { problems, aguardaPai, total: list.length };
}
