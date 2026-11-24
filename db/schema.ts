import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const studySnapshots = sqliteTable('study_snapshots', {
 userId: text('user_id').primaryKey(),
 revision: integer('revision').notNull().default(0),
 snapshot: text('snapshot').notNull(),
 updatedAt: text('updated_at').notNull(),
});

export const studyMaterials = sqliteTable('study_materials', {
 id: text('id').primaryKey(),
 userId: text('user_id').notNull(),
 name: text('name').notNull(),
 lectureId: text('lecture_id').notNull(),
 mime: text('mime').notNull(),
 bytes: integer('bytes').notNull(),
 pageCount: integer('page_count').notNull(),
 createdAt: text('created_at').notNull(),
}, table => [
 // Account-scoped reverse chronological private materials and deck listings.
 index('study_materials_user_created_idx').on(table.userId, table.createdAt.desc()),
]);
