// Cliente IPC do núcleo: JSON-RPC 2.0, uma mensagem por linha, sobre node:net
// (named pipe no Windows, socket Unix no Linux e no macOS; SPEC 0001, decisão 2).

import net from 'node:net';

export interface RpcRequest { jsonrpc: '2.0'; id: number; method: string; params: unknown }
export interface RpcResponse { jsonrpc: '2.0'; id: number; result?: unknown; error?: { code: number; message: string; data?: Record<string, unknown> } }

export class RpcError extends Error {
  readonly code: number;
  readonly data: Record<string, unknown>;
  constructor(code: number, message: string, data: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

// Códigos de erro de aplicação do protocolo do núcleo (espelham core/src/domain.ts).
export const RPC_ERR = { needsReconciliation: -32001, notUnknown: -32002, notFound: -32003, alreadyResolved: -32004 } as const;

export interface Connection {
  call: (method: string, params?: unknown) => Promise<unknown>;
  close: () => void;
}

export function connect(endpoint: string): Promise<Connection> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(endpoint);
    const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
    let nextId = 1;
    let buffer = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      let i: number;
      while ((i = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 1);
        const msg = JSON.parse(line) as RpcResponse;
        const p = pending.get(msg.id);
        if (!p) continue;
        pending.delete(msg.id);
        if (msg.error) p.reject(new RpcError(msg.error.code, msg.error.message, msg.error.data));
        else p.resolve(msg.result);
      }
    });
    const fail = (e: Error) => { for (const p of pending.values()) p.reject(e); pending.clear(); };
    socket.on('error', (e) => { fail(e); reject(e); });
    socket.on('close', () => fail(new Error('conexão com o dono encerrada')));
    socket.on('connect', () => resolve({
      call: (method, params = {}) => new Promise((res, rej) => {
        const id = nextId++;
        pending.set(id, { resolve: res, reject: rej });
        const req: RpcRequest = { jsonrpc: '2.0', id, method, params };
        socket.write(`${JSON.stringify(req)}\n`);
      }),
      close: () => socket.end(),
    }));
  });
}

// Uma chamada só, abrindo e fechando a conexão.
export async function call(endpoint: string, method: string, params: unknown = {}): Promise<unknown> {
  const c = await connect(endpoint);
  try {
    return await c.call(method, params);
  } finally {
    c.close();
  }
}
