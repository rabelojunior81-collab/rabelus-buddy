// Servidor HTTP falso para os provedores: registra cada requisição e responde por rota.
import http from 'node:http';
import type { AddressInfo } from 'node:net';

export interface Captured { method: string; path: string; headers: http.IncomingHttpHeaders; body: Record<string, unknown> }
// hang: a requisição fica sem resposta (o provedor "some" no meio da chamada).
// drop: a conexão cai sem resposta nenhuma (falha inconclusiva de verdade).
// sse: eventos em fluxo (string vira `data: <string>`, como o `[DONE]` do Chat Completions);
// gapMs: intervalo entre os eventos; hold: o fluxo fica aberto depois do último evento (modelo ainda pensando).
export type Responder = (req: Captured) => { status?: number; headers?: Record<string, string>; json?: unknown; sse?: unknown[]; gapMs?: number; hold?: boolean; hang?: boolean; drop?: boolean };

interface ChatJson { id?: string; choices?: { finish_reason?: string; message?: { content?: string | null; reasoning?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[]; usage?: unknown }
// Resposta de Chat Completions em pedaços, no formato medido nos servidores reais (2026-10-17): raciocínio
// e texto em deltas, chamada de ferramenta em partes (id e nome primeiro, argumentos depois), finish_reason
// num pedaço próprio e o uso num último pedaço sem choices; termina com [DONE].
export function chatChunks(j: ChatJson): unknown[] {
  const c = j.choices?.[0] ?? {};
  const m = c.message ?? {};
  const chunk = (delta: unknown, finish: string | null = null) => ({ id: j.id ?? 'c', object: 'chat.completion.chunk', choices: [{ index: 0, delta, finish_reason: finish }] });
  const out: unknown[] = [chunk({ role: 'assistant', content: '' })];
  if (m.reasoning) for (const part of m.reasoning.match(/.{1,8}/gs) ?? []) out.push(chunk({ reasoning: part }));
  if (m.content) for (const part of m.content.match(/.{1,8}/gs) ?? []) out.push(chunk({ content: part }));
  (m.tool_calls ?? []).forEach((t, index) => {
    const half = Math.ceil(t.function.arguments.length / 2);
    out.push(chunk({ tool_calls: [{ index, id: t.id, type: 'function', function: { name: t.function.name, arguments: t.function.arguments.slice(0, half) } }] }));
    out.push(chunk({ tool_calls: [{ index, function: { arguments: t.function.arguments.slice(half) } }] }));
  });
  out.push(chunk({}, c.finish_reason ?? 'stop'));
  out.push({ id: j.id ?? 'c', object: 'chat.completion.chunk', choices: [], usage: j.usage ?? null });
  out.push('[DONE]');
  return out;
}

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
      if (out.hang) return;
      if (out.drop) { req.socket.destroy(); return; }
      // Pedido em fluxo para o Chat Completions: o servidor real responde em pedaços, nunca com o JSON inteiro.
      if (!out.sse && body.stream === true && cap.path.endsWith('/chat/completions') && (out.status ?? 200) < 300 && out.json) out.sse = chatChunks(out.json as ChatJson);
      if (out.sse) {
        res.writeHead(out.status ?? 200, { 'content-type': 'text/event-stream', ...out.headers });
        const events = [...out.sse];
        const next = () => {
          if (res.destroyed) return;
          const ev = events.shift();
          if (ev === undefined) { if (!out.hold) res.end(); return; }
          if (typeof ev === 'string') res.write(`data: ${ev}\n\n`);
          else res.write(`event: ${(ev as { type?: string }).type ?? 'message'}\ndata: ${JSON.stringify(ev)}\n\n`);
          if (out.gapMs) setTimeout(next, out.gapMs); else next();
        };
        next();
        return;
      }
      res.writeHead(out.status ?? 200, { 'content-type': 'application/json', ...out.headers });
      res.end(JSON.stringify(out.json ?? {}));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, requests, close: () => new Promise((r) => { server.close(() => r()); server.closeAllConnections(); }) };
}
