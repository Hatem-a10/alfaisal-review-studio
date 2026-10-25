import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const studySnapshots = sqliteTable('study_snapshots', {
 userId: text('user_id').primaryKey(),
 revision: integer('revision').notNull().default(0),
 snapshot: text('snapshot').notNull(),
 updatedAt: text('updated_at').notNull(),
});
