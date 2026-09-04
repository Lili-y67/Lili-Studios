import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const client = path.join(root, 'dist', 'client');
const server = path.join(root, 'dist', 'server');
await fs.rm(path.join(root, 'dist'), { recursive: true, force: true });
await fs.mkdir(client, { recursive: true });
await fs.mkdir(server, { recursive: true });
for (const file of ['index.html', 'personnages.html', 'films.html', 'wallpapers.html', 'videos.html', 'admin.html', 'styles.css']) await fs.copyFile(path.join(root, file), path.join(client, file));
await fs.cp(path.join(root, 'js'), path.join(client, 'js'), { recursive: true });
await fs.cp(path.join(root, 'public', 'images'), path.join(client, 'images'), { recursive: true });
await fs.copyFile(path.join(root, 'public', 'og.png'), path.join(client, 'og.png'));
await fs.copyFile(path.join(root, 'public', 'favicon.svg'), path.join(client, 'favicon.svg'));
await fs.copyFile(path.join(root, 'server', 'worker.js'), path.join(server, 'index.js'));
await fs.writeFile(path.join(server, 'wrangler.json'), JSON.stringify({ main: 'index.js', compatibility_date: '2026-05-15', assets: { directory: '../client', binding: 'ASSETS' }, d1_databases: [{ binding: 'DB', database_name: 'site-creator-d1', database_id: '00000000-0000-4000-8000-000000000000' }] }, null, 2));
console.log('Site HTML/CSS/JS construit dans dist/.');
