CREATE INDEX IF NOT EXISTS `study_materials_user_created_idx` ON `study_materials` (`user_id`, `created_at` DESC, `id`);
