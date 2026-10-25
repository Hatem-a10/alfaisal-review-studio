CREATE TABLE `study_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`lecture_id` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`page_count` integer NOT NULL,
	`created_at` text NOT NULL
);
