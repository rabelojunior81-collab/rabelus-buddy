// Plano da CI por evento (2026-10-18). A cota de minutos do GitHub acabou com ~2.095 minutos ponderados no mês,
// e o macOS (peso 10) era mais da metade. Regra: cada combinação roda uma vez, onde ela agrega.
//   PR com código     → Linux 26 e Windows 26 (o Linux 24 roda no job de regras; Windows 26 é o ambiente do Pai)
//   merge na main     → só macOS 26 (o PR já testou o mesmo resultado de merge nos outros sistemas)
//   só documentação   → nenhuma matriz e nenhuma suíte (as regras de governança rodam sempre)
//   semanal ou manual → a matriz completa, para pegar deriva de runner ou de Node
import { tryGit } from './git.mjs';

const OS = ['ubuntu-latest', 'macos-latest', 'windows-latest'];
const NODE = [24, 26];
export const FULL_MATRIX = OS.flatMap((os) => NODE.map((node) => ({ os, node })));

const CODE = /^(packages\/|scripts\/|locales\/|package(-lock)?\.json$|tsconfig[^/]*\.json$|\.github\/)/;
export const isCode = (file) => CODE.test(file);

export function ciPlan({ event, changed }) {
  if (event === 'schedule' || event === 'workflow_dispatch') return { codigo: true, matriz: FULL_MATRIX };
  const codigo = changed === null || changed.some(isCode); // sem saber o que mudou, trata como código
  if (!codigo) return { codigo, matriz: [] };
  if (event === 'pull_request') return { codigo, matriz: [{ os: 'ubuntu-latest', node: 26 }, { os: 'windows-latest', node: 26 }] };
  if (event === 'push') return { codigo, matriz: [{ os: 'macos-latest', node: 26 }] };
  return { codigo, matriz: FULL_MATRIX };
}

// Arquivos alterados desde a base (PR: base...HEAD; push: before..HEAD). null quando não dá para saber.
export function changedFiles(root, base) {
  if (!base || /^0+$/.test(base)) return null;
  const out = tryGit(root, 'diff', '--name-only', `${base}...HEAD`) ?? tryGit(root, 'diff', '--name-only', base, 'HEAD');
  return out === null || out === undefined ? null : out.split('\n').filter(Boolean);
}
