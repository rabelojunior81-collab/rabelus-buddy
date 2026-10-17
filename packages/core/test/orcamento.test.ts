import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { openDatabase } from '../src/db.ts';
import { EventLog } from '../src/log.ts';
import { Budget, BudgetError, costOf, defaultWindows, type WindowDef } from '../src/budget.ts';
import { PRICES } from '../src/prices.ts';
import { call } from '../../client/src/ipc.ts';
import { createI18n } from '../../client/src/i18n.ts';
import { endpointFor } from '../src/paths.ts';
import { spawnOwner, killHard, tempHome, cli } from './helpers.ts';

const HOUR = 3_600_000;
const T0 = new Date('2026-10-16T12:00:00Z').getTime();
const owners: ChildProcess[] = [];
after(async () => { for (const o of owners) await killHard(o); });

function budget(windows: WindowDef[], now = () => T0) {
  const log = new EventLog(openDatabase(join(mkdtempSync(join(tmpdir(), 'rbuddy-orc-')), 'nucleo.db')));
  return { log, b: new Budget(log, { windows, now }) };
}
const usage = { input_tokens: 120_000, cached_tokens: 80_000, cache_write_tokens: 10_000, output_tokens: 3_000 };

test('fórmula de custo com os campos verificados de usage (ficha bibliotecas-do-nucleo; preços da ficha precos-llm)', () => {
  const p = PRICES['gpt-6-luna'];
  assert.ok(p);
  // (120k − 80k − 10k) × 0,10 + 80k × 0,01 + 10k × 0,125 + 3k × 0,50, por milhão
  const expected = (30_000 * 0.10 + 80_000 * 0.01 + 10_000 * 0.125 + 3_000 * 0.50) / 1e6;
  assert.equal(costOf(usage, p).toFixed(9), expected.toFixed(9));
});

test('janelas padrão: Go por modelo (5 h = 20%, semana = 50%, mês = 100%), OpenRouter com US$ 20 no mês', () => {
  const w = defaultWindows();
  const go = w.filter((x) => x.provider === 'opencode-go' && x.model === 'gpt-6-luna');
  assert.deepEqual(go.map((x) => [x.periodHours, x.capacity]).sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0)), [[5, 3], [168, 7.5], [720, 15]]);
  const or = w.find((x) => x.provider === 'openrouter');
  assert.deepEqual([or?.capacity, or?.periodHours], [20, 720]);
});

test('critério 15: liquidação pelo usage real; consumo da janela = soma das liquidações = fórmula', () => {
  const { b } = budget([{ id: 'w', provider: 'p', model: null, capacity: 10, periodHours: 720 }]);
  const r1 = b.reserve('s1', { provider: 'p', model: 'gpt-6-luna', estimateUsd: 0.5 });
  const r2 = b.reserve('s2', { provider: 'p', model: 'gpt-6-luna', estimateUsd: 0.5 });
  assert.equal(b.used('w'), 1.0, 'reservas pendentes contam pela estimativa');
  const a1 = b.settle(r1, usage);
  const a2 = b.settle(r2, { input_tokens: 1000, cached_tokens: 0, cache_write_tokens: 0, output_tokens: 1000 });
  const p = PRICES['gpt-6-luna'];
  assert.ok(p);
  assert.equal(a1.toFixed(9), costOf(usage, p).toFixed(9));
  assert.equal(b.used('w').toFixed(9), (a1 + a2).toFixed(9));
});

test('reserva liberada sem custo quando a chamada falha antes de consumir', () => {
  const { b } = budget([{ id: 'w', provider: 'p', model: null, capacity: 1, periodHours: 5 }]);
  const r = b.reserve('s1', { provider: 'p', model: 'gpt-6-luna', estimateUsd: 0.9 });
  b.release(r, 'erro antes da chamada');
  assert.equal(b.used('w'), 0);
  b.reserve('s1', { provider: 'p', model: 'gpt-6-luna', estimateUsd: 0.9 });
});

