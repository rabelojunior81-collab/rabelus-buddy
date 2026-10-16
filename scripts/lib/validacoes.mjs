// Registro de validações: toda validação tem dono (máquina, buddy-dev ou Pai),
// lugar onde roda e mecanismo. Ordem do Pai em 2026-10-16: ampliar a governança
// para garantir o enforcement, sabendo que algumas validações só ele constata.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const VALIDACOES = 'docs/30-governanca/validacoes.json';
const QUEM = ['maquina', 'buddy', 'pai'];
const CAMPOS = ['id', 'descricao', 'quem', 'onde', 'origem'];

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
  const aguardaPai = list.filter((v) => v.quem === 'pai' && v.estado === 'pendente');
  return { problems, aguardaPai, total: list.length };
}
