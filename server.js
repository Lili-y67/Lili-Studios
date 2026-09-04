import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 4173;
const host = '0.0.0.0';
const pages = new Set(['index.html', 'personnages.html', 'films.html', 'wallpapers.html', 'videos.html', 'admin.html', 'storage.html']);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function send(response, status, body, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(status, { 'content-type': contentType, 'content-length': Buffer.byteLength(body) });
  response.end(body);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    return send(response, 200, JSON.stringify({ ok: true }), 'application/json; charset=utf-8');
  }

  let relativePath;
  try {
    relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  } catch {
    return send(response, 400, 'Adresse incorrecte.');
  }

  if (!relativePath) relativePath = 'index.html';
  if (!path.extname(relativePath)) relativePath += '.html';

  const firstPart = relativePath.split('/')[0];
  const allowed = pages.has(relativePath) || relativePath === 'styles.css' || firstPart === 'js' || firstPart === 'public';
  const absolutePath = path.resolve(root, relativePath);
  const insideProject = absolutePath.startsWith(`${root}${path.sep}`);

  if (!allowed || !insideProject) return send(response, 404, 'Page introuvable.');

  try {
    const file = await fs.readFile(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();
    const headers = {
      'content-type': types[extension] || 'application/octet-stream',
      'content-length': file.length,
      'x-content-type-options': 'nosniff',
    };
    if (['.png', '.webp', '.jpg', '.jpeg', '.svg'].includes(extension)) headers['cache-control'] = 'public, max-age=86400';
    response.writeHead(200, headers);
    if (request.method === 'HEAD') return response.end();
    response.end(file);
  } catch {
    send(response, 404, 'Page introuvable.');
  }
});

server.listen(port, host, () => {
  console.log(`Les Immortelles écoute sur le port ${port}.`);
});

process.on('SIGTERM', () => server.close());
