import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZONE, formats, isKnownZone, verifyClock } from '../lib/time.mjs';

const T = new Date('2026-10-14T13:17:33Z');

test('Curitiba usa a zona IANA America/Sao_Paulo', () => {
  assert.equal(ZONE, 'America/Sao_Paulo');
  assert.equal(isKnownZone(ZONE), true);
  assert.equal(isKnownZone('Marte/Olympus'), false);
});

test('formatos canônicos com offset explícito', () => {
  const f = formats(T);
  assert.equal(f.iso, '2026-10-14T10:17:33-03:00');
  assert.equal(f.stamp, '2026-10-14T101733-0300');
  assert.equal(f.date, '2026-10-14');
  assert.equal(f.datePath, '2026/10/14');
  assert.equal(f.utc, '2026-10-14T13:17:33.000Z');
  assert.match(f.human, /2026/);
});

test('usa o tzdata, não offset fixo (horário de verão de 2018 era -02:00)', () => {
  assert.equal(formats(new Date('2018-12-01T12:00:00Z')).iso, '2018-12-01T10:00:00-02:00');
});

test('zona UTC vira +00:00, nunca hora nua', () => {
  assert.equal(formats(T, 'UTC').iso, '2026-10-14T13:17:33+00:00');
  assert.equal(formats(T, 'UTC').stamp, '2026-10-14T131733+0000');
});

test('verifyClock mede o desvio contra o cabeçalho Date', async () => {
  const fakeFetch = async () => ({ headers: new Map([['date', 'Wed, 14 Oct 2026 13:17:00 GMT']]) });
  const ok = await verifyClock({ fetchImpl: fakeFetch, now: () => new Date('2026-10-14T13:17:30Z') });
  assert.equal(ok.state, 'ok');
  assert.equal(ok.driftSec, 30);
  const off = await verifyClock({ fetchImpl: fakeFetch, now: () => new Date('2026-10-14T13:27:00Z') });
  assert.equal(off.state, 'drift');
});

test('verifyClock degrada com honestidade quando não há rede', async () => {
  const r = await verifyClock({ fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(r.state, 'unverified');
  assert.match(r.reason, /offline/);
});
