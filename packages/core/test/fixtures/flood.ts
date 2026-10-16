// Cliente de carga para o critério 1: N comandos em rajada, por uma única conexão, em 4 sessões.
// Uso: node flood.ts <prefixo-de-sessão> <n>   (RBUDDY_HOME define o dono)
import { connect } from '../../../client/src/ipc.ts';
import { endpointFor, stateHome } from '../../src/paths.ts';

const [prefix = 'x', nArg = '100'] = process.argv.slice(2);
const n = Number(nArg);
const conn = await connect(endpointFor(stateHome(process.env)));
const results = await Promise.allSettled(
  Array.from({ length: n }, (_, i) => conn.call('event.append', { session: `${prefix}${i % 4}`, kind: 'step', payload: { i } })),
);
conn.close();
const errors = results.filter((r) => r.status === 'rejected').length;
process.stdout.write(JSON.stringify({ errors, done: n - errors }));
