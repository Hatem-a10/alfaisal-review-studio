import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, check, primaryKey, index } from 'drizzle-orm/sqlite-core';
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
});

export const reviewAdminSessions = sqliteTable('review_admin_sessions', {
 ownerId: text('owner_id').primaryKey().notNull(),
 tokenHash: text('token_hash').notNull(),
 idleUntil: integer('idle_until').notNull(),
 expiresAt: integer('expires_at').notNull(),
});

export const reviewAdminLimits = sqliteTable('review_admin_limits', {
 ownerId: text('owner_id').primaryKey().notNull(),
 startedAt: integer('started_at').notNull(),
 attempts: integer('attempts').notNull(),
});

export const reviewAcademicGroups = sqliteTable('review_academic_groups', {
 classCode: text('class_code').notNull(),
 groupCode: text('group_code').notNull(),
 configuration: text('configuration').notNull(),
}, table => [
 primaryKey({columns:[table.classCode,table.groupCode]}),
 check('review_academic_groups_class_check',sql`${table.classCode} IN ('M1','M2','F1','F2')`),
]);

export const reviewStudentProfiles = sqliteTable('review_student_profiles', {
 userId: text('user_id').primaryKey().notNull(),
 profile: text('profile').notNull(),
 createdAt: text('created_at').notNull(),
 activeAt: text('active_at').notNull(),
 completedAt: text('completed_at'),
}, table => [index('review_student_profiles_active').on(table.activeAt)]);

const studentId = () => text('user_id').notNull().references(() => reviewStudentProfiles.userId,{onDelete:'cascade'});

export const reviewStudentPasses = sqliteTable('review_student_passes', {
 userId: studentId(),
 lectureId: text('lecture_id').notNull(),
 pass: integer('pass').notNull(),
 completedAt: text('completed_at').notNull(),
}, table => [
 primaryKey({columns:[table.userId,table.lectureId,table.pass]}),
 check('review_student_pass_range',sql`${table.pass} IN (0,1,2)`),
]);

export const reviewStudentAnswers = sqliteTable('review_student_answers', {
 userId: studentId(),
 lectureId: text('lecture_id').notNull(),
 questionId: text('question_id').notNull(),
 choice: integer('choice').notNull(),
 correct: integer('correct').notNull(),
 answeredAt: text('answered_at').notNull(),
}, table => [
 primaryKey({columns:[table.userId,table.lectureId,table.questionId]}),
 check('review_student_answer_correct',sql`${table.correct} IN (0,1)`),
]);

export const reviewStudentGrades = sqliteTable('review_student_grades', {
 userId: studentId().primaryKey(),
 grades: text('grades').notNull(),
 revision: integer('revision').notNull(),
});

export const reviewStudentPractice = sqliteTable('review_student_practice', {
 userId: studentId(),
 id: text('id').notNull(),
 expiresAt: integer('expires_at').notNull(),
 questions: text('questions').notNull(),
 result: text('result'),
}, table => [primaryKey({columns:[table.userId,table.id]})]);

export const reviewStudentCountdowns = sqliteTable('review_student_countdowns', {
 userId: studentId(),
 id: text('id').notNull(),
 event: text('event').notNull(),
}, table => [primaryKey({columns:[table.userId,table.id]})]);
