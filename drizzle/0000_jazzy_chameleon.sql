CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`sort_order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `category_state` (
	`category_id` text PRIMARY KEY NOT NULL,
	`current_dhikr_index` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `counters` (
	`dhikr_id` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`dhikr_id`) REFERENCES `dhikrs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `dhikrs` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`arabic` text NOT NULL,
	`transliteration` text NOT NULL,
	`translation` text NOT NULL,
	`target` integer NOT NULL,
	`description` text,
	`reference` text,
	`grade` text,
	`audio_filename` text,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dhikrs_category_sort_idx` ON `dhikrs` (`category_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `favourites` (
	`dhikr_id` text PRIMARY KEY NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`dhikr_id`) REFERENCES `dhikrs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
