CREATE TABLE `category_completion_log` (
	`date` text NOT NULL,
	`category_id` text NOT NULL,
	`completed_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`date`, `category_id`),
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `daily_stats` (
	`date` text PRIMARY KEY NOT NULL,
	`dhikr_count` integer DEFAULT 0 NOT NULL,
	`time_seconds` integer DEFAULT 0 NOT NULL,
	`categories_completed` integer DEFAULT 0 NOT NULL
);
