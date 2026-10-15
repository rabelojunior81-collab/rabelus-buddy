#!/usr/bin/env node
// bd — ferramenta de desenvolvimento do Rabelus Buddy (buddy-dev).
// Uso: node scripts/bd.mjs <comando> [opções]   (ou: npm run bd -- <comando>)
// Sem dependências externas; Node >= 24.

import { parseArgs } from 'node:util';
import { formats, verifyClock, isKnownZone, ZONE } from './lib/time.mjs';
import { stampedName, checkPath } from './lib/names.mjs';
import { startSession, logEvent, endSession, status, claim, release, currentSession, lastSession } from './lib/bus.mjs';
import { checkBlogDelivery, blogDir } from './lib/blog.mjs';
import { surfaceGaps } from './lib/surfaces.mjs';
import { checkDeps, latestVersions } from './lib/deps.mjs';
import { testGuard } from './lib/testguard.mjs';
import { archivePaths } from './lib/archive.mjs';
import { addEntry, prune, parse, CAP } from './lib/changelog.mjs';
import { findDeletions } from './lib/guard.mjs';
import { git, tryGit, repoRoot, currentBranch } from './lib/git.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HELP = `bd — buddy-dev

  now [--verify] [--json]            hora canônica de Curitiba (America/Sao_Paulo)
  name <texto> [--ext md]            nome semântico com carimbo
  names-check                        lint de nomes de todos os arquivos versionados
  session start --harness H --model M --scope S
  session log --type T --summary S [--refs a,b]
  session end [--summary S]          recusa sem post + daily publicados no Blog
  session status                     sessões abertas e claims (todos os worktrees)
  claim <recurso> [--ttl 30]         reivindica um recurso por N minutos
  release <recurso>
  archive <caminhos...> --reason R --name N
  changelog add --type T --text X | changelog prune | changelog count
  guard [--base origin/main] [--staged]
  pre                                rito ANTES: relógio, git, sessão, claims
  post                               rito DEPOIS: nomes, exclusões, push, sessão, Blog
  blog-check                         post e daily da sessão publicados no Blog?
  surfaces [--base origin/main]      superfícies coerentes: índices, ADRs, carimbos, main do STATUS
  deps [--latest]                    protocolo de dependências (registro, versão exata, licença, prazo)
  test-guard [--base origin/main]    a suíte não perde testes nem asserções; sem skip/todo/only
