// Barramento com ledger para sessões paralelas (mesmo harness ou harnesses diferentes).
//
// Duas camadas, de propósito:
// - Ledger (versionado): .buddy-dev/bus/ledger/AAAA/MM/DD/<carimbo>-<sessao>-<seq>-<tipo>.json
//   Um arquivo por evento, nunca editado: ramos paralelos se integram sem conflito,
//   e cada evento guarda a própria origem (quem commitou não é necessariamente quem agiu).
// - Estado vivo (local, fora do git): <git-common-dir>/buddy-bus/
//   Sessões abertas e claims. É comum a todos os worktrees da máquina; não atravessa hosts.
//
// Limite declarado: claims coordenam worktrees na mesma máquina. Entre hosts, a
// coordenação é eventual, pelo ledger publicado via push.

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, renameSync, unlinkSync, openSync, closeSync, writeSync } from 'node:fs';
import { join } from 'node:path';
import { hostname } from 'node:os';
import { randomBytes } from 'node:crypto';
import { formats } from './time.mjs';
import { slug } from './names.mjs';
import { commonDir, gitDir, currentBranch } from './git.mjs';

function live(root) {
  const base = join(commonDir(root), 'buddy-bus');
  for (const d of ['sessions', 'sessions-ended', 'claims']) mkdirSync(join(base, d), { recursive: true });
  return base;
}

const pointerPath = (root) => join(gitDir(root), 'buddy-current-session');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + '\n');

export function currentSession(root) {
  const ptr = pointerPath(root);
  if (!existsSync(ptr)) return null;
  const file = join(live(root), 'sessions', readFileSync(ptr, 'utf8').trim() + '.json');
  return existsSync(file) ? readJson(file) : null;
}

// A sessão aberta deste worktree ou, se não houver, a última encerrada nele.
export function lastSession(root) {
  const cur = currentSession(root);
  if (cur) return cur;
  const dir = join(live(root), 'sessions-ended');
  const mine = readdirSync(dir).filter((n) => n.endsWith('.json')).map((n) => readJson(join(dir, n)))
    .filter((s) => s.worktree === root);
  return mine.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt)).at(-1) ?? null;
}

function requireSession(root) {
  const s = currentSession(root);
  if (!s) throw new Error('nenhuma sessão aberta neste worktree: rode `bd session start` antes');
  return s;
}

function writeEvent(root, session, { type, summary, refs = [], data = {} }, date) {
  const f = formats(date);
  session.lastSeq += 1;
  session.lastActivity = f.iso;
  writeJson(join(live(root), 'sessions', session.id + '.json'), session);
  const seq = String(session.lastSeq).padStart(4, '0');
  const dir = join(root, '.buddy-dev/bus/ledger', f.datePath);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${f.stamp}-${session.id}-${seq}-${slug(type)}.json`);
  const event = {
    v: 1,
    id: `${f.stamp}-${session.id}-${seq}`,
    ts: f.iso,
    utc: f.utc,
    session: session.id,
    seq: session.lastSeq,
    harness: session.harness,
    model: session.model,
    host: session.host,
    branch: currentBranch(root),
    type: slug(type),
    summary,
    refs,
    data,
  };
  writeJson(file, event);
  return { file, event };
}

export function startSession(root, { harness, model, scope, now = () => new Date() }) {
  if (!harness || !model || !scope) throw new Error('informe --harness, --model e --scope');
  const existing = currentSession(root);
  if (existing) throw new Error(`já existe sessão aberta neste worktree: ${existing.id}`);
  const date = now();
  const session = {
    id: `${slug(harness)}-${randomBytes(3).toString('hex')}`,
    harness,
    model,
    scope,
    host: hostname(),
    worktree: root,
    startedAt: formats(date).iso,
    lastSeq: 0,
  };
  writeEvent(root, session, { type: 'session-start', summary: scope }, date);
  writeFileSync(pointerPath(root), session.id + '\n');
  return session;
}

export function logEvent(root, { type, summary, refs, data, now = () => new Date() }) {
  if (!type || !summary) throw new Error('informe --type e --summary');
  return writeEvent(root, requireSession(root), { type, summary, refs, data }, now());
}

export function endSession(root, { summary = 'sessão encerrada', now = () => new Date() } = {}) {
  const s = requireSession(root);
  const date = now();
  for (const c of status(root, { now }).claims.filter((c) => c.session === s.id)) release(root, c.resource, { now });
  const out = writeEvent(root, s, { type: 'session-end', summary }, date);
  const base = live(root);
  renameSync(join(base, 'sessions', s.id + '.json'), join(base, 'sessions-ended', s.id + '.json'));
  unlinkSync(pointerPath(root));
  return out;
}

export function status(root, { now = () => new Date() } = {}) {
  const base = live(root);
  const t = now().getTime();
  const read = (d) => readdirSync(join(base, d)).filter((n) => n.endsWith('.json')).map((n) => readJson(join(base, d, n)));
  return {
    sessions: read('sessions'),
    claims: read('claims').map((c) => ({ ...c, expired: new Date(c.expiresUtc).getTime() <= t })),
  };
}

export function claim(root, resource, { ttlMin = 30, now = () => new Date() } = {}) {
  const s = requireSession(root);
  const date = now();
  const file = join(live(root), 'claims', slug(resource) + '.json');
  const record = {
    resource,
    session: s.id,
    claimedAt: formats(date).iso,
    expiresUtc: new Date(date.getTime() + ttlMin * 60_000).toISOString(),
  };
  let tookOverFrom = null;
  if (existsSync(file)) {
    const cur = readJson(file);
    const expired = new Date(cur.expiresUtc).getTime() <= date.getTime();
    if (cur.session !== s.id && !expired) {
      throw new Error(`recurso "${resource}" reivindicado por ${cur.session} até ${cur.expiresUtc}`);
    }
    if (cur.session !== s.id) tookOverFrom = cur.session;
    unlinkSync(file);
  }
  // Criação exclusiva ('wx'): se duas sessões disputarem o mesmo instante, só uma vence.
  const fd = openSync(file, 'wx');
  writeSync(fd, JSON.stringify(record, null, 2) + '\n');
  closeSync(fd);
  writeEvent(root, s, {
    type: tookOverFrom ? 'claim-takeover' : 'claim',
    summary: resource,
    data: { expiresUtc: record.expiresUtc, tookOverFrom },
  }, date);
  return { ...record, tookOverFrom };
}

export function release(root, resource, { now = () => new Date() } = {}) {
  const s = requireSession(root);
  const file = join(live(root), 'claims', slug(resource) + '.json');
  if (!existsSync(file)) throw new Error(`não há claim para "${resource}"`);
  const cur = readJson(file);
  if (cur.session !== s.id) throw new Error(`claim de "${resource}" não pertence a ${s.id} (dono: ${cur.session})`);
  unlinkSync(file);
  return writeEvent(root, s, { type: 'release', summary: resource }, now());
}
