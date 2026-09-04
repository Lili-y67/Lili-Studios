# Sauvegarde de la version Cloudflare

Ce dossier conserve le backend et la configuration Cloudflare d'origine avant la migration vers Railway.
Le frontend HTML/CSS/JS et les images n'ont pas été dupliqués : ils restent inchangés à la racine du projet.

- `server/worker.js` : Worker Cloudflare original.
- `scripts/` : anciens scripts de build, test et serveur local.
- `drizzle/` : migration SQLite/D1 originale.
- `.openai/hosting.json` : ancienne configuration Sites/Cloudflare.
- `package.json` : scripts npm avant Railway.
