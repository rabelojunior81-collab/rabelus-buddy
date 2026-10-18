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
import { classifyBranches, pruneBranches, mergeReadiness } from './lib/branches.mjs';
import { checkValidations } from './lib/validacoes.mjs';
import { ciPlan, changedFiles } from './lib/ciplan.mjs';
import { governanceContext, recordCompaction } from './lib/contexto.mjs';
import { startServer, listServers, stopServers, serversOf, shellCommand } from './lib/servers.mjs';
import { checkClaims } from './lib/claims.mjs';
import { execFileSync } from 'node:child_process';
import { archivePaths } from './lib/archive.mjs';
import { addEntry, prune, parse, CAP } from './lib/changelog.mjs';
import { findDeletions } from './lib/guard.mjs';
import { git, tryGit, repoRoot, currentBranch } from './lib/git.mjs';
import { appendFileSync, readFileSync } from 'node:fs';
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
  ci-plan --event <evento> [--base <ref>]  o que a CI roda neste evento (código? qual matriz?)
  contexto [--compactou]             contexto essencial de governança (depois de compactar; --compactou registra a compactação)
  serve <pasta> [--port N] | --cmd "<comando>" --name <nome> | --list | --stop [--all|<id>|<pasta>]  servidor de conferência com dono e fim
  test-guard [--base origin/main]    a suíte não perde testes nem asserções; sem skip/todo/only
  prune [--dry-run] [--arquivar a,b] remove branches mergeadas; arquiva (tag) as abandonadas
  merge <PR>                         CI verde + bd post limpo → merge commit, main atualizada, prune
  validacoes                         registro de validações: mecanismos ligados; o que aguarda o Pai
  claims [--base origin/main]        documento vivo alterado na branch tem claim no ledger (AGENTS §2)
