// Onde mora o estado do núcleo e qual é o endpoint de IPC do dono (ficha banco-e-ipc).

import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';

// RBUDDY_HOME, ou o diretório de estado do usuário em cada sistema.
export function stateHome(env: NodeJS.ProcessEnv = process.env): string {
  if (env.RBUDDY_HOME) return env.RBUDDY_HOME;
  if (process.platform === 'win32') return join(env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'rabelus-buddy');
  if (process.platform === 'darwin') return join(homedir(), 'Library', 'Application Support', 'rabelus-buddy');
  return join(env.XDG_STATE_HOME ?? join(homedir(), '.local', 'state'), 'rabelus-buddy');
}

// Windows: named pipe (namespace plano, some com o processo). Unix: socket no diretório de estado.
export function endpointFor(home: string): string {
  if (process.platform === 'win32') return `\\\\.\\pipe\\rabelus-buddy-${createHash('sha256').update(home).digest('hex').slice(0, 16)}`;
  return join(home, 'rbuddy.sock');
}

export const dbPathFor = (home: string): string => join(home, 'nucleo.db');
