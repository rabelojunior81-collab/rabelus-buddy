// Regra do Pai (2026-10-18): a compactação de contexto não pode quebrar o mecanismo. Depois de compactar, o
// harness recebe o contexto ESSENCIAL de governança (bd contexto), e a compactação fica registrada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { startSession, logEvent, claim } from '../lib/bus.mjs';
import { startServer, stopServers } from '../lib/servers.mjs';
import { governanceContext, recordCompaction } from '../lib/contexto.mjs';

function repo() {
  const r = mkdtempSync(join(tmpdir(), 'buddy-ctx-'));
  execFileSync('git', ['init', '-q', '-b', 'main', r]);
  execFileSync('git', ['-C', r, 'checkout', '-q', '-b', 'feat/m9-1-coisa']);
  mkdirSync(join(r, '.buddy-dev'), { recursive: true });
  writeFileSync(join(r, '.buddy-dev/STATUS.md'), '# Estado\n\n**M8 concluído.** **Agora: M9 em execução**: o passo M9.0 está feito e segue o M9.1.\n\n| Item | Estado |\n');
  mkdirSync(join(r, 'docs/50-planos/m9'), { recursive: true });
  writeFileSync(join(r, 'docs/50-planos/m9/PLANO.md'), '# Plano M9\n\n**Estado:** em execução\n\n- [x] **M9.0 Fundação**\n- [ ] **M9.1 Próximo passo de verdade**\n- [ ] **M9.2 Depois**\n');
  return r;
}

test('bd contexto: sessão, escopo, branch, claims, servidores, próximo passo, últimos registros e o que não fazer, abaixo de 10 mil caracteres', async () => {
  const r = repo();
  const s = startSession(r, { harness: 'Claude Code', model: 'm', scope: 'M9.1: fazer a coisa certa' });
  logEvent(r, { type: 'decisao', summary: 'Pai decidiu o caminho B' });
  logEvent(r, { type: 'erro', summary: 'esqueci o claim do README' });
  claim(r, 'docs/50-planos/m9/PLANO.md');
  const srv = await startServer(r, { name: 'ensaio', cmd: process.execPath, args: ['-e', 'setInterval(() => {}, 1000)'] }, { session: s.id });
  try {
    const t = governanceContext(r);
    for (const want of [s.id, 'M9.1: fazer a coisa certa', 'feat/m9-1-coisa', 'docs/50-planos/m9/PLANO.md', 'ensaio', 'M9.1 Próximo passo de verdade', 'Agora: M9 em execução', 'Pai decidiu o caminho B', 'esqueci o claim do README', 'NÃO FAZER', 'bd session start', 'MEMORY.md']) {
      assert.ok(t.includes(want), `falta no contexto: ${want}`);
    }
    assert.ok(!t.includes('M9.0 Fundação'), 'o próximo passo é o primeiro não feito');
    assert.ok(t.length < 10_000, `contexto grande demais: ${t.length}`);
  } finally {
    stopServers(r, { all: true });
  }
  assert.ok(srv.pid);
});

// Achado no primeiro uso real (2026-10-18): o STATUS guardava um parágrafo antigo com "Agora: M0 em execução".
test('bd contexto usa o "Agora" mais recente do STATUS, não um parágrafo antigo esquecido', () => {
  const r = repo();
  writeFileSync(join(r, '.buddy-dev/STATUS.md'), '# Estado\n\n## Fase atual\n\n**Histórico:** **Agora: M7 em execução.** coisa velha.\n\n**M8 concluído.** **Agora: M9 em execução**: segue o M9.1.\n\n## Repositório\n');
  const t = governanceContext(r);
  assert.match(t, /Agora: M9 em execução/);
  assert.doesNotMatch(t, /M7 em execução/);
});

test('bd contexto sem sessão aberta manda abrir uma antes de agir', () => {
  const r = repo();
  assert.match(governanceContext(r), /sem sessão aberta/);
});

test('compactação registrada: resumo guardado fora do repositório; no ledger, só o fato e o tamanho', () => {
  const r = repo();
  startSession(r, { harness: 'Claude Code', model: 'm', scope: 'x' });
  const out = recordCompaction(r, { trigger: 'auto', summary: 'Resumo da conversa com dado sensível rabelo@exemplo.com' });
  assert.ok(existsSync(out.file));
  assert.ok(!out.file.startsWith(join(r, '.buddy-dev')), 'o resumo não vai para o repositório');
  assert.match(readFileSync(out.file, 'utf8'), /Resumo da conversa/);
  const ledger = join(r, '.buddy-dev/bus/ledger');
  const files = readdirSync(ledger, { recursive: true }).filter((f) => String(f).endsWith('compactacao.json'));
  assert.equal(files.length, 1);
  const ev = JSON.parse(readFileSync(join(ledger, String(files[0])), 'utf8'));
  assert.equal(ev.type, 'compactacao');
  assert.doesNotMatch(JSON.stringify(ev), /rabelo@exemplo\.com|Resumo da conversa/);
  assert.equal(ev.data.trigger, 'auto');
  assert.equal(ev.data.chars, 'Resumo da conversa com dado sensível rabelo@exemplo.com'.length);
});
