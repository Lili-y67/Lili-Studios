import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';

const COOKIE_NAME = 'immortelles_admin';
const SESSION_SECONDS = 60 * 60 * 12;

export const defaultEntries = {
  personnages: { slug: 'personnages', title: 'Visages de légende', body: '<p>Dix-huit destins. Des alliances fragiles, des pouvoirs anciens et une même guerre pour empêcher les mondes de disparaître.</p>' },
  films: { slug: 'films', title: 'Les histoires prennent vie', body: '<p>Entrez dans les coulisses des films en production. Chaque affiche est une porte entrouverte sur un chapitre de la saga.</p>' },
  wallpapers: { slug: 'wallpapers', title: 'Emportez les mondes', body: '<p>Une collection de paysages cinématographiques en haute définition, prête à habiller votre écran.</p>' },
  videos: { slug: 'videos', title: 'Quelque chose s’éveille', body: '<p>Les premières bandes-annonces se préparent dans l’ombre. Revenez bientôt pour découvrir les images en mouvement.</p>' },
};

function safeEqual(left = '', right = '') {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(value, secret) {
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function readCookie(request, name) {
  const rawCookie = request.headers.cookie || '';
  const part = rawCookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
}

function isAdmin(request, sessionSecret) {
  const [expires, token] = readCookie(request, COOKIE_NAME).split('.');
  if (!expires || !token || Number(expires) < Math.floor(Date.now() / 1000)) return false;
  return safeEqual(token, sign(expires, sessionSecret));
}

function sanitizeHtml(value) {
  return String(value)
    .replace(/<(script|style|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:/gi, '')
    .slice(0, 30_000);
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function createApp({ repository, adminPassword, sessionSecret, staticRoot, secureCookies = true }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '64kb' }));

  app.get('/health', (_request, response) => response.json({ ok: true }));

  app.get('/api/content', async (request, response) => {
    const slug = normalizeSlug(request.query.slug);
    if (!slug) return response.status(400).json({ error: 'Bloc manquant.' });
    try {
      const entry = await repository.find(slug);
      return response.json(entry || defaultEntries[slug] || { slug, title: slug, body: '<p>Un nouveau récit sera bientôt écrit ici.</p>' });
    } catch (error) {
      console.error('Lecture PostgreSQL impossible :', error.message);
      return response.json(defaultEntries[slug] || { slug, title: slug, body: '<p>Un nouveau récit sera bientôt écrit ici.</p>' });
    }
  });

  app.post('/api/admin/login', (request, response) => {
    if (!request.body?.password || !adminPassword || !sessionSecret || !safeEqual(request.body.password, adminPassword)) {
      return response.status(401).json({ error: 'Mot de passe incorrect.' });
    }
    const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    const token = `${expires}.${sign(String(expires), sessionSecret)}`;
    response.cookie(COOKIE_NAME, token, { httpOnly: true, secure: secureCookies, sameSite: 'strict', path: '/', maxAge: SESSION_SECONDS * 1000 });
    return response.json({ ok: true });
  });

  app.get('/api/admin/session', (request, response) => response.json({ authenticated: isAdmin(request, sessionSecret) }));
  app.delete('/api/admin/session', (_request, response) => {
    response.clearCookie(COOKIE_NAME, { httpOnly: true, secure: secureCookies, sameSite: 'strict', path: '/' });
    return response.json({ ok: true });
  });

  app.route('/api/admin/content')
    .all((request, response, next) => {
      if (!isAdmin(request, sessionSecret)) return response.status(401).json({ error: 'Non autorisé.' });
      return next();
    })
    .get(async (_request, response) => {
      try {
        const savedEntries = await repository.list();
        const saved = new Map(savedEntries.map((entry) => [entry.slug, entry]));
        return response.json({ entries: [
          ...Object.values(defaultEntries).map((entry) => saved.get(entry.slug) || entry),
          ...savedEntries.filter((entry) => !defaultEntries[entry.slug]),
        ] });
      } catch (error) {
        console.error('Liste PostgreSQL impossible :', error.message);
        return response.status(503).json({ error: 'La base de données est temporairement indisponible.' });
      }
    })
    .put(async (request, response) => {
      const slug = normalizeSlug(request.body?.slug);
      const title = String(request.body?.title || '').trim();
      const body = request.body?.body ? sanitizeHtml(request.body.body) : '';
      if (!slug || !title || !body || slug.length > 60 || title.length > 150) return response.status(400).json({ error: 'Le titre et le texte sont obligatoires.' });
      try {
        const entry = await repository.save({ slug, title, body });
        return response.json({ entry: { slug: entry.slug, title: entry.title, body: entry.body } });
      } catch (error) {
        console.error('Écriture PostgreSQL impossible :', error.message);
        return response.status(503).json({ error: 'La sauvegarde est temporairement indisponible.' });
      }
    })
    .delete(async (request, response) => {
      const slug = normalizeSlug(request.query.slug);
      if (!slug) return response.status(400).json({ error: 'Bloc manquant.' });
      try {
        await repository.remove(slug);
        return response.json({ ok: true });
      } catch (error) {
        console.error('Suppression PostgreSQL impossible :', error.message);
        return response.status(503).json({ error: 'La suppression est temporairement indisponible.' });
      }
    })
    .all((_request, response) => response.status(405).json({ error: 'Méthode non autorisée.' }));

  app.use(express.static(staticRoot, { extensions: ['html'], index: 'index.html', redirect: false }));
  const pages = ['index', 'personnages', 'films', 'wallpapers', 'videos', 'admin'];
  for (const page of pages) app.get(`/${page}`, (_request, response) => response.sendFile(path.join(staticRoot, `${page}.html`)));
  app.use((_request, response) => response.status(404).send('Ressource introuvable.'));
  return app;
}
