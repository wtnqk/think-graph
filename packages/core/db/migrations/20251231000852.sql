-- Create "users" table
CREATE TABLE `users` (
  `id` text NULL,
  `google_id` text NOT NULL,
  `email` text NOT NULL,
  `name` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (`id`)
);
-- Create index "users_google_id" to table: "users"
CREATE UNIQUE INDEX `users_google_id` ON `users` (`google_id`);
-- Create index "idx_users_google_id" to table: "users"
CREATE INDEX `idx_users_google_id` ON `users` (`google_id`);
