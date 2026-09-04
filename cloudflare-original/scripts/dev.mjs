import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost:4173');
  if (url.pathname.startsWith('/api/')) { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(url.pathname === '/api/admin/session' ? { authenticated: false } : {})); return; }
  let relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  if (relative.startsWith('images/')) relative = `public/${relative}`;
  if (relative === 'og.png' || relative === 'favicon.svg') relative = `public/${relative}`;
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(root)) { response.writeHead(403); response.end(); return; }
  try { const data = await fs.readFile(absolute); response.writeHead(200, { 'content-type': types[path.extname(absolute)] || 'application/octet-stream' }); response.end(data); } catch { response.writeHead(404); response.end('Introuvable'); }
});
server.listen(4173, '127.0.0.1', () => console.log('Local: http://localhost:4173/'));
