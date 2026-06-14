CREATE TABLE `dhikr_completion_log` (
	`date` text NOT NULL,
	`dhikr_id` text NOT NULL,
	`completed_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`date`, `dhikr_id`),
	FOREIGN KEY (`dhikr_id`) REFERENCES `dhikrs`(`id`) ON UPDATE no action ON DELETE cascade
);
