import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../src/db.ts';
import { EventLog } from '../src/log.ts';

const fresh = () => new EventLog(openDatabase(join(mkdtempSync(join(tmpdir(), 'rbuddy-log-')), 'nucleo.db')));

test('sequência por sessão começa em 1 e é contígua', () => {
  const log = fresh();
  const a = [log.append('s1', 'session.started', {}), log.append('s1', 'step', { n: 1 }), log.append('s2', 'session.started', {})];
  assert.deepEqual(a.map((e) => [e.session, e.seq]), [['s1', 1], ['s1', 2], ['s2', 1]]);
  assert.deepEqual(log.events('s1').map((e) => e.seq), [1, 2]);
  assert.deepEqual(log.events('s1')[1]?.payload, { n: 1 });
});

test('projeção de sessões acompanha o log na mesma transação', () => {
  const log = fresh();
  log.append('s1', 'session.started', {});
  log.append('s1', 'step', {});
  const p = log.sessions();
  assert.equal(p.length, 1);
  assert.deepEqual({ id: p[0]?.id, lastSeq: p[0]?.lastSeq, lastKind: p[0]?.lastKind, eventCount: p[0]?.eventCount }, { id: 's1', lastSeq: 2, lastKind: 'step', eventCount: 2 });
});

test('critério 3: projeções apagadas e reconstruídas do log ficam idênticas (hash)', () => {
  const log = fresh();
  // 200 eventos variados, com os eventos de domínio bem formados (o log recusa os malformados).
  for (let i = 0; i < 200; i++) {
    const s = `s${i % 7}`;
    switch (i % 6) {
      case 0: log.append(s, 'run.started', { run: `run-${i}`, task: `tarefa ${i}` }); break;
      case 1: log.append(s, 'effect.intent', { effect: `eff-${i}`, run: `run-${i - 1}`, kind: 'provider.call', key: `k-${i}`, target: 'go' }); break;
      case 2: log.append(s, 'effect.receipt', { effect: `eff-${i - 1}`, result: { ok: true } }); break;
      case 3: log.append(s, 'approval.requested', { approval: `ap-${i}`, action: `write_file ${i}` }); break;
      case 4: log.append(s, 'approval.resolved', { approval: `ap-${i - 1}`, decision: 'approve' }); break;
      default: log.append(s, 'step', { i, texto: 'ação ' + i });
    }
  }
  const before = log.projectionHash();
  log.dropProjections();
  assert.notEqual(log.projectionHash(), before, 'projeções apagadas deveriam mudar o hash');
  log.rebuildProjections();
  assert.equal(log.projectionHash(), before);
});

test('evento de domínio malformado é recusado e não entra no log', () => {
  const log = fresh();
  assert.throws(() => log.append('s1', 'approval.requested', { action: 'x' }), /malformado.*approval/);
  assert.throws(() => log.append('s1', 'effect.intent', { effect: 'e1' }), /malformado/);
  assert.equal(log.totalEvents(), 0);
});

test('evento com sequência repetida é recusado pelo banco (UNIQUE session, seq)', () => {
  const log = fresh();
  log.append('s1', 'step', {});
  assert.throws(() => log.insertRaw('s1', 1, 'step', {}), /UNIQUE/);
});
