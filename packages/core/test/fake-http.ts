// Servidor HTTP falso para os provedores: registra cada requisição e responde por rota.
import http from 'node:http';
import type { AddressInfo } from 'node:net';

export interface Captured { method: string; path: string; headers: http.IncomingHttpHeaders; body: Record<string, unknown> }
export type Responder = (req: Captured) => { status?: number; headers?: Record<string, string>; json?: unknown; sse?: unknown[] };

export async function fakeHttp(responder: Responder): Promise<{ url: string; requests: Captured[]; close: () => Promise<void> }> {
  const requests: Captured[] = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (c: string) => { raw += c; });
    req.on('end', () => {
      // Formulário (OAuth) ou JSON (APIs de modelo).
      const form = String(req.headers['content-type'] ?? '').includes('application/x-www-form-urlencoded');
      const body = !raw ? {} : form ? Object.fromEntries(new URLSearchParams(raw)) : (JSON.parse(raw) as Record<string, unknown>);
      const cap: Captured = { method: req.method ?? '', path: req.url ?? '', headers: req.headers, body };
      requests.push(cap);
      const out = responder(cap);
      if (out.sse) {
        res.writeHead(out.status ?? 200, { 'content-type': 'text/event-stream', ...out.headers });
        for (const ev of out.sse) {
          const e = ev as { type?: string };
          res.write(`event: ${e.type ?? 'message'}\ndata: ${JSON.stringify(ev)}\n\n`);
        }
        res.end();
        return;
      }
      res.writeHead(out.status ?? 200, { 'content-type': 'application/json', ...out.headers });
      res.end(JSON.stringify(out.json ?? {}));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, requests, close: () => new Promise((r) => server.close(() => r())) };
}
