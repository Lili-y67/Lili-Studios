import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { contentEntries } from './schema.js';

export function createPostgresRepository(databaseUrl) {
  if (!databaseUrl) throw new Error('La variable DATABASE_URL est obligatoire.');
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 });
  const db = drizzle(pool);
  return {
    async find(slug) {
      const rows = await db.select().from(contentEntries).where(eq(contentEntries.slug, slug)).limit(1);
      return rows[0] || null;
    },
    async list() { return db.select().from(contentEntries).orderBy(contentEntries.slug); },
    async save(entry) {
      const updatedAt = new Date();
      const rows = await db.insert(contentEntries).values({ ...entry, updatedAt }).onConflictDoUpdate({
        target: contentEntries.slug,
        set: { title: entry.title, body: entry.body, updatedAt },
      }).returning();
      return rows[0];
    },
    async remove(slug) { await db.delete(contentEntries).where(eq(contentEntries.slug, slug)); },
    async close() { await pool.end(); },
  };
}
