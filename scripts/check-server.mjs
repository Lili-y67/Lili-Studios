import path from 'node:path';
import { createApp } from '../server/app.js';

const records = new Map();
const repository = {
  async find(slug) { return records.get(slug) || null; },
  async list() { return [...records.values()].sort((left, right) => left.slug.localeCompare(right.slug)); },
  async save(entry) { const saved = { ...entry, updatedAt: new Date() }; records.set(entry.slug, saved); return saved; },
  async remove(slug) { records.delete(slug); },
};
const app = createApp({
  repository,
  adminPassword: 'test-password',
  sessionSecret: 'test-secret',
  staticRoot: path.join(process.cwd(), 'dist', 'client'),
  secureCookies: false,
});
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const { port } = server.address();
const call = (route, options) => fetch(`http://127.0.0.1:${port}${route}`, options);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  assert((await call('/health')).status === 200, 'Le healthcheck doit répondre.');
  assert((await call('/api/content?slug=films')).status === 200, 'La lecture publique doit fonctionner.');
  assert((await call('/api/admin/content')).status === 401, 'Le contenu admin doit être protégé.');
  assert((await call('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'wrong' }) })).status === 401, 'Un mauvais mot de passe doit être refusé.');
  const login = await call('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'test-password' }) });
  assert(login.status === 200, 'Le mot de passe valide doit être accepté.');
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const session = await (await call('/api/admin/session', { headers: { cookie } })).json();
  assert(session.authenticated === true, 'Le cookie admin doit ouvrir une session.');
  const save = await call('/api/admin/content', { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ slug: 'films', title: 'Titre modifié', body: '<p>Texte modifié</p><script>alert(1)</script>' }) });
  assert(save.status === 200, 'La sauvegarde authentifiée doit fonctionner.');
  const publicEntry = await (await call('/api/content?slug=films')).json();
  assert(publicEntry.title === 'Titre modifié' && !publicEntry.body.includes('<script>'), 'Le texte doit être relu et nettoyé.');
  assert((await call('/api/admin/content?slug=films', { method: 'DELETE', headers: { cookie } })).status === 200, 'La suppression authentifiée doit fonctionner.');
  assert(!records.has('films'), 'Le bloc supprimé ne doit plus être présent en base.');
  assert((await call('/films')).status === 200, 'Les URLs sans .html doivent fonctionner.');
  assert((await call('/films.html')).status === 200, 'Les URLs .html doivent continuer à fonctionner.');
  assert((await call('/api/admin/session', { method: 'DELETE', headers: { cookie } })).status === 200, 'La déconnexion doit fonctionner.');
  console.log('Express, routes, cookie admin et fichiers statiques : OK');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
