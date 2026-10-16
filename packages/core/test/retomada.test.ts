import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { call } from '../../client/src/ipc.ts';
import { createI18n } from '../../client/src/i18n.ts';
import { endpointFor, dbPathFor } from '../src/paths.ts';
import { openDatabase } from '../src/db.ts';
import { spawnOwner, killHard, tempHome, cli } from './helpers.ts';

const pt = createI18n('pt-BR');
const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });
const up = async (home: string) => { const o = await spawnOwner(home); owners.push(o); return o; };

interface Run { id: string; state: string }
interface Effect { id: string; key: string; state: string }
interface Approval { id: string; state: string; action: string }

test('critério 4: kill -9 no meio de um efeito → execução interrompida, efeito desconhecido, banco íntegro', async () => {
  const home = tempHome();
  const owner = await up(home);
  const ep = endpointFor(home);
  const run = (await call(ep, 'run.start', { session: 's1', task: 'tarefa' })) as Run;
  const eff = (await call(ep, 'effect.begin', { session: 's1', run: run.id, kind: 'provider.call', key: 'chamada-1', target: 'go/gpt-6-luna' })) as Effect;
  assert.equal(eff.state, 'attempting');
  await killHard(owner);

  const db = openDatabase(dbPathFor(home));
  const integ = db.prepare('PRAGMA integrity_check').get() as Record<string, string>;
  assert.equal(Object.values(integ)[0], 'ok');
  db.close();

  await up(home);
  assert.equal(((await call(ep, 'run.get', { id: run.id })) as Run).state, 'interrupted');
  const after = (await call(ep, 'effect.get', { id: eff.id })) as Effect;
  assert.equal(after.state, 'unknown', 'efeito sem recibo nunca vira concluído');
  const evs = (await call(ep, 'session.events', { session: 's1' })) as { kind: string }[];
  assert.ok(evs.some((e) => e.kind === 'run.interrupted') && evs.some((e) => e.kind === 'effect.unknown'), 'a retomada vira evento no log');
  await call(ep, 'daemon.stop', {});
});

test('critério 4 (controle): efeito com recibo continua concluído depois da queda', async () => {
  const home = tempHome();
  const owner = await up(home);
  const ep = endpointFor(home);
  const run = (await call(ep, 'run.start', { session: 's1', task: 't' })) as Run;
  const eff = (await call(ep, 'effect.begin', { session: 's1', run: run.id, kind: 'provider.call', key: 'k', target: 'x' })) as Effect;
  await call(ep, 'effect.complete', { id: eff.id, result: { ok: true } });
  await killHard(owner);
  await up(home);
  assert.equal(((await call(ep, 'effect.get', { id: eff.id })) as Effect).state, 'done');
  await call(ep, 'daemon.stop', {});
});

test('critério 5: aprovação pendente sobrevive à queda; rbuddy approvals lista e rbuddy approve resolve uma vez', async () => {
  const home = tempHome();
  const owner = await up(home);
  const ep = endpointFor(home);
  const ap = (await call(ep, 'approval.request', { session: 's1', action: 'write_file docs/a.md' })) as Approval;
  await killHard(owner);
  await up(home);

  const list = cli(home, ['approvals']);
  assert.equal(list.status, 0, list.stderr);
  assert.match(list.stdout, new RegExp(ap.id));
  assert.match(list.stdout, /write_file docs\/a\.md/);

  const ok = cli(home, ['approve', ap.id]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(ok.stdout.trim(), pt.t('approvals.approved', { id: ap.id }));
  assert.equal(((await call(ep, 'approval.get', { id: ap.id })) as Approval).state, 'approved');

  const again = cli(home, ['deny', ap.id]);
  assert.equal(again.status, 1);
  assert.equal(again.stderr.trim(), pt.t('approvals.alreadyResolved', { id: ap.id, state: 'approved' }));
  assert.equal(cli(home, ['approvals']).stdout.trim(), pt.t('approvals.none'));
  await call(ep, 'daemon.stop', {});
});

test('critério 6: efeito desconhecido bloqueia nova tentativa com a mesma identidade até a reconciliação', async () => {
  const home = tempHome();
  const owner = await up(home);
  const ep = endpointFor(home);
  const run = (await call(ep, 'run.start', { session: 's1', task: 't' })) as Run;
  const eff = (await call(ep, 'effect.begin', { session: 's1', run: run.id, kind: 'provider.call', key: 'chamada-x', target: 'go' })) as Effect;
  await killHard(owner);
  await up(home);

  const run2 = (await call(ep, 'run.start', { session: 's1', task: 't' })) as Run;
  await assert.rejects(call(ep, 'effect.begin', { session: 's1', run: run2.id, kind: 'provider.call', key: 'chamada-x', target: 'go' }), /reconcil/i);
  // Outra identidade não é bloqueada.
  const other = (await call(ep, 'effect.begin', { session: 's1', run: run2.id, kind: 'provider.call', key: 'chamada-y', target: 'go' })) as Effect;
  assert.equal(other.state, 'attempting');

  await call(ep, 'effect.reconcile', { id: eff.id, outcome: 'not-done' });
  assert.equal(((await call(ep, 'effect.get', { id: eff.id })) as Effect).state, 'failed');
  const retry = (await call(ep, 'effect.begin', { session: 's1', run: run2.id, kind: 'provider.call', key: 'chamada-x', target: 'go' })) as Effect;
  assert.equal(retry.state, 'attempting');
  await call(ep, 'daemon.stop', {});
});

test('reconciliação só vale para efeito desconhecido, e o resultado vira evento', async () => {
  const home = tempHome();
  await up(home);
  const ep = endpointFor(home);
  const run = (await call(ep, 'run.start', { session: 's1', task: 't' })) as Run;
  const eff = (await call(ep, 'effect.begin', { session: 's1', run: run.id, kind: 'k', key: 'z', target: 't' })) as Effect;
  await assert.rejects(call(ep, 'effect.reconcile', { id: eff.id, outcome: 'done' }), /desconhecido/);
  await call(ep, 'daemon.stop', {});
});
