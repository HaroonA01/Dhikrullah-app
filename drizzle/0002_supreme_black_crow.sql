CREATE TABLE `daily_category_progress` (
	`date` text NOT NULL,
	`category_id` text NOT NULL,
	`percent` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`date`, `category_id`),
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
