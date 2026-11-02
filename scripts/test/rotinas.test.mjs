// Rotinas agendadas do GitHub (CI completa e dependências, toda segunda): a última execução de cada uma aparece no
// início da sessão. Achado de 2026-11-02: a CI semanal falhou em 26/10 (brecha da rede contida no macOS) e ninguém
// viu por uma semana, porque nada mostrava o resultado das rotinas a quem trabalha no repositório.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scheduledVerdicts } from '../lib/rotinas.mjs';

const run = (workflowName, conclusion, createdAt, event = 'schedule') => ({ workflowName, event, status: 'completed', conclusion, createdAt });

test('a última execução agendada de cada rotina decide; falha vira aviso com a data', () => {
  const v = scheduledVerdicts([
    run('CI', 'failure', '2026-11-02T22:02:16Z'),
    run('CI', 'success', '2026-10-19T13:00:00Z'),
    run('Dependências (rotina semanal)', 'success', '2026-11-02T21:10:29Z'),
    run('CI', 'success', '2026-11-02T23:00:00Z', 'pull_request'),
  ]);
  assert.deepEqual(v.map((x) => [x.workflow, x.ok]), [['CI', false], ['Dependências (rotina semanal)', true]]);
  assert.match(v[0].text, /CI.*falhou.*2026-11-02/);
});

test('execução de PR ou manual não conta como rotina; sem rotina, nada a dizer', () => {
  assert.deepEqual(scheduledVerdicts([run('CI', 'failure', '2026-11-02T22:00:00Z', 'workflow_dispatch')]), []);
  assert.deepEqual(scheduledVerdicts([]), []);
});

test('rotina ainda rodando não é falha', () => {
  const v = scheduledVerdicts([{ workflowName: 'CI', event: 'schedule', status: 'in_progress', conclusion: '', createdAt: '2026-11-02T22:00:00Z' }]);
  assert.equal(v[0].ok, true);
  assert.match(v[0].text, /rodando/);
});
