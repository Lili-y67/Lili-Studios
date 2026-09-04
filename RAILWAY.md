# Déploiement Railway

Le projet utilise maintenant Node.js, Express, PostgreSQL et Drizzle ORM. Le frontend HTML/CSS/JS reste inchangé.

## Configuration Railway

1. Créez un projet Railway depuis ce dépôt.
2. Ajoutez un service PostgreSQL au projet.
3. Dans les variables du service web, ajoutez :
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `ADMIN_PASSWORD` avec votre mot de passe (ne jamais le committer)
   - `ADMIN_SESSION_SECRET` avec une longue valeur aléatoire (ne jamais la committer)
   - `NODE_ENV=production`
4. Commande de build : `npm run build`
5. Commande de pré-déploiement : `npm run db:migrate`
6. Commande de démarrage : `npm start`
7. Chemin du healthcheck : `/health`

Railway fournit automatiquement `PORT`. Le serveur écoute ce port sur `0.0.0.0`.

## Développement local avec PostgreSQL

Copiez `.env.example` vers `.env`, renseignez les trois variables privées dans ce fichier local, puis lancez :

```powershell
npm install
npm run build
npm run db:migrate
npm run dev
```

La copie de l'ancienne version Cloudflare se trouve dans `cloudflare-original/`.
