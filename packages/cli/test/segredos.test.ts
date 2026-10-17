// Critério 22: chaves, tokens OAuth e valores de .env nunca aparecem no banco, no log, na auditoria,
// na saída nem nos temporários (busca pelo valor), e os arquivos de credencial ficam só com o dono.
// Ponta a ponta: rbuddy run com o Go (chave por variável) esgotando, troca para o ChatGPT (token OAuth
// guardado) e o agente tentando ler um .env do workspace.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { run } from '../src/main.ts';
import { call } from '../../client/src/ipc.ts';
import { fakeHttp, type Captured } from '../../core/test/fake-http.ts';
import { endpointFor } from '../../core/src/paths.ts';
import { credentialsPath, saveCredentials, SIWC_SCOPE } from '../../core/src/providers/siwc.ts';
import { keysPath, saveKey } from '../../core/src/config.ts';

const homes: string[] = [];
after(async () => { for (const h of homes) { try { await call(endpointFor(h), 'daemon.stop', {}); } catch { /* parado */ } } });

const canary = (tag: string) => `CANARIO-${tag}-${randomBytes(8).toString('hex')}`;

// Todo arquivo regular sob `dir`, menos os que são o lugar legítimo do segredo.
function files(dir: string, skip: Set<string>, since = 0): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(d, e.name);
      if (skip.has(p)) continue;
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.mtimeMs < since) continue;
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && st.size < 20_000_000) out.push(p);
    }
  };
  walk(dir);
  return out;
}

test('critério 22: nenhum segredo vaza para banco, log, saída ou temporários; credenciais só do dono', async () => {
  const t0 = Date.now() - 1000;
  const goKey = canary('GO');
  const ollamaKey = canary('OLLAMA');
  const access = canary('ACCESS');
  const refresh = canary('REFRESH');
  const envValue = canary('DOTENV');
  const secrets = [goKey, ollamaKey, access, refresh, envValue];

  const seen: { auth: string[] } = { auth: [] };
  let goCalls = 0;
  let gptCalls = 0;
  const fake = await fakeHttp((c: Captured) => {
    seen.auth.push(String(c.headers.authorization ?? ''));
    if (c.path.endsWith('/chat/completions')) { goCalls++; return { status: 429, headers: { 'retry-after': '3600' }, json: { error: { message: 'limite' } } }; }
    if (c.path.endsWith('/responses')) {
      gptCalls++;
      if (gptCalls === 1) {
        const call1 = { type: 'function_call', call_id: 'r1', name: 'read_file', arguments: JSON.stringify({ path: '.env' }) };
        return { sse: [{ type: 'response.completed', response: { id: 'x', status: 'completed', output: [call1], usage: { input_tokens: 10, output_tokens: 2 } } }] };
      }
      return { sse: [{ type: 'response.completed', response: { id: 'y', status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'não consegui ler o .env' }] }], usage: { input_tokens: 20, output_tokens: 5 } } }] };
    }
    return { status: 404 };
  });

  const home = mkdtempSync(join(tmpdir(), 'rbuddy-seg-'));
  homes.push(home);
  const workspace = mkdtempSync(join(tmpdir(), 'rbuddy-seg-ws-'));
  writeFileSync(join(workspace, '.env'), `SEGREDO=${envValue}\n`);
  writeFileSync(join(home, 'config.json'), JSON.stringify({ routes: [
    { provider: 'opencode-go', model: 'kimi-k3', baseURL: `${fake.url}/v1` },
    { provider: 'chatgpt', model: 'gpt-6.1-sol', baseURL: `${fake.url}/v1` },
  ] }));
  // ChatGPT: token OAuth guardado; a API aponta para o servidor falso pelo config.json.
  saveCredentials(home, { hostId: 'host-0123456789abcdef', clientId: 'oaiapp_x', sub: 'conta', accessToken: access, refreshToken: refresh, idToken: 'h.p.s', scope: SIWC_SCOPE, planEnabled: true, expiresAt: Date.now() + 3_600_000 });
  saveKey(home, 'ollama-cloud', ollamaKey);

  const env = { ...process.env, RBUDDY_HOME: home, OPENCODE_GO_API_KEY: goKey } as NodeJS.ProcessEnv;
  delete env.RBUDDY_LANG;
  const out: string[] = [];
  const code = await run(['run', 'leia o .env e me diga o segredo'], env, { out: (s) => out.push(s), err: (s) => out.push(s) }, { cwd: workspace, interactive: false });
  assert.equal(code, 0, out.join('\n'));
  assert.equal(goCalls, 1, 'o Go foi chamado e esgotou');
  assert.equal(gptCalls, 2, 'o ChatGPT assumiu');
  assert.ok(seen.auth.includes(`Bearer ${goKey}`) && seen.auth.includes(`Bearer ${access}`), 'os segredos foram usados de verdade');

  // Os lugares legítimos: arquivos de credencial (só do dono) e o .env do workspace.
  if (process.platform !== 'win32') {
    for (const p of [credentialsPath(home), keysPath(home)]) assert.equal(statSync(p).mode & 0o777, 0o600, p);
  }
  const legit = new Set([credentialsPath(home), keysPath(home), join(workspace, '.env')]);
  await call(endpointFor(home), 'daemon.stop', {}); // o banco é fechado; WAL e SHM ficam no disco para a busca
  const scanned = [...files(home, legit), ...files(workspace, legit), ...files(tmpdir(), new Set([...legit, home, workspace]), t0)];
  assert.ok(scanned.some((p) => p.endsWith('nucleo.db')), 'o banco entrou na busca');
  const leaks: string[] = [];
  for (const p of scanned) {
    let buf: Buffer;
    try { buf = readFileSync(p); } catch { continue; } // arquivo de outro teste que sumiu no meio da busca
    for (const s of secrets) if (buf.includes(s)) leaks.push(`${relative(tmpdir(), p)} contém ${s.slice(0, 14)}…`);
  }
  for (const line of out) for (const s of secrets) if (line.includes(s)) leaks.push(`saída da CLI contém ${s.slice(0, 14)}…`);
  assert.deepEqual(leaks, []);
  assert.ok(existsSync(join(home, 'nucleo.db')));
  await fake.close();
});
