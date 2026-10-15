import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { indexGaps, staleProposals, stampProblems, statusMainLag } from '../lib/surfaces.mjs';

function repo(files) {
  const r = mkdtempSync(join(tmpdir(), 'buddy-surf-'));
  execFileSync('git', ['init', '-q', '-b', 'main', r]);
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(dirname(join(r, p)), { recursive: true });
    writeFileSync(join(r, p), c);
  }
  return r;
}
function commit(r, iso, msg = 'c', merge = false) {
  execFileSync('git', ['add', '-A'], { cwd: r });
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', msg], {
    cwd: r, env: { ...process.env, GIT_AUTHOR_DATE: iso, GIT_COMMITTER_DATE: iso },
  });
  return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: r, encoding: 'utf8' }).trim();
}

test('índices: ficha, ADR (com estado), SPEC e revisão de pesquisa fora do índice são lacunas', () => {
  const r = repo({
    'docs/20-conhecimento/README.md': '[a.md](./a.md)',
    'docs/20-conhecimento/a.md': 'x',
    'docs/20-conhecimento/b.md': 'x',
    'docs/60-decisoes/README.md': '| [0001](./0001-x.md) | X | aceita |\n| [0002](./0002-y.md) | Y | proposta |',
    'docs/60-decisoes/0001-x.md': '---\nstatus: aceita\n---',
    'docs/60-decisoes/0002-y.md': '---\nstatus: aceita (2026-10-15)\n---',
    'docs/60-decisoes/0003-z.md': '---\nstatus: proposta\n---',
    'docs/40-specs/README.md': 'Ainda não há SPECs.',
    'docs/40-specs/0001-nucleo/SPEC.md': 'x',
  });
  const g = indexGaps(r).join('\n');
  assert.match(g, /b\.md.*fora do índice/);
  assert.doesNotMatch(g, /\ba\.md/);
  assert.match(g, /0002.*índice diz "proposta".*ADR diz "aceita"/);
  assert.match(g, /0003-z\.md.*fora do índice/);
  assert.match(g, /0001-nucleo.*fora do índice/);
});

test('ADR aceita citada como proposta em documento vivo é lacuna; registros e diário não contam', () => {
  const r = repo({
    'docs/60-decisoes/0013-m.md': '---\nstatus: aceita (2026-10-15)\n---',
    'docs/50-planos/ROADMAP.md': 'Web UI (stack: ADR 0013, proposta)',
    '.buddy-dev/STATUS.md': '[ADR 0013](x) proposta: Expo',
    'docs/registros/2026-10-15T010101-0300-x.md': 'ADR 0013 proposta',
    '.buddy-dev/diario/2026-10-15.md': 'ADR 0013 (proposta)',
  });
  const g = staleProposals(r);
  assert.equal(g.length, 2);
  assert.match(g.join('\n'), /ROADMAP\.md/);
  assert.match(g.join('\n'), /STATUS\.md/);
});

test('carimbo "Atualizado em" atrás do último commit do arquivo, ou no futuro, é lacuna', () => {
  const r = repo({
    'docs/50-planos/ROADMAP.md': '**Atualizado em:** 2026-10-14T12:10:00-03:00',
    'docs/50-planos/PLANO-MACRO.md': '**Atualizado em:** 2026-10-15T03:50:00-03:00',
    '.buddy-dev/STATUS.md': '**Atualizado em:** 2026-10-15T09:00:00-03:00',
  });
  commit(r, '2026-10-15T04:00:00-03:00');
  const g = stampProblems(r, { now: new Date('2026-10-15T04:05:00-03:00') }).join('\n');
  assert.match(g, /ROADMAP\.md.*desatualizado/);
  assert.doesNotMatch(g, /PLANO-MACRO/);
  assert.match(g, /STATUS\.md.*no futuro/);
});

test('STATUS com a main mais de um merge atrás da base é lacuna', () => {
  const r = repo({ 'a.txt': '1' });
  const m0 = commit(r, '2026-10-15T01:00:00-03:00');
  const m1 = commit(r, '2026-10-15T02:00:00-03:00');
  commit(r, '2026-10-15T03:00:00-03:00');
  const lag = (h) => statusMainLag(r, { statusText: `| \`main\` | \`${h}\` (Merge) |`, base: 'HEAD' });
  assert.equal(lag(m1).problem, null);
  assert.match(lag(m0).problem, /2 commit\(s\) de primeiro pai atrás/);
  assert.match(lag('deadbee').problem, /não existe/);
});
