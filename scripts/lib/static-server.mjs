// Servidor estático de conferência (bd serve): só 127.0.0.1, só GET, nunca fora da pasta servida.
// Uso: node static-server.mjs <pasta> [porta]. Anuncia "porta N" na saída quando está ouvindo.
import http from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const no = (code) => { res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' }); res.end(String(code)); };
  if (req.method !== 'GET' && req.method !== 'HEAD') return no(405);
  let path;
  try { path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname); } catch { return no(400); }
  let file = resolve(root, `.${path}`);
  if (file !== root && !file.startsWith(root + sep)) return no(404);
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    const body = readFileSync(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    no(404);
  }
});
server.listen(Number(process.argv[3] ?? 0), '127.0.0.1', () => {
  process.stdout.write(`porta ${server.address().port}\n`);
});
