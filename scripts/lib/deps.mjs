// Protocolo de dependências (docs/30-governanca/DEPENDENCIAS.md).
//
// Ordem do Pai em 2026-10-15: "Deve ser garantido protocolo/processo/rotina de
// atualizações. E se replicar a toda e qualquer nova adição de dependência."
// Nenhuma dependência entra sem registro; nenhuma fica sem reverificação no prazo.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const REGISTRY = 'docs/30-governanca/dependencias.json';
const FIELDS = ['name', 'version', 'license', 'kind', 'purpose', 'ficha', 'verifiedAt', 'approvedBy'];
const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const SECTIONS = { dependencies: 'runtime', devDependencies: 'dev', optionalDependencies: 'runtime', peerDependencies: 'runtime' };
const DAY = 86_400_000;

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

// package.json da raiz e dos workspaces (padrões simples "dir/*" ou caminho direto).
function manifests(root) {
  const out = ['package.json'];
  const pkg = existsSync(join(root, 'package.json')) ? readJson(join(root, 'package.json')) : {};
  for (const w of pkg.workspaces ?? []) {
    if (w.endsWith('/*')) {
      const dir = w.slice(0, -2);
      if (!existsSync(join(root, dir))) continue;
      for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
        if (e.isDirectory() && existsSync(join(root, dir, e.name, 'package.json'))) out.push(`${dir}/${e.name}/package.json`);
      }
    } else if (existsSync(join(root, w, 'package.json'))) out.push(`${w}/package.json`);
  }
  return out.filter((p) => existsSync(join(root, p)));
}

export function checkDeps(root, { now = new Date() } = {}) {
  const problems = [];
  if (!existsSync(join(root, REGISTRY))) return [`registro ${REGISTRY} ausente`];
  const reg = readJson(join(root, REGISTRY));
  const allowed = new Set(reg.licenses ?? []);
  const maxDays = reg.reverifyDays ?? 30;
  const byName = new Map();

  for (const e of reg.dependencies ?? []) {
    const who = e.name ?? '(sem nome)';
    for (const f of FIELDS) if (!e[f]) problems.push(`${REGISTRY}: ${who} sem o campo ${f}`);
    if (e.version && !EXACT.test(e.version)) problems.push(`${REGISTRY}: ${who} precisa de versão exata (recebeu ${e.version})`);
    if (e.license && !allowed.has(e.license)) problems.push(`${REGISTRY}: ${who} com licença ${e.license}, fora da lista permitida (${[...allowed].join(', ')})`);
    if (e.kind && !['runtime', 'dev'].includes(e.kind)) problems.push(`${REGISTRY}: ${who} com kind "${e.kind}" (use runtime ou dev)`);
    if (e.ficha && !existsSync(join(root, e.ficha))) problems.push(`${REGISTRY}: ${who}: a ficha ${e.ficha} não existe`);
    if (e.verifiedAt) {
      const age = Math.floor((now.getTime() - new Date(`${e.verifiedAt}T12:00:00-03:00`).getTime()) / DAY);
      if (age > maxDays) problems.push(`${REGISTRY}: ${who} verificada em ${e.verifiedAt} (${age} dias, prazo ${maxDays}): reverificar versão, licença e notas de segurança, e atualizar verifiedAt`);
    }
    byName.set(e.name, e);
  }

  let installed = 0;
  for (const m of manifests(root)) {
    const pkg = readJson(join(root, m));
    for (const [section, kind] of Object.entries(SECTIONS)) {
      for (const [name, spec] of Object.entries(pkg[section] ?? {})) {
        installed += 1;
        const e = byName.get(name);
        if (!e) { problems.push(`${m}: ${name} fora do registro (${REGISTRY}); siga docs/30-governanca/DEPENDENCIAS.md`); continue; }
        if (!EXACT.test(spec)) problems.push(`${m}: ${name} "${spec}" precisa de versão exata`);
        else if (spec !== e.version) problems.push(`${m}: ${name} ${spec}, mas o registro diz ${e.version}`);
        if (e.kind && e.kind !== kind) problems.push(`${m}: ${name} está em ${section}, mas está registrada como ${e.kind}`);
        if ((e.status ?? 'aprovada') !== 'aprovada') problems.push(`${m}: ${name} está como "${e.status}" no registro: só se instala depois da aprovação do Pai`);
      }
    }
  }
  if (installed && !existsSync(join(root, 'package-lock.json'))) problems.push('há dependências instaladas sem package-lock.json versionado');
  return problems;
}

// Consulta ao registro do npm (rede): versões mais novas que as registradas.
export async function latestVersions(root, { fetchImpl = fetch } = {}) {
  const reg = readJson(join(root, REGISTRY));
  const out = [];
  for (const e of reg.dependencies ?? []) {
    try {
      const res = await fetchImpl(`https://registry.npmjs.org/${e.name.replace('/', '%2F')}/latest`);
      const j = await res.json();
      out.push({ name: e.name, registered: e.version, latest: j.version, license: j.license, outdated: j.version !== e.version });
    } catch (err) {
      out.push({ name: e.name, registered: e.version, error: err.message });
    }
  }
  return out;
}