`;

const { values: o, positionals: pos } = parseArgs({
  allowPositionals: true,
  options: {
    verify: { type: 'boolean' }, json: { type: 'boolean' }, staged: { type: 'boolean' },
    ext: { type: 'string' }, harness: { type: 'string' }, model: { type: 'string' },
    scope: { type: 'string' }, type: { type: 'string' }, summary: { type: 'string' },
    refs: { type: 'string' }, ttl: { type: 'string' }, reason: { type: 'string' },
    name: { type: 'string' }, text: { type: 'string' }, base: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

const root = () => repoRoot();
const sessionId = (r) => currentSession(r)?.id ?? 'nao-declarada';
const ok = (m) => console.log(`  ✔ ${m}`);
const warn = (m) => console.log(`  ⚠ ${m}`);
let failures = 0;
const fail = (m) => { failures += 1; console.log(`  ✖ ${m}`); };

function namesProblems(r) {
  return git(r, 'ls-files').split('\n').filter(Boolean).flatMap(checkPath);
}

async function clockCheck() {
  const f = formats();
  if (!isKnownZone(ZONE)) fail(`zona ${ZONE} desconhecida neste runtime`);
  const v = await verifyClock();
  const line = `${f.iso} (${f.human})`;
  if (v.state === 'ok') ok(`relógio ${line} · desvio ${v.driftSec}s vs ${v.source}`);
  else if (v.state === 'drift') fail(`relógio com desvio de ${v.driftSec}s vs ${v.source}: corrija antes de datar`);
  else warn(`relógio ${line} · NÃO VERIFICADO (${v.reason})`);
  return { f, v };
}

// Gate do Blog (BLOG_GOVERNANCE §5; ordem do Pai em 2026-10-15): a sessão só fecha com post publicado.
function blogGate(r, session) {
  const dir = blogDir(r);
  const res = checkBlogDelivery(dir, { since: session.startedAt });
  if (res.ok) ok(`Blog: ${res.posts.join(', ')} publicado(s) desde ${session.startedAt}, com daily`);
  else fail(`Blog (${dir}), sessão ${session.id}:\n    ${res.problems.join('\n    ')}`);
  return res.ok;
}

function syncInfo(r) {
  tryGit(r, 'fetch', '-q', 'origin');
  const branch = currentBranch(r);
  const upstream = tryGit(r, 'rev-parse', '--abbrev-ref', '@{u}');
  const counts = upstream ? tryGit(r, 'rev-list', '--left-right', '--count', `${upstream}...HEAD`) : null;
  const [behind, ahead] = counts ? counts.split(/\s+/).map(Number) : [null, null];
  return { branch, upstream, behind, ahead, dirty: git(r, 'status', '--porcelain') };
}

const commands = {
  async now() {
    const f = formats();
    const v = o.verify ? await verifyClock() : undefined;
    if (o.json) return console.log(JSON.stringify({ ...f, clock: v }, null, 2));
    console.log(f.iso);
    if (v) console.log(v.state === 'ok' ? `verificado: desvio ${v.driftSec}s` : `${v.state}: ${v.reason ?? v.driftSec + 's'}`);
    if (v && v.state === 'drift') process.exitCode = 1;
  },

  name() {
    console.log(stampedName(pos.slice(1).join(' '), { stamp: formats().stamp, ext: o.ext }));
  },

  'names-check'() {
    const problems = namesProblems(root());
    problems.forEach((p) => console.log(p));
    if (problems.length) process.exitCode = 1;
    else console.log('nomes ok');
  },

  session() {
    const r = root();
    const sub = pos[1];
    if (sub === 'start') {
      const s = startSession(r, { harness: o.harness, model: o.model, scope: o.scope });
      console.log(`sessão aberta: ${s.id}`);
    } else if (sub === 'log') {
      const { file } = logEvent(r, { type: o.type, summary: o.summary, refs: o.refs?.split(',') ?? [] });
      console.log(file);
    } else if (sub === 'end') {
      const cur = currentSession(r);
      if (!cur) throw new Error('nenhuma sessão aberta neste worktree');
      if (!blogGate(r, cur)) {
        console.log('sessão NÃO encerrada: publique o post e a daily no Blog e rode de novo');
        process.exitCode = 1;
        return;
      }
      endSession(r, { summary: o.summary });
      console.log('sessão encerrada');
    } else if (sub === 'status') {
      console.log(JSON.stringify(status(r), null, 2));
    } else throw new Error('use: session start|log|end|status');
  },

  claim() {
    const c = claim(root(), pos[1], { ttlMin: Number(o.ttl ?? 30) });
    console.log(`claim: ${c.resource} até ${c.expiresUtc}${c.tookOverFrom ? ` (assumido de ${c.tookOverFrom})` : ''}`);
  },

  release() {
    release(root(), pos[1]);
    console.log(`liberado: ${pos[1]}`);
  },

  archive() {
    const r = root();
    const out = archivePaths(r, pos.slice(1), { reason: o.reason, name: o.name, session: sessionId(r) });
    console.log(`arquivado em ${out.dest} (${out.entries.length} arquivos)`);
  },

  changelog() {
    const r = root();
    const sub = pos[1];
    if (sub === 'add') {
      const res = addEntry(r, { type: o.type, text: o.text, session: sessionId(r) });
      console.log(`#${String(res.n).padStart(4, '0')} adicionada (${res.count}/${CAP})`);
      if (res.overCap) console.log('acima do teto: extraia as lições em LEARNING-CURVE.md e rode `bd changelog prune`');
    } else if (sub === 'prune') {
      const res = prune(r);
      console.log(res.pruned ? `lote ${res.lot} arquivado em ${res.archived}` : 'nada a podar');
    } else if (sub === 'count') {
      const n = parse(readFileSync(join(r, '.buddy-dev/CHANGELOG.md'), 'utf8')).entries.length;
      console.log(`${n}/${CAP}`);
    } else throw new Error('use: changelog add|prune|count');
  },

  guard() {
    const d = findDeletions(root(), { base: o.base ?? 'origin/main', staged: o.staged });
    if (d.length) {
      console.log('exclusões proibidas (use `bd archive`):');
      d.forEach((p) => console.log(`  ${p}`));
      process.exitCode = 1;
    } else console.log('nenhuma exclusão');
  },

  async deps() {
    const r = root();
    const problems = checkDeps(r);
    problems.forEach((p) => console.log(`  ✖ ${p}`));
    if (problems.length) process.exitCode = 1;
    else console.log('dependências conforme o protocolo (docs/30-governanca/DEPENDENCIAS.md)');
    if (o.latest) {
      for (const d of await latestVersions(r)) {
        if (d.error) console.log(`  ⚠ ${d.name}: consulta falhou (${d.error})`);
        else if (d.outdated) console.log(`  ⚠ ${d.name}: registrada ${d.registered}, latest ${d.latest} (${d.license})`);
        else console.log(`  ✔ ${d.name} ${d.registered} é a latest`);
      }
    }
  },

  'test-guard'() {
    const problems = testGuard(root(), { base: o.base ?? 'origin/main' });
    problems.forEach((p) => console.log(`  ✖ ${p}`));
    if (problems.length) {
      console.log('teste reprovado se corrige no código, nunca afrouxando o teste');
      process.exitCode = 1;
    } else console.log('suíte de testes íntegra contra a base');
  },

  surfaces() {
    const gaps = surfaceGaps(root(), { base: o.base ?? 'origin/main' });
    gaps.forEach((g) => console.log(`  ✖ ${g}`));
    if (gaps.length) {
      console.log('superfícies desatualizadas: veja docs/30-governanca/SUPERFICIES.md');
      process.exitCode = 1;
    } else console.log('superfícies coerentes');
  },

  'blog-check'() {
    const r = root();
    const s = lastSession(r);
    if (!s) throw new Error('nenhuma sessão registrada neste worktree');
    if (!blogGate(r, s)) process.exitCode = 1;
  },

  async pre() {
    const r = root();
    console.log('ANTES');
    await clockCheck();
    const s = syncInfo(r);
    if (s.branch === 'main') warn('você está na main: trabalho novo nasce em branch (feat/…, fix/…, docs/…)');
    else ok(`branch ${s.branch}`);
    if (s.behind) fail(`${s.behind} commit(s) atrás de ${s.upstream}: git pull --ff-only`);
    else if (s.upstream) ok(`sincronizado com ${s.upstream}`);
    else warn('branch sem upstream: o primeiro push usa -u');
    if (s.dirty) warn(`árvore com alterações não commitadas:\n${s.dirty}`);
    const cur = currentSession(r);
    if (cur) ok(`sessão ${cur.id} (${cur.harness} · ${cur.model})`);
    else fail('sem sessão aberta: bd session start --harness … --model … --scope …');
    const st = status(r);
    const others = st.sessions.filter((x) => x.id !== cur?.id);
    if (others.length) warn(`sessões paralelas: ${others.map((x) => `${x.id} [${x.scope}]`).join(', ')}`);
    for (const c of st.claims.filter((c) => !c.expired)) warn(`claim ativo: ${c.resource} → ${c.session}`);
    if (failures) process.exitCode = 1;
  },

  async post() {
    const r = root();
    console.log('DEPOIS');
    await clockCheck();
    const problems = namesProblems(r);
    if (problems.length) fail(`nomes fora da convenção:\n    ${problems.join('\n    ')}`);
    else ok('nomes na convenção');
    const d = findDeletions(r, { base: o.base ?? 'origin/main' });
    if (d.length) fail(`exclusões proibidas: ${d.join(', ')}`);
    else ok('nenhuma exclusão');
    const gaps = surfaceGaps(r, { base: o.base ?? 'origin/main' });
    if (gaps.length) fail(`superfícies desatualizadas (docs/30-governanca/SUPERFICIES.md):\n    ${gaps.join('\n    ')}`);
    else ok('superfícies coerentes');
    const depProblems = checkDeps(r);
    if (depProblems.length) fail(`dependências fora do protocolo (docs/30-governanca/DEPENDENCIAS.md):\n    ${depProblems.join('\n    ')}`);
    else ok('dependências conforme o protocolo');
    const weakened = testGuard(r, { base: o.base ?? 'origin/main' });
    if (weakened.length) fail(`suíte de testes enfraquecida:\n    ${weakened.join('\n    ')}`);
    else ok('suíte de testes íntegra contra a base');
    const s = syncInfo(r);
    if (s.dirty) fail(`alterações não commitadas:\n${s.dirty}`);
    else ok('árvore limpa');
    if (!s.upstream) fail('branch sem upstream: git push -u origin <branch>');
    else if (s.ahead) fail(`${s.ahead} commit(s) sem push`);
    else ok(`tudo enviado a ${s.upstream}`);
    const cur = currentSession(r);
    if (cur) warn(`sessão ${cur.id} ainda aberta (encerre com bd session end ao terminar)`);
    // Com sessão aberta, o gate é cobrado no `session end` (que recusa sem post), e
    // `session start` não abre outra enquanto esta existir: aqui só avisa, para não
    // travar os PRs intermediários da sessão. Sem sessão aberta, reprova a última.
    if (cur) {
      const res = checkBlogDelivery(blogDir(r), { since: cur.startedAt });
      if (res.ok) ok(`Blog: ${res.posts.join(', ')} publicado(s) nesta sessão`);
      else warn('Blog: post e daily desta sessão ainda pendentes (o bd session end vai cobrar)');
    } else {
      const last = lastSession(r);
      if (last) blogGate(r, last);
      else warn('nenhuma sessão registrada neste worktree: gate do Blog não se aplica');
    }
    if (failures) process.exitCode = 1;
  },
};

const cmd = pos[0];
if (o.help || !cmd || !commands[cmd]) {
  console.log(HELP);
  if (cmd && !commands[cmd]) process.exitCode = 1;
} else {
  try {
    await commands[cmd]();
  } catch (e) {
    console.error(`erro: ${e.message}`);
    process.exitCode = 1;
  }
}
