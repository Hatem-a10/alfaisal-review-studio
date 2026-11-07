CREATE TABLE `review_academic_groups` (
	`class_code` text NOT NULL,
	`group_code` text NOT NULL,
	`configuration` text NOT NULL,
	PRIMARY KEY(`class_code`, `group_code`),
	CONSTRAINT "review_academic_groups_class_check" CHECK("review_academic_groups"."class_code" IN ('M1','M2','F1','F2'))
);
--> statement-breakpoint
CREATE TABLE `review_admin_limits` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`attempts` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_admin_sessions` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`idle_until` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_student_answers` (
	`user_id` text NOT NULL,
	`lecture_id` text NOT NULL,
	`question_id` text NOT NULL,
	`choice` integer NOT NULL,
	`correct` integer NOT NULL,
	`answered_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `lecture_id`, `question_id`),
	FOREIGN KEY (`user_id`) REFERENCES `review_student_profiles`(`user_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "review_student_answer_correct" CHECK("review_student_answers"."correct" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `review_student_countdowns` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`event` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`),
	FOREIGN KEY (`user_id`) REFERENCES `review_student_profiles`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `review_student_grades` (
	`user_id` text PRIMARY KEY NOT NULL,
	`grades` text NOT NULL,
	`revision` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `review_student_profiles`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `review_student_passes` (
	`user_id` text NOT NULL,
	`lecture_id` text NOT NULL,
	`pass` integer NOT NULL,
	`completed_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `lecture_id`, `pass`),
	FOREIGN KEY (`user_id`) REFERENCES `review_student_profiles`(`user_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "review_student_pass_range" CHECK("review_student_passes"."pass" IN (0,1,2))
);
--> statement-breakpoint
CREATE TABLE `review_student_practice` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`questions` text NOT NULL,
	`result` text,
	PRIMARY KEY(`user_id`, `id`),
	FOREIGN KEY (`user_id`) REFERENCES `review_student_profiles`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `review_student_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`profile` text NOT NULL,
	`created_at` text NOT NULL,
	`active_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE INDEX `review_student_profiles_active` ON `review_student_profiles` (`active_at`);