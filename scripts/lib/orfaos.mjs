// Varredura de órfãos e quebrados (regra do Pai, 2026-10-18): links relativos que não levam a nada, arquivos de
// documentação que nada referencia e exportações de código que ninguém usa. O arquivo morto (archive/) é
// história e fica de fora, assim como o rascunho local e o ledger.
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, posix } from 'node:path';
import { git } from './git.mjs';

const SKIP = /^(archive|node_modules|workspace)\/|^\.buddy-dev\/bus\//;
const TEXT = /\.(md|ts|mjs|cjs|js|json|html|css|yml|yaml|txt)$/;
const ASSET = /\.(png|jpe?g|svg|gif|webp|json|js|html|css|txt)$/;
const CODE = /^(packages\/[^/]+\/src|scripts\/lib)\/.+\.(ts|mjs)$/;
const external = (u) => /^([a-z][a-z0-9+.-]*:|#|\/\/|\{|\$)/i.test(u) || /\/(blob|tree)\//.test(u);

function files(root) {
  return git(root, 'ls-files', '--cached', '--others', '--exclude-standard').split('\n').filter(Boolean).filter((f) => !SKIP.test(f));
}

function target(root, from, url) {
  const clean = decodeURI(url.split('#')[0].split('?')[0]);
  if (!clean) return null;
  const rel = clean.startsWith('/') ? clean.slice(1) : posix.join(posix.dirname(from), clean);
  return existsSync(join(root, rel)) ? null : url;
}

export function findOrphans(root) {
  const all = files(root);
  const read = (f) => { try { return readFileSync(join(root, f), 'utf8'); } catch { return ''; } };
  const text = Object.fromEntries(all.filter((f) => TEXT.test(f)).map((f) => [f, read(f)]));
  const problems = [];

  // 1. Links relativos quebrados (Markdown e HTML), fora de blocos de código.
  for (const [f, t] of Object.entries(text)) {
    const urls = [];
    if (f.endsWith('.md')) {
      const body = t.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
      for (const m of body.matchAll(/!?\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) urls.push(m[1]);
    } else if (f.endsWith('.html')) {
      for (const m of t.matchAll(/\s(?:src|href)="([^"]+)"/g)) urls.push(m[1]);
    }
    for (const u of urls) if (!external(u) && target(root, f, u)) problems.push(`${f} → ${u}`);
  }

  // 2. Arquivos de documentação que nada referencia (pelo nome, ou pela pasta quando o código monta o caminho).
  const corpusOf = (skip) => Object.entries(text).filter(([f]) => f !== skip).map(([, t]) => t).join('\n');
  const corpus = corpusOf(null);
  for (const f of all.filter((x) => x.startsWith('docs/') && ASSET.test(x))) {
    const name = basename(f);
    const others = corpus.split(text[f] ?? '\u0000').join('');
    // Pela pasta, só quando o código monta o caminho: 'icones/labs/' + lab, `icones/labs/${lab}`.
    const parent = `${posix.basename(posix.dirname(posix.dirname(f)))}/${posix.basename(posix.dirname(f))}/`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const built = new RegExp(`${parent}(['"\`]|\\$\\{)`).test(others);
    if (!others.includes(name) && !built && !others.includes(name.replace(/\.[^.]+$/, ''))) problems.push(`${f}: nada referencia este arquivo`);
  }

  // 3. Exportações de código sem uso em lugar nenhum (nem no próprio arquivo, nem nos testes).
  const code = Object.entries(text).filter(([f]) => /\.(ts|mjs|cjs|js|html)$/.test(f));
  for (const [f, t] of code.filter(([x]) => CODE.test(x))) {
    for (const m of t.matchAll(/export (?:async )?(?:function|const|let|class|interface|type|enum) (\w+)/g)) {
      const re = new RegExp(`\\b${m[1]}\\b`, 'g');
      const usedHere = (t.match(re) ?? []).length > 1;
      const usedElsewhere = code.some(([g, u]) => g !== f && new RegExp(`\\b${m[1]}\\b`).test(u));
      if (!usedHere && !usedElsewhere) problems.push(`${f}: exportação sem uso: ${m[1]}`);
    }
  }
  return problems;
}
