import worker from '../server/worker.js';

const records = new Map();
const database = {
  prepare(sql) {
    return {
      values: [],
      bind(...values) { this.values = values; return this; },
      async first() { return records.get(this.values[0]) || null; },
      async all() { return { results: [...records.values()].sort((a, b) => a.slug.localeCompare(b.slug)) }; },
      async run() {
        if (sql.startsWith('INSERT')) { const [slug, title, body] = this.values; records.set(slug, { slug, title, body }); }
        if (sql.startsWith('DELETE')) records.delete(this.values[0]);
        return { success: true };
      },
    };
  },
};
const environment = {
  DB: database,
  ADMIN_PASSWORD: 'test-password',
  ADMIN_SESSION_SECRET: 'test-secret',
  ASSETS: { fetch: async () => new Response('<!doctype html><title>Les Immortelles</title>', { headers: { 'content-type': 'text/html' } }) },
};
const call = (path, init) => worker.fetch(new Request(`https://example.test${path}`, init), environment);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert((await call('/api/content?slug=films')).status === 200, 'La lecture publique doit fonctionner.');
assert((await call('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'wrong' }) })).status === 401, 'Un mauvais mot de passe doit être refusé.');
const login = await call('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'test-password' }) });
assert(login.status === 200, 'Le mot de passe valide doit être accepté.');
const cookie = login.headers.get('set-cookie').split(';')[0];
const save = await call('/api/admin/content', { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ slug: 'films', title: 'Titre modifié', body: '<p>Texte modifié</p>' }) });
assert(save.status === 200, 'La sauvegarde authentifiée doit fonctionner.');
const publicEntry = await (await call('/api/content?slug=films')).json();
assert(publicEntry.title === 'Titre modifié', 'Le texte sauvegardé doit être relu publiquement.');
assert((await call('/')).status === 200, 'Les fichiers HTML doivent être servis.');
console.log('Worker, mot de passe et sauvegarde : OK');
