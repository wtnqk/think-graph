-- Create "nodes" table
CREATE TABLE `nodes` (
  `id` text NULL,
  `type` text NOT NULL,
  `parent_id` text NULL,
  `owner_id` text NOT NULL,
  `title` text NOT NULL DEFAULT '',
  `content` text NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  `updated_at` text NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (`id`),
  CONSTRAINT `0` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
  CONSTRAINT `1` FOREIGN KEY (`parent_id`) REFERENCES `nodes` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_nodes_type" to table: "nodes"
CREATE INDEX `idx_nodes_type` ON `nodes` (`type`);
-- Create index "idx_nodes_parent_id" to table: "nodes"
CREATE INDEX `idx_nodes_parent_id` ON `nodes` (`parent_id`);
-- Create index "idx_nodes_owner_id" to table: "nodes"
CREATE INDEX `idx_nodes_owner_id` ON `nodes` (`owner_id`);
-- Create "edges" table
CREATE TABLE `edges` (
  `id` text NULL,
  `source_id` text NOT NULL,
  `target_id` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (`id`),
  CONSTRAINT `0` FOREIGN KEY (`target_id`) REFERENCES `nodes` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`source_id`) REFERENCES `nodes` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "idx_edges_source_id" to table: "edges"
CREATE INDEX `idx_edges_source_id` ON `edges` (`source_id`);
-- Create index "idx_edges_target_id" to table: "edges"
CREATE INDEX `idx_edges_target_id` ON `edges` (`target_id`);
-- Create "node_likes" table
CREATE TABLE `node_likes` (
  `node_id` text NOT NULL,
  `user_id` text NOT NULL,
  `created_at` text NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (`node_id`, `user_id`),
  CONSTRAINT `0` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT `1` FOREIGN KEY (`node_id`) REFERENCES `nodes` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
