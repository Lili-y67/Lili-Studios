const COOKIE_NAME = 'immortelles_admin';
const SESSION_SECONDS = 60 * 60 * 12;
const defaults = {
  personnages: { slug: 'personnages', title: 'Visages de légende', body: '<p>Dix-huit destins. Des alliances fragiles, des pouvoirs anciens et une même guerre pour empêcher les mondes de disparaître.</p>' },
  films: { slug: 'films', title: 'Les histoires prennent vie', body: '<p>Entrez dans les coulisses des films en production. Chaque affiche est une porte entrouverte sur un chapitre de la saga.</p>' },
  wallpapers: { slug: 'wallpapers', title: 'Emportez les mondes', body: '<p>Une collection de paysages cinématographiques en haute définition, prête à habiller votre écran.</p>' },
  videos: { slug: 'videos', title: 'Quelque chose s’éveille', body: '<p>Les premières bandes-annonces se préparent dans l’ombre. Revenez bientôt pour découvrir les images en mouvement.</p>' },
};
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
function safeEqual(left = '', right = '') { if (left.length !== right.length) return false; let result = 0; for (let index = 0; index < left.length; index++) result |= left.charCodeAt(index) ^ right.charCodeAt(index); return result === 0; }
async function sign(value, secret) { if (!secret) return ''; const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)); return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }
async function isAdmin(request, env) { const cookie = request.headers.get('cookie') || ''; const value = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1); if (!value) return false; const [expires, token] = value.split('.'); if (!expires || !token || Number(expires) < Math.floor(Date.now() / 1000)) return false; return safeEqual(token, await sign(expires, env.ADMIN_SESSION_SECRET)); }
function sanitizeHtml(value) { return String(value).replace(/<(script|style|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '').replace(/javascript:/gi, '').slice(0, 30000); }
async function publicContent(url, env) { const slug = url.searchParams.get('slug'); const fallback = defaults[slug]; if (!slug) return json({ error: 'Bloc manquant.' }, 400); try { const row = await env.DB.prepare('SELECT slug, title, body FROM content_entries WHERE slug = ? LIMIT 1').bind(slug).first(); return json(row || fallback || { slug, title: slug, body: '<p>Un nouveau récit sera bientôt écrit ici.</p>' }); } catch (_) { return json(fallback || { slug, title: slug, body: '<p>Un nouveau récit sera bientôt écrit ici.</p>' }); } }
async function adminContent(request, env) {
  if (!(await isAdmin(request, env))) return json({ error: 'Non autorisé.' }, 401);
  if (request.method === 'GET') { try { const result = await env.DB.prepare('SELECT slug, title, body FROM content_entries ORDER BY slug').all(); const saved = new Map((result.results || []).map((entry) => [entry.slug, entry])); return json({ entries: [...Object.values(defaults).map((entry) => saved.get(entry.slug) || entry), ...(result.results || []).filter((entry) => !defaults[entry.slug])] }); } catch (_) { return json({ entries: Object.values(defaults) }); } }
  if (request.method === 'PUT') { const payload = await request.json().catch(() => null); const slug = payload?.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); const title = payload?.title?.trim(); const body = payload?.body ? sanitizeHtml(payload.body) : ''; if (!slug || !title || !body || slug.length > 60 || title.length > 150) return json({ error: 'Le titre et le texte sont obligatoires.' }, 400); await env.DB.prepare('INSERT INTO content_entries (slug, title, body, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET title = excluded.title, body = excluded.body, updated_at = excluded.updated_at').bind(slug, title, body, Date.now()).run(); return json({ entry: { slug, title, body } }); }
  if (request.method === 'DELETE') { const slug = new URL(request.url).searchParams.get('slug'); if (!slug) return json({ error: 'Bloc manquant.' }, 400); await env.DB.prepare('DELETE FROM content_entries WHERE slug = ?').bind(slug).run(); return json({ ok: true }); }
  return json({ error: 'Méthode non autorisée.' }, 405);
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/content' && request.method === 'GET') return publicContent(url, env);
    if (url.pathname === '/api/admin/content') return adminContent(request, env);
    if (url.pathname === '/api/admin/login' && request.method === 'POST') { const payload = await request.json().catch(() => null); if (!payload?.password || !env.ADMIN_PASSWORD || !safeEqual(payload.password, env.ADMIN_PASSWORD)) return json({ error: 'Mot de passe incorrect.' }, 401); const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS; const token = `${expires}.${await sign(String(expires), env.ADMIN_SESSION_SECRET)}`; return json({ ok: true }, 200, { 'set-cookie': `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}` }); }
    if (url.pathname === '/api/admin/session' && request.method === 'GET') return json({ authenticated: await isAdmin(request, env) });
    if (url.pathname === '/api/admin/session' && request.method === 'DELETE') return json({ ok: true }, 200, { 'set-cookie': `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` });
    if (!env.ASSETS) return new Response('Ressource introuvable.', { status: 404 });
    let response = await env.ASSETS.fetch(request);
    if (response.status === 404 && url.pathname !== '/' && !url.pathname.split('/').pop().includes('.')) { const fallbackUrl = new URL(request.url); fallbackUrl.pathname = `${url.pathname}.html`; response = await env.ASSETS.fetch(new Request(fallbackUrl, request)); }
    return response;
  },
};
