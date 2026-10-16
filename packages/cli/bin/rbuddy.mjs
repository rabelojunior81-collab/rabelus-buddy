#!/usr/bin/env node
// Binários rabelus-buddy e rbuddy (ADR 0011). O Node executa o TypeScript direto
// (type stripping, estável no 24.12+ e no 26; SPEC 0001, decisão 8 = A).
import { run } from '../src/main.ts';

process.exitCode = run(process.argv.slice(2), process.env, {
  out: (text) => process.stdout.write(`${text}\n`),
  err: (text) => process.stderr.write(`${text}\n`),
});