`;

const { values: o, positionals: pos } = parseArgs({
  allowPositionals: true,
  options: {
    verify: { type: 'boolean' }, json: { type: 'boolean' }, staged: { type: 'boolean' },
    ext: { type: 'string' }, cmd: { type: 'string' }, port: { type: 'string' }, list: { type: 'boolean' }, compactou: { type: 'boolean' }, stop: { type: 'boolean' }, all: { type: 'boolean' }, harness: { type: 'string' }, model: { type: 'string' },
    scope: { type: 'string' }, type: { type: 'string' }, summary: { type: 'string' },
    refs: { type: 'string' }, ttl: { type: 'string' }, reason: { type: 'string' },
    name: { type: 'string' }, text: { type: 'string' }, base: { type: 'string' },
    event: { type: 'string' }, latest: { type: 'boolean' }, 'dry-run': { type: 'boolean' }, arquivar: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

// Fora de um repositório (ex.: gancho do harness chamado de outra pasta), vale o repositório onde este script mora;
// cada worktree tem a sua cópia, então o paralelismo continua certo.
const root = () => { try { return repoRoot(); } catch { return repoRoot(import.meta.dirname); } };
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

// Heads dos PRs abertos (para o prune nunca tocar trabalho com PR). Sem gh, vazio e avisado.
function openPrHeads(r) {
  try {
    const out = execFileSync('gh', ['pr', 'list', '--state', 'open', '--json', 'headRefName', '--limit', '200'], { cwd: r, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return new Set(JSON.parse(out).map((p) => p.headRefName));
  } catch {
    warn('gh indisponível: PRs abertos não consultados (o prune só remove o que já está mergeado)');
    return new Set();
  }
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
      // Regra do Pai (2026-10-18): servidor de conferência tem fim; a sessão não fecha com servidor dela rodando.
      const mine = serversOf(r, cur.id);
      if (mine.length) {
        for (const x of mine) console.log(`  ✖ servidor ${x.id} (${x.name}${x.port ? `, porta ${x.port}` : ''}, pid ${x.pid}) ainda rodando`);
        console.log('sessão NÃO encerrada: encerre os servidores com bd serve --stop --all (ou bd serve --stop <id>)');
        process.exitCode = 1;
        return;
      }
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

  // Contexto essencial de governança (regra do Pai, 2026-10-18): roda sozinho depois de cada compactação
  // (gancho SessionStart do Claude Code). Com --compactou, registra a compactação lida da entrada (PostCompact).
  contexto() {
    const r = root();
    if (o.compactou) {
      let input = {};
      try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* entrada vazia ou inválida */ }
      const { file } = recordCompaction(r, { trigger: input.trigger ?? 'auto', summary: String(input.compact_summary ?? '') });
      console.log(`compactação registrada: ${file}`);
      return;
    }
    console.log(governanceContext(r));
  },

  // Servidores de conferência com dono e fim (regra do Pai, 2026-10-18).
  async serve() {
    const r = root();
    const show = (x) => `${x.id} ${x.name}${x.port ? ` http://127.0.0.1:${x.port}/` : ''} (pid ${x.pid}, sessão ${x.session ?? '—'}, desde ${x.startedAt})`;
    if (o.list) {
      const all = listServers(r);
      console.log(all.length ? all.map(show).join('\n') : 'nenhum servidor de conferência rodando');
      return;
    }
    if (o.stop) {
      const stopped = stopServers(r, o.all ? { all: true } : pos[1]?.startsWith('srv-') ? { id: pos[1] } : pos[1] ? { dir: pos[1] } : { session: currentSession(r)?.id });
      console.log(stopped.length ? stopped.map((x) => `encerrado: ${show(x)}`).join('\n') : 'nada a encerrar');
      return;
    }
    const session = currentSession(r)?.id ?? null;
    const s = o.cmd ? await startServer(r, { name: o.name ?? 'cmd', ...shellCommand(o.cmd) }, { session })
      : await startServer(r, { dir: pos[1] ?? '.', ...(o.port ? { port: Number(o.port) } : {}) }, { session });
    console.log(`${s.reused ? 'reaproveitado' : 'iniciado'}: ${show(s)}`);
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

  prune() {
    const r = root();
    tryGit(r, 'fetch', '-q', '--prune', 'origin');
    const list = classifyBranches(r, { openPrHeads: openPrHeads(r), archive: new Set((o.arquivar ?? '').split(',').filter(Boolean)) });
    const report = pruneBranches(r, list, { stamp: formats().stamp, reason: `prune pelo bd (sessão ${sessionId(r)})`, dryRun: o['dry-run'] });
    const prefix = o['dry-run'] ? '(simulação) ' : '';
    for (const n of report.removed) console.log(`  ${prefix}removida: ${n}`);
    for (const a of report.archived) console.log(`  ${prefix}arquivada: ${a.name} → tag ${a.tag} (${a.sha.slice(0, 7)})`);
    for (const b of list.filter((x) => x.action === 'manter')) console.log(`  mantida: ${b.name} (${b.reason})`);
    if (!o['dry-run'] && (report.removed.length || report.archived.length) && currentSession(r)) {
      logEvent(r, { type: 'prune', summary: `${report.removed.length} removida(s), ${report.archived.length} arquivada(s)`, data: report });
    }
  },

  async merge() {
    const r = root();
    const n = pos[1];
    if (!/^\d+$/.test(n ?? '')) throw new Error('use: bd merge <número do PR>');
    const pr = JSON.parse(execFileSync('gh', ['pr', 'view', n, '--json', 'state,mergeable,mergeStateStatus,statusCheckRollup,headRefName,title'], { cwd: r, encoding: 'utf8' }));
    const notReady = mergeReadiness(pr);
    if (currentBranch(r) !== pr.headRefName) notReady.push(`a branch atual (${currentBranch(r)}) não é a do PR (${pr.headRefName}); o bd post precisa rodar nela`);
    if (!notReady.length) {
      await commands.post();
      if (failures) notReady.push('o bd post tem falhas');
    }
    if (notReady.length) {
      notReady.forEach((p) => console.log(`  ✖ ${p}`));
      process.exitCode = 1;
      return;
    }
    execFileSync('gh', ['pr', 'merge', n, '--merge', '--subject', `Merge #${n}: ${pr.title} (CI verde)`], { cwd: r, stdio: 'inherit' });
    git(r, 'checkout', '-q', 'main');
    git(r, 'pull', '-q', '--ff-only');
    if (currentSession(r)) logEvent(r, { type: 'merge', summary: `PR #${n}: ${pr.title}`, refs: [`#${n}`] });
    console.log(`mergeado: PR #${n} → main ${git(r, 'rev-parse', '--short', 'HEAD')}`);
    await commands.prune();
  },

  claims() {
    const { problems, late } = checkClaims(root(), { base: o.base ?? 'origin/main' });
    problems.forEach((p) => console.log(`  ✖ ${p}`));
    late.forEach((p) => console.log(`  ⚠ claim atrasado: ${p}`));
    if (problems.length) process.exitCode = 1;
    else console.log('documentos vivos alterados com claim no ledger');
  },

  validacoes() {
    const { problems, aguardaPai, total } = checkValidations(root());
    problems.forEach((p) => console.log(`  ✖ ${p}`));
    for (const v of aguardaPai) console.log(`  ⏳ aguarda o Pai: ${v.id} — ${v.descricao}`);
    if (problems.length) process.exitCode = 1;
    else console.log(`${total} validações registradas, mecanismos ligados`);
  },

  'ci-plan'() {
    const plan = ciPlan({ event: o.event ?? 'pull_request', changed: changedFiles(root(), o.base) });
    const lines = [`codigo=${plan.codigo}`, `matriz=${JSON.stringify(plan.matriz)}`];
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
    console.log(lines.join('\n'));
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
    // Nenhuma branch sobrevive ao merge (Pai, 2026-10-16): sessão não começa com branch para podar.
    const toPrune = classifyBranches(r, { openPrHeads: openPrHeads(r) }).filter((b) => b.action !== 'manter');
    if (toPrune.length) fail(`branches que já deviam ter saído (rode bd prune): ${toPrune.map((b) => `${b.name} [${b.reason}]`).join(', ')}`);
    else ok('nenhuma branch para podar');
    const { aguardaPai } = checkValidations(r);
    for (const v of aguardaPai) warn(`aguarda o Pai: ${v.id} — ${v.descricao}`);
    for (const x of listServers(r)) warn(`servidor de conferência rodando: ${x.id} ${x.name}${x.port ? ` porta ${x.port}` : ''} (sessão ${x.session ?? '—'}); reaproveite ou encerre com bd serve --stop`);
    if (failures) process.exitCode = 1;
  },

  async post() {
    const r = root();
    console.log('DEPOIS');
    await clockCheck();
    const problems = namesProblems(r);
    if (problems.length) fail(`nomes fora da convenção:\n    ${problems.join('\n    ')}`);
    else ok('nomes na convenção');
    for (const x of listServers(r)) warn(`servidor de conferência rodando: ${x.id} ${x.name}${x.port ? ` porta ${x.port}` : ''} (sessão ${x.session ?? '—'}); encerre ao terminar (bd serve --stop)`);
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
    const cl = checkClaims(r, { base: o.base ?? 'origin/main' });
    if (cl.problems.length) fail(`documento vivo sem claim (AGENTS §2; bd claim <arquivo> antes de editar):\n    ${cl.problems.join('\n    ')}`);
    else ok('documentos vivos com claim');
    cl.late.forEach((p) => warn(`claim atrasado: ${p}`));
    const val = checkValidations(r);
    if (val.problems.length) fail(`registro de validações com problema (docs/30-governanca/VALIDACOES.md):\n    ${val.problems.join('\n    ')}`);
    else ok(`${val.total} validações com mecanismo ligado`);
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