test('janela móvel: consumo de mais de 5 h atrás sai da janela de 5 h, mas conta na de 7 dias', () => {
  let now = T0;
  const { b } = budget([
    { id: 'h5', provider: 'p', model: null, capacity: 1, periodHours: 5 },
    { id: 'd7', provider: 'p', model: null, capacity: 10, periodHours: 168 },
  ], () => now);
  const r = b.reserve('s1', { provider: 'p', model: 'gpt-6-luna', estimateUsd: 0.8 });
  b.settle(r, usage);
  const spent = b.used('h5');
  now = T0 + 6 * HOUR;
  assert.equal(b.used('h5'), 0);
  assert.equal(b.used('d7').toFixed(9), spent.toFixed(9));
});

test('critério 16: janela esgotada (pela conta ou pelo provedor) barra a reserva; OpenRouter nunca passa de US$ 20 no mês', () => {
  const { b } = budget(defaultWindows());
  b.markExhausted('opencode-go', 'gpt-6-luna', T0 + 2 * HOUR, 'HTTP 429 do provedor');
  assert.throws(() => b.reserve('s1', { provider: 'opencode-go', model: 'gpt-6-luna', estimateUsd: 0.01 }), (e: unknown) => e instanceof BudgetError && e.reason === 'windowExhausted');
  const r = b.reserve('s1', { provider: 'openrouter', model: 'x', estimateUsd: 19.5 });
  b.settle(r, null, 19.5);
  assert.throws(() => b.reserve('s1', { provider: 'openrouter', model: 'x', estimateUsd: 0.6 }), (e: unknown) => e instanceof BudgetError && e.reason === 'capReached');
  b.reserve('s1', { provider: 'openrouter', model: 'x', estimateUsd: 0.4 });
});

test('critério 14: N sessões simultâneas pelo dono com saldo para uma chamada só → exatamente uma reserva', async () => {
  const home = tempHome();
  writeFileSync(join(home, 'budget.json'), JSON.stringify({ windows: [{ id: 'unica', provider: 'p', model: null, capacity: 1, periodHours: 5 }] }));
  owners.push(await spawnOwner(home));
  const ep = endpointFor(home);
  const results = await Promise.allSettled(Array.from({ length: 12 }, (_, i) => call(ep, 'budget.reserve', { session: `s${i}`, provider: 'p', model: 'gpt-6-luna', estimateUsd: 0.6 })));
  const ok = results.filter((r) => r.status === 'fulfilled');
  assert.equal(ok.length, 1);
  assert.ok(results.filter((r) => r.status === 'rejected').every((r) => /capReached/.test(String((r as PromiseRejectedResult).reason?.data?.reason))));
  const st = (await call(ep, 'budget.status', {})) as { id: string; used: number }[];
  assert.equal(st.find((w) => w.id === 'unica')?.used, 0.6, 'as recusadas não consumiram nada');
  await call(ep, 'daemon.stop', {});
});

test('rbuddy budget mostra cada janela pelo catálogo', async () => {
  const home = tempHome();
  writeFileSync(join(home, 'budget.json'), JSON.stringify({ windows: [{ id: 'go/gpt-6-luna/5h', provider: 'opencode-go', model: 'gpt-6-luna', capacity: 3, periodHours: 5 }] }));
  owners.push(await spawnOwner(home));
  const r = cli(home, ['budget']);
  assert.equal(r.status, 0, r.stderr);
  const pt = createI18n('pt-BR');
  assert.match(r.stdout, new RegExp(pt.t('budget.header').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(r.stdout, /go\/gpt-6-luna\/5h/);
  await call(endpointFor(home), 'daemon.stop', {});
});

test('todo modelo com janela do Go tem preço na tabela (sem preço, a janela nunca contaria o consumo)', () => {
  const goModels = [...new Set(defaultWindows().filter((w) => w.provider === 'opencode-go').map((w) => w.model!))];
  assert.ok(goModels.length >= 8);
  assert.deepEqual(goModels.filter((m) => !PRICES[m]), []);
  // Valores da página oficial do Go (ficha precos-llm, 2026-10-16), por milhão de tokens.
  assert.deepEqual(PRICES['kimi-k3'], { input: 3.0, cachedInput: 0.3, cacheWrite: 3.0, output: 15.0 });
  assert.deepEqual(PRICES['deepseek-v4.1-flash'], { input: 0.3, cachedInput: 0.006, cacheWrite: 0.3, output: 1.2 });
});
