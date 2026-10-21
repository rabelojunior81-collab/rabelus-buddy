// Voz do Buddy (produto): a instrução de sistema mora no catálogo de idiomas (pt-BR e en), diz quem ele é, a pasta
// de trabalho e o modelo em uso (preenchido a cada chamada), e o idioma vem da console (pedido do Pai, 2026-10-20:
// "resposta e personalidade cruas e robotizadas"; "camada de inglês sob o app inteiro").
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { call } from '../../client/src/ipc.ts';
import { endpointFor } from '../src/paths.ts';
import { buddySystem } from '../src/persona.ts';
import { checkParams } from '../src/contract.ts';
import { fakeHttp, type Captured } from './fake-http.ts';
import { spawnOwner, killHard, tempHome } from './helpers.ts';

const owners: ChildProcess[] = [];
const servers: { close: () => Promise<void> }[] = [];
after(async () => { for (const o of owners) await killHard(o); for (const s of servers) await s.close().catch(() => {}); });

test('a instrução do Buddy existe nos dois idiomas, com a pasta de trabalho e o lugar do modelo, sem falar de si como "persona"', () => {
  const pt = buddySystem('pt-BR', 'C:/trabalho/projeto');
  const en = buddySystem('en', 'C:/trabalho/projeto');
  for (const s of [pt, en]) {
    assert.match(s, /Rabelus Buddy/);
    assert.match(s, /Rabelus Lab/);
    assert.ok(s.includes('C:/trabalho/projeto'), 'a pasta de trabalho');
    assert.ok(s.includes('{{route}}'), 'o modelo em uso entra a cada chamada');
    assert.doesNotMatch(s, /persona|setup/i, 'ele não se descreve como persona de uma configuração');
    assert.ok(s.length > 600, 'não é uma linha só');
  }
  assert.match(pt, /português do Brasil/i);
  assert.match(en, /\bEnglish\b/);
  assert.equal(buddySystem('xx' as never, '/w'), buddySystem('pt-BR', '/w'), 'idioma desconhecido cai no português');
});

test('o contrato do agent.run aceita o idioma pt-BR ou en e recusa outro', () => {
  const base = { session: 's1', task: 'oi', workspace: 'C:/w' };
  assert.equal(checkParams('agent.run', { ...base, lang: 'en' }).ok, true);
  assert.equal(checkParams('agent.run', { ...base, lang: 'pt-BR' }).ok, true);
  assert.equal(checkParams('agent.run', { ...base, lang: 'fr' }).ok, false);
});

test('o modelo recebe a instrução no idioma pedido, com o nome do modelo em uso preenchido; sem idioma, português', async () => {
  const bodies: any[] = [];
  const llm = await fakeHttp((c: Captured) => {
    if (!c.path.endsWith('/chat/completions')) return { status: 404 };
    bodies.push(typeof c.body === 'string' ? JSON.parse(c.body) : c.body);
    return { json: { id: 'c', object: 'chat.completion', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: 'oi' } }], usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 } } };
  });
  servers.push(llm);
  const home = tempHome();
  writeFileSync(join(home, 'config.json'), JSON.stringify({ routes: [{ provider: 'opencode-go', model: 'kimi-k3', baseURL: `${llm.url}/v1` }] }));
  owners.push(await spawnOwner(home, { OPENCODE_GO_API_KEY: 'chave-falsa', OLLAMA_CLOUD_API_KEY: '', OPENROUTER_API_KEY: '' }));
  const ipc = (m: string, p: Record<string, unknown> = {}) => call(endpointFor(home), m, p) as Promise<any>;
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-ws-'));
  const wait = async (run: string) => { for (;;) { const r = await ipc('run.get', { id: run }); if (r.state !== 'running') return r; await new Promise((x) => setTimeout(x, 50)); } };

  await wait((await ipc('agent.run', { session: 'v1', task: 'hello', workspace, lang: 'en' })).run);
  const sysEn = bodies[0].messages[0];
  assert.equal(sysEn.role, 'system');
  assert.match(sysEn.content, /\bEnglish\b/);
  assert.ok(sysEn.content.includes('opencode-go/kimi-k3'), 'o modelo em uso, preenchido');
  assert.equal(sysEn.content.includes('{{route}}'), false);

  await wait((await ipc('agent.run', { session: 'v2', task: 'olá', workspace })).run);
  assert.match(bodies[1].messages[0].content, /português do Brasil/i);
});

test('a console manda o idioma escolhido junto da tarefa', () => {
  const PAGE = readFileSync(join(import.meta.dirname, '..', 'console', 'index.html'), 'utf8');
  assert.match(PAGE, /params\.lang = lang/);
});
