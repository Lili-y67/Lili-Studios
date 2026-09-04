import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createPostgresRepository } from './db/repository.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT) || 4173;
const host = '0.0.0.0';
const requiredVariables = ['DATABASE_URL', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET'];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length) {
  console.error(`Variables d’environnement manquantes : ${missingVariables.join(', ')}`);
  process.exit(1);
}

const repository = createPostgresRepository(process.env.DATABASE_URL);
const app = createApp({
  repository,
  adminPassword: process.env.ADMIN_PASSWORD,
  sessionSecret: process.env.ADMIN_SESSION_SECRET,
  staticRoot: path.join(root, 'dist', 'client'),
  secureCookies: process.env.NODE_ENV !== 'development',
});

const server = app.listen(port, host, () => console.log(`Les Immortelles écoute sur http://${host}:${port}`));

async function shutdown(signal) {
  console.log(`${signal} reçu, arrêt du serveur…`);
  server.close(async () => {
    await repository.close();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
