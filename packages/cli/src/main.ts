// Entrada da CLI do Rabelus Buddy (SPEC 0001, escopo 16; ADR 0011).
// No M0.1: --help, --version e --lang. Os comandos do núcleo chegam nas sub-fases seguintes.

import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createI18n, resolveLang } from '@rabelus-buddy/client/i18n';

const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8')) as { version: string };

export interface Io {
  out: (text: string) => void;
  err: (text: string) => void;
}

export function run(argv: string[], env: NodeJS.ProcessEnv, io: Io): number {
  // O idioma vem antes de tudo, para que até o erro de opção saia no idioma pedido.
  const langIdx = argv.indexOf('--lang');
  const { t } = createI18n(resolveLang({ flag: langIdx >= 0 ? argv[langIdx + 1] : undefined, env: env.RBUDDY_LANG }));

  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
        lang: { type: 'string' },
      },
    });
  } catch (e) {
    const option = /'(-[^']+)'/.exec((e as Error).message)?.[1] ?? argv.find((a) => a.startsWith('-')) ?? '';
    io.err(t('cli.unknownOption', { option }));
    return 1;
  }

  const { values, positionals } = parsed;
  if (values.version) {
    io.out(t('cli.version', { version: pkg.version }));
    return 0;
  }
  const command = positionals[0];
  if (values.help || !command) {
    io.out(t('cli.help'));
    return 0;
  }
  io.err(t('cli.unknownCommand', { command }));
  return 1;
}
