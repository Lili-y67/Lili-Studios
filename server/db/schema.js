import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const contentEntries = pgTable('content_entries', {
  slug: text('slug').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
