CREATE TABLE `content_entries` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`updated_at` integer NOT NULL
);
